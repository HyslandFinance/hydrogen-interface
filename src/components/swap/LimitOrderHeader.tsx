import { Trans } from '@lingui/macro'
import { Percent } from '@uniswap/sdk-core'
import styled from 'styled-components/macro'

import { ThemedText } from '../../theme'
import { RowBetween, RowFixed } from '../Row'
import LimitOrderSettingsTab from '../Settings/LimitOrderSettingsTab'

const StyledLimitOrderHeader = styled.div`
  padding: 8px 12px;
  margin-bottom: 8px;
  width: 100%;
  color: ${({ theme }) => theme.textSecondary};
`

export default function LimitOrderHeader({ allowedSlippage }: { allowedSlippage: Percent }) {
  return (
    <StyledLimitOrderHeader>
      <RowBetween>
        <RowFixed>
          <ThemedText.DeprecatedBlack fontWeight={500} fontSize={16} style={{ marginRight: '8px' }}>
            <Trans>Limit Order</Trans>
          </ThemedText.DeprecatedBlack>
        </RowFixed>
        <RowFixed>
          <LimitOrderSettingsTab placeholderSlippage={allowedSlippage} />
        </RowFixed>
      </RowBetween>
    </StyledLimitOrderHeader>
  )
}
