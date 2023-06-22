import { Currency, CurrencyAmount, Fraction, NativeCurrency, Percent, Price, Token, TradeType } from '@uniswap/sdk-core'
import { BIG_INT_ZERO, BIG_INT_ONE } from './../../constants/misc'

import invariant from 'tiny-invariant'

export class HydrogenLimitOrder<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType> {
  public readonly route: any
  public readonly tradeType: TTradeType
  public readonly orderType: string
  private _outputAmount: CurrencyAmount<TOutput> | undefined
  private _inputAmount: CurrencyAmount<TInput> | undefined

  /**
   * The swaps of the trade, i.e. which paths and how much is swapped in each that
   * make up the trade. May consist of swaps in v2 or v3.
   */
  public readonly swaps: {
    path: any//IRoute<TInput, TOutput, Pair | Pool>
    inputAmount: CurrencyAmount<TInput>
    outputAmount: CurrencyAmount<TOutput>
  }[]

  public constructor(
    amountInput: CurrencyAmount<NativeCurrency | Token> | undefined,//CurrencyAmount<Currency>,
    amountOutput: CurrencyAmount<NativeCurrency | Token> | undefined
  ) {
    this.orderType = "LimitOrder"
    this.swaps = []
    this.route = []
    this.tradeType = TradeType.EXACT_INPUT as TTradeType
    this._inputAmount = amountInput as CurrencyAmount<TInput>
    this._outputAmount = amountOutput as CurrencyAmount<TOutput>
  }

  public get inputAmount(): CurrencyAmount<TInput> {
    return this._inputAmount as CurrencyAmount<TInput>
  }

  public get outputAmount(): CurrencyAmount<TOutput> {
    return this._outputAmount as CurrencyAmount<TOutput>
  }

  private _executionPrice: Price<TInput, TOutput> | undefined

  /**
   * The price expressed in terms of output amount/input amount.
   */
  public get executionPrice(): Price<TInput, TOutput> {
    return (
      this._executionPrice ??
      (this._executionPrice = new Price(
        this.inputAmount.currency,
        this.outputAmount.currency,
        this.inputAmount.quotient,
        this.outputAmount.quotient
      ))
    )
  }

  /**
   * The cached result of the price impact computation
   * @private
   */
  private _priceImpact: Percent | undefined
  /**
   * Returns the percent difference between the route's mid price and the price impact
   */
  public get priceImpact(): Percent {
    if (this._priceImpact) {
      return this._priceImpact
    }

    this._priceImpact = new Percent(0, 1)
    // doesnt apply the same in orderbook as liquidity pool

    return this._priceImpact
  }

  /**
   * Get the minimum amount that must be received from this trade for the given slippage tolerance
   * @param slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade
   * @returns The amount out
   */
  public minimumAmountOut(slippageTolerance: Percent, amountOut = this.outputAmount): CurrencyAmount<TOutput> {
    invariant(!slippageTolerance.lessThan(BIG_INT_ZERO), 'SLIPPAGE_TOLERANCE')
    if (this.tradeType === TradeType.EXACT_OUTPUT) {
      return amountOut
    } else {
      const slippageAdjustedAmountOut = new Fraction(BIG_INT_ONE)
        .add(slippageTolerance)
        .invert()
        .multiply(amountOut.quotient).quotient
      return CurrencyAmount.fromRawAmount(amountOut.currency, slippageAdjustedAmountOut)
    }
  }

  /**
   * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
   * @param slippageTolerance The tolerance of unfavorable slippage from the execution price of this trade
   * @returns The amount in
   */
  public maximumAmountIn(slippageTolerance: Percent, amountIn = this.inputAmount): CurrencyAmount<TInput> {
    invariant(!slippageTolerance.lessThan(BIG_INT_ZERO), 'SLIPPAGE_TOLERANCE')
    if (this.tradeType === TradeType.EXACT_INPUT) {
      return amountIn
    } else {
      const slippageAdjustedAmountIn = new Fraction(BIG_INT_ONE).add(slippageTolerance).multiply(amountIn.quotient).quotient
      return CurrencyAmount.fromRawAmount(amountIn.currency, slippageAdjustedAmountIn)
    }
  }

  /**
   * Return the execution price after accounting for slippage tolerance
   * @param slippageTolerance the allowed tolerated slippage
   * @returns The execution price
   */
  public worstExecutionPrice(slippageTolerance: Percent): Price<TInput, TOutput> {
    return new Price(
      this.inputAmount.currency,
      this.outputAmount.currency,
      this.maximumAmountIn(slippageTolerance).quotient,
      this.minimumAmountOut(slippageTolerance).quotient
    )
  }
}
