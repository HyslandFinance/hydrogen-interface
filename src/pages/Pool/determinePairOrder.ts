// the greater the z index, the more likely it is to be the risk token
// the lower the z index, the more likely it is to be the stable token

const zindexes = {
  "0x70BF48BcfFcFcca6123fFeD4d4EC4Ec6eb31BA00": 101, // USDT
  "0x35CD54a3547190056A0F690357b1B2692B90Fb00": 102, // USDC
  "0x7D691e6b03b46B5A5769299fC9a32EaC690B7abc": 103, // DAI
  "0x1C6319Cf1F0b4b4109088B8e626D0b0aD0431253": 104, // FRAX

  "0x421EcD2E7e5BfE4E5b0Aa8Bbf894Da3fadF6Dd93": 201, // mWETH
  "0x4200000000000000000000000000000000000006": 202, // WETH
  "0x2E6365CfB7de7F00478C02485Ca56a975369d2B8": 203, // WBTC

  "0xFF0f9D4956f5f7f1Ea076d015f0a3c7185c5fc4f": 301, // DOGE

  "0x5bC8BDC70D7cD2ff78E0CDA60d326685c047f7B5": 501, // OIL

  //"": , //
} as any

export function determinePairOrder(token0:string, token1:string) {
  // setup
  const defaultZindex = 99999999
  const zindex0 = zindexes[token0] || defaultZindex
  const zindex1 = zindexes[token1] || defaultZindex
  let tokenL: any
  let tokenR: any
  // order preferred
  if(zindex0 < zindex1) {
    [tokenL, tokenR] = [token1, token0]
  }
  else if(zindex0 > zindex1) {
    [tokenL, tokenR] = [token0, token1]
  }
  /*
  // no order preferred. default to alphabetical order
  else if(token0.symbol < token1.symbol) {
    [tokenL, tokenR] = [token0, token1]
  }
  else {
    [tokenL, tokenR] = [token1, token0]
  }
  */
  // no order preferred. default to 0/1
  else {
    tokenL = token0
    tokenR = token1
  }
  /*
  const symbolL = tokenL.status == "verified" ? tokenL.symbol : `⚠️ ${tokenL.symbol} ⚠️`
  const symbolR = tokenR.status == "verified" ? tokenR.symbol : `⚠️ ${tokenR.symbol} ⚠️`
  const name = `${symbolL}/${symbolR}`
  return {
    name,
    tokenL: tokenL.address,
    tokenR: tokenR.address,
  }
  */
  return [tokenL, tokenR]
}
