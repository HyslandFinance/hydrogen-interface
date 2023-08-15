import { Currency } from '@uniswap/sdk-core'

export function currencyId(currency: Currency): string {
  //if (currency.isNative) return 'ETH'
  if (currency.isNative) {
    try {
      const c1 = currency as any
      //const c2 = c1.wrapped || c1
      const c2 = c1
      const c3 = c2.tokenInfo || c2
      const sym = c3.symbol
      if(sym) return sym
    } catch(e) {}
  }
  if (currency.isToken) return currency.address
  throw new Error('invalid currency')
}
