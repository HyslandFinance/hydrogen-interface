import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'
import { BigNumber } from '@ethersproject/bignumber'
const BN = BigNumber
import { getAddress } from '@ethersproject/address'
import { hexlify, zeroPad } from '@ethersproject/bytes'
import { WeiPerEther, MaxUint256, AddressZero, Zero } from '@ethersproject/constants'
import { getTradeRequestsByTokens } from "./getTradeRequestsByTokens"
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'

export function findOptimalPath(nucleusState:any, tokenInAddress:string, tokenOutAddress:string, maxAmount:BigNumber, tradeType: TradeType) {
  // setup
  // since trade requests are organized by [tokenA][tokenB], start search from tokenOut to tokenIn
  const tradeRequestsByTokens = getTradeRequestsByTokens(nucleusState)
  const searchQueue = [{tokenList: [tokenOutAddress], tokenSet: {[tokenOutAddress]:true}}]
  const searchResults = [] as any[]
  // step 1: find acceptable token paths. don't worry about math yet
  while(searchQueue.length > 0) {
    const searchItem = searchQueue.shift() as any// pop item off front
    const searchItemStr = JSON.stringify(searchItem)
    const tokenList = searchItem.tokenList
    const lastToken = tokenList[tokenList.length-1]
    const nextHops = tradeRequestsByTokens[lastToken]
    if(!nextHops) continue
    const nextTokens = Object.keys(nextHops)
    for(let tokenIndex = 0; tokenIndex < nextTokens.length; tokenIndex++) {
      const nextToken = nextTokens[tokenIndex]
      if(searchItem.tokenSet.hasOwnProperty(nextToken)) continue // no loops
      const nextSearchItem = JSON.parse(searchItemStr)
      nextSearchItem.tokenList.push(nextToken)
      nextSearchItem.tokenSet[nextToken] = true
      if(nextToken == tokenInAddress) {
        nextSearchItem.tokenList.reverse()
        searchResults.push(nextSearchItem.tokenList)
      }
      else {
        // cap max length to 4 tokens / 3 hops
        if(nextSearchItem.tokenList.length >= 4) continue
        searchQueue.push(nextSearchItem)
      }
    }
  }
  if(searchResults.length == 0) throw { name: "PathNotFoundError", stack: "No paths found. Verify the token addresses or create a limit order." }
  // step 2: math
  let bestPath = undefined as any
  for(let pathIndex = 0; pathIndex < searchResults.length; pathIndex++) {
    const tokenList = searchResults[pathIndex]
    const hops1 = []
    for(let tokenIndex = 0; tokenIndex < tokenList.length-1; tokenIndex++) {
      const tokenA = tokenList[tokenIndex+1]
      const tokenB = tokenList[tokenIndex]
      hops1.push(tradeRequestsByTokens[tokenA][tokenB][0])
    }
    const { hops, amountIn, amountOut } = calculateMultihopSwap(nucleusState, tokenList, hops1, maxAmount, tradeType)
    const thisPath = { amountIn, amountOut, tokenList, hops }
    if(pathIndex == 0) {
      bestPath = thisPath
    } else {
      // compare by cross multiplication
      const cmL = thisPath.amountIn.mul(bestPath.amountOut)
      const cmR = bestPath.amountIn.mul(thisPath.amountOut)
      if(cmL.lt(cmR)) {
        bestPath = thisPath
      }
    }
  }
  return bestPath
}

function calculateMultihopSwap(nucleusState:any, tokenList:any[], hops:any, maxAmount:any, tradeType:TradeType) {
  hops = JSON.parse(JSON.stringify(hops))
  // forward pass
  let nextAmountBMT = (tradeType === TradeType.EXACT_INPUT) ? maxAmount : MaxUint256
  let backwardsPassFrom = 0
  for(let hopIndex = 0; hopIndex < hops.length; hopIndex++) {
    const hop = hops[hopIndex]
    hop.amountA = BN.from(hop.amountA)
    const amountBMT = nextAmountBMT
    const exchangeRate = hop.exchangeRate
    const tokenA = tokenList[hopIndex+1]
    const tokenB = tokenList[hopIndex]
    const feePPM = HydrogenNucleusHelper.getSwapFeeForPair(nucleusState, tokenA, tokenB).feePPM
    const { amountAMM, amountAMT, amountBMM } = HydrogenNucleusHelper.calculateMarketOrderExactBMT(amountBMT, exchangeRate, feePPM)
    if(amountAMM.gt(hop.amountA)) {
      // insufficient capacity
      backwardsPassFrom = hopIndex+1
      hop.amountAMT = hop.amountA
      nextAmountBMT = hop.amountA
    } else {
      hop.amountAMM = amountAMM
      hop.amountAMT = amountAMT
      hop.amountBMM = amountBMM
      hop.amountBMT = amountBMT
      nextAmountBMT = amountAMT
    }
  }
  if(tradeType === TradeType.EXACT_OUTPUT && hops[hops.length-1].amountAMT.gt(maxAmount)) {
    backwardsPassFrom = hops.length
    hops[hops.length-1].amountAMT = maxAmount
  }
  // backward pass
  if(backwardsPassFrom > 0) {
    let nextAmountAMT = hops[backwardsPassFrom-1].amountAMT
    for(let hopIndex = backwardsPassFrom-1; hopIndex >= 0; hopIndex--) {
      const hop = hops[hopIndex]
      const amountAMT = nextAmountAMT
      const exchangeRate = hop.exchangeRate
      const tokenA = tokenList[hopIndex+1]
      const tokenB = tokenList[hopIndex]
      const feePPM = HydrogenNucleusHelper.getSwapFeeForPair(nucleusState, tokenA, tokenB).feePPM
      const { amountAMM, amountBMM, amountBMT } = HydrogenNucleusHelper.calculateMarketOrderExactAMT(amountAMT, exchangeRate, feePPM)
      hop.amountAMM = amountAMM
      hop.amountAMT = amountAMT
      hop.amountBMM = amountBMM
      hop.amountBMT = amountBMT
      nextAmountAMT = amountBMT
    }
  }
  const amountIn = hops[0].amountBMT
  const amountOut = hops[hops.length-1].amountAMT
  return { hops, amountIn, amountOut }
}
