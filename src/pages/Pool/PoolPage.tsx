import { useWeb3React } from "@web3-react/core"
import CenteringDiv from "components/centeringDiv"
import Loader from "components/Loader"
import { getChainInfo } from "constants/chainInfo"
import HydrogenNucleusHelper from "lib/utils/HydrogenNucleusHelper"
import TradePage from "pages/Trade"
import { useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useDefaultsFromURLSearch } from "state/pool/hooks"
import { useNucleusState } from "state/statsApi/hooks"

export default function PoolPage() {
  const navigate = useNavigate()
  const { account, chainId } = useWeb3React()
  const loadedUrlParams = useDefaultsFromURLSearch()

  // get poolID from url params
  const poolID = useMemo(() => {
    const poolID = loadedUrlParams.poolid || loadedUrlParams.poolId || loadedUrlParams.poolID
    if(HydrogenNucleusHelper.poolIDisValid(poolID)) return poolID
    return undefined
  }, [loadedUrlParams])

  // if the poolID is invalid, redirect to /trade
  useEffect(() => {
    if(!poolID) navigate('/trade/')
  }, [poolID])

  /*
  // get action from url params
  const action = useMemo(() => {
    const action = loadedUrlParams.action || ''
    if(!action) return ''
    const actions = ['deposit', 'withdraw', 'adjust']
  }, [loadedUrlParams])
  */
  
  //console.log(getChainInfo(chainId), getChainInfo(chainId)?.label)

  const nucleusState = useNucleusState() as any
  //console.log("in pool management page", {nucleusState, poolID})
  //const pool = {}
  //const balances = {}

  if(nucleusState.loading) return <Loader/>

  const pool = nucleusState?.pools[poolID]
  const balances = nucleusState?.internalBalancesByPool[poolID]

  return (
    <CenteringDiv>
      <div style={{marginTop:"40px"}}>
        {/*<p>{`In PoolPage. Displaying poolID ${poolID}`}</p>*/}
        {nucleusState.loading
          ? (<Loader/>)
          : (poolID && pool && balances)
          ? (
            <>
              <CenteringDiv>
                <img src={`https://assets.hydrogendefi.xyz/hpt/${chainId}/${poolID}.svg`} alt={`hpt ${poolID}`}/>
              </CenteringDiv>
              {/*
              <pre>{`Pool:\n${JSON.stringify(pool, undefined, 2)}`}</pre>
              <pre>{`Balances:\n${JSON.stringify(balances, undefined, 2)}`}</pre>
              */}
              <CenteringDiv>
                <h2 style={{margin:"32px 0"}}>Pool management coming soon</h2>
              </CenteringDiv>
              <CenteringDiv>
                <a href={`${getChainInfo(chainId)?.analyticsLink}pools/${poolID}`} target="_blank" style={{textDecoration:"none"}}>
                  <p style={{margin:"0"}}>View pool analytics</p>
                </a>
              </CenteringDiv>
            </>
          ) : (
            <p>{`PoolID ${poolID} does not exist on this network.`}<br/>Check the poolID and try again.</p>
          )
        }
      </div>
    </CenteringDiv>
  )
}
