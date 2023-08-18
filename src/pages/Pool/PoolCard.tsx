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
  box-shadow: 0px 10px 24px 0px rgba(0, 0, 0, 0.15);
`

const CardTitleText = styled.p`
  margin: 0;
  font-size: 20px;
`

const CardBodyText = styled.p`
  margin: 0;
`

export default function PoolCard(props:any) {
  const isDarkMode = useIsDarkMode()
  const navigate = useNavigate()
  const { account, chainId } = useWeb3React()
  const nucleusState = useNucleusState() as any
  const defaultTokens = useAllTokens() as any
  const { poolID, } = props

  const currencyIds = useMemo(() => {
    if(!poolID) return []
    const pool = nucleusState.pools[poolID]
    const tokens = []
    for(const tokenA of Object.keys(pool.tradeRequests)) {
      tokens.push(tokenA)
      for(const tokenB of Object.keys(pool.tradeRequests[tokenA])) {
        tokens.push(tokenB)
      }
    }
    return deduplicateArray(tokens.filter((x:any) => !!x))
  }, [poolID, nucleusState]) as string[]

  const currencies = useCurrencies(currencyIds)
  const currenciesById = useMemo(() => {
    const d = {} as any
    if(!currencyIds || !currencies || currencyIds.length != currencies.length) return d
    for(let i = 0; i < currencies.length; i++) {
      if(!!currencyIds[i] && !!currencies[i]) d[currencyIds[i]] = currencies[i]
    }
    return d
  }, [currencyIds, currencies])

  if(!chainId || !nucleusState || nucleusState.loading) return <Loader/>

  function pairToExchangeRateContent(poolID:number, tokenAAddress:string, tokenBAddress: string) {
    try {
      const pool = nucleusState.pools[poolID]
      const curA = currenciesById[tokenAAddress]
      const curB = currenciesById[tokenBAddress]
      const tokenA = curA.tokenInfo || curA
      const tokenB = curB.tokenInfo || curB
      const symbolA = tokenA.symbol
      const symbolB = tokenB.symbol
      const decimalsA = tokenA.decimals
      const decimalsB = tokenB.decimals
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
              {tokenL == tokenAAddress
                ? `Sell ${symbolA} at 1 ${symbolA} = ${formatTransactionAmount(priceToPreciseFloat(priceBperA.invert()))} ${symbolB}`
                : `Buy ${symbolB} at 1 ${symbolB} = ${formatTransactionAmount(priceToPreciseFloat(priceAperB.invert()))} ${symbolA}`
              }
            </p>
          </CenteringDiv>
        </div>
      )
    } catch(e) {
      return <></>
    }
  }

  function Hpt(props:any) {
    const { poolID } = props
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

  function LimitOrderCard() {
    let cardbody:any = <></>
    try {
      cardbody = <LimitOrderCardBody/>
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

  function LimitOrderCardBody() {
    try {
      const pool = nucleusState.pools[poolID]
      const tokenAAddress = Object.keys(pool.tradeRequests)[0]
      const tokenBAddress = Object.keys(pool.tradeRequests[tokenAAddress])[0]
      const curA = currenciesById[tokenAAddress]
      const curB = currenciesById[tokenBAddress]
      const tokenA = curA.tokenInfo || curA
      const tokenB = curB.tokenInfo || curB
      const symbolA = tokenA.symbol
      const symbolB = tokenB.symbol
      const decimalsA = tokenA.decimals
      const decimalsB = tokenB.decimals
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

  function GridOrderCard() {
    let cardbody = <></>
    try {
      cardbody = <GridOrderCardBody/>
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

  function GridOrderCardBody() {
    try {
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
                const cur = currenciesById[addr]
                const token = cur.tokenInfo || cur
                const symbol = token.symbol
                const decimals = token.decimals
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
    const cur = defaultTokens[address]
    const token = cur.tokenInfo || cur
    const symbol = token.symbol
    return (
      <span>
        <img src={`https://assets.hydrogendefi.xyz/tokens/${address}`} style={{height:"40px",width:"40px",display:"inline", margin:"10px",position:"relative",top:"20px"}}/>
        {symbol}
      </span>
    )
  }

  /*
  return (
    <CardContainer>
      <Link to={`/pool/?poolID=${poolID}`} style={{textDecoration:"none"}}>
        {poolID.substring(poolID.length-3) === "001" ? (
          <LimitOrderCard/>
        ) : (
          <GridOrderCard/>
        )}
      </Link>
    </CardContainer>
  )
  */

  return (
    poolID.substring(poolID.length-3) === "001" ? (
      <LimitOrderCard/>
    ) : (
      <GridOrderCard/>
    )
  )

}
