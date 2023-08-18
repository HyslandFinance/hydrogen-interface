import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components/macro'
import { PageWrapper } from '../../components/swap/styleds'
import { useIsDarkMode } from 'state/user/hooks'
import { useWeb3React } from '@web3-react/core'
import { useNucleusState } from 'state/statsApi/hooks'
import CenteringDiv from 'components/centeringDiv'
import Loader from 'components/Loader'
import { useAllTokens, useCurrencies } from 'hooks/Tokens'
import ArrowLimitOrderWhite from '../../assets/images/arrow-limit-order-white2.png'
import ArrowGridOrderWhite from '../../assets/images/arrow-grid-order-white2.png'
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { formatUnits } from 'ethers/lib/utils'
import { deduplicateArray } from 'lib/utils/arrays'
import { currencyAmountToString } from 'lib/utils/currencyAmountToString'
import { Price } from '@uniswap/sdk-core'
import TradePrice from 'components/swap/TradePrice'
import { formatTransactionAmount, priceToPreciseFloat } from 'utils/formatNumbers'
import { BigNumber } from '@ethersproject/bignumber'
import { Zero } from '@ethersproject/constants'
import PoolCard from './PoolCard'
import PoolCardInListContainer from './PoolCardInListContainer'

export default function PoolsPage() {
  const isDarkMode = useIsDarkMode()
  const navigate = useNavigate()
  const { account, chainId } = useWeb3React()
  const nucleusState = useNucleusState() as any
  const defaultTokens = useAllTokens() as any

  const poolIDs = useMemo(() => {
    if(!nucleusState || nucleusState.loading || !account || !chainId) return undefined
    return Object.keys(nucleusState.pools).filter((poolID:string) => {
      return (nucleusState.pools[poolID].owner == account)
    }).sort((a:string,b:string) => parseInt(b)-parseInt(a))
  }, [account, chainId, nucleusState])

  if(!chainId || !nucleusState || nucleusState.loading) return <Loader/>

  if(!account) return (
    <CenteringDiv>
      <div>
        <h3>Connect wallet to view your pools</h3>
        <div style={{marginTop:"20px"}}>
          <CenteringDiv>
            <h3>Or</h3>
          </CenteringDiv>
          <CenteringDiv>
            <Link to={'/trade'} style={{textDecoration:"none"}}>
              Place new order
            </Link>
          </CenteringDiv>
        </div>
      </div>
    </CenteringDiv>
  )

  if(!poolIDs || poolIDs.length == 0) return (
    <>
      <CenteringDiv>
        <h3>No pools owned by {account}</h3>
      </CenteringDiv>
      <CenteringDiv>
        <Link to={'/trade'} style={{textDecoration:"none"}}>
          <p>Place new order</p>
        </Link>
      </CenteringDiv>
    </>
  )

  return (
    <div>
      <CenteringDiv>
        <h1>Your Existing Orders</h1>
      </CenteringDiv>
      {poolIDs.map((poolID:string) => (
        <PoolCardInListContainer poolID={poolID} key={poolID}/>
      ))}
      <div style={{marginTop:"20px"}}>
        <CenteringDiv>
          <h3>Or</h3>
        </CenteringDiv>
        <CenteringDiv>
          <Link to={'/trade'} style={{textDecoration:"none"}}>
            Place new order
          </Link>
        </CenteringDiv>
      </div>
    </div>
  )
}
