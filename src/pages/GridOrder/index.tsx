import { Trans } from '@lingui/macro'
import { Trace, TraceEvent } from '@uniswap/analytics'
import { BrowserEvent, ElementName, EventName, PageName, SectionName } from '@uniswap/analytics-events'
import { Trade } from '@uniswap/router-sdk'
import { Currency, CurrencyAmount, Percent, Price, Token, TradeType } from '@uniswap/sdk-core'
import { UNIVERSAL_ROUTER_ADDRESS } from '@uniswap/universal-router-sdk'
import { useWeb3React } from '@web3-react/core'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import PriceImpactWarning from 'components/swap/PriceImpactWarning'
import SwapDetailsDropdown from 'components/swap/SwapDetailsDropdown'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import TokenSafetyModal from 'components/TokenSafety/TokenSafetyModal'
import { MouseoverTooltip } from 'components/Tooltip'
import { isSupportedChain } from 'constants/chains'
import { usePermit2Enabled } from 'featureFlags/flags/permit2'
import usePermit, { PermitState } from 'hooks/usePermit2'
import { useGridOrderCallback } from 'hooks/useGridOrderCallback'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import JSBI from 'jsbi'
import { formatSwapQuoteReceivedEventProperties } from 'lib/utils/analytics'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactNode } from 'react'
import { AlertTriangle, ArrowDown, CheckCircle, HelpCircle, Info } from 'react-feather'
import { useNavigate } from 'react-router-dom'
import { Text } from 'rebass'
import { useToggleWalletModal } from 'state/application/hooks'
import { InterfaceTrade } from 'state/routing/types'
import { TradeState } from 'state/routing/types'
import { useTransactionAdder } from 'state/transactions/hooks'
import styled, { useTheme } from 'styled-components/macro'
import { currencyAmountToPreciseFloat, formatTransactionAmount } from 'utils/formatNumbers'

import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonConfirmed, ButtonError, ButtonLight, ButtonPrimary, ButtonYellow } from '../../components/Button'
import { GrayCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import SwapCurrencyInputPanel from '../../components/CurrencyInputPanel/SwapCurrencyInputPanel'
import Loader from '../../components/Loader'
import { AutoRow, RowBetween, RowFixed } from '../../components/Row'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import { ArrowWrapper, Dots, PageWrapper, SwapCallbackError, SwapWrapper } from '../../components/swap/styleds'
import GridOrderHeader from '../../components/swap/GridOrderHeader'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import { TOKEN_SHORTHANDS } from '../../constants/tokens'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallback, useApproveCallbackFromTrade } from '../../hooks/useApproveCallback'
import useENSAddress from '../../hooks/useENSAddress'
import { useERC20PermitFromTrade, UseERC20PermitState } from '../../hooks/useERC20Permit'
import useIsArgentWallet from '../../hooks/useIsArgentWallet'
import { useIsSwapUnsupported } from '../../hooks/useIsSwapUnsupported'
import { useStablecoinValue } from '../../hooks/useStablecoinPrice'
import useWrapCallback, { WrapErrorText, WrapType } from '../../hooks/useWrapCallback'
import { Field, PriceField, PairState, DepositState, GridOrderState } from '../../state/gridOrder/actions'
import {
  //useDefaultsFromURLSearch,
  useDerivedGridOrderInfo,
  useGridOrderActionHandlers,
  useGridOrderState,
} from '../../state/gridOrder/hooks'
import { useExpertModeManager } from '../../state/user/hooks'
import { LinkStyledButton, ThemedText } from '../../theme'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { computeRealizedPriceImpact, warningSeverity } from '../../utils/prices'
import { supportedChainId } from '../../utils/supportedChainId'
import CenteringDiv from 'components/centeringDiv'
import { CurrencyDropdown } from 'pages/AddLiquidity/styled'
import { currencyId } from 'utils/currencyId'
import PriceSelectors from 'components/PriceSelectors'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import CurrencyInputPanel2 from 'components/CurrencyInputPanel/CurrencyInputPanel2'
import { HYDROGEN_NUCLEUS_ADDRESSES } from 'constants/addresses'
import nucleusAbi from 'data/abi/Hydrogen/HydrogenNucleus.json'
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'
import { Interface } from 'ethers/lib/utils'
import { BigNumber } from '@ethersproject/bignumber'
import type { TransactionResponse } from '@ethersproject/providers'
import { parseUnits } from '@ethersproject/units'
import { AddressZero } from '@ethersproject/constants'
import { currencyAmountToString, currencyAmountToBigNumber } from 'lib/utils/currencyAmountToString'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { TransactionType } from 'state/transactions/types'
import { stringValueIsPositiveFloat } from 'utils/stringValueIsPositiveFloat'

const ArrowContainer = styled.div`
  display: inline-block;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 100%;
  height: 100%;
`

const SwapSection = styled.div`
  position: relative;
  background-color: ${({ theme }) => theme.backgroundModule};
  border-radius: 12px;
  padding: 16px;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 14px;
  line-height: 20px;
  font-weight: 500;

  &:before {
    box-sizing: border-box;
    background-size: 100%;
    border-radius: inherit;

    position: absolute;
    top: 0;
    left: 0;

    width: 100%;
    height: 100%;
    pointer-events: none;
    content: '';
    border: 1px solid ${({ theme }) => theme.backgroundModule};
  }

  &:hover:before {
    border-color: ${({ theme }) => theme.stateOverlayHover};
  }

  &:focus-within:before {
    border-color: ${({ theme }) => theme.stateOverlayPressed};
  }
`

const OutputSwapSection = styled(SwapSection)<{ showDetailsDropdown: boolean }>`
  border-bottom: ${({ theme }) => `1px solid ${theme.backgroundSurface}`};
  border-bottom-left-radius: ${({ showDetailsDropdown }) => showDetailsDropdown && '0'};
  border-bottom-right-radius: ${({ showDetailsDropdown }) => showDetailsDropdown && '0'};
`

const DetailsSwapSection = styled(SwapSection)`
  padding: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
`

const SwapWrapperWrapper = styled.div`
  margin-bottom: 16px;
`

const SwapWrapperInner = styled.div`
  margin: 8px 12px;
`

export function getIsValidGridOrderQuote(
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined,
  tradeState: TradeState,
  gridOrderInputError?: ReactNode
): boolean {
  return !!gridOrderInputError && !!trade && (tradeState === TradeState.VALID || tradeState === TradeState.SYNCING)
}

function largerPercentValue(a?: Percent, b?: Percent) {
  if (a && b) {
    return a.greaterThan(b) ? a : b
  } else if (a) {
    return a
  } else if (b) {
    return b
  }
  return undefined
}

export default function GridOrderPage({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { account, chainId, provider } = useWeb3React()

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens()
  const urlLoadedTokens = [] as any[]
  const importTokensNotInDefault = useMemo(
    () =>
      urlLoadedTokens &&
      urlLoadedTokens
        .filter((token: Token) => {
          return !(token.address in defaultTokens)
        })
        .filter((token: Token) => {
          // Any token addresses that are loaded from the shorthands map do not need to show the import URL
          const supported = supportedChainId(chainId)
          if (!supported) return true
          return !Object.keys(TOKEN_SHORTHANDS).some((shorthand) => {
            const shorthandTokenAddress = TOKEN_SHORTHANDS[shorthand][supported]
            return shorthandTokenAddress && shorthandTokenAddress === token.address
          })
        }),
    [chainId, defaultTokens, urlLoadedTokens]
  )

  const theme = useTheme()

  // toggle wallet when disconnected
  const toggleWalletModal = useToggleWalletModal()

  // for expert mode
  const [isExpertMode] = useExpertModeManager()
  // swap state
  const currentState = useGridOrderState()
  const { pairs, deposits, recipient } = currentState
  const {
    currenciesById,
    currencyBalancesById,
    atLeastOnePairsInfoFilled,
    allPairsInfoFilled,
    atLeastOneDepositAmountFilled,
  } = useDerivedGridOrderInfo()

  const { onCurrencySelection, onPriceInput, onDepositAmountInput } = useGridOrderActionHandlers()

  const { address: recipientAddress } = useENSAddress(recipient)

  const [attemptingTxn, setAttemptingTxn] = useState<boolean>(false) // clicked confirm
  const addTransaction = useTransactionAdder()
  const [txHash, setTxHash] = useState<string>('')

  const handleCurrencySelect = useCallback(
    (pairIndex:number, field: Field, currencyNew: Currency) => {
      if(pairIndex >= pairs.length) return
      const currencyIdNew = currencyId(currencyNew)
      const pair = pairs[pairIndex]
      let currencyIdBase = pair[Field.BASE_TOKEN].currencyId
      let currencyIdQuote = pair[Field.QUOTE_TOKEN].currencyId
      if(field == Field.BASE_TOKEN) {
        if(currencyIdQuote == currencyIdNew) {
          currencyIdQuote = currencyIdBase
        }
        currencyIdBase = currencyIdNew
      } else {
        if(currencyIdBase == currencyIdNew) {
          currencyIdBase = currencyIdQuote
        }
        currencyIdQuote = currencyIdNew
      }
      onCurrencySelection(pairIndex, currencyIdBase, currencyIdQuote)
    },
    [pairs]
  )

  const handlePriceInput = useCallback(
    (pairIndex:number, field:PriceField, price:string) => {
      onPriceInput(pairIndex, field, price)
    }, []
  )

  const handleDepositAmountInput = useCallback(
    (depositIndex:number, amount:string) => {
      onDepositAmountInput(depositIndex, amount)
    }, []
  )

  const parsedAmounts = useMemo(() => {
    return deposits.map(deposit => {
      try {
        return tryParseCurrencyAmount(deposit.typedAmount, currenciesById[deposit.currencyId||''])
      } catch(e) {
        return undefined
      }
    })
  }, [deposits, currenciesById])

  const balances = useMemo(() => {
    return deposits.map((deposit) => {
      return currencyBalancesById[deposit?.currencyId||'']
    })
  }, [deposits, currencyBalancesById])


  const aboveBalances = useMemo(() => {
    return deposits.map((deposit,depositIndex) => {
      try {
        if(!parsedAmounts[depositIndex] || !balances[depositIndex]) return false
        return (parsedAmounts[depositIndex] as any).greaterThan(balances[depositIndex])
      } catch(e) { return false }
    })
  }, [deposits, balances])

  const areAnyDepositsAboveBalances = useMemo(() => {
    return aboveBalances.filter(x => !!x).length > 0
  }, [aboveBalances])

  // get the max amounts user can deposit
  const maxAmounts = useMemo(() => {
    return deposits.map((deposit) => {
      return maxAmountSpend(currencyBalancesById[deposit?.currencyId||''])
    })
  }, [deposits, currencyBalancesById])

  const atMaxAmounts = useMemo(() => {
    return maxAmounts.map((maxAmount) => {
      return false
    })
  }, [maxAmounts])

  const maxDepositTokens = 20
  const depositIndices = []
  for(let i = 0; i < maxDepositTokens; i++) depositIndices.push(i)
  const approvals = depositIndices.map((depositIndex:number) => {
    const typedAmount = depositIndex >= deposits.length ? '' : deposits[depositIndex].typedAmount
    const currency = depositIndex >= deposits.length ? undefined : currenciesById[deposits[depositIndex].currencyId||'']
    return useApproveCallback(
      tryParseCurrencyAmount(typedAmount, currency),
      chainId ? HYDROGEN_NUCLEUS_ADDRESSES[chainId] : undefined
    )
  })

  const areAnyTokensAwaitingApproval = useMemo(() => {
    for(const depositIndex in deposits) {
      const approvalState = approvals[depositIndex][0]
      if(approvalState == ApprovalState.NOT_APPROVED || approvalState == ApprovalState.PENDING) return true
    }
    return false
  }, [approvals, deposits])

  const arePricesUnordered = useMemo(() => {
    return pairs.map((pair,pairIndex) => {
      try {
        if(!stringValueIsPositiveFloat(pair.typedValueBuyPrice) || !stringValueIsPositiveFloat(pair.typedValueSellPrice)) return false
        const quoteCurrencyId = pair.QUOTE_TOKEN.currencyId || ''
        if(!quoteCurrencyId) return false
        const quoteCurrency = currenciesById[quoteCurrencyId]
        if(!quoteCurrency) return false
        const buyPrice = parseUnits(pair.typedValueBuyPrice, quoteCurrency.tokenInfo.decimals)
        const sellPrice = parseUnits(pair.typedValueSellPrice, quoteCurrency.tokenInfo.decimals)
        return buyPrice.gt(sellPrice)
      } catch(e) {
        return false
      }
    })
  }, [pairs])

  const areAnyPricesUnordered = useMemo(() => {
    for(const unordered of arePricesUnordered) {
      if(unordered) return true
    }
    return false
  }, [pairs])

  const addIsUnsupported = false
  const nucleusInterface = useMemo(() => new Interface(nucleusAbi), [nucleusAbi])

  async function handlePlaceGridOrder() {
    // checks
    if (!chainId || !provider || !account) return
    if(!HYDROGEN_NUCLEUS_ADDRESSES[chainId]) return
    if(areAnyDepositsAboveBalances || areAnyTokensAwaitingApproval || !allPairsInfoFilled || !atLeastOneDepositAmountFilled) return
    // encode transaction
    const userExternalLocation = HydrogenNucleusHelper.externalAddressToLocation(account)

    const currencyIds = deposits.map((deposit) => deposit.currencyId).filter(x=>!!x) as string[]

    const tokenSources = deposits.map((deposit,depositIndex) => {
      const parsedAmount = parsedAmounts[depositIndex] as any
      if(!parsedAmount) return undefined
      const amount = currencyAmountToString(parsedAmount)
      return {
        token: currenciesById[deposit.currencyId||''].address,
        amount: amount,
        location: userExternalLocation,
      }
    }).filter(x=>!!x)

    const tradeRequests = pairs.map((pair,pairIndex) => {
      const currencyBase = currenciesById[pair[Field.BASE_TOKEN].currencyId||''] ?? null
      const currencyQuote = currenciesById[pair[Field.QUOTE_TOKEN].currencyId||''] ?? null
      if(!currencyBase || !currencyQuote) return []
      const tokenBase = currencyBase?.wrapped
      const tokenQuote = currencyQuote?.wrapped
      const baseAmount = tryParseCurrencyAmount('1', tokenBase)
      const parsedQuoteAmountBuy = tryParseCurrencyAmount(pair.typedValueBuyPrice, tokenQuote)
      const parsedQuoteAmountSell = tryParseCurrencyAmount(pair.typedValueSellPrice, tokenQuote)
      if(!baseAmount || !parsedQuoteAmountBuy || !parsedQuoteAmountSell) return []
      const baseAmountBN = currencyAmountToBigNumber(baseAmount)
      const quoteAmountBuyBN = currencyAmountToBigNumber(parsedQuoteAmountBuy)
      const quoteAmountSellBN = currencyAmountToBigNumber(parsedQuoteAmountSell)
      if(!baseAmountBN || !quoteAmountBuyBN || !quoteAmountSellBN || baseAmountBN.eq(0) || quoteAmountBuyBN.eq(0) || quoteAmountSellBN.eq(0)) return []
      const exchangeRateBuy = HydrogenNucleusHelper.encodeExchangeRate(quoteAmountBuyBN, baseAmountBN)
      const exchangeRateSell = HydrogenNucleusHelper.encodeExchangeRate(baseAmountBN, quoteAmountSellBN)
      const tradeRequests = [{
        tokenA: currenciesById[pair.QUOTE_TOKEN.currencyId||''].address,
        tokenB: currenciesById[pair.BASE_TOKEN.currencyId||''].address,
        exchangeRate: exchangeRateBuy,
        locationB: HydrogenNucleusHelper.LOCATION_THIS_POOL,
      },{
        tokenA: currenciesById[pair.BASE_TOKEN.currencyId||''].address,
        tokenB: currenciesById[pair.QUOTE_TOKEN.currencyId||''].address,
        exchangeRate: exchangeRateSell,
        locationB: HydrogenNucleusHelper.LOCATION_THIS_POOL,
      }]
      return tradeRequests
    }).flat().filter(x=>!!x)

    if(tokenSources.length == 0 || tradeRequests.length == 0) return

    const params = {
      tokenSources,
      tradeRequests,
      hptReceiver: account,
    }

    const calldata = nucleusInterface.encodeFunctionData('createGridOrderPool', [params])
    let txn: { to: string; data: string; value: string } = {
      to: HYDROGEN_NUCLEUS_ADDRESSES[chainId],
      data: calldata,
      value: '0',
    }

    setAttemptingTxn(true)

    provider
      .getSigner()
      .estimateGas(txn)
      .then((estimate) => {
        const newTxn = {
          ...txn,
          gasLimit: calculateGasMargin(estimate),
        }

        return provider
          .getSigner()
          .sendTransaction(newTxn)
          .then((response: TransactionResponse) => {
            setAttemptingTxn(false)
            addTransaction(response, {
              type: TransactionType.GRID_ORDER,
              currencyIds: currencyIds,
            })
            setTxHash(response.hash)
          })
      })
      .catch((error) => {
        console.error('Failed to send transaction', error)
        setAttemptingTxn(false)
        // we only care if the error is something _other_ than the user rejected the tx
        if (error?.code !== 4001) {
          console.error(error)
        }
      })
  }

  const pairCard = (pair:any,pairIndex:number) => {
    const currencyBase = currenciesById[pair[Field.BASE_TOKEN].currencyId||''] ?? null
    const currencyQuote = currenciesById[pair[Field.QUOTE_TOKEN].currencyId||''] ?? null
    const tokenBase = currencyBase?.wrapped
    const tokenQuote = currencyQuote?.wrapped
    const baseAmount = tryParseCurrencyAmount('1', tokenBase)
    const parsedQuoteAmountBuy = tryParseCurrencyAmount(pair.typedValueBuyPrice, tokenQuote)
    const parsedQuoteAmountSell = tryParseCurrencyAmount(pair.typedValueSellPrice, tokenQuote)
    const buyPrice = (baseAmount && parsedQuoteAmountBuy
      ? new Price(
          currencyBase,
          currencyQuote,
          baseAmount.quotient,
          parsedQuoteAmountBuy.quotient
        )
      : undefined
    )
    const sellPrice = (baseAmount && parsedQuoteAmountSell
      ? new Price(
          currencyBase,
          currencyQuote,
          baseAmount.quotient,
          parsedQuoteAmountSell.quotient
        )
      : undefined
    )

    return (
      <SwapWrapperWrapper key={pairIndex}>
        <SwapWrapper className={className} id={`grid-order-pair-card-${pairIndex}`} >
          <SwapWrapperInner>
            <AutoColumn gap="md">
              <RowBetween>
                <span style={{width:"48.5%"}}>
                  <ThemedText.DeprecatedLabel>
                    <Trans>Buy and Sell</Trans>
                  </ThemedText.DeprecatedLabel>
                </span>
                <span style={{width:"48.5%"}}>
                  <ThemedText.DeprecatedLabel>
                    <Trans>With</Trans>
                  </ThemedText.DeprecatedLabel>
                </span>
              </RowBetween>
              <RowBetween>
                <CurrencyDropdown
                  value={''}
                  onUserInput={()=>{}}
                  hideInput={true}
                  onMax={()=>{}}
                  onCurrencySelect={(currencyNew)=>{handleCurrencySelect(pairIndex, Field.BASE_TOKEN, currencyNew)}}
                  showMaxButton={false}
                  currency={currencyBase}
                  id={`currency-dropdown-basetoken-${pairIndex}`}
                  showCommonBases
                />
                <div style={{ width: '12px' }} />
                <CurrencyDropdown
                  value={''}
                  hideInput={true}
                  onUserInput={()=>{}}
                  onCurrencySelect={(currencyNew)=>{handleCurrencySelect(pairIndex, Field.QUOTE_TOKEN, currencyNew)}}
                  onMax={()=>{}}
                  showMaxButton={false}
                  currency={currencyQuote}
                  id={`currency-dropdown-quotetoken-${pairIndex}`}
                  showCommonBases
                />
              </RowBetween>
            </AutoColumn>
            {(!!currencyBase && !!currencyQuote) ? (
              <>
                <div style={{height:"20px"}}/>
                <PriceSelectors
                  buyPrice={buyPrice}
                  sellPrice={sellPrice}
                  onBuyPriceInput={(price:string)=>{handlePriceInput(pairIndex, PriceField.BUY_PRICE, price)}}
                  onSellPriceInput={(price:string)=>{handlePriceInput(pairIndex, PriceField.SELL_PRICE, price)}}
                  currencyBase={currencyBase}
                  currencyQuote={currencyQuote}
                />
              </>
            ) : undefined}
          </SwapWrapperInner>
        </SwapWrapper>
      </SwapWrapperWrapper>
    )
  }

  const depositCard = (atLeastOnePairsInfoFilled || atLeastOneDepositAmountFilled) && (
    <SwapWrapperWrapper>
      <SwapWrapper className={className} id={`grid-order-deposit-card`}>
        <div style={{margin:"8px 12px"}}>
          <AutoColumn gap="md">
            <RowBetween paddingBottom="20px">
              <ThemedText.DeprecatedLabel>
                <Trans>Deposit Amounts</Trans>
              </ThemedText.DeprecatedLabel>
            </RowBetween>
            {deposits.map((deposit:DepositState,depositIndex:number) => (
              <CurrencyInputPanel2
                key={deposit.currencyId}
                value={deposit.typedAmount}
                onUserInput={(amount:string)=>{handleDepositAmountInput(depositIndex, amount)}}
                onMax={()=>{handleDepositAmountInput(depositIndex, maxAmounts[depositIndex]?.toExact()??'')}}
                showMaxButton={!atMaxAmounts[depositIndex]}
                currency={currenciesById[deposit.currencyId||""] ?? null}
                id={`deposit-amount-${deposit.currencyId}`}
                isOptional={atLeastOneDepositAmountFilled}
                showCommonBases
                locked={false}
                error={aboveBalances[depositIndex]}
              />
            ))}
          </AutoColumn>
        </div>
      </SwapWrapper>
    </SwapWrapperWrapper>
  )

  const pricesUnorderedButtons = (
    <RowBetween>
      {pairs.map((pair,pairIndex) => (
        arePricesUnordered[pairIndex] && (
          <ButtonPrimary
            disabled={true}
            width={'100%'}
            key={pairIndex}
          >
            <Trans>{`${currenciesById[pair.BASE_TOKEN.currencyId||'']?.tokenInfo.symbol}/${currenciesById[pair.QUOTE_TOKEN.currencyId||'']?.tokenInfo.symbol} prices unordered`}</Trans>
          </ButtonPrimary>
        )
      ))}
    </RowBetween>
  )

  const insufficientBalanceButtons = (
    <RowBetween>
      {deposits.map((deposit,depositIndex) => (
        aboveBalances[depositIndex] && (
          <ButtonPrimary
            disabled={true}
            width={'100%'}
            key={depositIndex}
          >
            <Trans>{`Insufficient ${currenciesById[deposit.currencyId||'']?.tokenInfo.symbol || "tokens"}`}</Trans>
          </ButtonPrimary>
        )
      ))}
    </RowBetween>
  )

  const tokenApprovalButtons = (
    <RowBetween>
      {deposits.map((deposit,depositIndex) => {
        const approvalState = approvals[depositIndex][0]
        return (approvalState == ApprovalState.NOT_APPROVED || approvalState == ApprovalState.PENDING) && (
          <ButtonPrimary
            onClick={approvals[depositIndex][1]}
            disabled={approvals[depositIndex][0] === ApprovalState.PENDING}
            width={'100%'}
          >
            {approvals[depositIndex][0] === ApprovalState.PENDING ? (
              <Dots>
                <Trans>Approving {currenciesById[deposit.currencyId||'']?.tokenInfo.symbol}</Trans>
              </Dots>
            ) : (
              <Trans>Approve {currenciesById[deposit.currencyId||'']?.tokenInfo.symbol}</Trans>
            )}
          </ButtonPrimary>
        )
      })}
    </RowBetween>
  )

  const placeGridOrderButton = (
    <RowBetween>
      <ButtonError
        onClick={() => { handlePlaceGridOrder() }}
        disabled={false}
        error={false}
      >
        <Text fontWeight={500}>{<Trans>Place Grid Order</Trans>}</Text>
      </ButtonError>
    </RowBetween>
  )

  const buttons = (allPairsInfoFilled && atLeastOneDepositAmountFilled && (
    addIsUnsupported ? (
      <ButtonPrimary disabled={true} $borderRadius="12px" padding="12px">
        <ThemedText.DeprecatedMain mb="4px">
          <Trans>Unsupported Asset</Trans>
        </ThemedText.DeprecatedMain>
      </ButtonPrimary>
    ) : !account ? (
      <ButtonLight onClick={toggleWalletModal} $borderRadius="12px" padding="12px">
        <Trans>Connect Wallet</Trans>
      </ButtonLight>
    ) : (
      <AutoColumn gap="md">
        {areAnyPricesUnordered ? (
          pricesUnorderedButtons
        ) : areAnyDepositsAboveBalances ? (
          insufficientBalanceButtons
        ) : areAnyTokensAwaitingApproval ? (
          tokenApprovalButtons
        ) : (
          placeGridOrderButton
        )}
      </AutoColumn>
    )
  ))

  return (
    <PageWrapper>
      <CenteringDiv>
        <h1>Grid Order</h1>
      </CenteringDiv>
      {pairs.map(pairCard)}
      {depositCard}
      {buttons}
    </PageWrapper>
  )
}
