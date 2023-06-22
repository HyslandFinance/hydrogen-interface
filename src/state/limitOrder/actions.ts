import { createAction } from '@reduxjs/toolkit'

export enum Field {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

export const selectCurrency = createAction<{ field: Field; currencyId: string }>('limitOrder/selectCurrency')
export const switchCurrencies = createAction<void>('limitOrder/switchCurrencies')
export const typeInput = createAction<{ field: Field; typedValue: string }>('limitOrder/typeInput')
export const replaceLimitOrderState = createAction<{
  typedValueInput: string
  typedValueOutput: string
  inputCurrencyId?: string
  outputCurrencyId?: string
  recipient: string | null
}>('limitOrder/replaceLimitOrderState')
export const setRecipient = createAction<{ recipient: string | null }>('limitOrder/setRecipient')
