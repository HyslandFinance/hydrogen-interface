import { createAction } from '@reduxjs/toolkit'

export enum Field {
  BASE_TOKEN = 'BASE_TOKEN',
  QUOTE_TOKEN = 'QUOTE_TOKEN',
}

export enum PriceField {
  BUY_PRICE = 'BUY_PRICE',
  SELL_PRICE = 'SELL_PRICE',
}

export interface PairState {
  readonly typedValueBuyPrice: string
  readonly typedValueSellPrice: string
  readonly [Field.BASE_TOKEN]: {
    readonly currencyId: string | undefined
  }
  readonly [Field.QUOTE_TOKEN]: {
    readonly currencyId: string | undefined
  }
}

export interface DepositState {
  readonly currencyId: string | undefined
  readonly typedAmount: string
}

export interface GridOrderState {
  readonly pairs: PairState[]
  readonly deposits: DepositState[]
  // the typed recipient address or ENS name, or null if swap should go to sender
  readonly recipient: string | null
}

//export const selectCurrency = createAction<{ pairIndex: number; field: Field; currencyId: string }>('GridOrder/selectCurrency')
export const selectCurrencies = createAction<{ pairIndex: number; currencyIdBase: string|undefined; currencyIdQuote: string|undefined }>('GridOrder/selectCurrencies')
export const typeInput = createAction<{ pairIndex: number; field: PriceField; typedValue: string }>('GridOrder/typeInput')
export const depositAmountInput = createAction<{ depositIndex: number; typedAmount: string }>('GridOrder/depositAmountInput')
/*
export const switchCurrencies = createAction<{ pairIndex: number }>('GridOrder/switchCurrencies')
export const addNewPair = createAction<void>('GridOrder/addNewPair')
export const clearGridOrderState = createAction<void>('GridOrder/clearGridOrderState')
export const replacePairState = createAction<{
  typedValueBuyPrice: string
  typedValueSellPrice: string
  inputCurrencyId?: string
  outputCurrencyId?: string
  pairIndex: number
}>('GridOrder/replacePairState')
export const setRecipient = createAction<{ recipient: string | null }>('GridOrder/setRecipient')
*/
export const replaceGridOrderState = createAction<{
  newState: GridOrderState
}>('GridOrder/replaceGridOrderState')
