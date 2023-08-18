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
import DepositModalFooter from './DepositModalFooter'
import DepositModalHeader from './DepositModalHeader'

export default function ConfirmDepositModal({
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
  // shouldLogModalCloseEvent lets the child DepositModalHeader component know when modal has been closed
  // and an event triggered by modal closing should be logged.
  const [shouldLogModalCloseEvent, setShouldLogModalCloseEvent] = useState(false)
  const showAcceptChanges = false

  // swap state
  const { deposits } = usePoolManagementState()
  const { currenciesById } = useDerivedPoolManagementInfo()

  const onModalDismiss = useCallback(() => {
    if (isOpen) setShouldLogModalCloseEvent(true)
    onDismiss()
  }, [isOpen, onDismiss])

  const modalHeader = useCallback(() => {
    return (
      <DepositModalHeader
        fiatValues={fiatValues}
        recipient={recipient}
      />
    )
  }, [recipient, trade, shouldLogModalCloseEvent, fiatValues])

  const modalBottom = useCallback(() => {
    return (
      <DepositModalFooter
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

  const deposits2 = deposits.filter((deposit:any) => (!!deposit.currencyId && !!deposit.typedAmount && parseFloat(deposit.typedAmount) > 0))
  //console.log("ConfirmDepositModal()", {deposits, deposits2})


  // text to show while loading
  //console.log("in ConfirmDepositModal", {deposits, currenciesById})
  const symbolList = deposits2.map((deposit:any) => {
    try {
      const c1 = currenciesById[deposit.currencyId]
      const c2 = c1.tokenInfo || c1
      const sym = c2.symbol
      //return sym
      return `${deposit.typedAmount} ${sym}`
    } catch(e) {
      //return 'ETH'
      return `${deposit.typedAmount} ETH`
    }
  })
  const tokenList = (
    deposits2.length == 0 ? 'no tokens' :
    deposits2.length == 1 ? symbolList[0] :
    deposits2.length == 2 ? `${symbolList[0]} and ${symbolList[1]}` :
    symbolList.map((symbol:string,index:number) => (
      index >= symbolList.length-1
      ? [symbol]
      : index == symbolList.length-2
      ? [symbol, ', and ']
      : [symbol, ', ']
    )).flat().filter(x=>!!x).join('')
  )
  //console.log("ConfirmDepositModal()", {deposits, symbolList, tokenList, currenciesById})
  //const amount = formatAmount()
  const pendingText = `Depositing ${tokenList}${poolID && ` into pool ${poolID}`}`

  const confirmationContent = useCallback(
    () =>
      swapErrorMessage ? (
        <TransactionErrorContent onDismiss={onModalDismiss} message={swapErrorMessage} />
      ) : (
        <ConfirmationModalContent
          title={<Trans>Confirm Deposit</Trans>}
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
