import { Currency, CurrencyAmount, NativeCurrency, Token, TradeType } from '@uniswap/sdk-core'
import { useMemo } from 'react'
import { HydrogenLimitOrder } from 'state/routing/HydrogenLimitOrder'
import { InterfaceTrade, TradeState } from 'state/routing/types'

/**
 * Returns the trade for a desired limit order.
 * @param amountInput the exact amount to swap in
 * @param amountOutput the exact amount to swap out
 */
export function useBestLimitOrder(
  amountInput: CurrencyAmount<NativeCurrency | Token> | undefined,
  amountOutput: CurrencyAmount<NativeCurrency | Token> | undefined
): {
  state: TradeState
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
} {
  return useMemo(() => {
    if(!amountInput || !amountOutput) return {
      state: TradeState.INVALID,
      trade: undefined
    }
    return {
      state: TradeState.VALID,
      trade: new HydrogenLimitOrder(amountInput, amountOutput) as any as InterfaceTrade<Currency, Currency, TradeType>
    }
  }, [amountInput, amountOutput])
}
