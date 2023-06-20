import { Trans } from '@lingui/macro'
import { Percent } from '@uniswap/sdk-core'
import styled from 'styled-components/macro'

import { ThemedText } from '../../theme'
import { RowBetween, RowFixed } from '../Row'
import SettingsTab from '../Settings'

const StyledMarketOrderHeader = styled.div`
  padding: 8px 12px;
  margin-bottom: 8px;
  width: 100%;
  color: ${({ theme }) => theme.textSecondary};
`

export default function MarketOrderHeader({ allowedSlippage }: { allowedSlippage: Percent }) {
  return (
    <StyledMarketOrderHeader>
      <RowBetween>
        <RowFixed>
          <ThemedText.DeprecatedBlack fontWeight={500} fontSize={16} style={{ marginRight: '8px' }}>
            <Trans>Market Order</Trans>
          </ThemedText.DeprecatedBlack>
        </RowFixed>
        <RowFixed>
          <SettingsTab placeholderSlippage={allowedSlippage} />
        </RowFixed>
      </RowBetween>
    </StyledMarketOrderHeader>
  )
}
