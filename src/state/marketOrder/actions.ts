import { createAction } from '@reduxjs/toolkit'

export enum Field {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

export const selectCurrency = createAction<{ field: Field; currencyId: string }>('marketOrder/selectCurrency')
export const switchCurrencies = createAction<void>('marketOrder/switchCurrencies')
export const typeInput = createAction<{ field: Field; typedValue: string }>('marketOrder/typeInput')
export const replaceMarketOrderState = createAction<{
  field: Field
  typedValue: string
  inputCurrencyId?: string
  outputCurrencyId?: string
  recipient: string | null
}>('marketOrder/replaceMarketOrderState')
export const setRecipient = createAction<{ recipient: string | null }>('marketOrder/setRecipient')
