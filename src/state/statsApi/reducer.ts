import { updateStatsApiStateData } from './actions'
import { createReducer } from '@reduxjs/toolkit'

export interface StatsApiState {
  readonly nucleusState: any
}

export const initialState: StatsApiState = {
  nucleusState: { loading: true }
}

export default createReducer(initialState, (builder) => {
  return builder
    .addCase(updateStatsApiStateData, (state, { payload: { apiResponse/*, networkId*/ } }) => {
      state.nucleusState = apiResponse
    })
})
