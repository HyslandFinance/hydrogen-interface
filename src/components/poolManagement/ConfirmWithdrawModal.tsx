import { Trans } from '@lingui/macro'
import { Trace } from '@uniswap/analytics'
import { ModalName } from '@uniswap/analytics-events'
import { Trade } from '@uniswap/router-sdk'
import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { useDerivedPoolManagementInfo, usePoolManagementState } from 'state/poolManagement/hooks'
import { InterfaceTrade } from 'state/routing/types'
import { tradeMeaningfullyDiffers } from 'utils/tradeMeaningFullyDiffer'

import TransactionConfirmationModal, {
  ConfirmationModalContent,
  TransactionErrorContent,
} from '../TransactionConfirmationModal'
import WithdrawModalFooter from './WithdrawModalFooter'
import WithdrawModalHeader from './WithdrawModalHeader'

export default function ConfirmWithdrawModal({
  trade,
  fiatValues,
  onConfirm,
  onDismiss,
  recipient,
  swapErrorMessage,
  isOpen,
  attemptingTxn,
  txHash,
  poolID,
}: {
  isOpen: boolean
  trade: InterfaceTrade<Currency, Currency, TradeType> | undefined
  fiatValues: any[]
  attemptingTxn: boolean
  txHash: string | undefined
  recipient: string | null
  onConfirm: () => void
  swapErrorMessage: ReactNode | undefined
  onDismiss: () => void
  poolID?: number | undefined
}) {
  // shouldLogModalCloseEvent lets the child WithdrawModalHeader component know when modal has been closed
  // and an event triggered by modal closing should be logged.
  const [shouldLogModalCloseEvent, setShouldLogModalCloseEvent] = useState(false)
  const showAcceptChanges = false

  // swap state
  const { withdraws } = usePoolManagementState()
  const { currenciesById } = useDerivedPoolManagementInfo()

  const onModalDismiss = useCallback(() => {
    if (isOpen) setShouldLogModalCloseEvent(true)
    onDismiss()
  }, [isOpen, onDismiss])

  const modalHeader = useCallback(() => {
    return (
      <WithdrawModalHeader
        fiatValues={fiatValues}
        recipient={recipient}
      />
    )
  }, [recipient, trade, shouldLogModalCloseEvent, fiatValues])

  const modalBottom = useCallback(() => {
    return (
      <WithdrawModalFooter
        onConfirm={onConfirm}
        disabledConfirm={showAcceptChanges}
        swapErrorMessage={swapErrorMessage}
      />
    )
  }, [
    onConfirm,
    showAcceptChanges,
    swapErrorMessage,
    trade,
  ])

  const withdraws2 = withdraws.filter((withdraw:any) => (!!withdraw.currencyId && !!withdraw.typedAmount && parseFloat(withdraw.typedAmount) > 0))

  // text to show while loading
  //console.log("in ConfirmWithdrawModal", {withdraws, currenciesById})
  const symbolList = withdraws2.map((withdraw:any) => {
    try {
      const c1 = currenciesById[withdraw.currencyId]
      const c2 = c1.tokenInfo || c1
      const sym = c2.symbol
      //return sym
      return `${withdraw.typedAmount} ${sym}`
    } catch(e) {
      //return 'ETH'
      return `${withdraw.typedAmount} ETH`
    }
  })
  const tokenList = (
    withdraws2.length == 0 ? 'no tokens' :
    withdraws2.length == 1 ? symbolList[0] :
    withdraws2.length == 2 ? `${symbolList[0]} and ${symbolList[1]}` :
    symbolList.map((symbol:string,index:number) => (
      index >= symbolList.length-1
      ? [symbol]
      : index == symbolList.length-2
      ? [symbol, ', and ']
      : [symbol, ', ']
    )).flat().filter(x=>!!x).join('')
  )
  //console.log("ConfirmWithdrawModal()", {withdraws, symbolList, tokenList, currenciesById})
  //const amount = formatAmount()
  const pendingText = `Withdrawing ${tokenList}${poolID && ` from pool ${poolID}`}`

  const confirmationContent = useCallback(
    () =>
      swapErrorMessage ? (
        <TransactionErrorContent onDismiss={onModalDismiss} message={swapErrorMessage} />
      ) : (
        <ConfirmationModalContent
          title={<Trans>Confirm Withdraw</Trans>}
          onDismiss={onModalDismiss}
          topContent={modalHeader}
          bottomContent={modalBottom}
        />
      ),
    [onModalDismiss, modalBottom, modalHeader, swapErrorMessage]
  )

  return (
    <TransactionConfirmationModal
      isOpen={isOpen}
      onDismiss={onModalDismiss}
      attemptingTxn={attemptingTxn}
      hash={txHash}
      content={confirmationContent}
      pendingText={pendingText}
      currencyToAdd={trade?.outputAmount.currency}
    />
  )
}
