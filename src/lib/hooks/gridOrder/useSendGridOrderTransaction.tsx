import { BigNumber } from '@ethersproject/bignumber'
import type { JsonRpcProvider, TransactionResponse } from '@ethersproject/providers'
// eslint-disable-next-line no-restricted-imports
import { t, Trans } from '@lingui/macro'
import { sendAnalyticsEvent } from '@uniswap/analytics'
import { EventName } from '@uniswap/analytics-events'
import { Trade } from '@uniswap/router-sdk'
import { Currency, TradeType } from '@uniswap/sdk-core'
//import { formatSwapSignedAnalyticsEventProperties } from 'lib/utils/analytics'
import { useMemo } from 'react'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import isZero from 'utils/isZero'
import { swapErrorToUserReadableMessage } from 'utils/swapErrorToUserReadableMessage'

interface GridOrderCall {
  address: string
  calldata: string
  value: string
}

interface GridOrderCallEstimate {
  call: GridOrderCall
}

interface SuccessfulCall extends GridOrderCallEstimate {
  call: GridOrderCall
  gasEstimate: BigNumber
}

interface FailedCall extends GridOrderCallEstimate {
  call: GridOrderCall
  error: Error
}

class InvalidGridOrderError extends Error {}

// returns a function that will execute a swap, if the parameters are all valid
export default function useSendGridOrderTransaction(
  account: string | null | undefined,
  chainId: number | undefined,
  provider: JsonRpcProvider | undefined,
  trade: Trade<Currency, Currency, TradeType> | undefined, // trade to execute, required
  swapCalls: GridOrderCall[]
): { callback: null | (() => Promise<TransactionResponse>) } {
  return useMemo(() => {
    if (!trade || !provider || !account || !chainId) {
      return { callback: null }
    }
    return {
      callback: async function onGridOrder(): Promise<TransactionResponse> {
        const estimatedCalls: GridOrderCallEstimate[] = await Promise.all(
          swapCalls.map((call) => {
            const { address, calldata, value } = call

            const tx =
              !value || isZero(value)
                ? { from: account, to: address, data: calldata }
                : {
                    from: account,
                    to: address,
                    data: calldata,
                    value,
                  }

            return provider
              .estimateGas(tx)
              .then((gasEstimate) => {
                return {
                  call,
                  gasEstimate,
                }
              })
              .catch((gasError) => {
                console.debug('Gas estimate failed, trying eth_call to extract error', call)

                return provider
                  .call(tx)
                  .then((result) => {
                    console.debug('Unexpected successful call after failed estimate gas', call, gasError, result)
                    return { call, error: <Trans>Unexpected issue with estimating the gas. Please try again.</Trans> }
                  })
                  .catch((callError) => {
                    console.debug('Call threw error', call, callError)
                    return { call, error: swapErrorToUserReadableMessage(callError) }
                  })
              })
          })
        )

        // a successful estimation is a bignumber gas estimate and the next call is also a bignumber gas estimate
        let bestCallOption: SuccessfulCall | GridOrderCallEstimate | undefined = estimatedCalls.find(
          (el, ix, list): el is SuccessfulCall =>
            'gasEstimate' in el && (ix === list.length - 1 || 'gasEstimate' in list[ix + 1])
        )

        // check if any calls errored with a recognizable error
        if (!bestCallOption) {
          const errorCalls = estimatedCalls.filter((call): call is FailedCall => 'error' in call)
          if (errorCalls.length > 0) throw errorCalls[errorCalls.length - 1].error
          const firstNoErrorCall = estimatedCalls.find<GridOrderCallEstimate>(
            (call): call is GridOrderCallEstimate => !('error' in call)
          )
          if (!firstNoErrorCall) throw new Error(t`Unexpected error. Could not estimate gas for the swap.`)
          bestCallOption = firstNoErrorCall
        }

        const {
          call: { address, calldata, value },
        } = bestCallOption

        return provider
          .getSigner()
          .sendTransaction({
            from: account,
            to: address,
            data: calldata,
            // let the wallet try if we can't estimate the gas
            ...('gasEstimate' in bestCallOption ? { gasGrid: calculateGasMargin(bestCallOption.gasEstimate) } : {}),
            ...(value && !isZero(value) ? { value } : {}),
          })
          .then((response) => {
            if (calldata !== response.data) {
              throw new InvalidGridOrderError(
                t`Your swap was modified through your wallet. If this was a mistake, please cancel immediately or risk losing your funds.`
              )
            }
            return response
          })
          .catch((error) => {
            // if the user rejected the tx, pass this along
            if (error?.code === 4001) {
              throw new Error(t`Transaction rejected`)
            } else {
              // otherwise, the error was unexpected and we need to convey that
              console.error(`GridOrder failed`, error, address, calldata, value)

              if (error instanceof InvalidGridOrderError) {
                throw error
              } else {
                throw new Error(t`GridOrder failed: ${swapErrorToUserReadableMessage(error)}`)
              }
            }
          })
      },
    }
  }, [account, chainId, provider, swapCalls, trade])
}
