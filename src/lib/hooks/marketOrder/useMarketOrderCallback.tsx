// eslint-disable-next-line no-restricted-imports
import { BigNumber } from '@ethersproject/bignumber'
import type { TransactionResponse } from '@ethersproject/providers'
import { Trans } from '@lingui/macro'
import { Trade } from '@uniswap/router-sdk'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { FeeOptions } from '@uniswap/v3-sdk'
import { useWeb3React } from '@web3-react/core'
import useENS from 'hooks/useENS'
import { SignatureData } from 'hooks/useERC20Permit'
import { useMarketOrderCallArguments } from 'hooks/useMarketOrderCallArguments'
import { ReactNode, useMemo } from 'react'

import useSendMarketOrderTransaction from './useSendMarketOrderTransaction'

export enum MarketOrderCallbackState {
  INVALID,
  LOADING,
  VALID,
}

interface UseMarketOrderCallbackReturns {
  state: MarketOrderCallbackState
  callback?: () => Promise<TransactionResponse>
  error?: ReactNode
}
interface UseMarketOrderCallbackArgs {
  trade: Trade<Currency, Currency, TradeType> | undefined // trade to execute, required
  allowedSlippage: Percent // in bips
  recipientAddressOrName: string | null | undefined // the ENS name or address of the recipient of the trade, or null if swap should be returned to sender
  signatureData: SignatureData | null | undefined
  deadline: BigNumber | undefined
  feeOptions?: FeeOptions
}

// returns a function that will execute a swap, if the parameters are all valid
// and the user has approved the slippage adjusted input amount for the trade
export function useMarketOrderCallback({
  trade,
  allowedSlippage,
  recipientAddressOrName,
  signatureData,
  deadline,
  feeOptions,
}: UseMarketOrderCallbackArgs): UseMarketOrderCallbackReturns {
  const { account, chainId, provider } = useWeb3React()

  const swapCalls = useMarketOrderCallArguments(
    trade,
    allowedSlippage,
    recipientAddressOrName,
    signatureData,
    deadline,
    feeOptions
  )
  const { callback } = useSendMarketOrderTransaction(account, chainId, provider, trade, swapCalls)

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress

  return useMemo(() => {
    if (!trade || !provider || !account || !chainId || !callback) {
      return { state: MarketOrderCallbackState.INVALID, error: <Trans>Missing dependencies</Trans> }
    }
    if (!recipient) {
      if (recipientAddressOrName !== null) {
        return { state: MarketOrderCallbackState.INVALID, error: <Trans>Invalid recipient</Trans> }
      } else {
        return { state: MarketOrderCallbackState.LOADING }
      }
    }

    return {
      state: MarketOrderCallbackState.VALID,
      callback: async () => callback(),
    }
  }, [trade, provider, account, chainId, callback, recipient, recipientAddressOrName])
}
