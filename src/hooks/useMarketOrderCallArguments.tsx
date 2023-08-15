import { Interface } from '@ethersproject/abi'
import { BigNumber } from '@ethersproject/bignumber'
import { AddressZero } from '@ethersproject/constants'
import { Percent } from '@uniswap/sdk-core'
import { FeeOptions } from '@uniswap/v3-sdk'
import { useWeb3React } from '@web3-react/core'
import { HYDROGEN_NUCLEUS_ADDRESSES } from 'constants/addresses'
import nucleusAbi from 'data/abi/Hydrogen/HydrogenNucleus.json'
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'
import { useMemo } from 'react'

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
  const nucleusInterface = useMemo(() => new Interface(nucleusAbi), [nucleusAbi])

  return useMemo(() => {
    if (!trade || !recipient || !provider || !account || !chainId || !deadline || !nucleusAddress) return []
    const userExternalLocation = HydrogenNucleusHelper.externalAddressToLocation(account)
    const userInternalLocation = HydrogenNucleusHelper.internalAddressToLocation(account)
    const recipientLocation = HydrogenNucleusHelper.externalAddressToLocation(recipient)

    const route = trade.route
    const hydrogenRoute = route.hydrogenRoute
    const paths = hydrogenRoute.paths
    // null case
    if (!paths || paths.length == 0) {
      return []
    }
    // single hop erc20 to erc20 case
    else if (paths.length == 1 && paths[0].hops.length == 1 && !route.inputAmount.currency.isNative && !route.outputAmount.currency.isNative) {
      const hop = paths[0].hops[0]
      const calldata = nucleusInterface.encodeFunctionData('executeMarketOrder', [
        {
          poolID: hop.poolID,
          tokenA: paths[0].tokenList[1],
          tokenB: paths[0].tokenList[0],
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
      if(!!route.inputAmount.currency.isNative) {
        txdatas.push(
          nucleusInterface.encodeFunctionData('wrapGasToken', [userInternalLocation])
        )
        gasTokenValue = amountIn
      } else {
        const tokenIn = (route.inputAmount.currency.tokenInfo || route.inputAmount.currency).address
        txdatas.push(
          nucleusInterface.encodeFunctionData('tokenTransfer', [
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
      for (const path of paths) {
        for (let hopIndex = 0; hopIndex < path.hops.length; hopIndex++) {
          const hop = path.hops[hopIndex]
          txdatas.push(
            nucleusInterface.encodeFunctionData('executeMarketOrder', [
              {
                poolID: hop.poolID,
                tokenA: path.tokenList[hopIndex + 1],
                tokenB: path.tokenList[hopIndex],
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
      }
      // output
      const amountOut = hydrogenRoute.swapType == 'exactIn' ? hydrogenRoute.quote : hydrogenRoute.amount
      if(!!route.outputAmount.currency.isNative) {
        txdatas.push(
          nucleusInterface.encodeFunctionData('unwrapGasToken', [amountOut, userInternalLocation, recipientLocation])
        )
      } else {
        const tokenOut = (route.outputAmount.currency.tokenInfo || route.outputAmount.currency).address
        txdatas.push(
          nucleusInterface.encodeFunctionData('tokenTransfer', [
            {
              token: tokenOut,
              amount: amountOut,
              src: userInternalLocation,
              dst: recipientLocation,
            },
          ])
        )
      }
      const calldata = nucleusInterface.encodeFunctionData('multicall', [txdatas])
      return [
        {
          address: nucleusAddress,
          calldata,
          value: gasTokenValue,
        },
      ]
    }
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
