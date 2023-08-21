import { Trans } from '@lingui/macro'
import { Currency, CurrencyAmount, Percent, TradeType, Price, Token } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import useAutoSlippageTolerance from 'hooks/useAutoSlippageTolerance'
//import { useBestPoolManagement } from 'hooks/useBestPoolManagement'
import { deduplicateArray } from 'lib/utils/arrays'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { ParsedQs } from 'qs'
import { ReactNode, useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { InterfaceTrade, TradeState } from 'state/routing/types'
import { useUserSlippageToleranceWithDefault } from 'state/user/hooks'
import { stringValueIsPositiveFloat } from 'utils/stringValueIsPositiveFloat'

import { TOKEN_SHORTHANDS } from '../../constants/tokens'
import { useCurrencies, useCurrenciesAndNatives, useCurrency, useAllTokens } from '../../hooks/Tokens'
import useENS from '../../hooks/useENS'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import { isAddress } from '../../utils'
import { useCurrencyBalances } from '../connection/hooks'
import { AppState } from '../index'
import { Field, PriceField, PairState, PoolManagementState, replacePoolManagementState, clearPoolManagementState, selectCurrencies, typeInput, depositAmountInput, withdrawAmountInput } from './actions'
import { useNucleusState } from "state/statsApi/hooks"
import { determinePairOrder } from 'pages/Pool/determinePairOrder'
import { formatTransactionAmount, priceToPreciseFloat } from 'utils/formatNumbers'
import HydrogenNucleusHelper from "lib/utils/HydrogenNucleusHelper"
import { formatUnits, Interface } from 'ethers/lib/utils'
import { BigNumber } from '@ethersproject/bignumber'

export function usePoolManagementState(): AppState['poolManagement'] {
  return useAppSelector((state) => state.poolManagement)
}

//onSwitchTokens: (pairIndex: number) => void
//onUserInput: (field: Field, typedValue: string, pairIndex: number) => void
//onChangeRecipient: (recipient: string | null) => void
//onAddNewPair: () => void
export function usePoolManagementActionHandlers(): {
  onReplacePoolManagementState: (newState: PoolManagementState) => void
  onClearPoolManagementState: () => void
  onCurrencySelection: (pairIndex: number, currencyIdBase: string|undefined, currencyIdQuote: string|undefined) => void
  onPriceInput: (pairIndex: number, field: PriceField, typedValue: string) => void
  onDepositAmountInput: (depositIndex: number, amount: string) => void
  onWithdrawAmountInput: (withdrawIndex: number, amount: string) => void
  onChangePoolID: (poolID: string) => void
} {

  const dispatch = useAppDispatch()

  const onReplacePoolManagementState = useCallback(
    (newState: PoolManagementState) => {
      dispatch(replacePoolManagementState({ newState }))
    },
    [dispatch]
  )

  const initialPoolManagementState: PoolManagementState = {
    poolID: "",
    deposits: [],
    withdraws: [],
    pairs: [],
    pairsOriginal: [],
    limitOrder: {currencyIdA: "", currencyIdB: "", typedValueBuyPrice: "", typedValueSellPrice: "", direction: "buy"},
    limitOrderOriginal: {currencyIdA: "", currencyIdB: "", typedValueBuyPrice: "", typedValueSellPrice: "", direction: "buy"},
    recipient: null,
  }

  const onClearPoolManagementState = useCallback(
    () => {
      dispatch(replacePoolManagementState({newState: initialPoolManagementState}))
    },
    [dispatch]
  )

  const onCurrencySelection = useCallback(
    (pairIndex: number, currencyIdBase: string|undefined, currencyIdQuote: string|undefined) => {
      dispatch(
        selectCurrencies({
          pairIndex,
          currencyIdBase,
          currencyIdQuote,
        })
      )
    },
    [dispatch]
  )

  const onPriceInput = useCallback(
    (pairIndex: number, field: PriceField, typedValue: string) => {
      dispatch(typeInput({ pairIndex, field, typedValue }))
    },
    [dispatch]
  )

  const onDepositAmountInput = useCallback(
    (depositIndex: number, typedAmount: string) => {
      dispatch(depositAmountInput({ depositIndex, typedAmount }))
    }, [dispatch]
  )

  const onWithdrawAmountInput = useCallback(
    (withdrawIndex: number, typedAmount: string) => {
      dispatch(withdrawAmountInput({ withdrawIndex, typedAmount }))
    }, [dispatch]
  )

  const currentState = usePoolManagementState()
  //const nucleusState = (useNucleusState()).nucleusState
  const nucleusState = useNucleusState() as any
  const allTokens = useAllTokens()

  const onChangePoolID = useCallback(
    (poolID:string) => {
      if(currentState.poolID == poolID) return
      //console.log(`in onChangePoolID(${poolID}) 1`, {currentState, nucleusState, poolID, allTokens})
      const newState:any = {
        poolID: poolID,
        deposits: [],
        withdraws: [],
        pairs: [],
        pairsOriginal: [],
        limitOrder: {currencyIdA: "", currencyIdB: "", typedValueBuyPrice: "", typedValueSellPrice: "", direction: "buy"},
        limitOrderOriginal: {currencyIdA: "", currencyIdB: "", typedValueBuyPrice: "", typedValueSellPrice: "", direction: "buy"},
        recipient: null,
      }
      if(!nucleusState || !!nucleusState.loading) return
      //console.log(`in onChangePoolID(${poolID}) 2`)
      const pool = nucleusState.pools[poolID]
      if(!pool) return
      //console.log(`in onChangePoolID(${poolID}) 3`)
      const tradeRequests = pool.tradeRequests
      const tokens:any[] = []
      for(const tokenA of Object.keys(tradeRequests)) {
        tokens.push(tokenA)
        for(const tokenB of Object.keys(tradeRequests[tokenA])) {
          tokens.push(tokenB)
        }
      }
      const currencyIds = deduplicateArray(tokens) as string[]
      //console.log(`in onChangePoolID(${poolID}) 4`, {poolID, pool, tradeRequests, currencyIds, allTokens})
      /*
      const currenciesById = useMemo(() => {
        const d = {} as any
        if(!currencyIds || !currencies || currencyIds.length != currencies.length) return d
        for(let i = 0; i < currencies.length; i++) {
          if(!!currencyIds[i] && !!currencies[i]) d[currencyIds[i]] = currencies[i]
        }
        return d
      }, [currencyIds, currencies])
      */
      const currenciesById:any = {}
      /*
      for(let i = 0; i < currencies.length; i++) {
        if(!!currencyIds[i] && !!currencies[i]) d[currencyIds[i]] = currencies[i]
      }
      */
      for(const currencyId of currencyIds) {
        if(!!currencyId && !!allTokens[currencyId]) currenciesById[currencyId] = allTokens[currencyId]
      }
      //console.log(`in onChangePoolID(${poolID}) 4`, {poolID, pool, currencyIds, allTokens, currenciesById})
      const tokenAs = Object.keys(tradeRequests)
      newState.deposits = tokenAs.map((tokenA) => ({currencyId: tokenA, typedAmount: ''}))
      newState.withdraws = tokenAs.map((tokenA) => ({currencyId: tokenA, typedAmount: ''}))
      if(poolID.substring(poolID.length-3) == '001') {
        //console.log("setting up pairs for limit order 1")
        //const newLimitOrder = {currencyIdA: "", currencyIdB: "", typedValuePrice: "", direction: "buy"},
        const tokenAAddress = tokenAs[0]
        const tokenBAddress = Object.keys(pool.tradeRequests[tokenAAddress])[0]
        const [tokenBase, tokenQuote] = determinePairOrder(tokenAAddress, tokenBAddress)

        const curA = currenciesById[tokenAAddress]
        const curB = currenciesById[tokenBAddress]
        if(!curA || !curB) return
        const currencyA = curA.tokenInfo || curA
        const currencyB = curB.tokenInfo || curB
        const exchangeRate = pool.tradeRequests[tokenAAddress][tokenBAddress].exchangeRate
        const er = HydrogenNucleusHelper.decodeExchangeRate(exchangeRate)
        const amounts = HydrogenNucleusHelper.calculateRelativeAmounts(er[0], currencyA.decimals, er[1], currencyB.decimals)
        const amtA = formatUnits(amounts.amountAperB, currencyA.decimals)
        const amtB = formatUnits(amounts.amountBperA, currencyB.decimals)
        //console.log("setting up pairs for limit order 2", {tokenAAddress, tokenBAddress, tokenBase, tokenQuote, currencyA, currencyB, exchangeRate, er, amounts, amtA, amtB})
        /*
        const [typedValueBuyPrice, typedValueSellPrice] = ((tokenAAddress == tokenBase)
          ? [amtA, amtB]
          : [amtB, amtA])
        newLimitOrders.push({
          BASE_TOKEN: { currencyId: tokenBase },
          QUOTE_TOKEN: { currencyId: tokenQuote },
          typedValueBuyPrice,
          typedValueSellPrice,
        })
        */
        const dir = (tokenAAddress == tokenQuote) ? "buy" : "sell"
        //const [dir, val] = ((tokenAAddress == tokenQuote)
          //? ["buy", amtA]
          //: ["sell", amtB])
        /*
        newLimitOrders.push({
          currencyIdA: tokenAAddress,
          currencyIdB: tokenBAddress,
          typedValuePrice: val,
          direction: dir
        })
        newState.limitOrders = newLimitOrders
        newState.limitOrdersOriginal = newLimitOrders
        */
        const newLimitOrder = {
          currencyIdA: tokenAAddress,
          currencyIdB: tokenBAddress,
          typedValueBuyPrice: amtA,
          typedValueSellPrice: amtB,
          direction: dir
        }
        newState.limitOrder = newLimitOrder
        newState.limitOrderOriginal = newLimitOrder
      }
      else if(tokenAs.length == 2) {
        const newPairs:any = []
        const tokenAAddress = tokenAs[0]
        const tokenBAddress = Object.keys(pool.tradeRequests[tokenAAddress])[0]
        const [tokenBase, tokenQuote] = determinePairOrder(tokenAAddress, tokenBAddress)
        const curBase = currenciesById[tokenBase]
        const curQuote = currenciesById[tokenQuote]
        if(!curBase || !curQuote) return
        const currencyBase = curBase.tokenInfo || curBase
        const currencyQuote = curQuote.tokenInfo || curQuote
        const exchangeRateBaseQuote = pool.tradeRequests[tokenBase][tokenQuote].exchangeRate
        const exchangeRateQuoteBase = pool.tradeRequests[tokenQuote][tokenBase].exchangeRate
        const erBaseQuote = HydrogenNucleusHelper.decodeExchangeRate(exchangeRateBaseQuote)
        const erQuoteBase = HydrogenNucleusHelper.decodeExchangeRate(exchangeRateQuoteBase)
        const amountsBaseQuote = HydrogenNucleusHelper.calculateRelativeAmounts(erBaseQuote[0], currencyBase.decimals, erBaseQuote[1], currencyQuote.decimals)
        const amountsQuoteBase = HydrogenNucleusHelper.calculateRelativeAmounts(erQuoteBase[0], currencyQuote.decimals, erQuoteBase[1], currencyBase.decimals)
        const amtBaseSell = formatUnits(amountsBaseQuote.amountBperA, currencyQuote.decimals)
        const amtBaseBuy = formatUnits(amountsQuoteBase.amountAperB, currencyQuote.decimals)
        const [typedValueBuyPrice, typedValueSellPrice] = [amtBaseBuy, amtBaseSell]
        newPairs.push({
          BASE_TOKEN: { currencyId: tokenBase },
          QUOTE_TOKEN: { currencyId: tokenQuote },
          typedValueBuyPrice,
          typedValueSellPrice,
        })
        newState.pairs = newPairs
        newState.pairsOriginal = newPairs
      }
      dispatch(replacePoolManagementState({ newState }))
    },
    [dispatch, currentState, nucleusState, allTokens]
  )

  return {
    onReplacePoolManagementState,
    onClearPoolManagementState,
    onCurrencySelection,
    onPriceInput,
    onDepositAmountInput,
    onWithdrawAmountInput,
    onChangePoolID,
  }
}

const BAD_RECIPIENT_ADDRESSES: { [address: string]: true } = {
  '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f': true, // v2 factory
  '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a': true, // v2 router 01
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': true, // v2 router 02
}

// from the current swap inputs, compute the best trade and return it.
export function useDerivedPoolManagementInfo(): {
  inputError?: ReactNode
  //trade: {
    //trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
    //state: TradeState
  //}
  allowedSlippage: Percent
  currenciesById: any
  currencyBalancesById: any
  atLeastOnePairsInfoFilled: boolean
  allPairsInfoFilled: boolean
  atLeastOneDepositAmountFilled: boolean
  atLeastOneWithdrawAmountFilled: boolean
  isLimitOrderInfoFilled: boolean
} {
  const { account } = useWeb3React()

  const { pairs, deposits, withdraws, recipient, poolID, limitOrder } = usePoolManagementState()
  /*
  const currencyIds = useMemo(() => deduplicateArray(
    pairs
    .map((pair:any) => [pair[Field.BASE_TOKEN].currencyId, pair[Field.QUOTE_TOKEN].currencyId])
    .flat()
    .concat(deposits.map((d:any) => d.currencyId))
    .concat(withdraws.map((w:any) => w.currencyId))
    .filter((x:any) => !!x)
  ), [pairs]) as string[]
  */
  //const nucleusState = (useNucleusState()).nucleusState as any
  const nucleusState = useNucleusState() as any
  const currencyIds = useMemo(() => {
    if(!nucleusState || !!nucleusState.loading) return []
    const pool = nucleusState.pools[poolID]
    if(!pool) return []
    const tradeRequests = pool.tradeRequests
    const tokens:any[] = []
    for(const tokenA of Object.keys(tradeRequests)) {
      tokens.push(tokenA)
      for(const tokenB of Object.keys(tradeRequests[tokenA])) {
        tokens.push(tokenB)
      }
    }
    return deduplicateArray(tokens)
  }, [poolID, nucleusState]) as string[]

  const currencies = useCurrenciesAndNatives(currencyIds)
  //console.log("in pool management order hooks", {currencies, currencyIds})
  const currenciesById = useMemo(() => {
    const d = {} as any
    if(!currencyIds || !currencies || currencyIds.length != currencies.length) return d
    for(let i = 0; i < currencies.length; i++) {
      if(!!currencyIds[i] && !!currencies[i]) d[currencyIds[i]] = currencies[i]
    }
    return d
  }, [currencyIds, currencies])
  //console.log("in pool management order hooks", {currencies, currencyIds, currenciesById})
  const recipientLookup = useENS(recipient ?? undefined)
  const to: string | null = (recipient === null ? account : recipientLookup.address) ?? null

  const currencyBalances = useCurrencyBalances(
    account ?? undefined,
    currencies
  )
  const currencyBalancesById = {} as any
  for(const currencyIndex in currencies) {
    currencyBalancesById[currencyIds[currencyIndex]] = currencyBalances[currencyIndex]
  }

  const parsedDepositAmounts = useMemo(() =>
    deposits.map((deposit:any) => tryParseCurrencyAmount(deposit.typedAmount, currenciesById[deposit.currencyId] ?? undefined))
  , [deposits, currencies])

  const parsedWithdrawAmounts = useMemo(() =>
    withdraws.map((withdraw:any) => tryParseCurrencyAmount(withdraw.typedAmount, currenciesById[withdraw.currencyId] ?? undefined))
  , [withdraws, currencies])

  const inputError = useMemo(() => {
    let inputError: ReactNode | undefined

    if (!account) {
      inputError = <Trans>Connect Wallet</Trans>
    }

    for(let i = 0; i < pairs.length && !inputError; i++) {
      if(!pairs[i].BASE_TOKEN.currencyId || !currenciesById[pairs[i].BASE_TOKEN.currencyId||""] || !pairs[i].QUOTE_TOKEN.currencyId || !currenciesById[pairs[i].QUOTE_TOKEN.currencyId||""]) {
        inputError = inputError ?? <Trans>Select a token</Trans>
      }
    }

    for(let i = 0; i < pairs.length && !inputError; i++) {
      if(!pairs[i].typedValueBuyPrice || !pairs[i].typedValueSellPrice) {
        inputError = inputError ?? <Trans>Enter a buy and sell price</Trans>
      }
    }

    for(let i = 0; i < parsedDepositAmounts.length && !inputError; i++) {
      if(!parsedDepositAmounts[i]) {
        inputError = inputError ?? <Trans>Enter a deposit amount</Trans>
      }
    }

    for(let i = 0; i < parsedWithdrawAmounts.length && !inputError; i++) {
      if(!parsedWithdrawAmounts[i]) {
        inputError = inputError ?? <Trans>Enter a withdraw amount</Trans>
      }
    }

    const formattedTo = isAddress(to)
    if (!to || !formattedTo) {
      inputError = inputError ?? <Trans>Enter a recipient</Trans>
    } else {
      if (BAD_RECIPIENT_ADDRESSES[formattedTo]) {
        inputError = inputError ?? <Trans>Invalid recipient</Trans>
      }
    }

    return inputError
  }, [account, currencies, currenciesById, currencyBalances, pairs, to])

  const atLeastOnePairsInfoFilled = useMemo(() => {
    for(const pair of pairs) {
      if(
        !!pair.BASE_TOKEN.currencyId &&
        !!currenciesById[pair.BASE_TOKEN.currencyId] &&
        !!pair.QUOTE_TOKEN.currencyId &&
        !!currenciesById[pair.QUOTE_TOKEN.currencyId] &&
        stringValueIsPositiveFloat(pair.typedValueBuyPrice) &&
        stringValueIsPositiveFloat(pair.typedValueSellPrice)
      ) return true
    }
    return false
  }, [pairs, currenciesById])

  const allPairsInfoFilled = useMemo(() => {
    for(const pair of pairs) {
      if(
        !pair.BASE_TOKEN.currencyId ||
        !currenciesById[pair.BASE_TOKEN.currencyId] ||
        !pair.QUOTE_TOKEN.currencyId ||
        !currenciesById[pair.QUOTE_TOKEN.currencyId] ||
        !stringValueIsPositiveFloat(pair.typedValueBuyPrice) ||
        !stringValueIsPositiveFloat(pair.typedValueSellPrice)
      ) return false
    }
    return true
  }, [pairs, currenciesById])

  const isLimitOrderInfoFilled = useMemo(() => {
    //console.log('isLimitOrderInfoFilled')
    //console.log(!limitOrder.currencyIdA)
    //console.log(!currenciesById[limitOrder.currencyIdA||''])
    //console.log(!limitOrder.currencyIdB)
    //console.log(!currenciesById[limitOrder.currencyIdB||''])
    //console.log(!limitOrder.typedValueBuyPrice)
    //console.log(!limitOrder.typedValueSellPrice)
    //console.log(!stringValueIsPositiveFloat(limitOrder.typedValueBuyPrice))
    //console.log(!stringValueIsPositiveFloat(limitOrder.typedValueSellPrice))
    //console.log(limitOrder.typedValueBuyPrice)
    //console.log(limitOrder.typedValueSellPrice)
    if(
      !limitOrder.currencyIdA ||
      !currenciesById[limitOrder.currencyIdA||''] ||
      !limitOrder.currencyIdB ||
      !currenciesById[limitOrder.currencyIdB||''] ||
      !limitOrder.typedValueBuyPrice ||
      !limitOrder.typedValueSellPrice ||
      !stringValueIsPositiveFloat(limitOrder.typedValueBuyPrice) ||
      !stringValueIsPositiveFloat(limitOrder.typedValueSellPrice)
    ) return false
    return true
  }, [limitOrder, currenciesById])

  const atLeastOneDepositAmountFilled = useMemo(() => {
    for(const deposit of deposits) {
      if(stringValueIsPositiveFloat(deposit.typedAmount)) return true
    }
    return false
  }, [deposits])

  const atLeastOneWithdrawAmountFilled = useMemo(() => {
    for(const withdraw of withdraws) {
      if(stringValueIsPositiveFloat(withdraw.typedAmount)) return true
    }
    return false
  }, [withdraws])

  return useMemo(() => {
    return {
      inputError: inputError,
      //trade: trade,
      allowedSlippage: new Percent(0),
      currenciesById: currenciesById,
      currencyBalancesById: currencyBalancesById,
      atLeastOnePairsInfoFilled: atLeastOnePairsInfoFilled,
      allPairsInfoFilled: allPairsInfoFilled,
      isLimitOrderInfoFilled: isLimitOrderInfoFilled,
      atLeastOneDepositAmountFilled: atLeastOneDepositAmountFilled,
      atLeastOneWithdrawAmountFilled: atLeastOneWithdrawAmountFilled,
    }
  }, [
    currencyIds, currencies, currenciesById,
    recipientLookup, to,
    currencyBalancesById,
    parsedDepositAmounts,
    parsedWithdrawAmounts,
    inputError,
    atLeastOnePairsInfoFilled,
    isLimitOrderInfoFilled,
    atLeastOneDepositAmountFilled,
    atLeastOneWithdrawAmountFilled,
  ])

}
