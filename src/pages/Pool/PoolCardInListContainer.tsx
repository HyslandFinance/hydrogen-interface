import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components/macro'
import { PageWrapper } from '../../components/swap/styleds'
import { useIsDarkMode } from 'state/user/hooks'
import { useWeb3React } from '@web3-react/core'
import { useNucleusState } from 'state/statsApi/hooks'
import CenteringDiv from 'components/centeringDiv'
import Loader from 'components/Loader'
import { useAllTokens, useCurrencies } from 'hooks/Tokens'
import ArrowLimitOrderWhite from '../../assets/images/arrow-limit-order-white2.png'
import ArrowGridOrderWhite from '../../assets/images/arrow-grid-order-white2.png'
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { formatUnits } from 'ethers/lib/utils'
import { deduplicateArray } from 'lib/utils/arrays'
import { currencyAmountToString } from 'lib/utils/currencyAmountToString'
import { Price } from '@uniswap/sdk-core'
import TradePrice from 'components/swap/TradePrice'
import { formatTransactionAmount, priceToPreciseFloat } from 'utils/formatNumbers'
import { BigNumber } from '@ethersproject/bignumber'
import { Zero } from '@ethersproject/constants'
import { determinePairOrder } from './determinePairOrder'
import PoolCard from './PoolCard'

const CardContainer = styled(CenteringDiv)`
  margin-top: 20px;
`

const StyledLink = styled(Link)<{ isDarkMode: boolean }>`
  text-decoration: none;
  border-radius: 24px;
  border: 1px solid transparent;
  transition: ${({ theme }) => `${theme.transition.duration.medium} ${theme.transition.timing.ease} border`};
  &:hover {
    border: 1px solid ${({ theme, isDarkMode }) => (isDarkMode ? theme.backgroundInteractive : theme.textTertiary)};
  }
`

export default function PoolCardInListContainer(props:any) {
  const isDarkMode = useIsDarkMode()
  const { poolID } = props

  return (
    <CardContainer>
      <StyledLink to={`/pool/?poolID=${poolID}`} isDarkMode={isDarkMode}>
        <PoolCard poolID={poolID}/>
      </StyledLink>
    </CardContainer>
  )
}
