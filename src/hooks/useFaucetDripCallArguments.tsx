import { Interface } from '@ethersproject/abi'
import { useWeb3React } from '@web3-react/core'
import { FAUCET_ADDRESSES } from 'constants/addresses'
import faucetAbi from 'data/abi/tokens/Faucet.json'
import { useMemo } from 'react'
import useENS from './useENS'

interface FaucetDrip {
  address: string
  calldata: string
  value: string
}

/**
 * Returns the calls that can be used to drip from the faucet.
 * @param tokenAddress the token to drip
 * @param recipientAddressOrName the ENS name or address of the recipient of the swap output
 */
export function useFaucetDripCallArguments(
  tokenAddress: string,
  recipientAddressOrName: string | null | undefined,
): FaucetDrip[] {
  const { account, chainId, provider } = useWeb3React()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress

  const faucetAddress = chainId ? FAUCET_ADDRESSES[chainId] : undefined
  const faucetInterface = useMemo(() => new Interface(faucetAbi), [faucetAbi])

  const isValidToken = useMemo(() => {
    return true
  }, [tokenAddress])

  return useMemo(() => {
    if(!tokenAddress) return []
    if(!recipient) {
      const calldata = faucetInterface.encodeFunctionData('drip(address)', [
        tokenAddress,
      ])
      const value = '0'
      return [
        {
          address: faucetAddress || "0x",
          calldata,
          value,
        },
      ]
    }
    const calldata = faucetInterface.encodeFunctionData('drip(address,address)', [
      tokenAddress,
      recipient,
    ])
    const value = '0'
    return [
      {
        address: faucetAddress || "0x",
        calldata,
        value,
      },
    ]
  }, [
    account,
    chainId,
    provider,
    recipient,
    tokenAddress,
    isValidToken,
  ])
}
