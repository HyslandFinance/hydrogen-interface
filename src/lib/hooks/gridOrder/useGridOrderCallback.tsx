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
import { useGridOrderCallArguments } from 'hooks/useGridOrderCallArguments'
import { ReactNode, useMemo } from 'react'

import useSendGridOrderTransaction from './useSendGridOrderTransaction'

export enum GridOrderCallbackState {
  INVALID,
  LOADING,
  VALID,
}

interface UseGridOrderCallbackReturns {
  state: GridOrderCallbackState
  callback?: () => Promise<TransactionResponse>
  error?: ReactNode
}
interface UseGridOrderCallbackArgs {
  trade: Trade<Currency, Currency, TradeType> | undefined // trade to execute, required
  allowedSlippage: Percent // in bips
  recipientAddressOrName: string | null | undefined // the ENS name or address of the recipient of the trade, or null if swap should be returned to sender
  signatureData: SignatureData | null | undefined
  deadline: BigNumber | undefined
  feeOptions?: FeeOptions
}

// returns a function that will execute a swap, if the parameters are all valid
// and the user has approved the slippage adjusted input amount for the trade
export function useGridOrderCallback({
  trade,
  allowedSlippage,
  recipientAddressOrName,
  signatureData,
  deadline,
  feeOptions,
}: UseGridOrderCallbackArgs): UseGridOrderCallbackReturns {
  const { account, chainId, provider } = useWeb3React()

  const swapCalls = useGridOrderCallArguments(
    trade,
    allowedSlippage,
    recipientAddressOrName,
    signatureData,
    deadline,
    feeOptions
  )
  const { callback } = useSendGridOrderTransaction(account, chainId, provider, trade, swapCalls)

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress

  return useMemo(() => {
    if (!trade || !provider || !account || !chainId || !callback) {
      return { state: GridOrderCallbackState.INVALID, error: <Trans>Missing dependencies</Trans> }
    }
    if (!recipient) {
      if (recipientAddressOrName !== null) {
        return { state: GridOrderCallbackState.INVALID, error: <Trans>Invalid recipient</Trans> }
      } else {
        return { state: GridOrderCallbackState.LOADING }
      }
    }

    return {
      state: GridOrderCallbackState.VALID,
      callback: async () => callback(),
    }
  }, [trade, provider, account, chainId, callback, recipient, recipientAddressOrName])
}
