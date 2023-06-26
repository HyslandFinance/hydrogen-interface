// eslint-disable-next-line no-restricted-imports
import type { TransactionResponse } from '@ethersproject/providers'
import { Trans } from '@lingui/macro'
import { useWeb3React } from '@web3-react/core'
import useENS from 'hooks/useENS'
import { useFaucetDripCallArguments } from 'hooks/useFaucetDripCallArguments'
import { ReactNode, useMemo } from 'react'

import useSendFaucetDripTransaction from './useSendFaucetDripTransaction'

export enum FaucetDripCallbackState {
  INVALID,
  LOADING,
  VALID,
}

interface UseFaucetDripCallbackReturns {
  state: FaucetDripCallbackState
  callback?: () => Promise<TransactionResponse>
  error?: ReactNode
}

interface UseFaucetDripCallbackArgs {
  tokenAddress: string,
  recipientAddressOrName: string | null | undefined // the ENS name or address of the recipient of the drip, or null if swap should be returned to sender
}

// returns a function that will execute a swap, if the parameters are all valid
// and the user has approved the slippage adjusted input amount for the drip
export function useFaucetDripCallback({
  tokenAddress,
  recipientAddressOrName
}: UseFaucetDripCallbackArgs): UseFaucetDripCallbackReturns {
  const { account, chainId, provider } = useWeb3React()

  const dripCalls = useFaucetDripCallArguments(
    tokenAddress,
    recipientAddressOrName
  )
  const { callback } = useSendFaucetDripTransaction(account, chainId, provider, dripCalls)

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress

  const isValidToken = useMemo(() => {
    return true
  }, [tokenAddress])


  return useMemo(() => {
    if (!isValidToken || !provider || !account || !chainId || !callback) {
      return { state: FaucetDripCallbackState.INVALID, error: <Trans>Missing dependencies</Trans> }
    }
    if (!recipient) {
      if (recipientAddressOrName !== null) {
        return { state: FaucetDripCallbackState.INVALID, error: <Trans>Invalid recipient</Trans> }
      } else {
        return { state: FaucetDripCallbackState.LOADING }
      }
    }

    return {
      state: FaucetDripCallbackState.VALID,
      callback: async () => callback(),
    }
  }, [provider, account, chainId, callback, recipient, recipientAddressOrName])
}
