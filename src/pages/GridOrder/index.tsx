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
import { CurrencyDropdown } from './styled'
import { currencyId } from 'utils/currencyId'
import PriceSelectors from 'components/PriceSelectors'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import CurrencyInputPanel2 from 'components/CurrencyInputPanel/CurrencyInputPanel2'
import { HYDROGEN_NUCLEUS_ADDRESSES } from 'constants/addresses'
import { NUCLEUS_VERSION } from 'constants/index'
import nucleusAbiV100 from 'data/abi/Hydrogen/HydrogenNucleusV100.json'
import nucleusAbiV101 from 'data/abi/Hydrogen/HydrogenNucleusV101.json'
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'
import { formatUnits, Interface } from 'ethers/lib/utils'
import { BigNumber } from '@ethersproject/bignumber'
import type { TransactionResponse } from '@ethersproject/providers'
import { parseUnits } from '@ethersproject/units'
import { AddressZero, WeiPerEther } from '@ethersproject/constants'
import { currencyAmountToString, currencyAmountToBigNumber } from 'lib/utils/currencyAmountToString'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { TransactionType } from 'state/transactions/types'
import { stringValueIsPositiveFloat } from 'utils/stringValueIsPositiveFloat'
import { usePollStatsApiForPoolID } from 'state/statsApi/hooks'
import ConfirmGridOrderModal from 'components/swap/ConfirmGridOrderModal'
import { colors } from 'theme/colors'

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

const MarketPriceText = styled.p`
  color: ${({ theme }) => theme.textSecondary};
  font-size: 13px;
  font-weight: 500;
  margin-top: 12px;
  margin-bottom: 0;
`

const PairCardMessageText = styled.p`
  margin: 0.5rem 0 0 0;
  font-size: 13px;
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

  const { onCurrencySelection, onPriceInput, onDepositAmountInput, onReplaceGridOrderState, onClearGridOrderState } = useGridOrderActionHandlers()

  const { address: recipientAddress } = useENSAddress(recipient)

  const addTransaction = useTransactionAdder()

  // modal and loading
  const [{ showConfirm, errorMessage, attemptingTxn, txHash }, setModalState] = useState<{
    showConfirm: boolean
    attemptingTxn: boolean
    errorMessage: string | undefined
    txHash: string | undefined
  }>({
    showConfirm: false,
    attemptingTxn: false,
    errorMessage: undefined,
    txHash: undefined,
  })

  const handleConfirmDismiss = useCallback(() => {
    setModalState({ showConfirm: false, attemptingTxn, errorMessage, txHash })
    if(!!createdPoolID) setCreatedPoolID(undefined)
  }, [attemptingTxn, errorMessage, txHash])

  const handleCurrencySelect = useCallback(
    (pairIndex:number, field: Field, currencyNew: Currency) => {
      if(pairIndex >= pairs.length) return
      const currencyIdNew = currencyId(currencyNew)
      const pair = pairs[pairIndex]
      let currencyIdBase = pair[Field.BASE_TOKEN].currencyId
      let currencyIdQuote = pair[Field.QUOTE_TOKEN].currencyId
      // normal operation
      if(field == Field.BASE_TOKEN) {
        if(currencyIdQuote == currencyIdNew) { // flip
          currencyIdQuote = currencyIdBase
        }
        currencyIdBase = currencyIdNew // set
      } else {
        if(currencyIdBase == currencyIdNew) { // flip
          currencyIdBase = currencyIdQuote
        }
        currencyIdQuote = currencyIdNew // set
      }
      // selected both gas and wgas
      const gasTokenIds = ['ETH', "0x4200000000000000000000000000000000000006", '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889']
      if(gasTokenIds.includes(currencyIdBase||'') && gasTokenIds.includes(currencyIdQuote||'')) {
        if(field == Field.BASE_TOKEN) currencyIdQuote = undefined
        else currencyIdBase = undefined
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

  const fiatValuesPerToken = depositIndices.map((depositIndex:number) => {
    const currencyAmount = (() => {
      try {
        const deposit = deposits[depositIndex]
        const currency = currenciesById[deposit.currencyId||'']
        const c2 = currency.wrapped
        if(!c2 || !c2.decimals) return undefined
        const value = '1'
        const parsedAmount = parseUnits(value, c2.decimals).toString()
        const currencyAmount = CurrencyAmount.fromRawAmount(c2, parsedAmount)
        return currencyAmount
      } catch(e) {
        return undefined
      }
    })()
    const stablecoinValue = useStablecoinValue(currencyAmount)
    return stablecoinValue
  })

  const fiatValuesForDepositAmount = depositIndices.map((depositIndex:number) => {
    const currencyAmount = (() => {
      try {
        const deposit = deposits[depositIndex]
        const currency = currenciesById[deposit.currencyId||'']
        const value = deposit.typedAmount
        if(!currency || !value) {
          return undefined
        }
        const c1 = currency as any
        const c2 = currency.wrapped || currency
        const decimals = (c2.tokenInfo || c2).decimals
        const parsedAmount = parseUnits(value, decimals).toString()
        const currencyAmount = CurrencyAmount.fromRawAmount(currency, parsedAmount)
        return currencyAmount
      } catch(e) {
        return undefined
      }
    })()
    const stablecoinValue = useStablecoinValue(currencyAmount)
    return stablecoinValue
  })

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
  const nucleusInterfaceV101 = useMemo(() => new Interface(nucleusAbiV101), [nucleusAbiV101])
  const nucleusInterfaceV100 = useMemo(() => new Interface(nucleusAbiV100), [nucleusAbiV100])

  const [createdPoolID, setCreatedPoolID] = useState<number | undefined>(undefined)
  const pollStatsApiForPoolID = usePollStatsApiForPoolID()

  async function handlePlaceGridOrder() {
    // checks
    if (!chainId || !provider || !account) return
    if(!HYDROGEN_NUCLEUS_ADDRESSES[chainId]) return
    if(areAnyDepositsAboveBalances || areAnyTokensAwaitingApproval || !allPairsInfoFilled || !atLeastOneDepositAmountFilled) return
    // encode transaction
    const userExternalLocation = HydrogenNucleusHelper.externalAddressToLocation(account)
    const userInternalLocation = HydrogenNucleusHelper.internalAddressToLocation(account)

    const currencyIds = deposits.map((deposit) => deposit.currencyId).filter(x=>!!x) as string[]

    let gasTokenAmount = '0'
    let calldata = "0x"

    if(NUCLEUS_VERSION == "v1.0.1") {

      const pair = pairs[0]
      const currencyBase = currenciesById[pair[Field.BASE_TOKEN].currencyId||''].wrapped ?? null
      const currencyQuote = currenciesById[pair[Field.QUOTE_TOKEN].currencyId||''].wrapped ?? null
      const currencies = [currencyQuote, currencyBase]
      const tokenSources = currencies.map((cur:any) => {
        let deposit: any
        let found = false
        let depositIndex = 0;
        for(; depositIndex < deposits.length; depositIndex++) {
          deposit = deposits[depositIndex]
          if(deposit.currencyId == cur.address) {
            found = true
            break
          }
        }
        if(!found) {
          depositIndex = 0;
          for(; depositIndex < deposits.length; depositIndex++) {
            deposit = deposits[depositIndex]
            if(deposit.currencyId == cur.address || deposit.currencyId == "ETH" || deposit.currencyId == "MATIC") {
              found = true
              break
            }
          }
        }
        if(!found) {
          console.error("deposit not found 1")
          return undefined
        }
        const parsedAmount = parsedAmounts[depositIndex] as any
        //if(!parsedAmount) return undefined
        const amount = currencyAmountToString(parsedAmount) || '0'
        const currency = currenciesById[deposit.currencyId||'']
        if(!currency) {
          console.error("currency unknown")
          return undefined
        }
        if(currency.isNative) {
          const address = currency.wrapped.address
          gasTokenAmount = amount
          return {
            token: address,
            amount: amount,
          }
        } else {
          const address = currency.address
          return {
            token: address,
            amount: amount,
          }
        }
      })

      const exchangeRates = pairs.map((pair,pairIndex) => {
        const currencyBase = currenciesById[pair[Field.BASE_TOKEN].currencyId||''].wrapped ?? null
        const currencyQuote = currenciesById[pair[Field.QUOTE_TOKEN].currencyId||''].wrapped ?? null
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
        const exchangeRates = [exchangeRateBuy, exchangeRateSell]
        return exchangeRates
      }).flat().filter(x=>!!x)

      if(tokenSources.length == 0 || exchangeRates.length == 0) return
      const params = {
        tokenSources: tokenSources,
        exchangeRates: exchangeRates,
      }
      calldata = nucleusInterfaceV101.encodeFunctionData('createGridOrderPoolCompact', [params])
    }

    else if(NUCLEUS_VERSION == "v1.0.0") {
      const tokenSources = deposits.map((deposit,depositIndex) => {
        const parsedAmount = parsedAmounts[depositIndex] as any
        if(!parsedAmount) return undefined
        const amount = currencyAmountToString(parsedAmount) || '0'
        const currency = currenciesById[deposit.currencyId||'']
        if(currency.isNative) {
          const address = currency.wrapped.address
          gasTokenAmount = amount
          return {
            token: address,
            amount: amount,
            location: userInternalLocation,
          }
        } else {
          const address = currency.address
          return {
            token: address,
            amount: amount,
            location: userExternalLocation,
          }
        }
      }).filter(x=>!!x)

      const tradeRequests = pairs.map((pair,pairIndex) => {
        const currencyBase = currenciesById[pair[Field.BASE_TOKEN].currencyId||''].wrapped ?? null
        const currencyQuote = currenciesById[pair[Field.QUOTE_TOKEN].currencyId||''].wrapped ?? null
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
          tokenA: currenciesById[pair.QUOTE_TOKEN.currencyId||''].wrapped.address,
          tokenB: currenciesById[pair.BASE_TOKEN.currencyId||''].wrapped.address,
          exchangeRate: exchangeRateBuy,
          locationB: HydrogenNucleusHelper.LOCATION_FLAG_POOL,
        },{
          tokenA: currenciesById[pair.BASE_TOKEN.currencyId||''].wrapped.address,
          tokenB: currenciesById[pair.QUOTE_TOKEN.currencyId||''].wrapped.address,
          exchangeRate: exchangeRateSell,
          locationB: HydrogenNucleusHelper.LOCATION_FLAG_POOL,
        }]
        return tradeRequests
      }).flat().filter(x=>!!x)

      if(tokenSources.length == 0 || tradeRequests.length == 0) return
      const params = {
        tokenSources: tokenSources,
        tradeRequests: tradeRequests,
        hptReceiver: account,
      }
      if(gasTokenAmount == "0") {
        calldata = nucleusInterfaceV100.encodeFunctionData('createGridOrderPool', [params])
      } else {
        const wrapcall = nucleusInterfaceV100.encodeFunctionData('wrapGasToken', [userInternalLocation])
        const createcall = nucleusInterfaceV100.encodeFunctionData('createGridOrderPool', [params])
        calldata = nucleusInterfaceV100.encodeFunctionData('multicall', [[wrapcall, createcall]])
      }
    }
    else {
      throw new Error(`cannot encode create grid order for nucleus version ${NUCLEUS_VERSION}`)
    }

    let txn: { to: string; data: string; value: string } = {
      to: HYDROGEN_NUCLEUS_ADDRESSES[chainId],
      data: calldata,
      value: gasTokenAmount,
    }

    if(!!createdPoolID) setCreatedPoolID(undefined)
    setModalState({ attemptingTxn: true, showConfirm, errorMessage: undefined, txHash: undefined })

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
            setModalState({ attemptingTxn: false, showConfirm, errorMessage: undefined, txHash: response.hash })
            addTransaction(response, {
              type: TransactionType.GRID_ORDER,
              currencyIds: currencyIds,
            })
            response.wait(1).then((receipt:any)=> {
              //const poolID = BigNumber.from(receipt.logs[0].topics[1]).toNumber()
              const createEvent = receipt.logs.filter((log:any) => log.topics.includes('0xfa88d81eaffbf548e3ffc6c6458827ce9906ad714060746b80909cdf8d1d7ef7'))[0]
              const poolID = BigNumber.from(createEvent.topics[1]).toNumber()
              setCreatedPoolID(poolID)
              pollStatsApiForPoolID(poolID)
              onClearGridOrderState()
            })
          })
      })
      .catch((error) => {
        console.error('Failed to send transaction', error)
        setModalState({
          attemptingTxn: false,
          showConfirm,
          errorMessage: error.message,
          txHash: undefined,
        })
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

    function currencyIdToUsdcAmount(currencyId:string|undefined) {
      try {
        if(!currencyId) return undefined
        let depositIndex = -1
        for(let i = 0; i < deposits.length; i++) {
          if(deposits[i].currencyId == currencyId) {
            depositIndex = i
            break
          }
        }
        if(depositIndex == -1) return undefined
        const fiatValue = fiatValuesPerToken[depositIndex]
        if(!fiatValue) return undefined
        const usdcAmount = currencyAmountToBigNumber(fiatValue)
        return usdcAmount
      } catch(e) {
        return undefined
      }
    }

    const baseTokenUsdcAmount = currencyIdToUsdcAmount(pair[Field.BASE_TOKEN].currencyId)
    const quoteTokenUsdcAmount = currencyIdToUsdcAmount(pair[Field.QUOTE_TOKEN].currencyId)

    function formatAmount(amount:string) {
      // if integer
      if(!amount.includes('.')) return amount
      // if x < 1
      if(amount[0] == '0') {
        for(let i = 2; i < amount.length; i++) {
          if(amount[i] != '0') {
            return amount.substring(0, i+3)
          }
        }
        return amount
      }
      // if 1 <= x < 100
      if(amount.indexOf('.') <= 2) {
        return amount.substring(0, 4)
      }
      // if x >= 100
      return amount.substring(0, amount.indexOf('.'))
    }

    const priceString = ((baseTokenUsdcAmount && quoteTokenUsdcAmount)
      ? formatAmount(formatUnits(baseTokenUsdcAmount.mul(WeiPerEther).div(quoteTokenUsdcAmount)))
      : undefined
    )

    function tryParseFloat(s: string | undefined) {
      try {
        if(!s) return undefined
        return parseFloat(s)
      } catch(e) {
        return undefined
      }
    }

    const buyPrice2 = tryParseFloat(pair.typedValueBuyPrice)
    const sellPrice2 = tryParseFloat(pair.typedValueSellPrice)
    const marketPrice2 = tryParseFloat(priceString)

    function formatPercent(n: number) {
      let s = `${n * 100}`
      const index = s.indexOf('.')
      if(index >= 0) {
        s = s.substring(0, index)
      }
      return `${s}%`
    }

    const messages = []
    if(buyPrice2 && sellPrice2) {
      if(buyPrice2 > sellPrice2) messages.push({color: colors.red400, text: 'Buy price is greater than sell price'})
      else if(marketPrice2) {
        if(buyPrice2 < marketPrice2 * 0.5) messages.push({color: colors.yellow100, text: `Buy price is ${formatPercent(1-(buyPrice2/marketPrice2))} lower than market price. Are you sure?`})
        else if(buyPrice2 > marketPrice2 * 1.05) messages.push({color: colors.yellow100, text: `Buy price is ${formatPercent((buyPrice2/marketPrice2)-1)} greater than market price. Are you sure?`})
        if(sellPrice2 < marketPrice2 * 0.95) messages.push({color: colors.yellow100, text: `Sell price is ${formatPercent(1-(sellPrice2/marketPrice2))} lower than market price. Are you sure?`})
        else if(sellPrice2 > marketPrice2 * 1.5) messages.push({color: colors.yellow100, text: `Sell price is ${formatPercent((sellPrice2/marketPrice2)-1)} greater than market price. Are you sure?`})
      }
    }

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
                {priceString && (
                  <CenteringDiv>
                    <MarketPriceText>
                      Current market price: {priceString} {currencyQuote?.symbol} per {currencyBase?.symbol}
                    </MarketPriceText>
                  </CenteringDiv>
                )}
                {messages.length > 0 && (
                  <div>
                    <div style={{marginTop:"0.5rem"}}/>
                    {messages.map((message:any,messageIndex:number) => (
                      <CenteringDiv key={messageIndex}>
                        <PairCardMessageText style={{color:message.color}}>
                          {message.text}
                        </PairCardMessageText>
                      </CenteringDiv>
                    ))}
                  </div>
                )}
              </>
            ) : undefined}
          </SwapWrapperInner>
        </SwapWrapper>
      </SwapWrapperWrapper>
    )
  }

  let depositCard = (<></>)
  if(atLeastOnePairsInfoFilled || atLeastOneDepositAmountFilled) {
    const pair = pairs[0]
    const currencyBase = currenciesById[pair[Field.BASE_TOKEN].currencyId||''].wrapped ?? null
    const currencyQuote = currenciesById[pair[Field.QUOTE_TOKEN].currencyId||''].wrapped ?? null
    const currencies = [currencyBase, currencyQuote]
    const tokenSources = currencies.map((cur:any) => {
      let deposit: any
      let found = false
      let depositIndex = 0;
      for(; depositIndex < deposits.length; depositIndex++) {
        deposit = deposits[depositIndex]
        if(deposit.currencyId == cur.address) {
          found = true
          break
        }
      }
      if(!found) {
        depositIndex = 0;
        for(; depositIndex < deposits.length; depositIndex++) {
          deposit = deposits[depositIndex]
          if(deposit.currencyId == cur.address || deposit.currencyId == "ETH" || deposit.currencyId == "MATIC") {
            found = true
            break
          }
        }
      }
      if(!found) {
        console.error("deposit not found 2")
        return undefined
      }

      return (
        <CurrencyInputPanel2
          key={`${depositIndex}_${deposit.currencyId}`}
          value={deposit.typedAmount}
          onUserInput={(amount:string)=>{handleDepositAmountInput(depositIndex, amount)}}
          onMax={()=>{handleDepositAmountInput(depositIndex, maxAmounts[depositIndex]?.toExact()??'')}}
          showMaxButton={!atMaxAmounts[depositIndex]}
          currency={currenciesById[deposit.currencyId||""] ?? null}
          fiatValue={fiatValuesForDepositAmount[depositIndex]}
          id={`deposit-amount-${deposit.currencyId}`}
          isOptional={atLeastOneDepositAmountFilled}
          showCommonBases
          locked={false}
          error={aboveBalances[depositIndex]}
        />
      )
    })
    depositCard = (
      <SwapWrapperWrapper>
        <SwapWrapper className={className} id={`grid-order-deposit-card`}>
          <div style={{margin:"8px 12px"}}>
            <AutoColumn gap="md">
              <RowBetween paddingBottom="20px">
                <ThemedText.DeprecatedLabel>
                  <Trans>Deposit Amounts</Trans>
                </ThemedText.DeprecatedLabel>
              </RowBetween>
              {tokenSources}
            </AutoColumn>
          </div>
        </SwapWrapper>
      </SwapWrapperWrapper>
    )
  }

  const pricesUnorderedButtons = (
    <RowBetween>
      {pairs.map((pair,pairIndex) => {
        if(!arePricesUnordered[pairIndex]) return undefined
        const symbol0 = currenciesById[pair.BASE_TOKEN.currencyId||'']?.tokenInfo.symbol || "token0"
        const symbol1 = currenciesById[pair.QUOTE_TOKEN.currencyId||'']?.tokenInfo.symbol || "token1"
        return (
          <ButtonPrimary
            disabled={true}
            width={'100%'}
            key={pairIndex}
          >
            {symbol0}/{symbol1} prices unordered
          </ButtonPrimary>
        )
      })}
    </RowBetween>
  )

  const insufficientBalanceButtons = (
    <RowBetween>
      {deposits.map((deposit,depositIndex) => {
        if(!aboveBalances[depositIndex]) return undefined
        const currency = currenciesById[deposit.currencyId||'']
        const symbol = (currency.tokenInfo || currency).symbol || "tokens"
        return (
          <ButtonPrimary
            disabled={true}
            width={'100%'}
            key={depositIndex}
          >
            Insufficient {symbol}
          </ButtonPrimary>
        )
      })}
    </RowBetween>
  )

  const tokenApprovalButtons = (
    <RowBetween>
      {deposits.map((deposit,depositIndex) => {
        try {
          const approvalState = approvals[depositIndex][0]
          const currency = currenciesById[deposit.currencyId||'']
          const tokenInfo = currency.tokenInfo || currency
          const symbol = tokenInfo.symbol
          return (approvalState == ApprovalState.NOT_APPROVED || approvalState == ApprovalState.PENDING) && (
            <ButtonPrimary
              onClick={approvals[depositIndex][1]}
              disabled={approvals[depositIndex][0] === ApprovalState.PENDING}
              width={'100%'}
            >
              {approvals[depositIndex][0] === ApprovalState.PENDING ? (
                <Dots>
                  {`Approving ${symbol}`}
                </Dots>
              ) : (
                `Approve ${symbol}`
              )}
            </ButtonPrimary>
          )
        } catch(e) {
          return undefined
        }
      })}
    </RowBetween>
  )

  const placeGridOrderButton = (
    <RowBetween>
      <ButtonError
        onClick={() => {
          setModalState({
            attemptingTxn: false,
            errorMessage: undefined,
            showConfirm: true,
            txHash: undefined,
          })
        }}
        disabled={false}
        error={false}
      >
        Place Grid Order
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
      <ConfirmGridOrderModal
        isOpen={showConfirm}
        trade={undefined}
        fiatValues={fiatValuesForDepositAmount}
        attemptingTxn={attemptingTxn}
        txHash={txHash}
        recipient={recipient}
        onConfirm={handlePlaceGridOrder}
        swapErrorMessage={errorMessage}
        onDismiss={handleConfirmDismiss}
        createdPoolID={createdPoolID}
      />
      {pairs.map(pairCard)}
      {depositCard}
      {buttons}
    </PageWrapper>
  )
}
