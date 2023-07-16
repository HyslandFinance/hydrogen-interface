import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components/macro'
import { PageWrapper } from '../../components/swap/styleds'
import { useIsDarkMode } from 'state/user/hooks'
import { useWeb3React } from '@web3-react/core'
import { useNucleusState } from 'state/statsApi/hooks'
import CenteringDiv from 'components/centeringDiv'
import Loader from 'components/Loader'
import { useAllTokens } from 'hooks/Tokens'

const HptWrapper = styled.div`
  margin: 1em;
`

const ImageWrapper = styled(CenteringDiv)`
`

const HptImage = styled.img`
  width: 350px;
  height: 350px;
  :hover {
    opacity: 80%;
    cursor: pointer;
  }
`

const CardContainer = styled(CenteringDiv)`
  margin-top: 20px;
`

const Card = styled.div<{ isDarkMode: boolean }>`
  padding: 20px;
  min-width: 350px;
  border-radius: 24px;
  color: ${({ theme }) => theme.textPrimary};
  text-decoration: none;
  background-color: ${({ isDarkMode, theme }) =>
    isDarkMode
      ? theme.backgroundModule
      : 'white'};
  border: 1px solid transparent;
  box-shadow: 0px 10px 24px 0px rgba(51, 53, 72, 0.04);
  transition: ${({ theme }) => `${theme.transition.duration.medium} ${theme.transition.timing.ease} border`};
  &:hover {
    border: 1px solid ${({ theme, isDarkMode }) => (isDarkMode ? theme.backgroundInteractive : theme.textTertiary)};
  }
`

const CardTitleText = styled.p`
  margin: 0;
  font-size: 20px;
`

const CardBodyText = styled.p`
  margin: 0;
`

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

  //console.log("poolsPage", {account, chainId, poolIDs, nucleusStateIsLoading: !nucleusState || !!nucleusState.loading})
  /*
  console.log("poolsPage", {
    pools: (poolIDs||[]).map((poolID:string) => nucleusState.pools[poolID]),
    defaultTokens,
  })
  */
  if(!chainId || !nucleusState || nucleusState.loading) return <Loader/>

  if(!account) return (
    <CenteringDiv>
      <h3>Connect wallet to view your pools</h3>
    </CenteringDiv>
  )

  if(!poolIDs || poolIDs.length == 0) return (
    <>
      <CenteringDiv>
        <h3>No pools owned by {account}</h3>
      </CenteringDiv>
      <CenteringDiv>
        <Link to={'/trade'} style={{textDecoration:"none"}}>
          <p>Place a new order</p>
        </Link>
      </CenteringDiv>
    </>
  )

  //console.log("poolIDs:", poolIDs)

  function Hpt(props:any) {
    const { poolID } = props
    //const pool = nucleusState.pools[poolID]
    //const balances = nucleusState.internalBalancesOfPool[poolID]
    return (
      <HptWrapper>
        <Link to={`/pool/?poolID=${poolID}`}>
          <ImageWrapper>
            <HptImage src={`https://assets.hydrogendefi.xyz/hpt/${chainId}/${poolID}.svg`} alt={`hpt ${poolID}`}/>
          </ImageWrapper>
        </Link>
      </HptWrapper>
    )
  }

  function PoolCard(props: any) {
    const { poolID } = props

    /*
    return poolID.substring(poolID.length-3) === "001" ? (
      <LimitOrderCardContent poolID={poolID}/>
    ) : (
      <GridOrderCardContent poolID={poolID}/>
    )
    */

    return (
      <CardContainer>
        <Link to={`/pool/?poolID=${poolID}`} style={{textDecoration:"none"}}>
          {poolID.substring(poolID.length-3) === "001" ? (
            <LimitOrderCard poolID={poolID}/>
          ) : (
            <GridOrderCard poolID={poolID}/>
          )}
        </Link>
      </CardContainer>
    )

  }

  function LimitOrderCard(props: any) {
    const { poolID } = props
    const pool = nucleusState.pools[poolID]
    const tokenAAddress = Object.keys(pool.tradeRequests)[0]
    const tokenBAddress = Object.keys(pool.tradeRequests[tokenAAddress])[0]
    return (
      <Card isDarkMode={isDarkMode}>
        <div>
          <CenteringDiv>
            <CardTitleText>Limit Order Pool {poolID}</CardTitleText>
          </CenteringDiv>
        </div>
        <div>
          <CenteringDiv style={{position:"relative",top:"-10px"}}>
            <CardBodyText>
              Trade
              <TokenInline address={tokenAAddress}/>
              {' for '}
              <TokenInline address={tokenBAddress}/>
            </CardBodyText>
          </CenteringDiv>
        </div>
      </Card>
    )
  }

  function GridOrderCard(props: any) {
    const { poolID } = props
    const pool = nucleusState.pools[poolID]
    //const balances = nucleusState.internalBalancesOfPool[poolID]
    const tokenAAddress = Object.keys(pool.tradeRequests)[0]
    const tokenBAddress = Object.keys(pool.tradeRequests[tokenAAddress])[0]
    return (
      <Card isDarkMode={isDarkMode}>
        <div>
          <CenteringDiv>
            <CardTitleText>Grid Order Pool {poolID}</CardTitleText>
          </CenteringDiv>
        </div>
        <div>
          <CenteringDiv style={{position:"relative",top:"-10px"}}>
            <CardBodyText>
              Trade
              <TokenInline address={tokenBAddress}/>
              {' and '}
              <TokenInline address={tokenAAddress}/>
            </CardBodyText>
          </CenteringDiv>
        </div>
      </Card>
    )
  }

  function TokenInline(props: any) {
    const { address } = props
    const symbol = defaultTokens[address].tokenInfo.symbol
    return (
      <span>
        <img src={`https://assets.hydrogendefi.xyz/tokens/${address}`} style={{height:"40px",width:"40px",display:"inline", margin:"10px",position:"relative",top:"20px"}}/>
        {symbol}
      </span>
    )
  }

  return (
    <div>
      <CenteringDiv>
        <h1>Modify Existing Orders</h1>
      </CenteringDiv>
      {/*<Hpt poolID={poolID} key={poolID}/>*/}
      {poolIDs.map((poolID:string) => (
        <PoolCard poolID={poolID} key={poolID}/>
      ))}
    </div>
  )
}
