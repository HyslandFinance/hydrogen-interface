import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'

import { BigNumber } from '@ethersproject/bignumber'
const BN = BigNumber
import { adjustNucleusState } from "./adjustNucleusState"
import { findOptimalPath } from "./findOptimalPath"

export function findPaths(tokenInAddress:string, tokenOutAddress:string, amount:BigNumber, tradeType:TradeType, nucleusState:any) {
  // step 1: setup
  let nucleusStateModified = JSON.parse(JSON.stringify(nucleusState))
  // vars
  const paths = []
  let amountLeft = amount
  // step 2: search
  while(amountLeft.gt(0)) {
    const maxAmount = amountLeft
    const nextPath = findOptimalPath(nucleusStateModified, tokenInAddress, tokenOutAddress, maxAmount, tradeType)
    if(tradeType === TradeType.EXACT_INPUT) {
      amountLeft = amountLeft.sub(nextPath.amountIn)
    } else {
      amountLeft = amountLeft.sub(nextPath.amountOut)
    }
    if(amountLeft.gt(0)) {
      nucleusStateModified = adjustNucleusState(nucleusStateModified, nextPath)
    }
    // remove unnecessary info from path before pushing
    for(let hopIndex = 0; hopIndex < nextPath.hops.length; hopIndex++) {
      nextPath.hops[hopIndex].amountA = undefined
      nextPath.hops[hopIndex].locationB = undefined
    }
    paths.push(nextPath)
  }
  return paths
}
