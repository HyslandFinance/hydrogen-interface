import { Trans } from '@lingui/macro'
import { SwapPriceUpdateUserResponse } from '@uniswap/analytics-events'
import { Currency, Percent, Price, TradeType } from '@uniswap/sdk-core'
import CenteringDiv from 'components/centeringDiv'
import { getPriceUpdateBasisPoints } from 'lib/utils/analytics'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown } from 'react-feather'
import { Text } from 'rebass'
import { useDerivedPoolManagementInfo, usePoolManagementState } from 'state/poolManagement/hooks'
import { InterfaceTrade } from 'state/routing/types'
import styled, { useTheme } from 'styled-components/macro'

import { useStablecoinValue } from '../../hooks/useStablecoinPrice'
import { ThemedText } from '../../theme'
import { isAddress, shortenAddress } from '../../utils'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'
import { ButtonPrimary } from '../Button'
import { LightCard } from '../Card'
import { AutoColumn } from '../Column'
import { FiatValue } from '../CurrencyInputPanel/FiatValue'
import CurrencyLogo from '../Logo/CurrencyLogo'
import { RowBetween, RowFixed } from '../Row'
import TradePrice from '../swap/TradePrice'
import { AdvancedDepositDetails } from './AdvancedDepositDetails'
import { SwapShowAcceptChanges, TruncatedText } from './styleds'

export default function DepositModalHeader({
  fiatValues,
  recipient,
}: {
  fiatValues: any[]
  recipient: string | null
}) {
  const theme = useTheme()
  // swap state
  const currentState = usePoolManagementState()
  const { pairs, deposits } = currentState
  const { currenciesById } = useDerivedPoolManagementInfo()
  const deposits2 = deposits.filter((deposit:any) => (!!deposit.currencyId && !!deposit.typedAmount && parseFloat(deposit.typedAmount) > 0))

  return (
    <AutoColumn gap="4px" style={{ marginTop: '1rem' }}>
      {/* deposits */}
      <div>
        <div style={{margin:"0.5rem 0 0.5rem 0.25rem"}}>
          <Trans>Deposits</Trans>
        </div>
        {deposits2.map((deposit:any,depositIndex:number) => {
          const token = currenciesById[deposit.currencyId]
          const parsedAmountDeposit = tryParseCurrencyAmount(deposit.typedAmount||"0", token)
          const fiatValue = fiatValues[depositIndex]
          //console.log(`deposit ${depositIndex}`, {deposit, token, parsedAmountDeposit, fiatValue: fiatValue, fiatValues})
          return token && (
            <div key={depositIndex}>
              <LightCard padding="0.75rem 1rem" style={{ marginBottom: '0.25rem' }}>
                <AutoColumn gap="sm">
                  <RowBetween align="flex-end">
                    <RowFixed gap="0px">
                      <TruncatedText fontSize={24} fontWeight={500}>
                        {parsedAmountDeposit ? parsedAmountDeposit.toSignificant(6) : '0'}
                      </TruncatedText>
                    </RowFixed>
                    <RowFixed gap="0px">
                      <CurrencyLogo currency={token} size="20px" style={{ marginRight: '12px' }} />
                      <Text fontSize={20} fontWeight={500}>
                        {(token.tokenInfo||token).symbol}
                      </Text>
                    </RowFixed>
                  </RowBetween>
                  <RowBetween>
                    <ThemedText.DeprecatedBody fontSize={14} color={theme.textTertiary}>
                      {fiatValue ? (
                        <FiatValue
                          fiatValue={fiatValue}
                        />
                      ) : '$0.00'}
                    </ThemedText.DeprecatedBody>
                  </RowBetween>
                </AutoColumn>
              </LightCard>
            </div>
          )
        })}
      </div>
    </AutoColumn>
  )
  /*
  return (
    <AutoColumn gap="4px" style={{ marginTop: '1rem' }}>
      {/* swap prices * /}
      <div>
        <div style={{margin:"0rem 0 0.5rem 0.25rem"}}>
          <Trans>Trade Requests</Trans>
        </div>
        {pairs.map((pair:any,pairIndex:number) => {
          const baseToken = currenciesById[pair.BASE_TOKEN.currencyId] // WETH
          const quoteToken = currenciesById[pair.QUOTE_TOKEN.currencyId] // USDC
          const parsedAmountOneBase = tryParseCurrencyAmount('1', baseToken)
          const parsedAmountBuy = tryParseCurrencyAmount(pair.typedValueBuyPrice, quoteToken)
          const parsedAmountSell = tryParseCurrencyAmount(pair.typedValueSellPrice, quoteToken)
          const buyPrice = (parsedAmountOneBase && parsedAmountBuy) ? new Price(
            quoteToken,
            baseToken,
            parsedAmountBuy?.quotient,
            parsedAmountOneBase?.quotient,
          ) : undefined
          const sellPrice = (parsedAmountOneBase && parsedAmountSell) ? new Price(
            quoteToken,
            baseToken,
            parsedAmountSell?.quotient,
            parsedAmountOneBase?.quotient,
          ) : undefined
          //console.log("in Deposit market header", {baseToken, quoteToken, buyPrice, sellPrice})
          const baseTokenInfo = baseToken.tokenInfo || baseToken
          const quoteTokenInfo = quoteToken.tokenInfo || quoteToken
          return (
            <div key={pairIndex}>
              {buyPrice && (
                <LightCard style={{ marginBottom: '0.25rem', padding: "0.25rem 0" }}>
                  <CenteringDiv>
                    {`Buy ${baseTokenInfo.symbol} at`}
                    <span style={{width:"4px"}}/>
                    <TradePrice price={buyPrice} showDollarAmount={false}/>
                  </CenteringDiv>
                </LightCard>
              )}
              {sellPrice && (
                <LightCard style={{ marginBottom: '0.25rem', padding: "0.25rem 0" }}>
                  <CenteringDiv>
                    {`Sell ${baseTokenInfo.symbol} at`}
                    <span style={{width:"4px"}}/>
                    <TradePrice price={sellPrice} showDollarAmount={false}/>
                  </CenteringDiv>
                </LightCard>
              )}
            </div>
          )
        })}
      </div>
      {/* deposits * /}
      <div>
        <div style={{margin:"0.5rem 0 0.5rem 0.25rem"}}>
          <Trans>Deposits</Trans>
        </div>
        {deposits.map((deposit:any,depositIndex:number) => {
          const token = currenciesById[deposit.currencyId]
          const parsedAmountDeposit = tryParseCurrencyAmount(deposit.typedAmount||"0", token)
          const fiatValue = fiatValues[depositIndex]
          //console.log(`deposit ${depositIndex}`, {deposit, token, parsedAmountDeposit, fiatValue: fiatValue, fiatValues})
          return token && (
            <div key={depositIndex}>
              <LightCard padding="0.75rem 1rem" style={{ marginBottom: '0.25rem' }}>
                <AutoColumn gap="sm">
                  <RowBetween align="flex-end">
                    <RowFixed gap="0px">
                      <TruncatedText fontSize={24} fontWeight={500}>
                        {parsedAmountDeposit ? parsedAmountDeposit.toSignificant(6) : '0'}
                      </TruncatedText>
                    </RowFixed>
                    <RowFixed gap="0px">
                      <CurrencyLogo currency={token} size="20px" style={{ marginRight: '12px' }} />
                      <Text fontSize={20} fontWeight={500}>
                        {(token.tokenInfo||token).symbol}
                      </Text>
                    </RowFixed>
                  </RowBetween>
                  <RowBetween>
                    <ThemedText.DeprecatedBody fontSize={14} color={theme.textTertiary}>
                      {fiatValue ? (
                        <FiatValue
                          fiatValue={fiatValue}
                        />
                      ) : '$0.00'}
                    </ThemedText.DeprecatedBody>
                  </RowBetween>
                </AutoColumn>
              </LightCard>
            </div>
          )
        })}
      </div>
      {/* footnote * /}
      <AutoColumn justify="flex-start" gap="sm" style={{ padding: '.75rem 1rem' }}>
        <ThemedText.DeprecatedItalic fontWeight={400} textAlign="left" style={{ width: '100%' }}>
          <Trans>
            The output of these trades will not be sent to your wallet. You are creating a pool that will hold the tokens to be traded. You may withdraw from your pool at any time.
          </Trans>
        </ThemedText.DeprecatedItalic>
      </AutoColumn>
      {/* recipient footnote * /}
      {recipient !== null ? (
        <AutoColumn justify="flex-start" gap="sm" style={{ padding: '12px 0 0 0px' }}>
          <ThemedText.DeprecatedMain>
            <Trans>
              Output will be sent to{' '}
              <b title={recipient}>{isAddress(recipient) ? shortenAddress(recipient) : recipient}</b>
            </Trans>
          </ThemedText.DeprecatedMain>
        </AutoColumn>
      ) : null}
    </AutoColumn>
  )
  */
}
