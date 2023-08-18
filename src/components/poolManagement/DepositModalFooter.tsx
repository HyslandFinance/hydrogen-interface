import { Trans } from '@lingui/macro'
import { ElementName } from '@uniswap/analytics-events'
import { ReactNode } from 'react'
import { Text } from 'rebass'

import { ButtonError } from '../Button'
import { AutoRow } from '../Row'
import { SwapCallbackError } from './styleds'

export default function DepositModalFooter({
  onConfirm,
  swapErrorMessage,
  disabledConfirm,
}: {
  onConfirm: () => void
  swapErrorMessage: ReactNode | undefined
  disabledConfirm: boolean
}) {
  return (
    <AutoRow>
      <ButtonError
        onClick={onConfirm}
        disabled={disabledConfirm}
        style={{ margin: '10px 0 0 0' }}
        id={ElementName.CONFIRM_SWAP_BUTTON}
      >
        <Text fontSize={20} fontWeight={500}>
          <Trans>Confirm Deposit</Trans>
        </Text>
      </ButtonError>

      {swapErrorMessage ? <SwapCallbackError error={swapErrorMessage} /> : null}
    </AutoRow>
  )
}
