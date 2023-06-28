import { BigNumber } from '@ethersproject/bignumber'
const BN = BigNumber

import { getAddress } from '@ethersproject/address'
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'

export function adjustNucleusState(nucleusState:any, path:any) {
  nucleusState = JSON.parse(JSON.stringify(nucleusState))
  // helper functions
  function modifyBalance(token:string, location:string|any, amount:BigNumber) {
    try {
      location = location.toHexString()
    } catch(e) {}
    //console.log("modifying", location)
    const locationType = parseInt(location.substring(0,4))
    if(locationType === 1) {
      // don't track external balances
    } else if(locationType === 2) {
      if(location.substring(4, 26) != "0000000000000000000000") {
        throw new Error(`Invalid location '${location}'`)
      }
      const address = getAddress(`0x${location.substring(26,66)}`)
      checkNonNullTokenBalanceAtAccount(token, address)
      nucleusState.internalBalancesByAccount[address][token] = BN.from(nucleusState.internalBalancesByAccount[address][token]).add(amount).toString()
      nucleusState.internalBalancesSum[token] = BN.from(nucleusState.internalBalancesSum[token]).add(amount).toString()
    } else if(locationType === 3) {
      const poolID = BN.from(`0x${location.substring(4,66)}`).toString()
      checkNonNullTokenBalanceAtPool(token, poolID)
      nucleusState.internalBalancesByPool[poolID][token] = BN.from(nucleusState.internalBalancesByPool[poolID][token]).add(amount).toString()
      nucleusState.internalBalancesSum[token] = BN.from(nucleusState.internalBalancesSum[token]).add(amount).toString()
    } else {
      throw new Error(`Invalid location '${location}'`)
    }
  }
  function checkNonNullTokenBalanceAtSum(token:string) {
    if(!nucleusState.internalBalancesSum.hasOwnProperty(token)) nucleusState.internalBalancesSum[token] = "0"
  }
  function checkNonNullTokenBalanceAtAccount(token:string, account:string) {
    if(!nucleusState.internalBalancesByAccount.hasOwnProperty(account)) nucleusState.internalBalancesByAccount[account] = {}
    if(!nucleusState.internalBalancesByAccount[account].hasOwnProperty(token)) nucleusState.internalBalancesByAccount[account][token] = "0"
    checkNonNullTokenBalanceAtSum(token)
  }
  function checkNonNullTokenBalanceAtPool(token:string, poolID:number|string) {
    if(!nucleusState.internalBalancesByPool.hasOwnProperty(poolID)) nucleusState.internalBalancesByPool[poolID] = {}
    if(!nucleusState.internalBalancesByPool[poolID].hasOwnProperty(token)) nucleusState.internalBalancesByPool[poolID][token] = "0"
    checkNonNullTokenBalanceAtSum(token)
  }
  // adjust for each hop
  for(let hopIndex = 0; hopIndex < path.hops.length; hopIndex++) {
    const hop = path.hops[hopIndex]
    const tokenA = path.tokenList[hopIndex+1]
    const tokenB = path.tokenList[hopIndex]
    const poolLocationB = nucleusState.pools[hop.poolID].tradeRequests[tokenA][tokenB].locationB
    modifyBalance(tokenA, HydrogenNucleusHelper.poolIDtoLocation(hop.poolID), hop.amountAMM.mul(-1))
    modifyBalance(tokenB, poolLocationB, hop.amountBMM)
    const amountBFR = hop.amountBMT.sub(hop.amountBMM)
    if(amountBFR.gt(0)) {
      const feeReceiver = HydrogenNucleusHelper.getSwapFeeForPair(nucleusState, tokenA, tokenB).receiverLocation
      modifyBalance(tokenB, feeReceiver, amountBFR)
    }
  }
  return nucleusState
}
