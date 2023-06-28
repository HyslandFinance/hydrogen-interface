import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { BigNumber } from '@ethersproject/bignumber'
const BN = BigNumber
import { WeiPerEther, MaxUint256, AddressZero, Zero } from '@ethersproject/constants'
import { formatUnits } from '@ethersproject/units'
import { findPaths } from './findPaths'

export function calculateRoute(
  nucleusState: any,
  tradeType: TradeType,
  amountSpecified: CurrencyAmount<Currency> | undefined,
  otherCurrency: Currency | undefined,
  estimateGas: boolean = true
) {
  try {
    // input validation
    if(!amountSpecified || !otherCurrency) return undefined
    const [currencyIn, currencyOut]: [Currency | undefined, Currency | undefined] = (
        tradeType === TradeType.EXACT_INPUT
          ? [(amountSpecified?.currency as any), (otherCurrency as any).tokenInfo]
          : [(otherCurrency as any).tokenInfo, (amountSpecified?.currency as any)]
    )
    const swapType = tradeType === TradeType.EXACT_INPUT ? "exactIn" : "exactOut"
    if(!currencyIn || !currencyOut) return undefined
    const tokenIn = (currencyIn as any)
    const tokenOut = (currencyOut as any)
    if(!tokenIn || !tokenOut) return undefined
    const tokenInAddress = tokenIn.address
    const tokenOutAddress = tokenOut.address
    const amount = BigNumber.from(amountSpecified.numerator.toString()).div(amountSpecified.denominator.toString())
    // search
    const paths = findPaths(tokenInAddress, tokenOutAddress, amount, tradeType, nucleusState)
    // other return data
    let amountIn = Zero
    let amountOut = Zero
    const gasUsePerMarketOrder = BN.from(185_000)
    let numMarketOrders = 0
    for(let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
      const path = paths[pathIndex]
      amountIn = amountIn.add(path.amountIn)
      amountOut = amountOut.add(path.amountOut)
      numMarketOrders += path.hops.length
    }
    //const gasPriceWei = block.baseFeePerGas // TODO: how to get this value?
    const gasPriceWei = 1500000
    const gasUseEstimate = gasUsePerMarketOrder.mul(numMarketOrders)
    //const gasUseEstimateQuote = BN.from(gasPriceWei).mul(gasUseEstimate).mul(ethPrice).div(oneToken(18))
    const gasUseEstimateQuote = BigNumber.from(gasPriceWei).mul(gasUseEstimate).mul(1800) // TODO: how to get this value?
    let amountDecimals = ""
    let quote = ""
    let quoteDecimals = ""
    if(tradeType === TradeType.EXACT_INPUT) {
      if(!!tokenIn) amountDecimals = formatUnits(amountIn, tokenIn.decimals)
      quote = amountOut.toString()
      if(!!tokenOut) quoteDecimals = formatUnits(amountOut, tokenOut.decimals)
    }
    if(tradeType === TradeType.EXACT_OUTPUT) {
      if(!!tokenOut) amountDecimals = formatUnits(amountOut, tokenOut.decimals)
      quote = amountIn.toString()
      if(!!tokenIn) quoteDecimals = formatUnits(amountIn, tokenIn.decimals)
    }
    return {
      blockNumber: `${nucleusState.lastScannedBlock}`,
      swapType: swapType,
      amount: amount.toString(),
      amountDecimals: amountDecimals,
      quote: quote,
      quoteDecimals: quoteDecimals,

      protocol: "Hydrogen",
      paths: paths,

      gasPriceWei: gasPriceWei.toString(),
      gasUseEstimate: gasUseEstimate.toString(),
      gasUseEstimateQuote: gasUseEstimateQuote.toString(),
      gasUseEstimateQuoteDecimals: formatUnits(gasUseEstimateQuote, 18),
      gasUseEstimateUSD: formatUnits(gasUseEstimateQuote, 18),

      simulationStatus: "UNATTEMPTED",
      simulationError: false,
    }
  } catch(e) {
    return undefined
  }
}
