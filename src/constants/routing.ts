// a list of tokens by chain
import { Currency, Token } from '@uniswap/sdk-core'

import { SupportedChainId } from './chains'
import {
  AMPL,
  CEUR_CELO,
  CEUR_CELO_ALFAJORES,
  CMC02_CELO,
  CUSD_CELO,
  CUSD_CELO_ALFAJORES,
  DAI,
  DAI_ARBITRUM_ONE,
  DAI_BASE,
  DAI_BASE_GOERLI,
  DAI_OPTIMISM,
  DAI_POLYGON,
  DAI_POLYGON_MUMBAI,
  ETH2X_FLI,
  FEI,
  FRAX,
  FXS,
  nativeOnChain,
  PORTAL_ETH_CELO,
  PORTAL_USDC_CELO,
  renBTC,
  rETH2,
  sETH2,
  SWISE,
  TRIBE,
  USDC_ARBITRUM_ONE,
  USDC_BASE,
  USDC_BASE_GOERLI,
  USDC_ETHEREUM,
  USDC_OPTIMISM,
  USDC_POLYGON,
  USDC_POLYGON_MUMBAI,
  USDT,
  USDT_ARBITRUM_ONE,
  USDT_BASE_GOERLI,
  USDT_OPTIMISM,
  USDT_POLYGON,
  USDT_POLYGON_MUMBAI,
  WBTC,
  WBTC_ARBITRUM_ONE,
  WBTC_BASE_GOERLI,
  WBTC_OPTIMISM,
  WBTC_POLYGON,
  WBTC_POLYGON_MUMBAI,
  WETH_POLYGON,
  WETH_POLYGON_MUMBAI,
  WRAPPED_NATIVE_CURRENCY,
} from './tokens'

type ChainTokenList = {
  readonly [chainId: number]: Token[]
}

type ChainCurrencyList = {
  readonly [chainId: number]: Currency[]
}

const WRAPPED_NATIVE_CURRENCIES_ONLY: ChainTokenList = Object.fromEntries(
  Object.entries(WRAPPED_NATIVE_CURRENCY)
    .map(([key, value]) => [key, [value]])
    .filter(Boolean)
)

// used to construct intermediary pairs for trading
export const BASES_TO_CHECK_TRADES_AGAINST: ChainTokenList = {
  ...WRAPPED_NATIVE_CURRENCIES_ONLY,
  [SupportedChainId.ETHEREUM]: [
    ...WRAPPED_NATIVE_CURRENCIES_ONLY[SupportedChainId.ETHEREUM],
    DAI,
    USDC_ETHEREUM,
    USDT,
    WBTC,
  ],
  [SupportedChainId.OPTIMISM]: [
    ...WRAPPED_NATIVE_CURRENCIES_ONLY[SupportedChainId.OPTIMISM],
    DAI_OPTIMISM,
    USDT_OPTIMISM,
    WBTC_OPTIMISM,
  ],
  [SupportedChainId.ARBITRUM_ONE]: [
    ...WRAPPED_NATIVE_CURRENCIES_ONLY[SupportedChainId.ARBITRUM_ONE],
    DAI_ARBITRUM_ONE,
    USDT_ARBITRUM_ONE,
    WBTC_ARBITRUM_ONE,
  ],
  [SupportedChainId.POLYGON]: [
    ...WRAPPED_NATIVE_CURRENCIES_ONLY[SupportedChainId.POLYGON],
    DAI_POLYGON,
    USDC_POLYGON,
    USDT_POLYGON,
    WETH_POLYGON,
  ],
  [SupportedChainId.CELO]: [CUSD_CELO, CEUR_CELO, CMC02_CELO, PORTAL_USDC_CELO, PORTAL_ETH_CELO],
}
export const ADDITIONAL_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {
  [SupportedChainId.ETHEREUM]: {
    '0xF16E4d813f4DcfDe4c5b44f305c908742De84eF0': [ETH2X_FLI],
    [rETH2.address]: [sETH2],
    [SWISE.address]: [sETH2],
    [FEI.address]: [TRIBE],
    [TRIBE.address]: [FEI],
    [FRAX.address]: [FXS],
    [FXS.address]: [FRAX],
    [WBTC.address]: [renBTC],
    [renBTC.address]: [WBTC],
  },
}
/**
 * Some tokens can only be swapped via certain pairs, so we override the list of bases that are considered for these
 * tokens.
 */
export const CUSTOM_BASES: { [chainId: number]: { [tokenAddress: string]: Token[] } } = {
  [SupportedChainId.ETHEREUM]: {
    [AMPL.address]: [DAI, WRAPPED_NATIVE_CURRENCY[SupportedChainId.ETHEREUM] as Token],
  },
}

/**
 * Shows up in the currency select for swap and add liquidity
 */
export const COMMON_BASES: ChainCurrencyList = {
  [SupportedChainId.ETHEREUM]: [
    nativeOnChain(SupportedChainId.ETHEREUM),
    DAI,
    USDC_ETHEREUM,
    USDT,
    WBTC,
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.ETHEREUM] as Token,
  ],
  [SupportedChainId.ROPSTEN]: [
    nativeOnChain(SupportedChainId.ROPSTEN),
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.ROPSTEN] as Token,
  ],
  [SupportedChainId.RINKEBY]: [
    nativeOnChain(SupportedChainId.RINKEBY),
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.RINKEBY] as Token,
  ],
  [SupportedChainId.GOERLI]: [
    nativeOnChain(SupportedChainId.GOERLI),
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.GOERLI] as Token,
  ],
  [SupportedChainId.KOVAN]: [
    nativeOnChain(SupportedChainId.KOVAN),
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.KOVAN] as Token,
  ],
  [SupportedChainId.ARBITRUM_ONE]: [
    nativeOnChain(SupportedChainId.ARBITRUM_ONE),
    DAI_ARBITRUM_ONE,
    USDC_ARBITRUM_ONE,
    USDT_ARBITRUM_ONE,
    WBTC_ARBITRUM_ONE,
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.ARBITRUM_ONE] as Token,
  ],
  [SupportedChainId.ARBITRUM_RINKEBY]: [
    nativeOnChain(SupportedChainId.ARBITRUM_RINKEBY),
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.ARBITRUM_RINKEBY] as Token,
  ],
  [SupportedChainId.OPTIMISM]: [
    nativeOnChain(SupportedChainId.OPTIMISM),
    DAI_OPTIMISM,
    USDC_OPTIMISM,
    USDT_OPTIMISM,
    WBTC_OPTIMISM,
  ],
  [SupportedChainId.OPTIMISM_GOERLI]: [nativeOnChain(SupportedChainId.OPTIMISM_GOERLI)],
  [SupportedChainId.POLYGON]: [
    nativeOnChain(SupportedChainId.POLYGON),
    WETH_POLYGON,
    USDC_POLYGON,
    DAI_POLYGON,
    USDT_POLYGON,
    WBTC_POLYGON,
  ],
  [SupportedChainId.POLYGON_MUMBAI]: [
    //nativeOnChain(SupportedChainId.POLYGON_MUMBAI), // TODO: re add
    WETH_POLYGON_MUMBAI,
    USDC_POLYGON_MUMBAI,
    DAI_POLYGON_MUMBAI,
    USDT_POLYGON_MUMBAI,
    WBTC_POLYGON_MUMBAI,
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.POLYGON_MUMBAI] as Token,
  ],

  [SupportedChainId.CELO]: [
    nativeOnChain(SupportedChainId.CELO),
    CEUR_CELO,
    CUSD_CELO,
    PORTAL_ETH_CELO,
    PORTAL_USDC_CELO,
    CMC02_CELO,
  ],
  [SupportedChainId.CELO_ALFAJORES]: [
    nativeOnChain(SupportedChainId.CELO_ALFAJORES),
    CUSD_CELO_ALFAJORES,
    CEUR_CELO_ALFAJORES,
  ],
  [SupportedChainId.BASE]: [
    nativeOnChain(SupportedChainId.BASE),
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.BASE] as Token,
    DAI_BASE,
    USDC_BASE,
    //USDT_BASE,
    //WBTC_BASE,
  ],
  [SupportedChainId.BASE_GOERLI]: [
    nativeOnChain(SupportedChainId.BASE_GOERLI),
    WRAPPED_NATIVE_CURRENCY[SupportedChainId.BASE_GOERLI] as Token,
    DAI_BASE_GOERLI,
    USDC_BASE_GOERLI,
    USDT_BASE_GOERLI,
    WBTC_BASE_GOERLI,
  ],
}

// used to construct the list of all pairs we consider by default in the frontend
export const BASES_TO_TRACK_LIQUIDITY_FOR: ChainTokenList = {
  ...WRAPPED_NATIVE_CURRENCIES_ONLY,
  [SupportedChainId.ETHEREUM]: [
    ...WRAPPED_NATIVE_CURRENCIES_ONLY[SupportedChainId.ETHEREUM],
    DAI,
    USDC_ETHEREUM,
    USDT,
    WBTC,
  ],
}
export const PINNED_PAIRS: { readonly [chainId: number]: [Token, Token][] } = {
  [SupportedChainId.ETHEREUM]: [
    [
      new Token(SupportedChainId.ETHEREUM, '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', 8, 'cDAI', 'Compound Dai'),
      new Token(
        SupportedChainId.ETHEREUM,
        '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
        8,
        'cUSDC',
        'Compound USD Coin'
      ),
    ],
    [USDC_ETHEREUM, USDT],
    [DAI, USDT],
  ],
}
