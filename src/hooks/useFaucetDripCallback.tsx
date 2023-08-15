import { useWeb3React } from '@web3-react/core'
import { FaucetDripCallbackState, useFaucetDripCallback as useLibFaucetDripCallback } from 'lib/hooks/faucet/useFaucetDripCallback'
import { ReactNode, useMemo } from 'react'
import useENS from './useENS'
import { useTransactionAdder } from '../state/transactions/hooks'
import { TransactionType } from '../state/transactions/types'

// returns a function that will execute a drip, if the parameters are all valid
export function useFaucetDripCallback(
  token: any,
  recipientAddressOrName: string | undefined, // the ENS name or address of the recipient of the drip, or null if drip should be returned to sender
): { state: FaucetDripCallbackState; callback: null | (() => Promise<string>); error: ReactNode | null } {
  let tokenAddress:any = undefined
  try {
    const token1 = token as any
    const token2 = token1.wrapped || token1
    const token3 = token2.tokenInfo || token2
    tokenAddress = token3.address
  } catch(e) {}
  const { account } = useWeb3React()

  const addTransaction = useTransactionAdder()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = !recipientAddressOrName ? account : recipientAddress
  const {
    state,
    callback: dripCallback,
    error,
  } = useLibFaucetDripCallback({
    tokenAddress,
    recipientAddressOrName: recipient
  })

  const callback = useMemo(() => {
    if (!dripCallback) return null
    return () =>
      dripCallback().then((response) => {
        addTransaction(
          response,
          {
            type: TransactionType.FAUCET_DRIP,
            tokenAddress: tokenAddress,
            recipientAddress: recipient || "",
          }
        )
        return response.hash
      })
  }, [dripCallback])

  return {
    state,
    callback,
    error,
  }
}
