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

interface GridOrderCall {
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
export function useGridOrderCallArguments(
  //trade: Trade<Currency, Currency, TradeType> | undefined,
  trade: any,
  allowedSlippage: Percent,
  recipientAddressOrName: string | null | undefined,
  signatureData: SignatureData | null | undefined,
  deadline: BigNumber | undefined,
  feeOptions: FeeOptions | undefined
): GridOrderCall[] {
  const { account, chainId, provider } = useWeb3React()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress
  const argentWalletContract = useArgentWalletContract()

  const nucleusAddress = chainId ? HYDROGEN_NUCLEUS_ADDRESSES[chainId] : undefined
  const nucleusInterface = useMemo(() => new Interface(nucleusAbi), [nucleusAbi])

  return useMemo(() => {
    if (!trade || !recipient || !provider || !account || !chainId || !deadline || !nucleusAddress) return []
    const userExternalLocation = HydrogenNucleusHelper.externalAddressToLocation(account)
    //const userInternalLocation = HydrogenNucleusHelper.internalAddressToLocation(account)
    const recipientLocation = HydrogenNucleusHelper.externalAddressToLocation(recipient)

    const amountA = BigNumber.from(trade.inputAmount.numerator.toString()).div(BigNumber.from(trade.inputAmount.denominator.toString()))
    const amountB = BigNumber.from(trade.outputAmount.numerator.toString()).div(BigNumber.from(trade.outputAmount.denominator.toString()))
    const exchangeRate = HydrogenNucleusHelper.encodeExchangeRate(amountA, amountB)
    const calldata = nucleusInterface.encodeFunctionData('createGridOrderPool', [
      {
        tokenA: trade.inputAmount.currency.address,
        tokenB: trade.outputAmount.currency.address,
        exchangeRate: exchangeRate,
        locationA: userExternalLocation,
        locationB: recipientLocation,
        amountA: amountA,
        hptReceiver: recipient
      },
    ])
    const value = '0'
    return [
      {
        address: nucleusAddress,
        calldata,
        value,
      },
    ]
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
