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
import { useLimitOrderCallArguments } from 'hooks/useLimitOrderCallArguments'
import { ReactNode, useMemo } from 'react'

import useSendLimitOrderTransaction from './useSendLimitOrderTransaction'

export enum LimitOrderCallbackState {
  INVALID,
  LOADING,
  VALID,
}

interface UseLimitOrderCallbackReturns {
  state: LimitOrderCallbackState
  callback?: () => Promise<TransactionResponse>
  error?: ReactNode
}
interface UseLimitOrderCallbackArgs {
  trade: Trade<Currency, Currency, TradeType> | undefined // trade to execute, required
  allowedSlippage: Percent // in bips
  recipientAddressOrName: string | null | undefined // the ENS name or address of the recipient of the trade, or null if swap should be returned to sender
  signatureData: SignatureData | null | undefined
  deadline: BigNumber | undefined
  feeOptions?: FeeOptions
}

// returns a function that will execute a swap, if the parameters are all valid
// and the user has approved the slippage adjusted input amount for the trade
export function useLimitOrderCallback({
  trade,
  allowedSlippage,
  recipientAddressOrName,
  signatureData,
  deadline,
  feeOptions,
}: UseLimitOrderCallbackArgs): UseLimitOrderCallbackReturns {
  const { account, chainId, provider } = useWeb3React()

  const swapCalls = useLimitOrderCallArguments(
    trade,
    allowedSlippage,
    recipientAddressOrName,
    signatureData,
    deadline,
    feeOptions
  )
  const { callback } = useSendLimitOrderTransaction(account, chainId, provider, trade, swapCalls)

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress

  return useMemo(() => {
    if (!trade || !provider || !account || !chainId || !callback) {
      return { state: LimitOrderCallbackState.INVALID, error: <Trans>Missing dependencies</Trans> }
    }
    if (!recipient) {
      if (recipientAddressOrName !== null) {
        return { state: LimitOrderCallbackState.INVALID, error: <Trans>Invalid recipient</Trans> }
      } else {
        return { state: LimitOrderCallbackState.LOADING }
      }
    }

    return {
      state: LimitOrderCallbackState.VALID,
      callback: async () => callback(),
    }
  }, [trade, provider, account, chainId, callback, recipient, recipientAddressOrName])
}
