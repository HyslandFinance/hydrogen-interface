import { Trans } from '@lingui/macro'
import { Percent } from '@uniswap/sdk-core'
import styled from 'styled-components/macro'

import { ThemedText } from '../../theme'
import { RowBetween, RowFixed } from '../Row'
import GridOrderSettingsTab from '../Settings/GridOrderSettingsTab'

const StyledGridOrderHeader = styled.div`
  padding: 8px 12px;
  margin-bottom: 8px;
  width: 100%;
  color: ${({ theme }) => theme.textSecondary};
`

export default function GridOrderHeader({ allowedSlippage }: { allowedSlippage: Percent }) {
  return (
    <StyledGridOrderHeader>
      <RowBetween>
        <RowFixed>
          <ThemedText.DeprecatedBlack fontWeight={500} fontSize={16} style={{ marginRight: '8px' }}>
            <Trans>Grid Order</Trans>
          </ThemedText.DeprecatedBlack>
        </RowFixed>
        <RowFixed>
          <GridOrderSettingsTab placeholderSlippage={allowedSlippage} />
        </RowFixed>
      </RowBetween>
    </StyledGridOrderHeader>
  )
}
