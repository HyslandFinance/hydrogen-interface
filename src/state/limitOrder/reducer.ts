import { createReducer } from '@reduxjs/toolkit'
import { parsedQueryString } from 'hooks/useParsedQueryString'

import { Field, replaceLimitOrderState, selectCurrency, setRecipient, switchCurrencies, typeInput } from './actions'
import { queryParametersToLimitOrderState } from './hooks'

export interface LimitOrderState {
  readonly typedValueInput: string
  readonly typedValueOutput: string
  readonly [Field.INPUT]: {
    readonly currencyId: string | undefined | null
  }
  readonly [Field.OUTPUT]: {
    readonly currencyId: string | undefined | null
  }
  // the typed recipient address or ENS name, or null if swap should go to sender
  readonly recipient: string | null
}

const initialState: LimitOrderState = queryParametersToLimitOrderState(parsedQueryString())

export default createReducer<LimitOrderState>(initialState, (builder) =>
  builder
    .addCase(
      replaceLimitOrderState,
      (state, { payload: { typedValueInput, typedValueOutput, recipient, inputCurrencyId, outputCurrencyId } }) => {
        return {
          [Field.INPUT]: {
            currencyId: inputCurrencyId ?? null,
          },
          [Field.OUTPUT]: {
            currencyId: outputCurrencyId ?? null,
          },
          typedValueInput,
          typedValueOutput,
          recipient,
        }
      }
    )
    .addCase(selectCurrency, (state, { payload: { currencyId, field } }) => {
      const otherField = field === Field.INPUT ? Field.OUTPUT : Field.INPUT
      if (currencyId === state[otherField].currencyId) {
        // the case where we have to swap the order
        return {
          ...state,
          [field]: { currencyId },
          [otherField]: { currencyId: state[field].currencyId },
        }
      } else {
        // the normal case
        return {
          ...state,
          [field]: { currencyId },
        }
      }
    })
    .addCase(switchCurrencies, (state) => {
      return {
        ...state,
        typedValueInput: state.typedValueOutput,
        typedValueOutput: state.typedValueInput,
        [Field.INPUT]: { currencyId: state[Field.OUTPUT].currencyId },
        [Field.OUTPUT]: { currencyId: state[Field.INPUT].currencyId },
      }
    })
    .addCase(typeInput, (state, { payload: { field, typedValue } }) => {
      let newState = { ...state }
      if(field == Field.INPUT) newState.typedValueInput = typedValue
      else newState.typedValueOutput = typedValue
      return newState
    })
    .addCase(setRecipient, (state, { payload: { recipient } }) => {
      state.recipient = recipient
    })
)
