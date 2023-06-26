import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToggleWalletModal } from 'state/application/hooks'
import styled, { useTheme } from 'styled-components/macro'
import { TOKEN_SHORTHANDS } from '../../constants/tokens'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { supportedChainId } from '../../utils/supportedChainId'
import { useFaucetDripCallback } from 'hooks/useFaucetDripCallback'

const CenteringDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const AllTokensContainer = styled.div`
  margin-top: 20px;
  width: 100%;
  @media (min-width: 580px) {
    width: 580px;
  }
`

const TokenOuterContainer = styled(CenteringDiv)`
  padding: 10px 20px 0px 20px;
  max-width: 580px;
  @media (min-width: 580px) {
    width: 580px;
  }
`

const TokenInnerContainer = styled.div`
  margin: auto;
`

const TokenMetadataMobileView = styled.div`
  display: none;
  @media (max-width: 580px) {
    display: block;
  }
`

const TokenMetadataDesktopView = styled.div`
  display: block;
  @media (max-width: 580px) {
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
  width: 470px;
`

const TokenTextBreaker = styled.br`
  @media (min-width: 580px) {
    display: none;
  }
`

const TokenWarningContainer = styled.div`
  margin-left: 70px;
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
    const tokenSymbol = token.tokenInfo.symbol
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
    const symbols = ['DAI', 'USDC', 'USDT', 'WETH', 'WBTC', 'DOGE', 'FRAX']
    const tokens:any[] = []
    const addresses = Object.keys(defaultTokens)
    for(let symbol of symbols) {
      for(let address of addresses) {
        const token = defaultTokens[address] as any
        if(token.tokenInfo.symbol == symbol) {
          tokens.push(token)
        }
      }
    }
    return tokens
  }, [defaultTokens])

  const tokenNotes = useMemo(() => {
    if(!chainId) return {}
    if(chainId == 84531) return {'WETH': 'Note: this mock WETH is not redeemable for ETH'}
    return {}
  }, [chainId]) as any

  return (
    <>
      <h1>Get testnet tokens and try out Hydrogen</h1>
      <p>Base Goerli uses ETH as the gas token. You can get some using the Coinbase Wallet.</p>
      <p>You can drip any of the tokens below from the Hydrogen faucet.</p>
      <AllTokensContainer>
        {sortedTokens.map(token => (
          <TokenOuterContainer key={token.tokenInfo.address}>
            <TokenInnerContainer>
              <TokenMetadataMobileView>
                <TokenIcon src={`https://assets.hydrogendefi.xyz/tokens/${token.tokenInfo.symbol}`} alt={`${token.tokenInfo.symbol} icon`}/>
                <TokenTextContainer>
                  <TokenText>
                    {token.tokenInfo.symbol}{" "}<TokenTextBreaker/>{token.tokenInfo.address.substring(0,21)}<TokenTextBreaker/>{token.tokenInfo.address.substring(21)}
                  </TokenText>
                </TokenTextContainer>
                {
                  tokenNotes[token.tokenInfo.symbol] ? (
                    <>
                    <TokenTextBreaker/>
                    <TokenWarningContainer>
                      <TokenText>
                        {tokenNotes[token.tokenInfo.symbol]}
                      </TokenText>
                    </TokenWarningContainer>
                    </>
                  ) : null
                }
              </TokenMetadataMobileView>
              <TokenMetadataDesktopView>
                <TokenIcon src={`https://assets.hydrogendefi.xyz/tokens/${token.tokenInfo.symbol}`} alt={`${token.tokenInfo.symbol} icon`}/>
                <TokenTextContainer>
                  <TokenText>
                    {`${token.tokenInfo.symbol} ${token.tokenInfo.address}`}
                  </TokenText>
                </TokenTextContainer>
                {
                  tokenNotes[token.tokenInfo.symbol] ? (
                    <>
                    <TokenTextBreaker/>
                    <TokenWarningContainer>
                      <TokenText>
                        {tokenNotes[token.tokenInfo.symbol]}
                      </TokenText>
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
                <p>{errorMessages[token.tokenInfo.symbol] || " "}</p>
              </ErrorContainer>
            </TokenInnerContainer>
          </TokenOuterContainer>
        ))}
      </AllTokensContainer>
    </>
  )
}
