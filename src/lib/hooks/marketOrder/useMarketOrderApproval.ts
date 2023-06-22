import { Trade } from '@uniswap/router-sdk'
import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { useWeb3React } from '@web3-react/core'
import { HYDROGEN_NUCLEUS_ADDRESSES } from 'constants/addresses'
import { useMemo } from 'react'

import { useApproval } from '../useApproval'

// wraps useApproveCallback in the context of a swap
export default function useMarketOrderApproval(
  trade: Trade<Currency, Currency, TradeType> | undefined,
  allowedSlippage: Percent,
  useIsPendingApproval: (token?: Token, spender?: string) => boolean,
  amount?: CurrencyAmount<Currency> // defaults to trade.maximumAmountIn(allowedSlippage)
) {
  const { chainId } = useWeb3React()

  const amountToApprove = useMemo(
    () => amount || (trade && trade.inputAmount.currency.isToken ? trade.maximumAmountIn(allowedSlippage) : undefined),
    [amount, trade, allowedSlippage]
  )
  const spender = chainId ? HYDROGEN_NUCLEUS_ADDRESSES[chainId] : undefined

  return useApproval(amountToApprove, spender, useIsPendingApproval)
}
