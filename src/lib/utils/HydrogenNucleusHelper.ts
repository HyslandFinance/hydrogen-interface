import { BigNumber } from '@ethersproject/bignumber'
const BN = BigNumber
import { getAddress } from '@ethersproject/address'
import { hexlify, zeroPad } from '@ethersproject/bytes'
import { AddressZero, Zero } from '@ethersproject/constants'

const MaxUint128 = BN.from(2).pow(128).sub(1)
const MAX_PPM = BN.from(1_000_000) // parts per million

export default class HydrogenNucleusHelper {

  // location flags

  static LOCATION_FLAG_EXTERNAL_ADDRESS = "0x0400000000000000000000000000000000000000000000000000000000000001";
  static LOCATION_FLAG_INTERNAL_ADDRESS = "0x0400000000000000000000000000000000000000000000000000000000000002";
  static LOCATION_FLAG_POOL             = "0x0400000000000000000000000000000000000000000000000000000000000003";

  // location functions

  // encode an external address as a location
  static externalAddressToLocation(address: string) {
    let addr = address.substring(2).toLowerCase()
    while (addr.length < 62) addr = `0${addr}`
    addr = `0x01${addr}`
    return addr
  }

  // encode an internal address as a location
  static internalAddressToLocation(address: string) {
    let addr = address.substring(2).toLowerCase()
    while (addr.length < 62) addr = `0${addr}`
    addr = `0x02${addr}`
    return addr
  }

  // encode a poolID as a location
  static poolIDtoLocation(poolID: BigNumber) {
    let num = BN.from(poolID).toHexString()
    num = num.substring(2)
    while (num.length < 62) num = `0${num}`
    num = `0x03${num}`
    return num
  }

  // create a human readable description of a location
  static locationToString(loc: string) {
    if (loc.length != 66) return `invalid location ${loc}`
    if (loc.substring(0, 4) === '0x01') {
      if (loc.substring(4, 26) != '0000000000000000000000') return `invalid location ${loc}`
      const addr = getAddress(`0x${loc.substring(26, 66)}`)
      return `${addr} external balance`
    } else if (loc.substring(0, 4) === '0x02') {
      if (loc.substring(4, 26) != '0000000000000000000000') return `invalid location ${loc}`
      const addr = getAddress(`0x${loc.substring(26, 66)}`)
      return `${addr} internal balance`
    } else if (loc.substring(0, 4) === '0x03') {
      const poolID = BN.from(`0x${loc.substring(4, 66)}`)
      return `poolID ${poolID}`
    } else return `invalid location ${loc}`
  }

  // poolID functions

  // returns true if the given string parses to a valid poolID
  // does not determine if the pool exists or not
  static poolIDisValid(poolID: string) {
    try {
      if(!poolID || poolID.length <= 3) return false
      const c = poolID[0]
      if(c == '-' || c == '0') return false
      const poolType = poolID.substring(poolID.length-3)
      if(poolType != '001' && poolType != '002') return false
      const num = BN.from(poolID)
      const str = num.toString()
      if(poolID != str) return false
      return true
    } catch(e) {
      return false
    }
  }

  // exchange rate functions

  // encodes an exchange rate
  static encodeExchangeRate(exchangeRateX1: BigNumber, exchangeRateX2: BigNumber) {
    const x1 = BN.from(exchangeRateX1)
    const x2 = BN.from(exchangeRateX2)
    if (x1.gt(MaxUint128) || x2.gt(MaxUint128))
      throw `HydrogenNucleusHelper: cannot encode exchange rate. Received ${x1.toString()}, ${x2.toString()}. Max ${MaxUint128.toString()}`
    const exchangeRate = HydrogenNucleusHelper.toBytes32(x1.shl(128).add(x2))
    return exchangeRate
  }

  // decodes an exchange rate
  static decodeExchangeRate(exchangeRate: string) {
    // decode exchange rate
    const er = BN.from(exchangeRate)
    const x1 = er.shr(128)
    const x2 = er.and(MaxUint128)
    return [x1, x2]
  }

  // returns true if the exchange rate is non zero
  static exchangeRateIsNonzero(exchangeRate: string) {
    const [x1, x2] = HydrogenNucleusHelper.decodeExchangeRate(exchangeRate)
    if (x1.lte(0) || x2.lte(0)) return false
    return true
  }

  // creates human readable descriptions of an exchange rate
  static calculateRelativeAmounts(amountA: BigNumber, decimalsA: number, amountB: BigNumber, decimalsB: number) {
    const amountAperB = BN.from(amountA).mul(HydrogenNucleusHelper.decimalsToAmount(decimalsB)).div(amountB)
    const amountBperA = BN.from(amountB).mul(HydrogenNucleusHelper.decimalsToAmount(decimalsA)).div(amountA)
    return { amountAperB, amountBperA }
  }

  // swap calculators

  // as market maker
  static calculateAmountA(amountB: BigNumber, exchangeRate: string) {
    const [x1, x2] = HydrogenNucleusHelper.decodeExchangeRate(exchangeRate)
    if (x1.lte(0) || x2.lte(0)) throw 'HydrogenNucleusHelper: pool cannot exchange these tokens'
    // amountA = floor( (amountB * x1) / x2 )
    const amtB = BN.from(amountB)
    const amountA = amtB.mul(x1).div(x2)
    return amountA
  }

  // as market maker
  static calculateAmountB(amountA: BigNumber, exchangeRate: string) {
    const [x1, x2] = HydrogenNucleusHelper.decodeExchangeRate(exchangeRate)
    if (x1.lte(0) || x2.lte(0)) throw 'HydrogenNucleusHelper: pool cannot exchange these tokens'
    // amountB = ceil( (amountA * x2) / x1 )
    const amtA = BN.from(amountA)
    const numerator = amtA.mul(x2)
    let amountB = numerator.div(x1)
    if (numerator.mod(x1).gt(0)) amountB = amountB.add(1)
    return amountB
  }

  // as market taker
  static calculateMarketOrderExactAMT(amountAMT: BigNumber, exchangeRate: string, feePPM: BigNumber) {
    const amountAMM = BN.from(amountAMT)
    const amountBMM = this.calculateAmountB(amountAMM, exchangeRate)
    const amountBMT = amountBMM.mul(MAX_PPM).div(MAX_PPM.sub(feePPM))
    const amountBFR = amountBMT.mul(feePPM).div(MAX_PPM)
    return { amountAMM, amountBMM, amountBMT, amountBFR }
  }

  // as market taker
  static calculateMarketOrderExactBMT(amountBMT: BigNumber, exchangeRate: string, feePPM: BigNumber) {
    amountBMT = BN.from(amountBMT)
    const amountBFR = amountBMT.mul(feePPM).div(MAX_PPM)
    const amountBMM = amountBMT.sub(amountBFR)
    const amountAMM = this.calculateAmountA(amountBMM, exchangeRate)
    const amountAMT = amountAMM
    return { amountAMM, amountAMT, amountBMM, amountBFR }
  }

  // swap fees

  static getSwapFeeForPair(nucleusState: any, tokenA: string, tokenB: string) {
    let feePPM = Zero
    let receiverLocation = HydrogenNucleusHelper.toBytes32(0);
    const swapFees = nucleusState.swapFees
    if (feePPM.eq(Zero)) {
      try {
        feePPM = BN.from(swapFees[tokenA][tokenB].feePPM)
        receiverLocation = swapFees[tokenA][tokenB].receiverLocation;
      } catch (e) {
        1 + 1
      }
    }
    if (feePPM.eq(Zero)) {
      try {
        feePPM = BN.from(swapFees[AddressZero][AddressZero].feePPM)
        receiverLocation = swapFees[AddressZero][AddressZero].receiverLocation;
      } catch (e) {
        1 + 1
      }
    }
    if (feePPM.gte(MAX_PPM)) {
      feePPM = Zero
      receiverLocation = HydrogenNucleusHelper.toBytes32(0);
    }
    return { feePPM, receiverLocation }
  }

  // general helper functions

  // given the decimals of a token, returns a bignumber of one token
  static decimalsToAmount(decimals: number) {
    decimals = BN.from(decimals).toNumber()
    let s = '1'
    for (let i = 0; i < decimals; ++i) s += '0'
    return BN.from(s)
  }

  // returns a number in its full 32 byte hex representation
  static toBytes32(bn: BigNumber | number | string) {
    return hexlify(zeroPad(BN.from(bn).toHexString(), 32))
  }
}
