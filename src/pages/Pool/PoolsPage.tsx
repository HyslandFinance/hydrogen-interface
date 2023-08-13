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
import { determinePairOrder } from './determinePairOrder'

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
  box-shadow: 0px 10px 24px 0px rgba(0, 0, 0, 0.15);
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

  const currencyIds = useMemo(() => {
    if(!poolIDs) return []
    return deduplicateArray(
      poolIDs
        .map((poolID:string) => {
          const pool = nucleusState.pools[poolID]
          const tokens = []
          for(const tokenA of Object.keys(pool.tradeRequests)) {
            tokens.push(tokenA)
            for(const tokenB of Object.keys(pool.tradeRequests[tokenA])) {
              tokens.push(tokenB)
            }
          }
          return tokens
        })
        .flat()
        .filter((x:any) => !!x)
    )
  }, [poolIDs, nucleusState]) as string[]

  const currencies = useCurrencies(currencyIds)
  const currenciesById = useMemo(() => {
    const d = {} as any
    if(!currencyIds || !currencies || currencyIds.length != currencies.length) return d
    for(let i = 0; i < currencies.length; i++) {
      if(!!currencyIds[i] && !!currencies[i]) d[currencyIds[i]] = currencies[i]
    }
    return d
  }, [currencyIds, currencies])

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

  //console.log("poolIDs:", poolIDs)

  function Hpt(props:any) {
    const { poolID } = props
    //const pool = nucleusState.pools[poolID]
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
    let cardbody:any = <></>
    try {
      cardbody = <LimitOrderCardBody poolID={poolID}/>
    } catch(e) {
      console.error("Error in LimitOrderCardBody:")
      console.error(e)
    }
    return (
      <Card isDarkMode={isDarkMode}>
        <div>
          <CenteringDiv>
            <CardTitleText>Limit Order Pool {poolID}</CardTitleText>
          </CenteringDiv>
        </div>
        <div>
          <CenteringDiv style={{position:"relative",top:"-10px"}}>
            {cardbody}
          </CenteringDiv>
        </div>
      </Card>
    )
  }

  function pairToExchangeRateContent(poolID:number, tokenAAddress:string, tokenBAddress: string) {
    try {
      const pool = nucleusState.pools[poolID]
      const tokenA = currenciesById[tokenAAddress]
      const tokenB = currenciesById[tokenBAddress]
      const symbolA = tokenA.tokenInfo.symbol
      const symbolB = tokenB.tokenInfo.symbol
      const decimalsA = tokenA.tokenInfo.decimals
      const decimalsB = tokenB.tokenInfo.decimals
      const [x1, x2] = HydrogenNucleusHelper.decodeExchangeRate(pool.tradeRequests[tokenAAddress][tokenBAddress].exchangeRate)
      const { amountAperB, amountBperA } = HydrogenNucleusHelper.calculateRelativeAmounts(x1, decimalsA, x2, decimalsB)
      const parsedAmountOneA = tryParseCurrencyAmount('1', tokenA)
      const parsedAmountOneB = tryParseCurrencyAmount('1', tokenB)
      const parsedAmountA = tryParseCurrencyAmount(formatUnits(amountAperB, decimalsA), tokenA)
      const parsedAmountB = tryParseCurrencyAmount(formatUnits(amountBperA, decimalsB), tokenB)
      const priceAperB = ((parsedAmountA && parsedAmountOneB) ? new Price(
        tokenA,
        tokenB,
        parsedAmountA?.quotient,
        parsedAmountOneB?.quotient,
      ) : undefined) as any
      const priceBperA = ((parsedAmountOneA && parsedAmountB) ? new Price(
        tokenB,
        tokenA,
        parsedAmountB?.quotient,
        parsedAmountOneA?.quotient,
      ) : undefined) as any

      if(!priceAperB || !priceBperA) return undefined

      const [tokenL, tokenR] = determinePairOrder(tokenAAddress, tokenBAddress)

      return (
        <div key={`${poolID}_${tokenAAddress}_${tokenBAddress}`}>
          <CenteringDiv>
            <p style={{margin:"0 0 0 0"}}>
              {/*`Sell ${symbolA} to buy ${symbolB}`*/}
              {tokenL == tokenAAddress
                ? `Sell ${symbolA} at 1 ${symbolA} = ${formatTransactionAmount(priceToPreciseFloat(priceBperA.invert()))} ${symbolB}`
                : `Buy ${symbolB} at 1 ${symbolB} = ${formatTransactionAmount(priceToPreciseFloat(priceAperB.invert()))} ${symbolA}`
              }
            </p>
          </CenteringDiv>
          {/*
          <CenteringDiv>
            <p style={{fontSize:"14px",margin:"0"}}>
              {`1 ${symbolA} = ${formatTransactionAmount(priceToPreciseFloat(priceBperA.invert()))} ${symbolB}`}
            </p>
          </CenteringDiv>
          <CenteringDiv>
            <p style={{fontSize:"14px",margin:"0"}}>
              {`1 ${symbolB} = ${formatTransactionAmount(priceToPreciseFloat(priceAperB.invert()))} ${symbolA}`}
            </p>
          </CenteringDiv>
          */}
        </div>
      )
    } catch(e) {
      return <></>
    }
  }

  function LimitOrderCardBody(props: any) {
    try {
      const { poolID } = props
      const pool = nucleusState.pools[poolID]
      const tokenAAddress = Object.keys(pool.tradeRequests)[0]
      const tokenBAddress = Object.keys(pool.tradeRequests[tokenAAddress])[0]
      const tokenA = currenciesById[tokenAAddress]
      const tokenB = currenciesById[tokenBAddress]
      if(!tokenA || !tokenA.tokenInfo) console.error("LimitOrderCardBody tokenA", tokenA)
      if(!tokenB || !tokenB.tokenInfo) console.error("LimitOrderCardBody tokenB", tokenB)
      const symbolA = tokenA.tokenInfo.symbol
      const symbolB = tokenB.tokenInfo.symbol
      const decimalsA = tokenA.tokenInfo.decimals
      const decimalsB = tokenB.tokenInfo.decimals
      const balances = nucleusState.internalBalancesByPool[poolID]
      const balanceA = BigNumber.from(balances[tokenAAddress])
      const exchangeRate = pool.tradeRequests[tokenAAddress][tokenBAddress].exchangeRate
      const balanceB = (HydrogenNucleusHelper.exchangeRateIsNonzero(exchangeRate)
        ? HydrogenNucleusHelper.calculateAmountB(balanceA, exchangeRate)
        : Zero)

      const exchangeRateContent = pairToExchangeRateContent(poolID, tokenAAddress, tokenBAddress)

      return (
        <div>
          {/* diagram */}
          <CenteringDiv style={{paddingTop:"40px"}}>
            <div style={{width:"160px", height:"40px", position:"relative"}}>
              <img src={`https://assets.hydrogendefi.xyz/tokens/${tokenAAddress}`} style={{width:"40px",height:"40px",position:"absolute",left:"0px",top:"0px"}} />
              <img src={ArrowLimitOrderWhite} style={{width:"40px",height:"20px",position:"absolute",left:"60px",top:"10px"}} />
              <img src={`https://assets.hydrogendefi.xyz/tokens/${tokenBAddress}`} style={{width:"40px",height:"40px",position:"absolute",left:"120px",top:"0px"}} />
            </div>
          </CenteringDiv>
          {/* exchange rates */}
          <div style={{marginTop:"20px"}}>
            {exchangeRateContent}
          </div>
          {/* balances */}
          {balanceA.gt(0) ? (
            <div style={{margin:"12px 0 0 0"}}>
              {/*
              <CenteringDiv>
                <p style={{margin:"0"}}>{`${formatTransactionAmount(parseFloat(formatUnits(balanceA, decimalsA)))} ${symbolA} /`}</p>
              </CenteringDiv>
              <CenteringDiv>
                <p style={{margin:"0"}}>{`${formatTransactionAmount(parseFloat(formatUnits(balanceB, decimalsB)))} ${symbolB} remaining`}</p>
              </CenteringDiv>
              */}
              <CenteringDiv>
                <p style={{margin:"0"}}>{`Remaining`}</p>
              </CenteringDiv>
              <CenteringDiv>
                <p style={{margin:"0"}}>{`${formatTransactionAmount(parseFloat(formatUnits(balanceA, decimalsA)))} ${symbolA} -> ${formatTransactionAmount(parseFloat(formatUnits(balanceB, decimalsB)))} ${symbolB}`}</p>
              </CenteringDiv>
            </div>
          ) : (
            <CenteringDiv style={{margin:"12px 0 0 0"}}>
              <p style={{margin:"0"}}>Order has been filled</p>
            </CenteringDiv>
          )}
        </div>
      )
    } catch(e) {
      return <></>
    }
  }

  function GridOrderCard(props: any) {
    const { poolID } = props
    let cardbody = <></>
    try {
      cardbody = <GridOrderCardBody poolID={poolID}/>
    } catch(e) {
      console.error("Error in GridOrderCardBody:")
      console.error(e)
    }
    return (
      <Card isDarkMode={isDarkMode}>
        <div>
          <CenteringDiv>
            <CardTitleText>Grid Order Pool {poolID}</CardTitleText>
          </CenteringDiv>
        </div>
        <div>
          <CenteringDiv style={{position:"relative",top:"-10px"}}>
            {cardbody}
          </CenteringDiv>
        </div>
      </Card>
    )
  }

  function GridOrderCardBody(props: any) {
    try {
      const { poolID } = props
      if(!nucleusState || !!nucleusState.loading || !nucleusState.pools || !nucleusState.internalBalancesByPool) return <></>
      const pool = nucleusState.pools[poolID]
      const tokenAs = Object.keys(pool.tradeRequests)

      const pairs = []
      for(const tokenAAddress of tokenAs) {
        for(const tokenBAddress of Object.keys(pool.tradeRequests[tokenAAddress])) {
          pairs.push({tokenAAddress, tokenBAddress})
        }
      }
      const exchangeRateContent = []
      for(let i = 0; i < pairs.length; i++) {
        exchangeRateContent.push(pairToExchangeRateContent(poolID, pairs[i].tokenAAddress, pairs[i].tokenBAddress))
        if(i < pairs.length-1) {
          exchangeRateContent.push(<div key={`spacer_${poolID}`} style={{height:"8px",display:"block"}}/>)
        }
      }

      const tokenAAddress = Object.keys(pool.tradeRequests)[0]
      const tokenBAddress = Object.keys(pool.tradeRequests[tokenAAddress])[0]

      const balances = nucleusState.internalBalancesByPool[poolID]
      tokenAs.reverse()
      const balanceAs = tokenAs.map(tokenAAddress => BigNumber.from(balances[tokenAAddress]))
      const poolHasTokens = balanceAs.some(bal => bal.gt(0))

      return (
        <div>
          {/* diagram */}
          <CenteringDiv style={{paddingTop:"40px"}}>
            <div style={{width:"160px", height:"120px", position:"relative"}}>
              {/*<div style={{height:"120px", width:"120px",backgroundColor:"#4444aa",position:"absolute",left:"0px",top:"0px"}}/>*/}
              <img src={ArrowGridOrderWhite} style={{width:"160px",height:"120px",position:"absolute",left:"0px",top:"0px"}} />
              <img src={`https://assets.hydrogendefi.xyz/tokens/${tokenBAddress}`} style={{width:"40px",height:"40px",position:"absolute",left:"0px",top:"0px"}} />
              <img src={`https://assets.hydrogendefi.xyz/tokens/${tokenAAddress}`} style={{width:"40px",height:"40px",position:"absolute",left:"120px",top:"80px"}} />
            </div>
          </CenteringDiv>
          {/* exchange rates */}
          <div style={{marginTop:"20px"}}>
            {exchangeRateContent}
          </div>
          {/* balances */}
          {poolHasTokens ? (
            <div style={{margin:"12px 0 0 0"}}>
              <CenteringDiv>
                <p style={{margin:"0"}}>Balances</p>
              </CenteringDiv>
              {tokenAs.map((addr:string,index:number) => {
                const balance = balanceAs[index]
                const token = currenciesById[addr]
                if(!token || !token.tokenInfo) console.error("GridOrderCardBody token", token)
                const symbol = token.tokenInfo.symbol
                const decimals = token.tokenInfo.decimals
                return (
                  <CenteringDiv key={addr}>
                    <p style={{margin:"0"}}>{`${formatTransactionAmount(parseFloat(formatUnits(balance, decimals)))} ${symbol}`}</p>
                  </CenteringDiv>
                )
              })}
            </div>
          ) : (
            <CenteringDiv style={{margin:"12px 0 0 0"}}>
              <p style={{margin:"0"}}>Pool has been emptied</p>
            </CenteringDiv>
          )}
        </div>
      )
    } catch(e) {
      return <></>
    }
  }

  function TokenInline(props: any) {
    const { address } = props
    const token = defaultTokens[address]
    if(!token || !token.tokenInfo) console.error("TokenInline token", token, defaultTokens, address)
    const symbol = token.tokenInfo.symbol
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
        <h1>Your Existing Orders</h1>
      </CenteringDiv>
      {/*<Hpt poolID={poolID} key={poolID}/>*/}
      {poolIDs.map((poolID:string) => (
        <PoolCard poolID={poolID} key={poolID}/>
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
