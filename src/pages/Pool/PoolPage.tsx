import { useWeb3React } from "@web3-react/core"
import styled from 'styled-components/macro'
import CenteringDiv from "components/centeringDiv"
import Loader from "components/Loader"
import { getChainInfo } from "constants/chainInfo"
import HydrogenNucleusHelper from "lib/utils/HydrogenNucleusHelper"
import TradePage from "pages/Trade"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDefaultsFromURLSearch } from "state/pool/hooks"
import { useNucleusState } from "state/statsApi/hooks"
import PoolCard from './PoolCard'
import LimitOrderPoolPage from './LimitOrderPoolPage'
import GridOrderPoolPage from './GridOrderPoolPage'
import { Currency, CurrencyAmount, Percent, Price, Token, TradeType } from '@uniswap/sdk-core'
import { Field, PriceField, PairState, DepositState, WithdrawState, PoolManagementState } from '../../state/poolManagement/actions'
import {
  useDerivedPoolManagementInfo,
  usePoolManagementActionHandlers,
  usePoolManagementState,
} from '../../state/poolManagement/hooks'
import { determinePairOrder } from './../Pool/determinePairOrder'
import { formatTransactionAmount, priceToPreciseFloat } from 'utils/formatNumbers'
import { useCurrencies, useCurrenciesAndNatives, useCurrency } from '../../hooks/Tokens'
import { deduplicateArray } from 'lib/utils/arrays'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { formatUnits, Interface } from 'ethers/lib/utils'
import { BigNumber } from '@ethersproject/bignumber'

export default function PoolPage() {
  const navigate = useNavigate()
  const { account, chainId } = useWeb3React()
  const loadedUrlParams = useDefaultsFromURLSearch()
  const nucleusState = useNucleusState() as any
  // swap state
  const currentState = usePoolManagementState()
  const { poolID } = currentState
  const { onChangePoolID } = usePoolManagementActionHandlers()

  // get poolID from url params
  const poolIDurl = useMemo(() => {
    const poolID = loadedUrlParams.poolid || loadedUrlParams.poolId || loadedUrlParams.poolID
    if(HydrogenNucleusHelper.poolIDisValid(poolID)) return poolID
    return undefined
  }, [loadedUrlParams])

  // if the poolID is invalid, redirect to /trade
  useEffect(() => {
    if(!poolIDurl) navigate('/trade/')
  }, [poolIDurl])

  // if the pool was recently created give the stats api some time to pick it up
  const [searching, setSearching] = useState(true)
  useEffect(() => {
    setTimeout(() => setSearching(false), 30000)
  }, [poolIDurl])

  const Loading = () => (
    <>
      <p style={{display:"inline", marginRight: "8px"}}>{`Loading pool ${poolIDurl}`}</p>
      <Loader/>
    </>
  )

  // if still fetching from stats api
  if(!nucleusState || !!nucleusState.loading) return <Loading/>

  async function onChangePoolIDWithDelay(poolIDurl:any) {
    async function _sleeper(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    await _sleeper(0);
    onChangePoolID(poolIDurl)
  }
  if(poolID != poolIDurl) {
    onChangePoolIDWithDelay(poolIDurl)
    return <Loading/>
  }

  const pool = nucleusState?.pools[poolID]
  const balances = nucleusState?.internalBalancesByPool[poolID]

  // if pool not known to stats api
  if(!pool || !balances) {
    // if still in buffer time
    if(searching) return <Loading/>
    // if time up
    else return (
      <>
        <CenteringDiv><p style={{margin:"4px"}}>{`PoolID ${poolID} does not exist on this network.`}</p></CenteringDiv>
        <CenteringDiv><p style={{margin:"0"}}>Check the poolID and try again.</p></CenteringDiv>
      </>
    )
  }

  return (
    poolID.substring(poolID.length-3) === "001" ? (
      <LimitOrderPoolPage/>
    ) : (
      <GridOrderPoolPage/>
    )
  )
}
