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

interface LimitOrderCall {
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
export function useLimitOrderCallArguments(
  //trade: Trade<Currency, Currency, TradeType> | undefined,
  trade: any,
  allowedSlippage: Percent,
  recipientAddressOrName: string | null | undefined,
  signatureData: SignatureData | null | undefined,
  deadline: BigNumber | undefined,
  feeOptions: FeeOptions | undefined
): LimitOrderCall[] {
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

    const amountA = BigNumber.from(trade.inputAmount.numerator.toString()).div(BigNumber.from(trade.inputAmount.denominator.toString()))
    const amountB = BigNumber.from(trade.outputAmount.numerator.toString()).div(BigNumber.from(trade.outputAmount.denominator.toString()))
    const exchangeRate = HydrogenNucleusHelper.encodeExchangeRate(amountA, amountB)

    // note limit orders don't support eth out, only weth
    const wgas = WRAPPED_NATIVE_CURRENCY[chainId]
    //console.log('wgas', wgas)
    if(!wgas) return []
    const tokenB = !!trade.outputAmount.currency.isNative ? wgas.address : trade.outputAmount.currency.address

    if(NUCLEUS_VERSION == "v1.0.1") {
      // erc20 to erc20 case
      if(!trade.inputAmount.currency.isNative) {
        const calldata = nucleusInterfaceV101.encodeFunctionData('createLimitOrderPoolCompact', [
          {
            tokenA: trade.inputAmount.currency.address,
            tokenB: tokenB,
            exchangeRate: exchangeRate,
            amountA: amountA,
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
      // gas token to erc20 case
      else {
        const calldata = nucleusInterfaceV101.encodeFunctionData('createLimitOrderPoolCompact', [
          {
            tokenA: wgas.address,
            tokenB: tokenB,
            exchangeRate: exchangeRate,
            amountA: amountA,
          },
        ])
        return [
          {
            address: nucleusAddress,
            calldata,
            value: amountA.toString(),
          },
        ]
      }
    }

    else if(NUCLEUS_VERSION == "v1.0.0") {
      // erc20 to erc20 case
      if(!trade.inputAmount.currency.isNative) {
        const calldata = nucleusInterfaceV100.encodeFunctionData('createLimitOrderPool', [
          {
            tokenA: trade.inputAmount.currency.address,
            tokenB: tokenB,
            exchangeRate: exchangeRate,
            locationA: userExternalLocation,
            locationB: recipientLocation,
            amountA: amountA,
            hptReceiver: recipient
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
      // gas token to erc20 case
      else {
        const txdatas = [
          nucleusInterfaceV100.encodeFunctionData('wrapGasToken', [userInternalLocation]),
          nucleusInterfaceV100.encodeFunctionData('createLimitOrderPool', [
            {
              tokenA: wgas.address,
              tokenB: tokenB,
              exchangeRate: exchangeRate,
              locationA: userInternalLocation,
              locationB: recipientLocation,
              amountA: amountA,
              hptReceiver: recipient
            },
          ])
        ]
        const calldata = nucleusInterfaceV100.encodeFunctionData('multicall', [txdatas])
        return [
          {
            address: nucleusAddress,
            calldata,
            value: amountA.toString(),
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
