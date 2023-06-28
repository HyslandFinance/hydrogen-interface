import { useUpdateStatsApiState } from './hooks'
import { useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import { HttpClient } from './HttpClient'

export default function Updater(): null {
  const { chainId } = useWeb3React()

  const updateStatsApiState = useUpdateStatsApiState()
  const httpClient = new HttpClient()

  function updateFunction() {
    if(!chainId) return
    //console.log("in updateFunction()", new Date())
    const stateUrl = `https://stats.hydrogendefi.xyz/state/?chainID=${chainId}`
    httpClient.get(stateUrl, false).then((nucleusState:any) => {
      nucleusState.chainId = chainId
      //console.log({nucleusState})
      updateStatsApiState(nucleusState)
    })
  }

  useEffect(() => {
    updateFunction()
    const interval = setInterval(updateFunction, 30000)
    return () => clearInterval(interval)
  }, [chainId])

  return null
}
