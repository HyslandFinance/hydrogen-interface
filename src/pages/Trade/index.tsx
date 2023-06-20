import { Link } from 'react-router-dom'
import styled from 'styled-components/macro'
import { PageWrapper } from '../../components/swap/styleds'
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

const Center = styled.div`
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
  border: 1px solid gray;
  border-radius: 20px;
  &:hover {
    background-color: ${({ isDarkMode }) =>
      isDarkMode
        ? '#ffffff22'
        : '#03538B22'};;
    cursor: pointer;
  }
`

const OrderTypeSelectorTextContainer = styled(Center)<{ isDarkMode: boolean }>`
  width: 120px;
  color: white;
  color: ${({ isDarkMode }) =>
    isDarkMode
      ? 'white'
      : 'black'};
`

export default function TradePage() {
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
    <PageWrapper>
      <Center>
        <h1>Select order type</h1>
      </Center>
      <MobileView>
        <Center>
          <LimitOrderSelector/>
        </Center>
        <Center>
          <MarketOrderSelector/>
        </Center>
        <Center>
          <GridOrderSelector/>
        </Center>
      </MobileView>
      <DesktopView>
        <Center>
          <LimitOrderSelector/>
          <MarketOrderSelector/>
          <GridOrderSelector/>
        </Center>
      </DesktopView>
    </PageWrapper>
  )

}
