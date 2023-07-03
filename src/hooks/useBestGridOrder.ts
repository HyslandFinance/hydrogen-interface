import { Currency, CurrencyAmount, NativeCurrency, Token, TradeType } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { PairState } from 'state/gridOrder/actions'
import { HydrogenGridOrder } from 'state/routing/HydrogenGridOrder'
import { InterfaceTrade, TradeState } from 'state/routing/types'

/**
 * Returns the trade for a desired grid order.
 * @param amountInput the exact amount to swap in
 * @param amountOutput the exact amount to swap out
 */
export function useBestGridOrder(
  pairs: PairState[],
  depositAmounts: (CurrencyAmount<NativeCurrency | Token> | undefined)[]
): {
  state: TradeState
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
} {
  return useMemo(() => {
    try {
      const trade = new HydrogenGridOrder(pairs, depositAmounts) as any as InterfaceTrade<Currency, Currency, TradeType>
      return {
        state: TradeState.VALID,
        trade: trade
      }
    } catch(e) {
      return {
        state: TradeState.INVALID,
        trade: undefined
      }
    }
  }, [pairs, depositAmounts])
}
