import { parseUnits } from '@ethersproject/units'
import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import JSBI from 'jsbi'

// an alternate implementation of tryParseCurrencyAmount
// for when `value` was calculated in raw js math so may have too many decimals of precision

/**
 * Parses a CurrencyAmount from the passed string.
 * Returns the CurrencyAmount, or undefined if parsing fails.
 */
export default function tryParseCurrencyAmount3<T extends Currency>(
  value?: string,
  currency?: T
): CurrencyAmount<T> | undefined {
  //console.log("tryParseCurrencyAmount3() 1", {value, currency, })
  if (!value || !currency) {
    return undefined
  }
  let val = value
  while(true) {
    try {
      const typedValueParsed = parseUnits(val, currency.decimals).toString()
      //if (typedValueParsed !== '0') {
        //return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed))
      //}
      //console.log("tryParseCurrencyAmount3() 2", {val, currency, typedValueParsed })
      const parsedAmount = CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed))
      //console.log("tryParseCurrencyAmount3() 3", {val, currency, typedValueParsed, parsedAmount})
      return parsedAmount
    } catch (error) {
      // fails if the user specifies too many decimal places of precision (or maybe exceed max uint?)
      //console.debug(`Failed to parse input amount: "${value}"`, error)
    }
    val = val.substring(0, val.length-1)
  }
  return undefined
}
