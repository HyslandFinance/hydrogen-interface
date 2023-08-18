import { parseUnits } from '@ethersproject/units'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

/**
 * Parses a CurrencyAmount from the passed string.
 * Returns the CurrencyAmount, or undefined if parsing fails.
 */
export default function tryParseCurrencyAmount2<T extends Currency>(
  value?: string,
  currency?: T
): CurrencyAmount<T> | undefined {
  //console.log("tryParseCurrencyAmount2() 1", {value, currency, })
  if (!value || !currency) {
    return undefined
  }
  try {
    const typedValueParsed = parseUnits(value, currency.decimals).toString()
    //if (typedValueParsed !== '0') {
      //return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed))
    //}
    const parsedAmount = CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed))
    //console.log("tryParseCurrencyAmount2() 2", {value, currency, typedValueParsed, parsedAmount})
    return parsedAmount
  } catch (error) {
    // fails if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.debug(`Failed to parse input amount: "${value}"`, error)
  }
  return undefined
}
