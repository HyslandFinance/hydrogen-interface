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

export interface LimitOrderState {
  readonly currencyIdA: string | undefined
  readonly currencyIdB: string | undefined
  readonly typedValueBuyPrice: string
  readonly typedValueSellPrice: string
  readonly direction: string
}

export interface DepositState {
  readonly currencyId: string | undefined
  readonly typedAmount: string
}

export interface WithdrawState {
  readonly currencyId: string | undefined
  readonly typedAmount: string
}

export interface PoolManagementState {
  readonly poolID: string
  readonly deposits: DepositState[]
  readonly withdraws: WithdrawState[]
  readonly pairs: PairState[]
  readonly pairsOriginal: PairState[]
  readonly limitOrder: LimitOrderState
  readonly limitOrderOriginal: LimitOrderState
  // the typed recipient address or ENS name, or null if swap should go to sender
  readonly recipient: string | null
}

export const selectCurrencies = createAction<{ pairIndex: number; currencyIdBase: string|undefined; currencyIdQuote: string|undefined }>('PoolManagement/selectCurrencies')
export const typeInput = createAction<{ pairIndex: number; field: PriceField; typedValue: string }>('PoolManagement/typeInput')
export const depositAmountInput = createAction<{ depositIndex: number; typedAmount: string }>('PoolManagement/depositAmountInput')
export const withdrawAmountInput = createAction<{ withdrawIndex: number; typedAmount: string }>('PoolManagement/withdrawAmountInput')
/*
export const switchCurrencies = createAction<{ pairIndex: number }>('PoolManagement/switchCurrencies')
export const addNewPair = createAction<void>('PoolManagement/addNewPair')
export const clearPoolManagementState = createAction<void>('PoolManagement/clearPoolManagementState')
export const replacePairState = createAction<{
  typedValueBuyPrice: string
  typedValueSellPrice: string
  inputCurrencyId?: string
  outputCurrencyId?: string
  pairIndex: number
}>('PoolManagement/replacePairState')
export const setRecipient = createAction<{ recipient: string | null }>('PoolManagement/setRecipient')
*/
export const replacePoolManagementState = createAction<{
  newState: PoolManagementState
}>('PoolManagement/replacePoolManagementState')
export const clearPoolManagementState = createAction<{}>('PoolManagement/clearPoolManagementState')
//export const changePoolID = createAction<{}>('PoolManagement/changePoolID')
