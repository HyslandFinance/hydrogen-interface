import { Trans } from '@lingui/macro'
import { Fraction, TradeType } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import {
  AddLiquidityV3PoolTransactionInfo,
  ApproveTransactionInfo,
  ClaimTransactionInfo,
  CollectFeesTransactionInfo,
  ExactInputSwapTransactionInfo,
  ExactOutputSwapTransactionInfo,
  RemoveLiquidityV3TransactionInfo,
  TransactionInfo,
  TransactionType,
  WrapTransactionInfo,
  LimitOrderTransactionInfo,
  FaucetDripTransactionInfo,
  GridOrderTransactionInfo,
  DepositTransactionInfo,
  WithdrawTransactionInfo,
  SetPricesTransactionInfo,
} from 'state/transactions/types'
import styled from 'styled-components/macro'

import { nativeOnChain } from '../../constants/tokens'
import { useCurrency, useToken } from '../../hooks/Tokens'
import useENSName from '../../hooks/useENSName'
import { shortenAddress } from '../../utils'
import { TransactionState } from './index'

const HighlightText = styled.span`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: 600;
`

const BodyWrap = styled.div`
  line-height: 20px;
`

interface ActionProps {
  pending: JSX.Element
  success: JSX.Element
  failed: JSX.Element
  transactionState: TransactionState
}

const Action = ({ pending, success, failed, transactionState }: ActionProps) => {
  switch (transactionState) {
    case TransactionState.Failed:
      return failed
    case TransactionState.Success:
      return success
    default:
      return pending
  }
}

//const formatAmount = (amountRaw: string, decimals: number, sigFigs: number): string =>
  //new Fraction(amountRaw, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))).toSignificant(sigFigs)
const formatAmount = (amountRaw: string, decimals: number, sigFigs: number): string => {
  //console.log("TransactionBody.formatAmount() 1", {amountRaw, decimals, sigFigs})

  //console.log("formatAmount() 1", {amountRaw, decimals, sigFigs})
  //console.log("formatAmount() 2", {amountRaw, decimals, sigFigs, exp: JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))})
  const formattedAmount = new Fraction(amountRaw, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))).toSignificant(sigFigs)
  return formattedAmount

  //return ''
}

const FailedText = ({ transactionState }: { transactionState: TransactionState }) =>
  transactionState === TransactionState.Failed ? <Trans>failed</Trans> : <span />

const FormattedCurrency = ({
  currencyId,
}: {
  currencyId: string
}) => {
  const currency = useCurrency(currencyId)

  return currency ? (
    <HighlightText>
      {currency.symbol}
    </HighlightText>
  ) : null
}

const FormattedCurrencyAmount = ({
  rawAmount,
  currencyId,
}: {
  rawAmount: string
  currencyId: string
  sigFigs: number
}) => {
  const currency = useCurrency(currencyId)
  console.log("FormattedCurrencyAmount", {rawAmount, currencyId, currency})

  return currency ? (
    <HighlightText>
      {formatAmount(rawAmount, currency.decimals, /* sigFigs= */ 6)} {currency.symbol}
    </HighlightText>
  ) : null
}

const getRawAmounts = (
  info: ExactInputSwapTransactionInfo | ExactOutputSwapTransactionInfo
): { rawAmountFrom: string; rawAmountTo: string } => {
  return info.tradeType === TradeType.EXACT_INPUT
    ? { rawAmountFrom: info.inputCurrencyAmountRaw, rawAmountTo: info.expectedOutputCurrencyAmountRaw }
    : { rawAmountFrom: info.expectedInputCurrencyAmountRaw, rawAmountTo: info.outputCurrencyAmountRaw }
}

const SwapSummary = ({
  info,
  transactionState,
}: {
  info: ExactInputSwapTransactionInfo | ExactOutputSwapTransactionInfo
  transactionState: TransactionState
}) => {
  const actionProps = {
    transactionState,
    pending: <Trans>Placing market order</Trans>,
    success: <Trans>Placed market order</Trans>,
    failed: <Trans>Place market order</Trans>,
  }
  const { rawAmountFrom, rawAmountTo } = getRawAmounts(info)

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      <FormattedCurrencyAmount rawAmount={rawAmountFrom} currencyId={info.inputCurrencyId} sigFigs={2} />{' '}
      <Trans>for </Trans>{' '}
      <FormattedCurrencyAmount rawAmount={rawAmountTo} currencyId={info.outputCurrencyId} sigFigs={2} />{' '}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const AddLiquidityV3PoolSummary = ({
  info,
  transactionState,
}: {
  info: AddLiquidityV3PoolTransactionInfo
  transactionState: TransactionState
}) => {
  const { createPool, quoteCurrencyId, baseCurrencyId } = info

  const actionProps = {
    transactionState,
    pending: <Trans>Adding</Trans>,
    success: <Trans>Added</Trans>,
    failed: <Trans>Add</Trans>,
  }

  return (
    <BodyWrap>
      {createPool ? (
        <CreateV3PoolSummary info={info} transactionState={transactionState} />
      ) : (
        <>
          <Action {...actionProps} />{' '}
          <FormattedCurrencyAmount rawAmount={info.expectedAmountBaseRaw} currencyId={baseCurrencyId} sigFigs={2} />{' '}
          <Trans>and</Trans>{' '}
          <FormattedCurrencyAmount rawAmount={info.expectedAmountQuoteRaw} currencyId={quoteCurrencyId} sigFigs={2} />
        </>
      )}{' '}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const RemoveLiquidityV3Summary = ({
  info: { baseCurrencyId, quoteCurrencyId, expectedAmountBaseRaw, expectedAmountQuoteRaw },
  transactionState,
}: {
  info: RemoveLiquidityV3TransactionInfo
  transactionState: TransactionState
}) => {
  const actionProps = {
    transactionState,
    pending: <Trans>Removing</Trans>,
    success: <Trans>Removed</Trans>,
    failed: <Trans>Remove</Trans>,
  }

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      <FormattedCurrencyAmount rawAmount={expectedAmountBaseRaw} currencyId={baseCurrencyId} sigFigs={2} />{' '}
      <Trans>and</Trans>{' '}
      <FormattedCurrencyAmount rawAmount={expectedAmountQuoteRaw} currencyId={quoteCurrencyId} sigFigs={2} />{' '}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const CreateV3PoolSummary = ({
  info: { baseCurrencyId, quoteCurrencyId },
  transactionState,
}: {
  info: AddLiquidityV3PoolTransactionInfo
  transactionState: TransactionState
}) => {
  const baseCurrency = useCurrency(baseCurrencyId)
  const quoteCurrency = useCurrency(quoteCurrencyId)
  const actionProps = {
    transactionState,
    pending: <Trans>Creating</Trans>,
    success: <Trans>Created</Trans>,
    failed: <Trans>Create</Trans>,
  }

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      <HighlightText>
        {baseCurrency?.symbol}/{quoteCurrency?.symbol}{' '}
      </HighlightText>
      <Trans>Pool</Trans> <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const CollectFeesSummary = ({
  info,
  transactionState,
}: {
  info: CollectFeesTransactionInfo
  transactionState: TransactionState
}) => {
  const { currencyId0, expectedCurrencyOwed0 = '0', expectedCurrencyOwed1 = '0', currencyId1 } = info
  const actionProps = {
    transactionState,
    pending: <Trans>Collecting</Trans>,
    success: <Trans>Collected</Trans>,
    failed: <Trans>Collect</Trans>,
  }

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      <FormattedCurrencyAmount rawAmount={expectedCurrencyOwed0} currencyId={currencyId0} sigFigs={2} />{' '}
      <Trans>and</Trans>{' '}
      <FormattedCurrencyAmount rawAmount={expectedCurrencyOwed1} currencyId={currencyId1} sigFigs={2} />{' '}
      <Trans>fees</Trans> <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const ApprovalSummary = ({
  info,
  transactionState,
}: {
  info: ApproveTransactionInfo
  transactionState: TransactionState
}) => {
  const token = useToken(info.tokenAddress)
  const actionProps = {
    transactionState,
    pending: <Trans>Approving</Trans>,
    success: <Trans>Approved</Trans>,
    failed: <Trans>Approve</Trans>,
  }

  return (
    <BodyWrap>
      <Action {...actionProps} /> <HighlightText>{token?.symbol}</HighlightText>{' '}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const ClaimSummary = ({
  info: { recipient, uniAmountRaw },
  transactionState,
}: {
  info: ClaimTransactionInfo
  transactionState: TransactionState
}) => {
  const { ENSName } = useENSName()
  const actionProps = {
    transactionState,
    pending: <Trans>Claiming</Trans>,
    success: <Trans>Claimed</Trans>,
    failed: <Trans>Claim</Trans>,
  }

  return (
    <BodyWrap>
      {uniAmountRaw && (
        <>
          <Action {...actionProps} />{' '}
          <HighlightText>
            {formatAmount(uniAmountRaw, 18, 4)}
            UNI{' '}
          </HighlightText>{' '}
          <Trans>for</Trans> <HighlightText>{ENSName ?? shortenAddress(recipient)}</HighlightText>
        </>
      )}{' '}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const WrapSummary = ({
  info: { chainId, currencyAmountRaw, unwrapped },
  transactionState,
}: {
  info: WrapTransactionInfo
  transactionState: TransactionState
}) => {
  const native = chainId ? nativeOnChain(chainId) : undefined
  const from = unwrapped ? native?.wrapped.symbol ?? 'WETH' : native?.symbol ?? 'ETH'
  const to = unwrapped ? native?.symbol ?? 'ETH' : native?.wrapped.symbol ?? 'WETH'

  const amount = formatAmount(currencyAmountRaw, 18, 6)
  const actionProps = unwrapped
    ? {
        transactionState,
        pending: <Trans>Unwrapping</Trans>,
        success: <Trans>Unwrapped</Trans>,
        failed: <Trans>Unwrap</Trans>,
      }
    : {
        transactionState,
        pending: <Trans>Wrapping</Trans>,
        success: <Trans>Wrapped</Trans>,
        failed: <Trans>Wrap</Trans>,
      }

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      <HighlightText>
        {amount} {from}
      </HighlightText>{' '}
      <Trans>to</Trans>{' '}
      <HighlightText>
        {amount} {to}
      </HighlightText>{' '}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const LimitOrderSummary = ({
  info,
  transactionState,
}: {
  info: LimitOrderTransactionInfo
  transactionState: TransactionState
}) => {
  const actionProps = {
    transactionState,
    pending: <Trans>Placing limit order</Trans>,
    success: <Trans>Placed limit order</Trans>,
    failed: <Trans>Place limit order</Trans>,
  }

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      <FormattedCurrencyAmount rawAmount={info.inputCurrencyAmountRaw} currencyId={info.inputCurrencyId} sigFigs={2} />{' '}
      <Trans>for </Trans>{' '}
      <FormattedCurrencyAmount rawAmount={info.outputCurrencyAmountRaw} currencyId={info.outputCurrencyId} sigFigs={2} />{' '}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const FaucetDripSummary = ({
  info,
  transactionState,
}: {
  info: FaucetDripTransactionInfo
  transactionState: TransactionState
}) => {
  const actionProps = {
    transactionState,
    pending: <Trans>Dripping</Trans>,
    success: <Trans>Dripped</Trans>,
    failed: <Trans>Drip</Trans>,
  }

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      <FormattedCurrency currencyId={info.tokenAddress} />{' '}
      <Trans>from testnet faucet</Trans>
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const GridOrderSummary = ({
  info,
  transactionState,
}: {
  info: GridOrderTransactionInfo
  transactionState: TransactionState
}) => {
  const actionProps = {
    transactionState,
    pending: <Trans>Placing grid order with</Trans>,
    success: <Trans>Placed grid order with</Trans>,
    failed: <Trans>Place grid order with</Trans>,
  }

  const formattedCurrencies = info.currencyIds.map(currencyId => (
    <FormattedCurrency currencyId={currencyId} />
  ))

  const len = info.currencyIds.length
  const items = len == 0 ? [] : len == 1 ? ([
    formattedCurrencies[0],
    ' '
  ]) : len == 2 ? ([
    formattedCurrencies[0],
    ' ',
    <Trans>and </Trans>,
    ' ',
    formattedCurrencies[1],
    ' ',
  ]) : ([
    formattedCurrencies.map((cur,i) => {
      return [
        cur, ' ',
        <Trans>{(i == formattedCurrencies.length - 2) ? ', and ' : (i < formattedCurrencies.length - 1) ? ', ' : undefined}</Trans>,
        , ' '
      ]
    }).flat().filter(x=>!!x)
  ])

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      {items}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const DepositSummary = ({
  info,
  transactionState,
}: {
  info: DepositTransactionInfo
  transactionState: TransactionState
}) => {
  const actionProps = {
    transactionState,
    pending: <Trans>Depositing</Trans>,
    success: <Trans>Deposited</Trans>,
    failed: <Trans>Deposit</Trans>,
  }

  //console.log("TransactionBody.DepositSummary()", {info, transactionState})
  /*
  const list = [] as any[]
  for(let i = 0; i < info.currencyIds.length; i++) {
    list.push(<FormattedCurrencyAmount rawAmount={info.currencyAmountRaws[i]} currencyId={info.currencyIds[i]} sigFigs={2} />)
    if(i < info.currencyIds.length - 1) list.push(', ')
    else list.push(' ')
  }
  */
  const list0 = [] as any[]
  for(let i = 0; i < info.currencyIds.length; i++) {
    try {
      list0.push(<FormattedCurrencyAmount rawAmount={info.currencyAmountRaws[i]} currencyId={info.currencyIds[i]} sigFigs={2} />)
    } catch(e) {}
  }

  const list1 = [] as any[]
  for(let i = 0; i < list0.length; i++) {
    list1.push(list0[i])
    if(i < list0.length - 1) list1.push(', ')
    else list1.push(' ')
  }

  const list2 = list1.map((item,index)=>(<span key={index}>{item}</span>))

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      {list2}
      {` into pool ${info.poolID}`}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const WithdrawSummary = ({
  info,
  transactionState,
}: {
  info: WithdrawTransactionInfo
  transactionState: TransactionState
}) => {
  const actionProps = {
    transactionState,
    pending: <Trans>Withdrawing</Trans>,
    success: <Trans>Withdrew</Trans>,
    failed: <Trans>Withdraw</Trans>,
  }

  //console.log("TransactionBody.WithdrawSummary()", {info, transactionState})
  /*
  const list = [] as any[]
  for(let i = 0; i < info.currencyIds.length; i++) {
    list.push(<FormattedCurrencyAmount rawAmount={info.currencyAmountRaws[i]} currencyId={info.currencyIds[i]} sigFigs={2} />)
    if(i < info.currencyIds.length - 1) list.push(', ')
    else list.push(' ')
  }

  const list2 = list.map((item,index)=>(<span key={index}>{item}</span>))
  */

  const list0 = [] as any[]
  for(let i = 0; i < info.currencyIds.length; i++) {
    try {
      list0.push(<FormattedCurrencyAmount rawAmount={info.currencyAmountRaws[i]} currencyId={info.currencyIds[i]} sigFigs={2} />)
    } catch(e) {}
  }

  const list1 = [] as any[]
  for(let i = 0; i < list0.length; i++) {
    list1.push(list0[i])
    if(i < list0.length - 1) list1.push(', ')
    else list1.push(' ')
  }

  const list2 = list1.map((item,index)=>(<span key={index}>{item}</span>))

  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}
      {list2}
      {` from pool ${info.poolID}`}
      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const SetPricesSummary = ({
  info,
  transactionState,
}: {
  info: SetPricesTransactionInfo
  transactionState: TransactionState
}) => {
  const actionProps = {
    transactionState,
    pending: <Trans>Setting prices</Trans>,
    success: <Trans>Prices set</Trans>,
    failed: <Trans>Set prices</Trans>,
  }

  //console.log("TransactionBody.SetPricesSummary()", {info, transactionState})
  /*
  const list = [] as any[]
  for(let i = 0; i < info.currencyIds.length; i++) {
    list.push(<FormattedCurrencyAmount rawAmount={info.currencyAmountRaws[i]} currencyId={info.currencyIds[i]} sigFigs={2} />)
    if(i < info.currencyIds.length - 1) list.push(', ')
    else list.push(' ')
  }

  {list}
  {` into pool ${info.poolID}`}
  */
  return (
    <BodyWrap>
      <Action {...actionProps} />{' '}

      <FailedText transactionState={transactionState} />
    </BodyWrap>
  )
}

const TransactionBody = ({ info, transactionState }: { info: TransactionInfo; transactionState: TransactionState }) => {
  switch (info.type) {
    case TransactionType.SWAP:
      return <SwapSummary info={info} transactionState={transactionState} />
    case TransactionType.ADD_LIQUIDITY_V3_POOL:
      return <AddLiquidityV3PoolSummary info={info} transactionState={transactionState} />
    case TransactionType.REMOVE_LIQUIDITY_V3:
      return <RemoveLiquidityV3Summary info={info} transactionState={transactionState} />
    case TransactionType.WRAP:
      return <WrapSummary info={info} transactionState={transactionState} />
    case TransactionType.COLLECT_FEES:
      return <CollectFeesSummary info={info} transactionState={transactionState} />
    case TransactionType.APPROVAL:
      return <ApprovalSummary info={info} transactionState={transactionState} />
    case TransactionType.CLAIM:
      return <ClaimSummary info={info} transactionState={transactionState} />
    case TransactionType.LIMIT_ORDER:
      return <LimitOrderSummary info={info} transactionState={transactionState} />
    case TransactionType.FAUCET_DRIP:
      return <FaucetDripSummary info={info} transactionState={transactionState} />
    case TransactionType.GRID_ORDER:
      return <GridOrderSummary info={info} transactionState={transactionState} />
    case TransactionType.DEPOSIT:
      return <DepositSummary info={info} transactionState={transactionState} />
    case TransactionType.WITHDRAW:
      return <WithdrawSummary info={info} transactionState={transactionState} />
    //case TransactionType.SET_PRICES:
      //return <SetPricesSummary info={info} transactionState={transactionState} />
    default:
      return <span />
  }
}

export default TransactionBody
