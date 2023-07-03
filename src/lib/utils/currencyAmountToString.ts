
import { Currency, CurrencyAmount, Percent, Price, Token, TradeType } from '@uniswap/sdk-core'
import { BigNumber } from '@ethersproject/bignumber'

export function currencyAmountToBigNumber(currencyAmount:CurrencyAmount<any> | undefined) {
  if(!currencyAmount) return undefined
  return BigNumber.from(currencyAmount.numerator.toString()).div(BigNumber.from(currencyAmount.denominator.toString()))
}

export function currencyAmountToString(currencyAmount:CurrencyAmount<any> | undefined) {
  if(!currencyAmount) return undefined
  return BigNumber.from(currencyAmount.numerator.toString()).div(BigNumber.from(currencyAmount.denominator.toString())).toString()
}
