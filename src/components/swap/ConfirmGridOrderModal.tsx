import { Trans } from '@lingui/macro'
import { Trace } from '@uniswap/analytics'
import { ModalName } from '@uniswap/analytics-events'
import { Trade } from '@uniswap/router-sdk'
import { Currency, CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core'
import { ReactNode, useCallback, useMemo, useState } from 'react'
import { useDerivedGridOrderInfo, useGridOrderState } from 'state/gridOrder/hooks'
import { InterfaceTrade } from 'state/routing/types'
import { tradeMeaningfullyDiffers } from 'utils/tradeMeaningFullyDiffer'

import TransactionConfirmationModal, {
  ConfirmationModalContent,
  TransactionErrorContent,
} from '../TransactionConfirmationModal'
import GridOrderModalFooter from './GridOrderModalFooter'
import GridOrderModalHeader from './GridOrderModalHeader'

export default function ConfirmGridOrderModal({
  trade,
  fiatValues,
  onConfirm,
  onDismiss,
  recipient,
  swapErrorMessage,
  isOpen,
  attemptingTxn,
  txHash,
  createdPoolID,
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
  createdPoolID?: number | undefined
}) {
  // shouldLogModalCloseEvent lets the child GridOrderModalHeader component know when modal has been closed
  // and an event triggered by modal closing should be logged.
  const [shouldLogModalCloseEvent, setShouldLogModalCloseEvent] = useState(false)
  const showAcceptChanges = false

  // swap state
  const { deposits } = useGridOrderState()
  const { currenciesById } = useDerivedGridOrderInfo()

  const onModalDismiss = useCallback(() => {
    if (isOpen) setShouldLogModalCloseEvent(true)
    onDismiss()
  }, [isOpen, onDismiss])

  const modalHeader = useCallback(() => {
    return (
      <GridOrderModalHeader
        fiatValues={fiatValues}
        recipient={recipient}
      />
    )
  }, [recipient, trade, shouldLogModalCloseEvent, fiatValues])

  const modalBottom = useCallback(() => {
    return (
      <GridOrderModalFooter
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

  // text to show while loading
  const symbolList = deposits.map((deposit:any) => currenciesById[deposit.currencyId].tokenInfo.symbol)
  const tokenList = (
    deposits.length == 0 ? 'no tokens' :
    deposits.length == 1 ? symbolList[0] :
    deposits.length == 2 ? `${symbolList[0]} and ${symbolList[1]}` :
    symbolList.map((symbol:string,index:number) => (
      index >= symbolList.length-1
      ? [symbol]
      : index == symbolList.length-2
      ? [symbol, ', and ']
      : [symbol, ', ']
    )).flat().filter(x=>!!x).join('')
  )
  const pendingText = `Placing grid order with ${tokenList}`

  const confirmationContent = useCallback(
    () =>
      swapErrorMessage ? (
        <TransactionErrorContent onDismiss={onModalDismiss} message={swapErrorMessage} />
      ) : (
        <ConfirmationModalContent
          title={<Trans>Confirm Grid Order</Trans>}
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
      createdPoolID={createdPoolID}
    />
  )
}
