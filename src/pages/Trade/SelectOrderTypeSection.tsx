import { Link } from 'react-router-dom'
import styled from 'styled-components/macro'
import { useIsDarkMode } from 'state/user/hooks'

const MobileView = styled.div`
  display: block;
  @media screen and (min-width: 600px) {
    display: none;
  }
`

const DesktopView = styled.div`
  display: none;
  @media screen and (min-width: 600px) {
    display: block;
  }
`

const CenteringDiv = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`

const OrderTypeContainer = styled(Link)`
  margin: 20px;
`

const OrderTypeSelector = styled.div<{ isDarkMode: boolean }>`
  display: inline-block;
  padding: 20px;
  border-radius: 24px;
  color: ${({ theme }) => theme.textPrimary};
  background-color: ${({ isDarkMode, theme }) =>
    isDarkMode
      ? theme.backgroundModule
      : 'white'};
  border: 1px solid transparent;
  box-shadow: 0px 10px 24px 0px rgba(51, 53, 72, 0.04);
  transition: ${({ theme }) => `${theme.transition.duration.medium} ${theme.transition.timing.ease} border`};
  &:hover {
    border: 1px solid ${({ theme, isDarkMode }) => (isDarkMode ? theme.backgroundInteractive : theme.textTertiary)};
  }
`

const OrderTypeSelectorTextContainer = styled(CenteringDiv)<{ isDarkMode: boolean }>`
  width: 140px;
  font-size: 20px;
  font-weight: 400;
  color: ${({ isDarkMode }) =>
    isDarkMode
      ? 'white'
      : 'black'};
`

export default function SelectOrderTypeSelection() {
  const isDarkMode = useIsDarkMode()

  const OrderSelector = ({to, text}: any) => (
    <OrderTypeContainer to={to}>
      <OrderTypeSelector isDarkMode={isDarkMode}>
        <OrderTypeSelectorTextContainer isDarkMode={isDarkMode}>
          <p>{text}</p>
        </OrderTypeSelectorTextContainer>
      </OrderTypeSelector>
    </OrderTypeContainer>
  )

  const LimitOrderSelector = () => <OrderSelector to={"/limit_order"} text={"Limit Order"}/>
  const MarketOrderSelector = () => <OrderSelector to={"/market_order"} text={"Market Order"}/>
  const GridOrderSelector = () => <OrderSelector to={"/grid_order"} text={"Grid Order"}/>

  return (
    <div>
      {/* header */}
      <CenteringDiv>
        <h1>Select order type</h1>
      </CenteringDiv>
      {/* mobile view */}
      <MobileView>
        <CenteringDiv>
          <LimitOrderSelector/>
        </CenteringDiv>
        <CenteringDiv>
          <MarketOrderSelector/>
        </CenteringDiv>
        <CenteringDiv>
          <GridOrderSelector/>
        </CenteringDiv>
        <CenteringDiv>
        </CenteringDiv>
      </MobileView>
      {/* desktop view */}
      <DesktopView>
        <CenteringDiv>
          <LimitOrderSelector/>
          <MarketOrderSelector/>
          <GridOrderSelector/>
        </CenteringDiv>
      </DesktopView>
    </div>
  )

}
