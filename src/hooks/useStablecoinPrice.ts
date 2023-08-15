import { Currency, CurrencyAmount, Price, Token, TradeType } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { useMemo, useRef } from 'react'
import { RouterPreference } from 'state/routing/slice'
import { useTradeFromLocalRouter } from 'state/routing/localrouter/useTradeFromLocalRouter'

import { SupportedChainId } from '../constants/chains'
import { CUSD_CELO, DAI_OPTIMISM, USDC_ARBITRUM_ONE, USDC_ETHEREUM, USDC_POLYGON, USDC_GOERLI, USDC_BASE, USDC_BASE_GOERLI, USDC_POLYGON_MUMBAI } from '../constants/tokens'

// Stablecoin amounts used when calculating spot price for a given currency.
// The amount is large enough to filter low liquidity pairs.
const STABLECOIN_AMOUNT_OUT: { [chainId: number]: CurrencyAmount<Token> } = {
  [SupportedChainId.ETHEREUM]: CurrencyAmount.fromRawAmount(USDC_ETHEREUM, 100_000e6),
  [SupportedChainId.ARBITRUM_ONE]: CurrencyAmount.fromRawAmount(USDC_ARBITRUM_ONE, 10_000e6),
  [SupportedChainId.OPTIMISM]: CurrencyAmount.fromRawAmount(DAI_OPTIMISM, 10_000e18),
  [SupportedChainId.POLYGON]: CurrencyAmount.fromRawAmount(USDC_POLYGON, 10_000e6),
  [SupportedChainId.CELO]: CurrencyAmount.fromRawAmount(CUSD_CELO, 10_000e18),
  [SupportedChainId.GOERLI]: CurrencyAmount.fromRawAmount(USDC_GOERLI, 1_000e6),
  [SupportedChainId.BASE]: CurrencyAmount.fromRawAmount(USDC_BASE, 1_000e6), // todo: increase
  [SupportedChainId.BASE_GOERLI]: CurrencyAmount.fromRawAmount(USDC_BASE_GOERLI, 1_000e6), // todo: increase
  [SupportedChainId.POLYGON_MUMBAI]: CurrencyAmount.fromRawAmount(USDC_POLYGON_MUMBAI, 1_000e6),
}

/**
 * Returns the price in USDC of the input currency
 * @param currency currency to compute the USDC price of
 */
export default function useStablecoinPrice(currency?: Currency): Price<Currency, Token> | undefined {
  const chainId = currency?.chainId

  const amountOut = chainId ? STABLECOIN_AMOUNT_OUT[chainId] : undefined
  const stablecoin = amountOut?.currency

  const { trade } = useTradeFromLocalRouter(TradeType.EXACT_OUTPUT, amountOut, currency, RouterPreference.API, false)

  const price = useMemo(() => {
    if (!currency || !stablecoin) {
      return undefined
    }

    // handle usdc
    if (currency?.wrapped.equals(stablecoin)) {
      return new Price(stablecoin, stablecoin, '1', '1')
    }

    if (trade) {
      const frac = trade.outputAmount.divide(trade.inputAmount)
      const numerator = frac.numerator
      const denominator = frac.denominator
      return new Price(currency, stablecoin, denominator, numerator)
    }

    return undefined
  }, [currency, stablecoin, trade])

  const lastPrice = useRef(price)
  if (!price || !lastPrice.current || !price.equalTo(lastPrice.current)) {
    lastPrice.current = price
  }
  return lastPrice.current
}

export function useStablecoinValue(currencyAmount: CurrencyAmount<Currency> | undefined | null) {
  const price = useStablecoinPrice(currencyAmount?.currency)

  return useMemo(() => {
    if (!price || !currencyAmount) return null
    try {
      return price.quote(currencyAmount)
    } catch (error) {
      return null
    }
  }, [currencyAmount, price])
}

/**
 *
 * @param fiatValue string representation of a USD amount
 * @returns CurrencyAmount where currency is stablecoin on active chain
 */
export function useStablecoinAmountFromFiatValue(fiatValue: string | null | undefined) {
  const { chainId } = useWeb3React()
  const stablecoin = chainId ? STABLECOIN_AMOUNT_OUT[chainId]?.currency : undefined

  return useMemo(() => {
    if (fiatValue === null || fiatValue === undefined || !chainId || !stablecoin) {
      return undefined
    }

    // trim for decimal precision when parsing
    const parsedForDecimals = parseFloat(fiatValue).toFixed(stablecoin.decimals).toString()
    try {
      // parse USD string into CurrencyAmount based on stablecoin decimals
      return tryParseCurrencyAmount(parsedForDecimals, stablecoin)
    } catch (error) {
      return undefined
    }
  }, [chainId, fiatValue, stablecoin])
}
