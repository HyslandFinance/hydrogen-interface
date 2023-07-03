import { Trans } from '@lingui/macro'
import { Currency, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import useAutoSlippageTolerance from 'hooks/useAutoSlippageTolerance'
import { useBestGridOrder } from 'hooks/useBestGridOrder'
import { deduplicateArray } from 'lib/utils/arrays'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { ParsedQs } from 'qs'
import { ReactNode, useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from 'state/hooks'
import { InterfaceTrade, TradeState } from 'state/routing/types'
import { useUserSlippageToleranceWithDefault } from 'state/user/hooks'
import { stringValueIsPositiveFloat } from 'utils/stringValueIsPositiveFloat'

import { TOKEN_SHORTHANDS } from '../../constants/tokens'
import { useCurrencies, useCurrency } from '../../hooks/Tokens'
import useENS from '../../hooks/useENS'
import useParsedQueryString from '../../hooks/useParsedQueryString'
import { isAddress } from '../../utils'
import { useCurrencyBalances } from '../connection/hooks'
import { AppState } from '../index'
import { Field, PriceField, PairState, GridOrderState, replaceGridOrderState, selectCurrencies, typeInput, depositAmountInput } from './actions'

export function useGridOrderState(): AppState['gridOrder'] {
  return useAppSelector((state) => state.gridOrder)
}

//onSwitchTokens: (pairIndex: number) => void
//onUserInput: (field: Field, typedValue: string, pairIndex: number) => void
//onChangeRecipient: (recipient: string | null) => void
//onAddNewPair: () => void
export function useGridOrderActionHandlers(): {
  onReplaceGridOrderState: (newState: GridOrderState) => void
  onCurrencySelection: (pairIndex: number, currencyIdBase: string|undefined, currencyIdQuote: string|undefined) => void
  onPriceInput: (pairIndex: number, field: PriceField, typedValue: string) => void
  onDepositAmountInput: (depositIndex: number, amount: string) => void
} {

  const dispatch = useAppDispatch()

  const onReplaceGridOrderState = useCallback(
    (newState: GridOrderState) => {
      dispatch(replaceGridOrderState({ newState }))
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

  return {
    onReplaceGridOrderState,
    onCurrencySelection,
    onPriceInput,
    onDepositAmountInput,
  }
}

const BAD_RECIPIENT_ADDRESSES: { [address: string]: true } = {
  '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f': true, // v2 factory
  '0xf164fC0Ec4E93095b804a4795bBe1e041497b92a': true, // v2 router 01
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D': true, // v2 router 02
}

// from the current swap inputs, compute the best trade and return it.
export function useDerivedGridOrderInfo(): {
  inputError?: ReactNode
  trade: {
    trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
    state: TradeState
  }
  allowedSlippage: Percent
  currenciesById: any
  currencyBalancesById: any
  atLeastOnePairsInfoFilled: boolean
  allPairsInfoFilled: boolean
  atLeastOneDepositAmountFilled: boolean
} {
  const { account } = useWeb3React()

  const { pairs, deposits, recipient } = useGridOrderState()

  const currencyIds = useMemo(() => deduplicateArray(
    pairs
    .map((pair:any) => [pair[Field.BASE_TOKEN].currencyId, pair[Field.QUOTE_TOKEN].currencyId])
    .flat()
    .concat(deposits.map((d:any) => d.currencyId))
    .filter((x:any) => !!x)
  ), [pairs]) as string[]

  const currencies = useCurrencies(currencyIds)
  const currenciesById = useMemo(() => {
    const d = {} as any
    if(!currencyIds || !currencies || currencyIds.length != currencies.length) return d
    for(let i = 0; i < currencies.length; i++) {
      if(!!currencyIds[i] && !!currencies[i]) d[currencyIds[i]] = currencies[i]
    }
    return d
  }, [currencyIds, currencies])

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


  const trade = useBestGridOrder(
    pairs,
    parsedDepositAmounts,
  )

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

  const atLeastOneDepositAmountFilled = useMemo(() => {
    for(const deposit of deposits) {
      if(stringValueIsPositiveFloat(deposit.typedAmount)) return true
    }
    return false
  }, [deposits])

  return useMemo(() => {
    return {
      inputError: inputError,
      trade: trade,
      allowedSlippage: new Percent(0),
      currenciesById: currenciesById,
      currencyBalancesById: currencyBalancesById,
      atLeastOnePairsInfoFilled: atLeastOnePairsInfoFilled,
      allPairsInfoFilled: allPairsInfoFilled,
      atLeastOneDepositAmountFilled: atLeastOneDepositAmountFilled,
    }
  }, [
    currencyIds, currencies, currenciesById,
    recipientLookup, to,
    currencyBalancesById,
    parsedDepositAmounts,
    trade,
    inputError,
    atLeastOnePairsInfoFilled,
    atLeastOneDepositAmountFilled
  ])

}
