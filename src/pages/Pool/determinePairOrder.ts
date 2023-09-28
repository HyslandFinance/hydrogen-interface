// the greater the z index, the more likely it is to be the risk token
// the lower the z index, the more likely it is to be the stable token

const zindexes = {
  // base mainnet
  "0x7f5373AE26c3E8FfC4c77b7255DF7eC1A9aF52a6": 102, // axlUSDT
  "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA": 103, // USDbC
  "0xEB466342C4d449BC9f53A865D5Cb90586f405215": 104, // axlUSDC
  "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb": 105, // DAI
  "0x5C7e299CF531eb66f2A1dF637d37AbB78e6200C7": 106, // axlDAI
  "0x406Cde76a3fD20e48bc1E0F60651e60Ae204B040": 108, // axlFRAX
  "0x88DfaAABaf06f3a41D2606EA98BC8edA109AbeBb": 122, // axlWMAI
  "0x4D84E25cEa9447581867fE9f2329B972f532Da2c": 124, // axlBUSD
  "0x4A3A6Dd60A34bB2Aba60D73B4C88315E9CeB6A3D": 125, // MIM
  "0x4621b7A9c75199271F773Ebd9A499dbd165c3191": 127, // DOLA
  "0x4200000000000000000000000000000000000006": 202, // WETH
  "0xb829b68f57CC546dA7E5806A929e53bE32a4625D": 204, // axlETH
  //"": , // wstETH
  "0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c": 207, // rETH
  //"": , // frxETH
  //"": , // sfrxETH
  "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22": 213, // cbETH
  //"": , // icETH
  // base goerli
  "0x70BF48BcfFcFcca6123fFeD4d4EC4Ec6eb31BA00": 101, // USDT
  "0x35CD54a3547190056A0F690357b1B2692B90Fb00": 102, // USDC
  "0x7D691e6b03b46B5A5769299fC9a32EaC690B7abc": 103, // DAI
  "0x1C6319Cf1F0b4b4109088B8e626D0b0aD0431253": 104, // FRAX
  "0x421EcD2E7e5BfE4E5b0Aa8Bbf894Da3fadF6Dd93": 201, // mWETH
  //"0x4200000000000000000000000000000000000006": 202, // WETH
  "0x2E6365CfB7de7F00478C02485Ca56a975369d2B8": 203, // WBTC
  "0xFF0f9D4956f5f7f1Ea076d015f0a3c7185c5fc4f": 301, // DOGE
  "0x2d98B318998386A69782f776a96664AA41286efA": 302, // wstETH
  "0x9D668d07B45a700aEA6CaE697ac675e3C1a43091": 303, // rETH
  "0xfE9d41Bd9ccCAaf80a3905dc23Db2ddcAd015f73": 304, // frxETH
  "0x646833DED9ef0633f9C889F9dC8Ca8721289C538": 305, // sfrxETH
  "0xbAA901115eeAbC312C63dF708f4D6aB2ceb8eEbA": 306, // cbETH
  "0x34173c7EEe379B45117429f2F2bB635190EAc36B": 307, // icETH
  "0x5bC8BDC70D7cD2ff78E0CDA60d326685c047f7B5": 501, // OIL
  // polygon mumbai
  "0x7a49D1804434Ad537e4cC0061865727b87E71cd8": 101, // USDT
  "0xA9DC572c76Ead4197154d36bA3f4D0839353abbb": 102, // USDC
  "0xF59FD8840DC9bb2d00Fe5c0BE0EdF637ACeC77E1": 103, // DAI
  "0x39FbfBa00de6f464e26f9983cB9C79A82442FaCc": 104, // FRAX
  "0x09db75630A9b2e66F220531B77080282371156FE": 202, // WETH
  "0x1C9b3500bF4B13BB338DC4F4d4dB1dEAF0638a1c": 203, // WBTC
  //"0x9D668d07B45a700aEA6CaE697ac675e3C1a43091": 204, // mWMATIC1 (busted)
  "0x7a2e59AdBd9Ce932018991bF28Fa688e13AD48fa": 204, // mWMATIC2
  "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889": 205, // WMATIC
  "0xbb8fD2d558206E3CB68038A338718359a96e0C44": 301, // DOGE
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
