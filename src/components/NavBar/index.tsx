import { Trans } from '@lingui/macro'
import { useWeb3React } from '@web3-react/core'
import Web3Status from 'components/Web3Status'
import { chainIdToBackendName } from 'graphql/data/util'
import { Box } from 'nft/components/Box'
import { Row } from 'nft/components/Flex'
import { UniIcon } from 'nft/components/icons'
import { ReactNode } from 'react'
import { NavLink, NavLinkProps, useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components/macro'

import { Bag } from './Bag'
import { ChainSelector } from './ChainSelector'
import { MenuDropdown } from './MenuDropdown'
import * as styles from './style.css'

const Nav = styled.nav`
  padding: 20px 12px;
  width: 100%;
  height: ${({ theme }) => theme.navHeight}px;
  z-index: 2;
`

interface MenuItemProps {
  href: string
  id?: NavLinkProps['id']
  isActive?: boolean
  children: ReactNode
  dataTestId?: string
}

const MenuItem = ({ href, dataTestId, id, isActive, children }: MenuItemProps) => {
  return (
    <NavLink
      to={href}
      className={isActive ? styles.activeMenuItem : styles.menuItem}
      id={id}
      style={{ textDecoration: 'none' }}
      data-testid={dataTestId}
    >
      {children}
    </NavLink>
  )
}

export const PageTabs = () => {
  const { pathname } = useLocation()

  const isPoolActive =
    pathname.startsWith('/pool') ||
    pathname.startsWith('/add') ||
    pathname.startsWith('/remove') ||
    pathname.startsWith('/increase') ||
    pathname.startsWith('/find')

  return (
    <>
      <MenuItem href="/swap" isActive={pathname.startsWith('/swap')}>
        <Trans>Swap</Trans>
      </MenuItem>
      <MenuItem href="/pool" id="pool-nav-link" isActive={isPoolActive}>
        <Trans>Pool</Trans>
      </MenuItem>
    </>
  )
}

const Navbar = () => {
  const navigate = useNavigate()

  return (
    <>
      <Nav>
        <Box display="flex" height="full" flexWrap="nowrap">
          <Box className={styles.leftSideContainer}>
            <Box className={styles.logoContainer}>
              <UniIcon
                width="48"
                height="48"
                data-testid="uniswap-logo"
                className={styles.logo}
                onClick={() => {
                  navigate({
                    pathname: '/',
                    search: '?intro=true',
                  })
                }}
              />
            </Box>
            <Box display={{ sm: 'flex', lg: 'none' }}>
              <ChainSelector leftAlign={true} />
            </Box>
            <Row gap={{ xl: '0', xxl: '8' }} display={{ sm: 'none', lg: 'flex' }}>
              <PageTabs />
            </Row>
          </Box>
          <Box className={styles.rightSideContainer}>
            <Row gap="12">
              <Box display={{ sm: 'none', lg: 'flex' }}>
                <MenuDropdown />
              </Box>
              <Box display={{ sm: 'none', lg: 'flex' }}>
                <ChainSelector />
              </Box>
              <Web3Status />
            </Row>
          </Box>
        </Box>
      </Nav>
    </>
  )
}

export default Navbar
