import { createReducer } from '@reduxjs/toolkit'
import { parsedQueryString } from 'hooks/useParsedQueryString'

import { Field, PriceField, PairState, DepositState, WithdrawState, PoolManagementState, replacePoolManagementState, selectCurrencies, typeInput, depositAmountInput, withdrawAmountInput } from './actions'

const initialState: PoolManagementState = {
    pairs: [{
      typedValueBuyPrice: '',
      typedValueSellPrice: '',
      [Field.BASE_TOKEN]: { currencyId: undefined },
      [Field.QUOTE_TOKEN]: { currencyId: undefined },
    }],
    deposits: [],
    withdraws: [],
    recipient: null,
}

export default createReducer<PoolManagementState>(initialState, (builder) => (
  builder
    .addCase(
      replacePoolManagementState,
      (state, { payload: { newState } }) => {
        return newState
      }
    )
    .addCase(selectCurrencies, (state, { payload: { pairIndex, currencyIdBase, currencyIdQuote } }) => {
      const newState = JSON.parse(JSON.stringify(state))
      if(pairIndex >= newState.pairs.length) return newState
      newState.pairs[pairIndex][Field.BASE_TOKEN] = { currencyId: currencyIdBase }
      newState.pairs[pairIndex][Field.QUOTE_TOKEN] = { currencyId: currencyIdQuote }
      //verifyDepositsState(newState)
      return newState
    })
    .addCase(typeInput, (state, { payload: { pairIndex, field, typedValue } }) => {
      const newState = JSON.parse(JSON.stringify(state))
      if(pairIndex >= newState.pairs.length) return newState
      if(field == PriceField.BUY_PRICE) newState.pairs[pairIndex].typedValueBuyPrice = typedValue
      else newState.pairs[pairIndex].typedValueSellPrice = typedValue
      //verifyDepositsState(newState)
      return newState
    })
    .addCase(depositAmountInput, (state, { payload: { depositIndex, typedAmount } }) => {
      const newState = JSON.parse(JSON.stringify(state))
      if(depositIndex >= newState.deposits.length) return newState
      newState.deposits[depositIndex].typedAmount = typedAmount
      //verifyDepositsState(newState)
      return newState
    })
    .addCase(withdrawAmountInput, (state, { payload: { withdrawIndex, typedAmount } }) => {
      const newState = JSON.parse(JSON.stringify(state))
      if(withdrawIndex >= newState.withdraws.length) return newState
      newState.withdraws[withdrawIndex].typedAmount = typedAmount
      //verifyDepositsState(newState)
      return newState
    })
  )
)
/*
function verifyDepositsState(state: any) {
  // 0: reformat data
  const currenciesFromDepositsSet = {} as any
  const currenciesFromPairsSet = {} as any
  for(const deposit of state.deposits) {
    if(deposit.currencyId) currenciesFromDepositsSet[deposit.currencyId] = true
  }
  for(const pair of state.pairs) {
    if(pair.BASE_TOKEN.currencyId) currenciesFromPairsSet[pair.BASE_TOKEN.currencyId] = true
    if(pair.QUOTE_TOKEN.currencyId) currenciesFromPairsSet[pair.QUOTE_TOKEN.currencyId] = true
  }
  // 1: every token in the deposits list must be included in at least one pair
  for(let depositIndex = 0; depositIndex < state.deposits.length; depositIndex++) {
    const currencyId = state.deposits[depositIndex].currencyId
    if(!currenciesFromPairsSet[currencyId]) {
      state.deposits.splice(depositIndex, 1)
      depositIndex--
    }
  }
  // 2: every token in each pair must be in the deposits list
  for(const currencyId of Object.keys(currenciesFromPairsSet)) {
    if(!currenciesFromDepositsSet[currencyId]) state.deposits.push({
      currencyId: currencyId,
      typedAmount: '',
    })
  }
  // 3: no duplicates and no undefined in the deposits list
  const currenciesFromDepositsSet2 = {} as any
  for(let depositIndex = 0; depositIndex < state.deposits.length; depositIndex++) {
    const currencyId = state.deposits[depositIndex].currencyId
    if(!currencyId || currenciesFromDepositsSet2[currencyId]) {
      state.deposits.splice(depositIndex, 1)
      depositIndex--
    }
    currenciesFromDepositsSet2[currencyId] = true
  }
  // 4: max 20 tokens
  if(state.deposits.length > 20) throw new Error("max 20 tokens") // todo: add a precheck somewhere else
  // 5: no return. modified the state object passed in
}
*/
