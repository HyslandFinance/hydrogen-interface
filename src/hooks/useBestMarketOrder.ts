import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { RouterPreference } from 'state/routing/slice'
import { InterfaceTrade, TradeState } from 'state/routing/types'
import { useTradeFromLocalRouter } from 'state/routing/localrouter/useTradeFromLocalRouter'

import useAutoRouterSupported from './useAutoRouterSupported'
import useDebounce from './useDebounce'
import useIsWindowVisible from './useIsWindowVisible'

/**
 * Returns the best trade for a desired swap.
 * @param tradeType whether the swap is an exact in/out
 * @param amountSpecified the exact amount to swap in/out
 * @param otherCurrency the desired output/payment currency
 */
export function useBestMarketOrder(
  tradeType: TradeType,
  amountSpecified?: CurrencyAmount<Currency>,
  otherCurrency?: Currency
): {
  state: TradeState
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
} {
  const autoRouterSupported = useAutoRouterSupported()
  const isWindowVisible = useIsWindowVisible()

  const [debouncedAmount, debouncedOtherCurrency] = useDebounce(
    useMemo(() => [amountSpecified, otherCurrency], [amountSpecified, otherCurrency]),
    200
  )

  const trade = useTradeFromLocalRouter(
    tradeType,
    autoRouterSupported && isWindowVisible ? debouncedAmount : undefined,
    debouncedOtherCurrency,
    RouterPreference.API
  )

  return trade
}
