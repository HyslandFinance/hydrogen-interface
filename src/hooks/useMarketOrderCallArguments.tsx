import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Percent } from '@uniswap/sdk-core'
import { FeeOptions } from '@uniswap/v3-sdk'
import { useWeb3React } from '@web3-react/core'
import { HYDROGEN_NUCLEUS_ADDRESSES } from 'constants/addresses'
import { WRAPPED_NATIVE_CURRENCY } from 'constants/tokens'
import nucleusAbiV100 from 'data/abi/Hydrogen/HydrogenNucleusV100.json'
import nucleusAbiV101 from 'data/abi/Hydrogen/HydrogenNucleusV101.json'
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'
import { useMemo } from 'react'
import { NUCLEUS_VERSION } from 'constants/index'

import { useArgentWalletContract } from './useArgentWalletContract'
import useENS from './useENS'
import { SignatureData } from './useERC20Permit'

interface MarketOrderCall {
  address: string
  calldata: string
  value: string
}

/**
 * Returns the swap calls that can be used to make the trade
 * @param trade trade to execute
 * @param allowedSlippage user allowed slippage
 * @param recipientAddressOrName the ENS name or address of the recipient of the swap output
 * @param signatureData the signature data of the permit of the input token amount, if available
 */
export function useMarketOrderCallArguments(
  //trade: Trade<Currency, Currency, TradeType> | undefined,
  trade: any,
  allowedSlippage: Percent,
  recipientAddressOrName: string | null | undefined,
  signatureData: SignatureData | null | undefined,
  deadline: BigNumber | undefined,
  feeOptions: FeeOptions | undefined
): MarketOrderCall[] {
  const { account, chainId, provider } = useWeb3React()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress
  const argentWalletContract = useArgentWalletContract()

  const nucleusAddress = chainId ? HYDROGEN_NUCLEUS_ADDRESSES[chainId] : undefined
  const nucleusInterfaceV101 = useMemo(() => new Interface(nucleusAbiV101), [nucleusAbiV101])
  const nucleusInterfaceV100 = useMemo(() => new Interface(nucleusAbiV100), [nucleusAbiV100])

  return useMemo(() => {
    if (!trade || !recipient || !provider || !account || !chainId || !deadline || !nucleusAddress) return []
    const userExternalLocation = HydrogenNucleusHelper.externalAddressToLocation(account)
    const userInternalLocation = HydrogenNucleusHelper.internalAddressToLocation(account)
    const recipientLocation = HydrogenNucleusHelper.externalAddressToLocation(recipient)

    const route = trade.route
    const hydrogenRoute = route.hydrogenRoute
    const hops = hydrogenRoute.hops
    // null case
    if(!hops || hops.length == 0) {
      return []
    }

    if(NUCLEUS_VERSION == "v1.0.1") {
      // single hop case
      if(hops.length == 1) {
        // to erc20
        if(!route.outputAmount.currency.isNative) {
          const hop = hops[0]
          const calldata = nucleusInterfaceV101.encodeFunctionData('executeMarketOrderDstExt', [
            {
              poolID: hop.poolID,
              tokenA: hop.tokenA,
              tokenB: hop.tokenB,
              amountA: hop.amountAMT,
              amountB: hop.amountBMT,
            },
          ])
          return [
            {
              address: nucleusAddress,
              calldata,
              value: '0',
            },
          ]
        }
        // to gas token
        else {
          const hop = hops[0]
          const txdata0 = nucleusInterfaceV101.encodeFunctionData('executeMarketOrderDstInt', [
            {
              poolID: hop.poolID,
              tokenA: hop.tokenA,
              tokenB: hop.tokenB,
              amountA: hop.amountAMT,
              amountB: hop.amountBMT,
            },
          ])
          const txdata1 = nucleusInterfaceV101.encodeFunctionData('unwrapGasToken', [hop.amountAMT, userInternalLocation, recipientLocation])
          const txdatas = [txdata0, txdata1]
          const calldata = nucleusInterfaceV101.encodeFunctionData('multicall', [txdatas])
          return [
            {
              address: nucleusAddress,
              calldata,
              value: '0',
            },
          ]
        }
      }
      // multi hop case
      else {
        const txdatas = []
        // input
        const amountIn = hydrogenRoute.swapType == 'exactIn' ? hydrogenRoute.amount : hydrogenRoute.quote
        let gasTokenValue = '0'
        // eth
        if(!!route.inputAmount.currency.isNative) {
          gasTokenValue = amountIn
        }
        // erc20
        else {
          const tokenIn = (route.inputAmount.currency.tokenInfo || route.inputAmount.currency).address
          txdatas.push(
            nucleusInterfaceV101.encodeFunctionData('tokenTransferIn', [
              {
                token: tokenIn,
                amount: amountIn,
              },
            ])
          )
        }
        // swaps
        for(const hop of hops) {
          txdatas.push(
            nucleusInterfaceV101.encodeFunctionData('executeMarketOrderDstInt', [
              {
                poolID: hop.poolID,
                tokenA: hop.tokenA,
                tokenB: hop.tokenB,
                amountA: hop.amountAMT,
                amountB: hop.amountBMT,
              },
            ])
          )
        }
        // output
        const amountOut = hydrogenRoute.swapType == 'exactIn' ? hydrogenRoute.quote : hydrogenRoute.amount
        // eth
        if(!!route.outputAmount.currency.isNative) {
          txdatas.push(
            nucleusInterfaceV101.encodeFunctionData('unwrapGasToken', [amountOut, userInternalLocation, recipientLocation])
          )
        }
        // erc20
        else {
          const tokenOut = (route.outputAmount.currency.tokenInfo || route.outputAmount.currency).address
          // to msg.sender
          if(recipientLocation == userExternalLocation) {
            txdatas.push(
              nucleusInterfaceV101.encodeFunctionData('tokenTransferOut', [
                {
                  token: tokenOut,
                  amount: amountOut,
                },
              ])
            )
          }
          // to other
          else {
            txdatas.push(
              nucleusInterfaceV101.encodeFunctionData('tokenTransfer', [
                {
                  token: tokenOut,
                  amount: amountOut,
                  src: userInternalLocation,
                  dst: recipientLocation,
                },
              ])
            )
          }
        }
        const calldata = nucleusInterfaceV101.encodeFunctionData('multicall', [txdatas])
        return [
          {
            address: nucleusAddress,
            calldata,
            value: gasTokenValue,
          },
        ]
      }
    }
    else if(NUCLEUS_VERSION == "v1.0.0") {
      // single hop erc20 to erc20 case
      if(hops.length == 1 && !route.inputAmount.currency.isNative && !route.outputAmount.currency.isNative) {
        const hop = hops[0]
        const calldata = nucleusInterfaceV100.encodeFunctionData('executeMarketOrder', [
          {
            poolID: hop.poolID,
            tokenA: hop.tokenA,
            tokenB: hop.tokenB,
            amountA: hop.amountAMT,
            amountB: hop.amountBMT,
            locationA: recipientLocation,
            locationB: userExternalLocation,
            flashSwapCallee: AddressZero,
            callbackData: '0x',
          },
        ])
        return [
          {
            address: nucleusAddress,
            calldata,
            value: '0',
          },
        ]
      }
      // multi hop and/or input or output is gas token
      else {
        const txdatas = []
        // input
        const amountIn = hydrogenRoute.swapType == 'exactIn' ? hydrogenRoute.amount : hydrogenRoute.quote
        let gasTokenValue = '0'
        // eth
        if(!!route.inputAmount.currency.isNative) {
          txdatas.push(
            nucleusInterfaceV100.encodeFunctionData('wrapGasToken', [userInternalLocation])
          )
          gasTokenValue = amountIn
        }
        // erc20
        else {
          const tokenIn = (route.inputAmount.currency.tokenInfo || route.inputAmount.currency).address
          txdatas.push(
            nucleusInterfaceV100.encodeFunctionData('tokenTransfer', [
              {
                token: tokenIn,
                amount: amountIn,
                src: userExternalLocation,
                dst: userInternalLocation,
              },
            ])
          )
        }
        // swaps
        for(const hop of hops) {
          txdatas.push(
            nucleusInterfaceV100.encodeFunctionData('executeMarketOrder', [
              {
                poolID: hop.poolID,
                tokenA: hop.tokenA,
                tokenB: hop.tokenB,
                amountA: hop.amountAMT,
                amountB: hop.amountBMT,
                locationA: userInternalLocation,
                locationB: userInternalLocation,
                flashSwapCallee: AddressZero,
                callbackData: '0x',
              },
            ])
          )
        }
        // output
        const amountOut = hydrogenRoute.swapType == 'exactIn' ? hydrogenRoute.quote : hydrogenRoute.amount
        // eth
        if(!!route.outputAmount.currency.isNative) {
          txdatas.push(
            nucleusInterfaceV100.encodeFunctionData('unwrapGasToken', [amountOut, userInternalLocation, recipientLocation])
          )
        }
        // erc20
        else {
          const tokenOut = (route.outputAmount.currency.tokenInfo || route.outputAmount.currency).address
          txdatas.push(
            nucleusInterfaceV100.encodeFunctionData('tokenTransfer', [
              {
                token: tokenOut,
                amount: amountOut,
                src: userInternalLocation,
                dst: recipientLocation,
              },
            ])
          )
        }
        const calldata = nucleusInterfaceV100.encodeFunctionData('multicall', [txdatas])
        return [
          {
            address: nucleusAddress,
            calldata,
            value: gasTokenValue,
          },
        ]
      }
    }

    else {
      throw new Error(`cannot encode create limit order for nucleus version ${NUCLEUS_VERSION}`)
    }
    return []
  }, [
    account,
    allowedSlippage,
    argentWalletContract,
    chainId,
    deadline,
    feeOptions,
    provider,
    recipient,
    signatureData,
    trade,
  ])
}
