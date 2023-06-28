import { BigNumber } from '@ethersproject/bignumber'
const BN = BigNumber
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'

export function getTradeRequestsByTokens(nucleusState:any) {
  const pools = nucleusState.pools
  const poolIDs = Object.keys(pools)
  const poolBalances = nucleusState.internalBalancesByPool
  // separate trade requests by tokenA->tokenB. filter zeros and invalids
  const tradeRequestsByTokens = {} as any
  const tokenSet = {} as any
  for(let i = 0; i < poolIDs.length; i++) {
    const poolID = poolIDs[i]
    const pool = pools[poolID]
    const tokenAs = Object.keys(pool.tradeRequests)
    for(let j = 0; j < tokenAs.length; j++) {
      const tokenA = tokenAs[j]
      const balanceA = BN.from(poolBalances[poolID][tokenA] || "0")
      if(balanceA.lte(0)) continue
      if(!tradeRequestsByTokens.hasOwnProperty(tokenA)) tradeRequestsByTokens[tokenA] = {}
      tokenSet[tokenA] = true
      const tokenBs = Object.keys(pool.tradeRequests[tokenA])
      for(let k = 0; k < tokenBs.length; k++) {
        const tokenB = tokenBs[k]
        const tradeRequest = pool.tradeRequests[tokenA][tokenB]
        if(!HydrogenNucleusHelper.exchangeRateIsNonzero(tradeRequest.exchangeRate)) continue
        if(!tradeRequestsByTokens[tokenA].hasOwnProperty(tokenB)) tradeRequestsByTokens[tokenA][tokenB] = []
        tokenSet[tokenB] = true
        tradeRequestsByTokens[tokenA][tokenB].push({
          poolID,
          ...tradeRequest,
          amountA: balanceA
        })
      }
    }
  }
  // sort trade requests by exchange rate - most A per B first
  const tokens = Object.keys(tokenSet)
  for(let j = 0; j < tokens.length; j++) {
    const tokenA = tokens[j]
    for(let k = 0; k < tokens.length; k++) {
      if(j == k) continue
      const tokenB = tokens[k]
      if(!tradeRequestsByTokens.hasOwnProperty(tokenA) || !tradeRequestsByTokens[tokenA].hasOwnProperty(tokenB)) continue
      const tradeRequests = tradeRequestsByTokens[tokenA][tokenB]
      tradeRequests.sort((reqX:any, reqY:any) => {
        const erX = HydrogenNucleusHelper.decodeExchangeRate(reqX.exchangeRate)
        const erY = HydrogenNucleusHelper.decodeExchangeRate(reqY.exchangeRate)
        const cmL = erX[0].mul(erY[1])
        const cmR = erY[0].mul(erX[1])
        if(cmL.gt(cmR)) return -1
        if(cmL.lt(cmR)) return 1
        return 0
      })
    }
  }
  return tradeRequestsByTokens
}
