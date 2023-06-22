import { Currency, CurrencyAmount, Token, TradeType } from '@uniswap/sdk-core'

import { GetQuoteResult, InterfaceTrade, V2PoolInRoute, V3PoolInRoute } from './types'
import { HydrogenMarketOrder } from './HydrogenMarketOrder'

/**
 * Transforms a Routing API quote into an array of routes that can be used to create
 * a `Trade`.
 */
export function computeRoutes(
  currencyIn: Currency | undefined,
  currencyOut: Currency | undefined,
  tradeType: TradeType,
  quoteResult: GetQuoteResult | undefined
) {
  if (!quoteResult || !quoteResult.paths || !quoteResult.paths.length || !currencyIn || !currencyOut) return undefined

  const paths = quoteResult.paths
  if (paths.length === 0) return []
  const [rawAmountIn, rawAmountOut] = (quoteResult.swapType == "exactIn"
    ? [quoteResult.amount, quoteResult.quote]
    : [quoteResult.quote, quoteResult.amount]
  )
  try {
    return [{
      hydrogenRoute: quoteResult,
      inputAmount: CurrencyAmount.fromRawAmount(currencyIn, rawAmountIn),
      outputAmount: CurrencyAmount.fromRawAmount(currencyOut, rawAmountOut),
    }]
  } catch (e) {
    // `Route` constructor may throw if inputs/outputs are temporarily out of sync
    // (RTK-Query always returns the latest data which may not be the right inputs/outputs)
    // This is not fatal and will fix itself in future render cycles
    console.error(e)
    return undefined
  }
}

export function transformRoutesToTrade<TTradeType extends TradeType>(
  paths: any[],
  tradeType: TTradeType,
  blockNumber?: string | null,
  gasUseEstimateUSD?: CurrencyAmount<Token> | null
): HydrogenMarketOrder<Currency, Currency, TTradeType> {
  const trade = new HydrogenMarketOrder({
    paths,
    tradeType,
    gasUseEstimateUSD,
    blockNumber,
  })
  return trade
}
