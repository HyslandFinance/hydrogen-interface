import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { useStablecoinAmountFromFiatValue } from 'hooks/useStablecoinPrice'
import { useMemo } from 'react'
import { RouterPreference, useGetQuoteQuery } from 'state/routing/slice'
import { useNucleusState } from 'state/statsApi/hooks'

import { GetQuoteResult, InterfaceTrade, TradeState } from './../types'
import { computeRoutes, transformRoutesToTrade } from './../utils'
import { calculateRoute } from './calculateRoute'

/**
 * Returns the best trade by invoking the local router
 * @param tradeType whether the swap is an exact in/out
 * @param amountSpecified the exact amount to swap in/out
 * @param otherCurrency the desired output/payment currency
 */
export function useTradeFromLocalRouter(
  tradeType: TradeType,
  amountSpecified: CurrencyAmount<Currency> | undefined,
  otherCurrency: Currency | undefined,
  routerPreference: RouterPreference,
  estimateGas: boolean = true
): {
  state: TradeState
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
} {
  const [currencyIn, currencyOut]: [Currency | undefined, Currency | undefined] = useMemo(
    () =>
      tradeType === TradeType.EXACT_INPUT
        ? [amountSpecified?.currency, otherCurrency]
        : [otherCurrency, amountSpecified?.currency],
    [amountSpecified, otherCurrency, tradeType]
  )

  const nucleusState = useNucleusState() as any

  const data = useMemo(() => calculateRoute(nucleusState, tradeType, amountSpecified, otherCurrency, estimateGas),
    [nucleusState, tradeType, amountSpecified, otherCurrency, estimateGas]) as any

  const quoteResult = data

  const route = useMemo(
    () => computeRoutes(currencyIn, currencyOut, tradeType, quoteResult),
    [currencyIn, currencyOut, quoteResult, tradeType]
  )

  // get USD gas cost of trade in active chains stablecoin amount
  const gasUseEstimateUSD = useStablecoinAmountFromFiatValue(estimateGas ? quoteResult?.gasUseEstimateUSD : undefined) ?? null

  return useMemo(() => {
    try {
      if (!currencyIn || !currencyOut) {
        return {
          state: TradeState.INVALID,
          trade: undefined,
        }
      }
      if(nucleusState.loading) return {
        state: TradeState.LOADING,
        trade: undefined,
      }
      if(!data) return {
         state: TradeState.NO_ROUTE_FOUND,
         trade: undefined,
      }

      let otherAmount = undefined
      if (quoteResult) {
        if (tradeType === TradeType.EXACT_INPUT && currencyOut) {
          otherAmount = CurrencyAmount.fromRawAmount(currencyOut, quoteResult.quote)
        }

        if (tradeType === TradeType.EXACT_OUTPUT && currencyIn) {
          otherAmount = CurrencyAmount.fromRawAmount(currencyIn, quoteResult.quote)
        }
      }

      if (!otherAmount || !route || route.length === 0) {
        return {
          state: TradeState.NO_ROUTE_FOUND,
          trade: undefined,
        }
      }

      const trade = transformRoutesToTrade(route, tradeType, quoteResult?.blockNumber, gasUseEstimateUSD)

      return {
         state: TradeState.VALID,
         trade: trade,
       }
     } catch(e) {
       return { state: TradeState.INVALID, trade: undefined }
     }
  }, [
    currencyIn,
    currencyOut,
    tradeType,
    nucleusState,
  ]) as any
}
