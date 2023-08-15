import { Trans } from '@lingui/macro'
import { Trace, TraceEvent } from '@uniswap/analytics'
import { BrowserEvent, ElementName, EventName, PageName, SectionName } from '@uniswap/analytics-events'
import { Trade } from '@uniswap/router-sdk'
import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
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
import { useMarketOrderCallback } from 'hooks/useMarketOrderCallback'
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
import { AutoRow } from '../../components/Row'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import ConfirmMarketOrderModal from '../../components/swap/ConfirmMarketOrderModal'
import { ArrowWrapper, PageWrapper, SwapCallbackError, SwapWrapper } from '../../components/swap/styleds'
import MarketOrderHeader from '../../components/swap/MarketOrderHeader'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import { TOKEN_SHORTHANDS } from '../../constants/tokens'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApproveCallbackFromTrade } from '../../hooks/useApproveCallback'
import useENSAddress from '../../hooks/useENSAddress'
import { useERC20PermitFromTrade, UseERC20PermitState } from '../../hooks/useERC20Permit'
import useIsArgentWallet from '../../hooks/useIsArgentWallet'
import { useIsSwapUnsupported } from '../../hooks/useIsSwapUnsupported'
import { useStablecoinValue } from '../../hooks/useStablecoinPrice'
import useWrapCallback, { WrapErrorText, WrapType } from '../../hooks/useWrapCallback'
import { Field } from '../../state/marketOrder/actions'
import {
  useDefaultsFromURLSearch,
  useDerivedMarketOrderInfo,
  useMarketOrderActionHandlers,
  useMarketOrderState,
} from '../../state/marketOrder/hooks'
import { useExpertModeManager } from '../../state/user/hooks'
import { LinkStyledButton, ThemedText } from '../../theme'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { computeRealizedPriceImpact, warningSeverity } from '../../utils/prices'
import { supportedChainId } from '../../utils/supportedChainId'
import { currencyAmountToString } from 'lib/utils/currencyAmountToString'

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

export function getIsValidMarketOrderQuote(
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined,
  tradeState: TradeState,
  marketOrderInputError?: ReactNode
): boolean {
  return !!marketOrderInputError && !!trade && (tradeState === TradeState.VALID || tradeState === TradeState.SYNCING)
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

export default function MarketOrderPage({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { account, chainId } = useWeb3React()
  const loadedUrlParams = useDefaultsFromURLSearch()
  const [newSwapQuoteNeedsLogging, setNewSwapQuoteNeedsLogging] = useState(true)
  const [fetchingSwapQuoteStartTime, setFetchingSwapQuoteStartTime] = useState<Date | undefined>()

  // token warning stuff
  const [loadedInputCurrency, loadedOutputCurrency] = [
    useCurrency(loadedUrlParams?.[Field.INPUT]?.currencyId),
    useCurrency(loadedUrlParams?.[Field.OUTPUT]?.currencyId),
  ]
  const [dismissTokenWarning, setDismissTokenWarning] = useState<boolean>(false)
  const urlLoadedTokens: Token[] = useMemo(
    () => [loadedInputCurrency, loadedOutputCurrency]?.filter((c): c is Token => c?.isToken ?? false) ?? [],
    [loadedInputCurrency, loadedOutputCurrency]
  )
  const handleConfirmTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
  }, [])

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens()
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
  const { independentField, typedValue, recipient } = useMarketOrderState()
  const {
    trade: { state: tradeState, trade },
    allowedSlippage,
    currencyBalances,
    parsedAmount,
    currencies,
    inputError: marketOrderInputError,
  } = useDerivedMarketOrderInfo()

  const {
    wrapType,
    execute: onWrap,
    inputError: wrapInputError,
  } = useWrapCallback(currencies[Field.INPUT], currencies[Field.OUTPUT], typedValue)
  const showWrap: boolean = wrapType !== WrapType.NOT_APPLICABLE
  const { address: recipientAddress } = useENSAddress(recipient)

  const parsedAmounts = useMemo(
    () =>
      showWrap
        ? {
            [Field.INPUT]: parsedAmount,
            [Field.OUTPUT]: parsedAmount,
          }
        : {
            [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : trade?.inputAmount,
            [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : trade?.outputAmount,
          },
    [independentField, parsedAmount, showWrap, trade]
  )

  const [routeNotFound, routeIsLoading, routeIsSyncing] = useMemo(
    () => [!trade?.swaps, TradeState.LOADING === tradeState, TradeState.SYNCING === tradeState],
    [trade, tradeState]
  )
  const [routeNotFound, routeIsLoading, routeIsSyncing] = useMemo(() => {
    const routeNotFound = !trade?.swaps
    const routeIsSyncing = TradeState.SYNCING === tradeState
    const routeIsLoading = (() => {
      if(TradeState.LOADING === tradeState) return true
      if(!currencies.INPUT || !currencies.OUTPUT) {
        //console.log("less than two currencies given. still invalid")
        return false
      }
      const parsedIn = currencyAmountToString(parsedAmounts.INPUT)
      const parsedOut = currencyAmountToString(parsedAmounts.OUTPUT)
      if(!parsedIn && !parsedOut) {
        return false
      }
      if(!parsedIn || !parsedOut) {
        return true
      }
      if(!trade) {
        return true
      }
      const parsedCurrencyIn = parsedAmounts?.INPUT?.currency as any
      const parsedCurrencyOut = parsedAmounts?.OUTPUT?.currency as any
      const tradeCurrencyIn = trade.inputAmount.currency as any
      const tradeCurrencyOut = trade.outputAmount.currency as any
      const addrIn1 = (parsedCurrencyIn.tokenInfo || parsedCurrencyIn).address
      const addrIn2 = (tradeCurrencyIn.tokenInfo || tradeCurrencyIn).address
      const addrOut1 = (parsedCurrencyOut.tokenInfo || parsedCurrencyOut).address
      const addrOut2 = (tradeCurrencyOut.tokenInfo || tradeCurrencyOut).address
      if(addrIn1 != addrIn2 || addrOut1 != addrOut2) {
        return true
      }

      const tradeIn = currencyAmountToString(trade?.inputAmount)
      const tradeOut = currencyAmountToString(trade?.outputAmount)
      return false
    })()
    return [routeNotFound, routeIsLoading, routeIsSyncing]
  }, [trade, tradeState, parsedAmounts, currencies])

  const fiatValueInput = useStablecoinValue(parsedAmounts[Field.INPUT])
  const fiatValueOutput = useStablecoinValue(parsedAmounts[Field.OUTPUT])
  const stablecoinPriceImpact = useMemo(
    () => (routeIsSyncing ? undefined : computeFiatValuePriceImpact(fiatValueInput, fiatValueOutput)),
    [fiatValueInput, fiatValueOutput, routeIsSyncing]
  )

  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useMarketOrderActionHandlers()
  const isValid = !marketOrderInputError
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT

  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const handleTypeOutput = useCallback(
    (value: string) => {
      onUserInput(Field.OUTPUT, value)
    },
    [onUserInput]
  )

  // reset if they close warning without tokens in params
  const handleDismissTokenWarning = useCallback(() => {
    setDismissTokenWarning(true)
    navigate('/market_order/')
  }, [navigate])

  // modal and loading
  const [{ showConfirm, tradeToConfirm, swapErrorMessage, attemptingTxn, txHash }, swapError] = useState<{
    showConfirm: boolean
    tradeToConfirm: Trade<Currency, Currency, TradeType> | undefined
    attemptingTxn: boolean
    swapErrorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    tradeToConfirm: undefined,
    attemptingTxn: false,
    swapErrorMessage: undefined,
    txHash: undefined,
  })

  const formattedAmounts = useMemo(
    () => ({
      [independentField]: typedValue,
      [dependentField]: showWrap
        ? parsedAmounts[independentField]?.toExact() ?? ''
        : formatTransactionAmount(currencyAmountToPreciseFloat(parsedAmounts[dependentField])),
    }),
    [dependentField, independentField, parsedAmounts, showWrap, typedValue]
  )

  const userHasSpecifiedInputOutput = Boolean(
    currencies[Field.INPUT] && currencies[Field.OUTPUT] && parsedAmounts[independentField]?.greaterThan(JSBI.BigInt(0))
  )

  const permit2Enabled = usePermit2Enabled()
  const maximumAmountIn = useMemo(() => {
    const maximumAmountIn = trade?.maximumAmountIn(allowedSlippage)
    return maximumAmountIn?.currency.isToken ? (maximumAmountIn as CurrencyAmount<Token>) : undefined
  }, [allowedSlippage, trade])
  const permit = usePermit(
    permit2Enabled ? maximumAmountIn : undefined,
    permit2Enabled && chainId ? UNIVERSAL_ROUTER_ADDRESS(chainId) : undefined
  )
  const isApprovalLoading = permit.state === PermitState.APPROVAL_LOADING
  const [isPermitPending, setIsPermitPending] = useState(false)
  const [isPermitFailed, setIsPermitFailed] = useState(false)
  const addTransaction = useTransactionAdder()
  const updatePermit = useCallback(async () => {
    setIsPermitPending(true)
    try {
      const approval = await permit.callback?.()
      if (approval) {
        const { response, info } = approval
        addTransaction(response, info)
      }
      setIsPermitFailed(false)
    } catch (e) {
      console.error(e)
      setIsPermitFailed(true)
    } finally {
      setIsPermitPending(false)
    }
  }, [addTransaction, chainId, maximumAmountIn?.currency.address, maximumAmountIn?.currency.symbol, permit])

  // check whether the user has approved the router on the input token
  const [approvalState, approveCallback] = useApproveCallbackFromTrade(
    permit2Enabled ? undefined : trade,
    allowedSlippage
  )
  const transactionDeadline = useTransactionDeadline()
  const {
    state: signatureState,
    signatureData,
    gatherPermitSignature,
  } = useERC20PermitFromTrade(permit2Enabled ? undefined : trade, allowedSlippage, transactionDeadline)

  const [approvalPending, setApprovalPending] = useState<boolean>(false)
  const handleApprove = useCallback(async () => {
    setApprovalPending(true)
    try {
      if (signatureState === UseERC20PermitState.NOT_SIGNED && gatherPermitSignature) {
        try {
          await gatherPermitSignature()
        } catch (error) {
          // try to approve if gatherPermitSignature failed for any reason other than the user rejecting it
          if (error?.code !== 4001) {
            await approveCallback()
          }
        }
      } else {
        await approveCallback()
      }
    } finally {
      setApprovalPending(false)
    }
  }, [signatureState, gatherPermitSignature, approveCallback, trade?.inputAmount?.currency.symbol])

  // check if user has gone through approval process, used to show two step buttons, reset on token change
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)

  // mark when a user has submitted an approval, reset onTokenSelection for input field
  useEffect(() => {
    if (approvalState === ApprovalState.PENDING) {
      setApprovalSubmitted(true)
    }
  }, [approvalState, approvalSubmitted])

  const maxInputAmount: CurrencyAmount<Currency> | undefined = useMemo(
    () => maxAmountSpend(currencyBalances[Field.INPUT]),
    [currencyBalances]
  )
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))

  // the callback to execute the swap
  const { callback: swapCallback, error: swapCallbackError } = useMarketOrderCallback(
    trade,
    allowedSlippage,
    recipient,
    signatureData,
    permit
  )

  const handleSwap = useCallback(() => {
    if (!swapCallback) {
      return
    }
    if (stablecoinPriceImpact && !confirmPriceImpactWithoutFee(stablecoinPriceImpact)) {
      return
    }
    swapError({ attemptingTxn: true, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: undefined })
    swapCallback()
      .then((hash) => {
        swapError({ attemptingTxn: false, tradeToConfirm, showConfirm, swapErrorMessage: undefined, txHash: hash })
      })
      .catch((error) => {
        swapError({
          attemptingTxn: false,
          tradeToConfirm,
          showConfirm,
          swapErrorMessage: error.message,
          txHash: undefined,
        })
      })
  }, [
    swapCallback,
    stablecoinPriceImpact,
    tradeToConfirm,
    showConfirm,
    recipient,
    recipientAddress,
    account,
    trade?.inputAmount?.currency?.symbol,
    trade?.outputAmount?.currency?.symbol,
  ])

  // errors
  const [swapQuoteReceivedDate, setSwapQuoteReceivedDate] = useState<Date | undefined>()

  // warnings on the greater of fiat value price impact and execution price impact
  const { priceImpactSeverity, largerPriceImpact } = useMemo(() => {
    const marketPriceImpact = trade?.priceImpact ? computeRealizedPriceImpact(trade) : undefined
    const largerPriceImpact = largerPercentValue(marketPriceImpact, stablecoinPriceImpact)
    return { priceImpactSeverity: warningSeverity(largerPriceImpact), largerPriceImpact }
  }, [stablecoinPriceImpact, trade])

  const isArgentWallet = useIsArgentWallet()

  // show approve flow when: no error on inputs, not approved or pending, or approved in current session
  // never show if price impact is above threshold in non expert mode
  const showApproveFlow =
    !permit2Enabled &&
    !isArgentWallet &&
    !marketOrderInputError &&
    (approvalState === ApprovalState.NOT_APPROVED ||
      approvalState === ApprovalState.PENDING ||
      (approvalSubmitted && approvalState === ApprovalState.APPROVED)) &&
    !(priceImpactSeverity > 3 && !isExpertMode)

  const handleConfirmDismiss = useCallback(() => {
    swapError({ showConfirm: false, tradeToConfirm, attemptingTxn, swapErrorMessage, txHash })
    // if there was a tx hash, we want to clear the inputs
    if (txHash) {
      onUserInput(Field.OUTPUT, '')
      onUserInput(Field.INPUT, '')
    }
  }, [attemptingTxn, onUserInput, swapErrorMessage, tradeToConfirm, txHash])

  const handleAcceptChanges = useCallback(() => {
    swapError({ tradeToConfirm: trade, swapErrorMessage, txHash, attemptingTxn, showConfirm })
  }, [attemptingTxn, showConfirm, swapErrorMessage, trade, txHash])

  const handleInputSelect = useCallback(
    (inputCurrency: Currency) => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )

  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
  }, [maxInputAmount, onUserInput])

  const handleOutputSelect = useCallback(
    (outputCurrency: Currency) => onCurrencySelection(Field.OUTPUT, outputCurrency),
    [onCurrencySelection]
  )

  const swapIsUnsupported = useIsSwapUnsupported(currencies[Field.INPUT], currencies[Field.OUTPUT])

  const priceImpactTooHigh = priceImpactSeverity > 3 && !isExpertMode
  const showPriceImpactWarning = largerPriceImpact && priceImpactSeverity > 3

  // Handle time based logging events and event properties.
  useEffect(() => {
    const now = new Date()
    // If a trade exists, and we need to log the receipt of this new swap quote:
    if (newSwapQuoteNeedsLogging && !!trade) {
      // Set the current datetime as the time of receipt of latest swap quote.
      setSwapQuoteReceivedDate(now)
      // Latest swap quote has just been logged, so we don't need to log the current trade anymore
      // unless user inputs change again and a new trade is in the process of being generated.
      setNewSwapQuoteNeedsLogging(false)
      // New quote is not being fetched, so set start time of quote fetch to undefined.
      setFetchingSwapQuoteStartTime(undefined)
    }
    // If another swap quote is being loaded based on changed user inputs:
    if (routeIsLoading) {
      setNewSwapQuoteNeedsLogging(true)
      if (!fetchingSwapQuoteStartTime) setFetchingSwapQuoteStartTime(now)
    }
  }, [
    newSwapQuoteNeedsLogging,
    routeIsSyncing,
    routeIsLoading,
    fetchingSwapQuoteStartTime,
    trade,
    setSwapQuoteReceivedDate,
  ])

  const approveTokenButtonDisabled =
    approvalState !== ApprovalState.NOT_APPROVED || approvalSubmitted || signatureState === UseERC20PermitState.SIGNED

  const showDetailsDropdown = Boolean(
    !showWrap && userHasSpecifiedInputOutput && (trade || routeIsLoading || routeIsSyncing)
  )

  const navigateToLimitOrder = useCallback(() => {
    const params = []
    if(currencies.INPUT) {
      const currency = currencies.INPUT as any
      const address = currency?.tokenInfo?.address || currency?._checksummedAddress
      if(address) params.push(`inputCurrency=${address}`)
    }
    if(currencies.OUTPUT) {
      const currency = currencies.OUTPUT as any
      const address = currency?.tokenInfo?.address || currency?._checksummedAddress
      if(address) params.push(`outputCurrency=${address}`)
    }
    if(formattedAmounts.INPUT) params.push(`exactAmountInput=${formattedAmounts.INPUT}`)
    if(formattedAmounts.OUTPUT) params.push(`exactAmountOutput=${formattedAmounts.OUTPUT}`)
    const link = `/limit_order?${params.join('&')}`
    navigate(link)
  }, [navigate, currencies, formattedAmounts])

  return (
    <Trace page={PageName.SWAP_PAGE} shouldLogImpression={false}>
      <>
        <TokenSafetyModal
          isOpen={importTokensNotInDefault.length > 0 && !dismissTokenWarning}
          tokenAddress={importTokensNotInDefault[0]?.address}
          secondTokenAddress={importTokensNotInDefault[1]?.address}
          onContinue={handleConfirmTokenWarning}
          onCancel={handleDismissTokenWarning}
          showCancel={true}
        />
        <PageWrapper>
          <SwapWrapper className={className} id="swap-page">
            <MarketOrderHeader allowedSlippage={allowedSlippage} />
            <ConfirmMarketOrderModal
              isOpen={showConfirm}
              trade={trade}
              originalTrade={tradeToConfirm}
              onAcceptChanges={handleAcceptChanges}
              attemptingTxn={attemptingTxn}
              txHash={txHash}
              recipient={recipient}
              allowedSlippage={allowedSlippage}
              onConfirm={handleSwap}
              swapErrorMessage={swapErrorMessage}
              onDismiss={handleConfirmDismiss}
              swapQuoteReceivedDate={swapQuoteReceivedDate}
              fiatValueInput={fiatValueInput}
              fiatValueOutput={fiatValueOutput}
            />

            <div style={{ display: 'relative' }}>
              <SwapSection>
                <Trace section={SectionName.CURRENCY_INPUT_PANEL} shouldLogImpression={false}>
                  <SwapCurrencyInputPanel
                    label={
                      independentField === Field.OUTPUT && !showWrap ? (
                        <Trans>From (at most)</Trans>
                      ) : (
                        <Trans>From</Trans>
                      )
                    }
                    value={formattedAmounts[Field.INPUT]}
                    showMaxButton={showMaxButton}
                    currency={currencies[Field.INPUT] ?? null}
                    onUserInput={handleTypeInput}
                    onMax={handleMaxInput}
                    fiatValue={fiatValueInput ?? undefined}
                    onCurrencySelect={handleInputSelect}
                    otherCurrency={currencies[Field.OUTPUT]}
                    showCommonBases={true}
                    id={SectionName.CURRENCY_INPUT_PANEL}
                    loading={independentField === Field.OUTPUT && routeIsSyncing}
                  />
                </Trace>
              </SwapSection>
              <ArrowWrapper clickable={isSupportedChain(chainId)}>
                <TraceEvent
                  events={[BrowserEvent.onClick]}
                  name={EventName.SWAP_TOKENS_REVERSED}
                  element={ElementName.SWAP_TOKENS_REVERSE_ARROW_BUTTON}
                >
                  <ArrowContainer
                    onClick={() => {
                      setApprovalSubmitted(false) // reset 2 step UI for approvals
                      onSwitchTokens()
                    }}
                    color={theme.textPrimary}
                  >
                    <ArrowDown
                      size="16"
                      color={
                        currencies[Field.INPUT] && currencies[Field.OUTPUT] ? theme.textPrimary : theme.textTertiary
                      }
                    />
                  </ArrowContainer>
                </TraceEvent>
              </ArrowWrapper>
            </div>
            <AutoColumn gap="md">
              <div>
                <OutputSwapSection showDetailsDropdown={showDetailsDropdown}>
                  <Trace section={SectionName.CURRENCY_OUTPUT_PANEL} shouldLogImpression={false}>
                    <SwapCurrencyInputPanel
                      value={formattedAmounts[Field.OUTPUT]}
                      onUserInput={handleTypeOutput}
                      label={
                        independentField === Field.INPUT && !showWrap ? <Trans>To (at least)</Trans> : <Trans>To</Trans>
                      }
                      showMaxButton={false}
                      hideBalance={false}
                      fiatValue={fiatValueOutput ?? undefined}
                      priceImpact={stablecoinPriceImpact}
                      currency={currencies[Field.OUTPUT] ?? null}
                      onCurrencySelect={handleOutputSelect}
                      otherCurrency={currencies[Field.INPUT]}
                      showCommonBases={true}
                      id={SectionName.CURRENCY_OUTPUT_PANEL}
                      loading={independentField === Field.INPUT && routeIsSyncing}
                    />
                  </Trace>

                  {recipient !== null && !showWrap ? (
                    <>
                      <AutoRow justify="space-between" style={{ padding: '0 1rem' }}>
                        <ArrowWrapper clickable={false}>
                          <ArrowDown size="16" color={theme.textSecondary} />
                        </ArrowWrapper>
                        <LinkStyledButton id="remove-recipient-button" onClick={() => onChangeRecipient(null)}>
                          <Trans>- Remove recipient</Trans>
                        </LinkStyledButton>
                      </AutoRow>
                      <AddressInputPanel id="recipient" value={recipient} onChange={onChangeRecipient} />
                    </>
                  ) : null}
                </OutputSwapSection>
                {showDetailsDropdown && (
                  <DetailsSwapSection>
                    <SwapDetailsDropdown
                      trade={trade}
                      syncing={routeIsSyncing}
                      loading={routeIsLoading}
                      allowedSlippage={allowedSlippage}
                    />
                  </DetailsSwapSection>
                )}
              </div>
              {showPriceImpactWarning && <PriceImpactWarning priceImpact={largerPriceImpact} />}
              <div>
                {swapIsUnsupported ? (
                  <ButtonPrimary disabled={true}>
                    <ThemedText.DeprecatedMain mb="4px">
                      <Trans>Unsupported Asset</Trans>
                    </ThemedText.DeprecatedMain>
                  </ButtonPrimary>
                ) : !account ? (
                  <TraceEvent
                    events={[BrowserEvent.onClick]}
                    name={EventName.CONNECT_WALLET_BUTTON_CLICKED}
                    properties={{ received_swap_quote: getIsValidMarketOrderQuote(trade, tradeState, marketOrderInputError) }}
                    element={ElementName.CONNECT_WALLET_BUTTON}
                  >
                    <ButtonLight onClick={toggleWalletModal} fontWeight={600}>
                      <Trans>Connect Wallet</Trans>
                    </ButtonLight>
                  </TraceEvent>
                ) : showWrap ? (
                  <ButtonPrimary disabled={Boolean(wrapInputError)} onClick={onWrap} fontWeight={600}>
                    {wrapInputError ? (
                      <WrapErrorText wrapInputError={wrapInputError} />
                    ) : wrapType === WrapType.WRAP ? (
                      <Trans>Wrap</Trans>
                    ) : wrapType === WrapType.UNWRAP ? (
                      <Trans>Unwrap</Trans>
                    ) : null}
                  </ButtonPrimary>
                ) : routeNotFound && userHasSpecifiedInputOutput && !routeIsLoading && !routeIsSyncing ? (
                  <>
                    <GrayCard style={{ textAlign: 'center' }}>
                      <ThemedText.DeprecatedMain mb="4px">
                        <Trans>Insufficient liquidity for this market order.</Trans>
                      </ThemedText.DeprecatedMain>
                    </GrayCard>
                    <div style={{height:"12px"}}/>
                    <ButtonPrimary onClick={navigateToLimitOrder} fontWeight={600}>
                      <Trans>Create a limit order instead</Trans>
                    </ButtonPrimary>
                  </>
                ) : showApproveFlow ? (
                  <AutoRow style={{ flexWrap: 'nowrap', width: '100%' }}>
                    <AutoColumn style={{ width: '100%' }} gap="12px">
                      <ButtonConfirmed
                        fontWeight={600}
                        onClick={handleApprove}
                        disabled={approveTokenButtonDisabled}
                        width="100%"
                        altDisabledStyle={approvalState === ApprovalState.PENDING} // show solid button while waiting
                        confirmed={
                          approvalState === ApprovalState.APPROVED || signatureState === UseERC20PermitState.SIGNED
                        }
                      >
                        <AutoRow justify="space-between" style={{ flexWrap: 'nowrap' }} height="20px">
                          {/* we need to shorten this string on mobile */}
                          {approvalState === ApprovalState.APPROVED || signatureState === UseERC20PermitState.SIGNED ? (
                            <ThemedText.SubHeader width="100%" textAlign="center" color="textSecondary">
                              <Trans>You can now trade {currencies[Field.INPUT]?.symbol}</Trans>
                            </ThemedText.SubHeader>
                          ) : (
                            <ThemedText.SubHeader width="100%" textAlign="center" color="white">
                              <Trans>Allow the Hydrogen Protocol to use your {currencies[Field.INPUT]?.symbol}</Trans>
                            </ThemedText.SubHeader>
                          )}

                          {approvalPending || approvalState === ApprovalState.PENDING ? (
                            <Loader stroke={theme.white} />
                          ) : (approvalSubmitted && approvalState === ApprovalState.APPROVED) ||
                            signatureState === UseERC20PermitState.SIGNED ? (
                            <CheckCircle size="20" color={theme.accentSuccess} />
                          ) : (
                            <MouseoverTooltip
                              text={
                                <Trans>
                                  You must give the Hydrogen smart contracts permission to use your{' '}
                                  {currencies[Field.INPUT]?.symbol}. You only have to do this once per token.
                                </Trans>
                              }
                            >
                              <HelpCircle size="20" color={theme.white} style={{ marginLeft: '8px' }} />
                            </MouseoverTooltip>
                          )}
                        </AutoRow>
                      </ButtonConfirmed>
                      <ButtonError
                        onClick={() => {
                          if (isExpertMode) {
                            handleSwap()
                          } else {
                            swapError({
                              tradeToConfirm: trade,
                              attemptingTxn: false,
                              swapErrorMessage: undefined,
                              showConfirm: true,
                              txHash: undefined,
                            })
                          }
                        }}
                        width="100%"
                        id="swap-button"
                        disabled={
                          !isValid ||
                          routeIsSyncing ||
                          routeIsLoading ||
                          (approvalState !== ApprovalState.APPROVED && signatureState !== UseERC20PermitState.SIGNED) ||
                          priceImpactTooHigh
                        }
                        error={isValid && priceImpactSeverity > 2}
                      >
                        <Text fontSize={16} fontWeight={600}>
                          {priceImpactTooHigh ? (
                            <Trans>High Price Impact</Trans>
                          ) : trade && priceImpactSeverity > 2 ? (
                            <Trans>Place Market Order Anyway</Trans>
                          ) : (
                            <Trans>Place Market Order</Trans>
                          )}
                        </Text>
                      </ButtonError>
                    </AutoColumn>
                  </AutoRow>
                ) : isValid &&
                  (permit.state === PermitState.APPROVAL_OR_PERMIT_NEEDED ||
                    permit.state === PermitState.APPROVAL_LOADING) ? (
                  <ButtonYellow
                    onClick={updatePermit}
                    disabled={isPermitPending || isApprovalLoading}
                    style={{ gap: 14 }}
                  >
                    {isPermitPending ? (
                      <>
                        <Loader size="20px" stroke={theme.accentWarning} />
                        <ThemedText.SubHeader color="accentWarning">
                          <Trans>Approve in your wallet</Trans>
                        </ThemedText.SubHeader>
                      </>
                    ) : isPermitFailed ? (
                      <>
                        <AlertTriangle size={20} stroke={theme.accentWarning} />
                        <ThemedText.SubHeader color="accentWarning">
                          <Trans>Approval failed. Try again.</Trans>
                        </ThemedText.SubHeader>
                      </>
                    ) : isApprovalLoading ? (
                      <>
                        <Loader size="20px" stroke={theme.accentWarning} />
                        <ThemedText.SubHeader color="accentWarning">
                          <Trans>Approval pending</Trans>
                        </ThemedText.SubHeader>
                      </>
                    ) : (
                      <>
                        <div style={{ height: 20 }}>
                          <MouseoverTooltip
                            text={
                              <Trans>
                                Permission is required for Hydrogen to swap each token. This will expire after one month
                                for your security.
                              </Trans>
                            }
                          >
                            <Info size={20} color={theme.accentWarning} />
                          </MouseoverTooltip>
                        </div>
                        <ThemedText.SubHeader color="accentWarning">
                          <Trans>Approve use of {currencies[Field.INPUT]?.symbol}</Trans>
                        </ThemedText.SubHeader>
                      </>
                    )}
                  </ButtonYellow>
                ) : (
                  <ButtonError
                    onClick={() => {
                      if (isExpertMode) {
                        handleSwap()
                      } else {
                        swapError({
                          tradeToConfirm: trade,
                          attemptingTxn: false,
                          swapErrorMessage: undefined,
                          showConfirm: true,
                          txHash: undefined,
                        })
                      }
                    }}
                    id="swap-button"
                    disabled={
                      !isValid ||
                      routeIsSyncing ||
                      routeIsLoading ||
                      priceImpactTooHigh ||
                      (permit2Enabled ? permit.state === PermitState.LOADING : Boolean(swapCallbackError))
                    }
                    error={isValid && priceImpactSeverity > 2 && (permit2Enabled || !swapCallbackError)}
                  >
                    <Text fontSize={20} fontWeight={600}>
                      {marketOrderInputError ? (
                        marketOrderInputError
                      ) : routeIsSyncing || routeIsLoading ? (
                        <Trans>Searching...</Trans>
                      ) : priceImpactTooHigh ? (
                        <Trans>Price Impact Too High</Trans>
                      ) : priceImpactSeverity > 2 ? (
                        <Trans>Place Market Order Anyway</Trans>
                      ) : (
                        <Trans>Place Market Order</Trans>
                      )}
                    </Text>
                  </ButtonError>
                )}
                {isExpertMode && swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
              </div>
            </AutoColumn>
          </SwapWrapper>
          <NetworkAlert />
        </PageWrapper>
        <SwitchLocaleLink />
        {!swapIsUnsupported ? null : (
          <UnsupportedCurrencyFooter
            show={swapIsUnsupported}
            currencies={[currencies[Field.INPUT], currencies[Field.OUTPUT]]}
          />
        )}
      </>
    </Trace>
  )
}
