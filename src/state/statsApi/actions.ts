import { createAction } from '@reduxjs/toolkit'

export const updateStatsApiStateData = createAction<{ apiResponse: any; }>('statsApi/updateStateData')
