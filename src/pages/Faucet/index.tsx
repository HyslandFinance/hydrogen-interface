import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToggleWalletModal } from 'state/application/hooks'
import styled, { useTheme } from 'styled-components/macro'
import { TOKEN_SHORTHANDS } from '../../constants/tokens'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { supportedChainId } from '../../utils/supportedChainId'
import { useFaucetDripCallback } from 'hooks/useFaucetDripCallback'
import { NavLink, NavLinkProps, useLocation, useNavigate } from 'react-router-dom'

const CenteringDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const AllTokensContainer = styled.div`
  margin-top: 20px;
  width: 100%;
  @media (min-width: 600px) {
    width: 600px;
  }
`

const TokenOuterContainer = styled(CenteringDiv)`
  padding: 10px 20px 0px 20px;
  max-width: 600px;
  @media (min-width: 600px) {
    width: 600px;
  }
`

const TokenInnerContainer = styled.div`
  margin: auto;
`

const TokenMetadataMobileView = styled.div`
  display: none;
  @media (max-width: 600px) {
    display: block;
  }
`

const TokenMetadataDesktopView = styled.div`
  display: block;
  @media (max-width: 600px) {
    display: none;
  }
`

const TokenIcon = styled.img`
  display: inline;
  width: 50px;
  height: 50px;
  position: relative;
  top: 18px;
  margin-right: 20px;
`

const TokenTextContainer = styled.div`
  display: inline-block;
  width: 490px;
`

const TokenTextBreaker = styled.br`
  @media (min-width: 600px) {
    display: none;
  }
`

const TokenWarningContainer = styled.div`
  margin-left: 70px;

  @media (max-width: 600px) {
    margin-left: 0px;
  }
`

const TokenText = styled.p`
  display: inline;
`

const TokenButtonRow = styled(CenteringDiv)`
  margin-top: 20px;
`

const TokenButtonContainer = styled.div`
  margin-right: 20px;
  padding: 0 20px;
  border: 1px solid gray;
  border-radius: 16px;
  display: inline-block;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background-color: #ffffff22;
    cursor: pointer;
  }
`

const ErrorContainer = styled(CenteringDiv)`
  color: red;
`

export default function FaucetPage({ className }: { className?: string }) {
  const { account, chainId } = useWeb3React()

  // dismiss warning if all imported tokens are in active lists
  const urlLoadedTokens: Token[] = []
  const defaultTokens = useAllTokens()

  const theme = useTheme()

  // toggle wallet when disconnected
  const toggleWalletModal = useToggleWalletModal()

  // modal and loading
  const [{ dripErrorMessage, attemptingTxn, txHash }, dripError] = useState<{
    attemptingTxn: boolean
    dripErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    attemptingTxn: false,
    dripErrorMessage: undefined,
    txHash: undefined,
  })

  const [token, setToken] = useState(undefined as any)
  // the callback to execute the drip
  const { callback: dripCallback, error: dripCallbackError } = useFaucetDripCallback(
    token,
    undefined,
  )
  const [errorMessages, setErrorMessages] = useState({} as any)

  const handleDrip = useCallback(async () => {
    if(!token) {
      console.error("no token to drip")
      return
    }
    const tokenInfo = token.tokenInfo || token
    const tokenSymbol = tokenInfo.symbol
    if(!account) {
      console.error("connect to your wallet first")
      setErrorMessages({...errorMessages, [tokenSymbol]: "Connect to your wallet first"})
    }
    if(!dripCallback) {
      console.error("no callback")
      return
    }
    dripError({ attemptingTxn: true, dripErrorMessage: undefined, txHash: undefined })
    dripCallback()
      .then((hash) => {
        dripError({ attemptingTxn: false, dripErrorMessage: undefined, txHash: hash })
      })
      .catch((error) => {
        dripError({
          attemptingTxn: false,
          dripErrorMessage: error.message,
          txHash: undefined,
        })
      })
  }, [token, account])

  const handleAddToWallet = useCallback(async (token:any) => {
    if(!token) {
      console.error("no token to add")
      return
    }
    const tokenAddress = token.tokenInfo.address
    const tokenSymbol = token.tokenInfo.symbol
    const tokenDecimals = token.tokenInfo.decimals
    const tokenImage = `https://assets.hydrogendefi.xyz/tokens/${tokenSymbol}`
    if(!window || !window.ethereum) {
      console.error("connect to your wallet first")
      setErrorMessages({...errorMessages, [tokenSymbol]: "Connect to your wallet first"})
      return
    }
    const ethereum = window.ethereum as any
    try {
      // wasAdded is a boolean. Like any RPC method, an error can be thrown.
      const wasAdded = await ethereum?.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20', // Initially only supports ERC-20 tokens, but eventually more!
          options: {
            address: tokenAddress, // The address of the token.
            symbol: tokenSymbol, // A ticker symbol or shorthand, up to 5 characters.
            decimals: tokenDecimals, // The number of decimals in the token.
            image: tokenImage, // A string URL of the token logo.
          },
        },
      });
    } catch (error) {
      console.log(error);
      setErrorMessages({...errorMessages, [tokenSymbol]: error.message})
    }
  }, [])

  const sortedTokens = useMemo(() => {
    if(!defaultTokens) return []
    let symbols:any[] = []
    if(chainId == 84531) symbols = ['DAI', 'USDC', 'USDT', 'mWETH', 'WBTC', 'DOGE', 'FRAX', 'wstETH', 'rETH', 'frxETH', 'sfrxETH', 'cbETH', 'icETH']
    else if(chainId == 80001) symbols = ['DAI', 'USDC', 'USDT', 'WETH', 'WBTC', 'DOGE', 'FRAX', 'mWMATIC2']
    //const symbols = ['DAI', 'USDC', 'USDT', 'WETH', 'WBTC', 'DOGE', 'FRAX', 'WMATIC', 'wstETH', 'rETH', 'frxETH', 'sfrxETH', 'cbETH', 'icETH']
    const tokens:any[] = []
    const addresses = Object.keys(defaultTokens)
    for(let symbol of symbols) {
      for(let address of addresses) {
        const token1 = defaultTokens[address] as any
        const token2 = token1.wrapped || token1
        const token3 = token2.tokenInfo || token2
        if(token3.symbol == symbol) {
          tokens.push(token1)
        }
      }
    }
    return tokens
  }, [defaultTokens, chainId])

  const gasTokenNotes = useMemo(() => {
    if(!chainId) return undefined
    if(chainId == 84531) return <><CenteringDiv><p style={{marginBottom:0}}>Base Goerli uses ETH as the gas token.</p></CenteringDiv><CenteringDiv><p style={{marginTop:0}}>You can get some using the Coinbase Wallet.</p></CenteringDiv></>
    if(chainId == 80001) return <><CenteringDiv><p style={{marginBottom:0}}>Polygon Mumbai uses MATIC as the gas token.</p></CenteringDiv><CenteringDiv><p style={{marginTop:0}}>You can get some using the Coinbase Wallet or by signing up for Alchemy.</p></CenteringDiv></>
    return undefined
  }, [chainId]) as any

  const tokenNotes = useMemo(() => {
    if(!chainId) return {}
    if(chainId == 84531) return {'mWETH': <p style={{marginBottom:"0"}}>Note: this mock WETH is <TokenTextBreaker/>not redeemable for ETH</p>}
    if(chainId == 80001) return {
      'WETH': <p style={{marginBottom:"0"}}>Note: this mock WETH is <TokenTextBreaker/>not redeemable for ETH</p>,
      'mWMATIC2': <p style={{marginBottom:"0"}}>Note: this mock WMATIC is <TokenTextBreaker/>not redeemable for MATIC</p>,
    }
    return {}
  }, [chainId]) as any

  //console.log("in faucet page")
  //console.log({defaultTokens, sortedTokens, gasTokenNotes, tokenNotes})

  const navigate = useNavigate()
  const CHAINS_WITH_FAUCETS = [84531, 80001]
  const chainExists = !!chainId
  const chainHasFaucet = chainExists && CHAINS_WITH_FAUCETS.includes(chainId)
  const chainCondition = chainExists && !chainHasFaucet
  if(chainCondition) {
    navigate({ pathname: '/', })
    return (<></>)
  }

  return (
    <>
      <h1>Get testnet tokens and try out Hydrogen</h1>
      {gasTokenNotes}
      <p>You can drip any of the tokens below from the Hydrogen faucet.</p>
      <AllTokensContainer>
        {sortedTokens.map(token => {
          const token1 = token as any
          const token2 = token1.wrapped || token1
          const token3 = token2.tokenInfo || token2
          return (
            <TokenOuterContainer key={token3.address}>
              <TokenInnerContainer>
                <TokenMetadataMobileView>
                  <CenteringDiv>
                    <div>
                      <TokenIcon src={`https://assets.hydrogendefi.xyz/tokens/${token3.symbol}`} alt={`${token3.symbol} icon`}/>
                      <TokenText>
                        {token3.symbol}
                      </TokenText>
                    </div>
                  </CenteringDiv>
                  <CenteringDiv>
                    <p style={{marginTop:"32px", marginBottom:"0"}}>
                      {token3.address.substring(0,21)}<TokenTextBreaker/>{token3.address.substring(21)}
                    </p>
                  </CenteringDiv>
                  {
                    tokenNotes[token3.symbol] ? (
                      <CenteringDiv>
                        <TokenWarningContainer>
                          {tokenNotes[token3.symbol]}
                        </TokenWarningContainer>
                      </CenteringDiv>
                    ) : null
                  }
                </TokenMetadataMobileView>
                <TokenMetadataDesktopView>
                  <TokenIcon src={`https://assets.hydrogendefi.xyz/tokens/${token3.symbol}`} alt={`${token3.symbol} icon`}/>
                  <TokenTextContainer>
                    <TokenText>
                      {`${token3.symbol} ${token3.address}`}
                    </TokenText>
                  </TokenTextContainer>
                  {
                    tokenNotes[token3.symbol] ? (
                      <>
                      <TokenTextBreaker/>
                      <TokenWarningContainer>
                        {tokenNotes[token3.symbol]}
                      </TokenWarningContainer>
                      </>
                    ) : null
                  }
                </TokenMetadataDesktopView>
                <TokenButtonRow>
                  <TokenButtonContainer onMouseDown={() => setToken(token)} onClick={() => handleDrip()}>
                    <p>Drip</p>
                  </TokenButtonContainer>
                  <TokenButtonContainer onClick={() => handleAddToWallet(token)}>
                    <p>Add to wallet</p>
                  </TokenButtonContainer>
                </TokenButtonRow>
                <ErrorContainer>
                  <p>{errorMessages[token3.symbol] || " "}</p>
                </ErrorContainer>
              </TokenInnerContainer>
            </TokenOuterContainer>
          )
        }
      )}
      </AllTokensContainer>
    </>
  )
}
