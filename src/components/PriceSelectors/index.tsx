import { Trans } from '@lingui/macro'
import { Currency, Price, Token } from '@uniswap/sdk-core'
import { AutoColumn } from 'components/Column'
import PriceSelector from 'components/PriceSelector/PriceSelector'
import { RowBetween } from 'components/Row'

export default function PriceSelectors({
  buyPrice,
  sellPrice,
  onBuyPriceInput,
  onSellPriceInput,
  currencyBase,
  currencyQuote,
}: {
  buyPrice?: Price<Token, Token>
  sellPrice?: Price<Token, Token>
  onBuyPriceInput: (typedValue: string) => void
  onSellPriceInput: (typedValue: string) => void
  currencyBase?: Currency | null
  currencyQuote?: Currency | null
}) {
  return (
    <AutoColumn gap="md">
      <RowBetween>
        <PriceSelector
          value={buyPrice?.toSignificant(5) ?? ''}
          onUserInput={onBuyPriceInput}
          width="48%"
          label={buyPrice ? `${currencyQuote?.symbol}` : '-'}
          title={<Trans>Buy Price</Trans>}
          tokenBase={currencyBase?.symbol}
          tokenQuote={currencyQuote?.symbol}
        />
        <PriceSelector
          value={sellPrice?.toSignificant(5) ?? ''}
          onUserInput={onSellPriceInput}
          width="48%"
          label={sellPrice ? `${currencyQuote?.symbol}` : '-'}
          tokenBase={currencyBase?.symbol}
          tokenQuote={currencyQuote?.symbol}
          title={<Trans>Sell Price</Trans>}
        />
      </RowBetween>
    </AutoColumn>
  )
}
