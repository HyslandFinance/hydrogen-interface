import { updateStatsApiStateData } from './actions'
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { AppState } from '../index'

export function useNucleusState(): AppState['statsApi'] {
  return useAppSelector((state) => state.statsApi.nucleusState)
}

export function useUpdateStatsApiState(): (apiResponse: any) => void {
  const dispatch = useAppDispatch()
  return useCallback((apiResponse: any) => dispatch(updateStatsApiStateData({ apiResponse })), [
    dispatch,
  ])
}
