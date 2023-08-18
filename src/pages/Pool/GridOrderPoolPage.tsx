import { Trans } from '@lingui/macro'
import { useWeb3React } from "@web3-react/core"
import { useIsDarkMode } from 'state/user/hooks'
import CenteringDiv from "components/centeringDiv"
import Loader from "components/Loader"
import { getChainInfo } from "constants/chainInfo"
import HydrogenNucleusHelper from "lib/utils/HydrogenNucleusHelper"
import TradePage from "pages/Trade"
import { Currency, CurrencyAmount, Percent, Price, Token, TradeType } from '@uniswap/sdk-core'
import { Field, PriceField, PairState, DepositState, WithdrawState, PoolManagementState } from '../../state/poolManagement/actions'
import {
  useDerivedPoolManagementInfo,
  usePoolManagementActionHandlers,
  usePoolManagementState,
} from '../../state/poolManagement/hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from "react-router-dom"
import { useDefaultsFromURLSearch } from "state/pool/hooks"
import { useNucleusState } from "state/statsApi/hooks"
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { TOKEN_SHORTHANDS } from '../../constants/tokens'
import styled, { useTheme } from 'styled-components/macro'
import { useToggleWalletModal } from 'state/application/hooks'
import { useExpertModeManager } from '../../state/user/hooks'
import { supportedChainId } from '../../utils/supportedChainId'
import { ApprovalState, useApproveCallback, useApproveCallbackFromTrade } from '../../hooks/useApproveCallback'
import useENSAddress from '../../hooks/useENSAddress'
import { useERC20PermitFromTrade, UseERC20PermitState } from '../../hooks/useERC20Permit'
import useIsArgentWallet from '../../hooks/useIsArgentWallet'
import { useStablecoinValue } from '../../hooks/useStablecoinPrice'
import useWrapCallback, { WrapErrorText, WrapType } from '../../hooks/useWrapCallback'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import { useTransactionAdder } from 'state/transactions/hooks'
import { ButtonConfirmed, ButtonError, ButtonLight, ButtonPrimary, ButtonYellow } from '../../components/Button'
import { ArrowWrapper, Dots, PageWrapper, SwapCallbackError, SwapWrapper } from '../../components/swap/styleds'
import { AutoRow, RowBetween, RowFixed } from '../../components/Row'
import { LinkStyledButton, ThemedText } from '../../theme'
import PoolCard from './PoolCard'
import { currencyId } from 'utils/currencyId'
import PriceSelectors from 'components/PriceSelectors'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import tryParseCurrencyAmount2 from 'lib/utils/tryParseCurrencyAmount2'
import CurrencyInputPanel from 'components/CurrencyInputPanel'
import CurrencyInputPanel2 from 'components/CurrencyInputPanel/CurrencyInputPanel2'
import { AutoColumn } from '../../components/Column'
import { HYDROGEN_NUCLEUS_ADDRESSES } from 'constants/addresses'
import nucleusAbi from 'data/abi/Hydrogen/HydrogenNucleus.json'
import { formatUnits, Interface } from 'ethers/lib/utils'
import { BigNumber } from '@ethersproject/bignumber'
import type { TransactionResponse } from '@ethersproject/providers'
import { parseUnits } from '@ethersproject/units'
import { AddressZero, WeiPerEther } from '@ethersproject/constants'
import { currencyAmountToString, currencyAmountToBigNumber } from 'lib/utils/currencyAmountToString'
import { calculateGasMargin } from 'utils/calculateGasMargin'
import { TransactionType } from 'state/transactions/types'
import { stringValueIsPositiveFloat } from 'utils/stringValueIsPositiveFloat'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import ConfirmDepositModal from 'components/poolManagement/ConfirmDepositModal'
import ConfirmWithdrawModal from 'components/poolManagement/ConfirmWithdrawModal'

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-gap: 1em;

  @media screen and (max-width: 800px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
`

const HptImageCardContainer = styled.div`
  display: inline;
  position: relative;
  top: -50px;
`

const HptImageCard = styled.img`
  display: block;
  margin: auto;
  width: 350px;
  border-radius: 42px;
  box-shadow: 0 0 32px rgba(0, 0, 0, 0.7);
`

const FirstRowContainer = styled.div`
  width: 100%;
  height: 400px;

  @media screen and (max-width: 800px) {
    height: 660px;
  }
`

const FirstRowContainerLeft = styled.div`
  display: inline-block;
  height: 350px;
  width: 50%;

  @media screen and (max-width: 800px) {
    display: block;
    width: 100%;
  }
`

const FirstRowSpacer = styled.div`
  display: inline-block;
  width: 5%;

  @media screen and (max-width: 800px) {
    display: block;
    height: 50px;
  }
`

const FirstRowContainerRight = styled.div`
  display: inline-block;
  height: 350px;
  width: 45%;
  position: relative;
  top: 0px;

  @media screen and (max-width: 800px) {
    display: block;
    width: 100%;
    padding: 0;
    position: inherit;
  }
`
/*
position: relative;
top: -75px;
*/

const Card = styled.div<{ isDarkMode: boolean }>`
  padding: 20px;
  min-width: 350px;
  border-radius: 24px;
  color: ${({ theme }) => theme.textPrimary};
  text-decoration: none;
  background-color: ${({ isDarkMode, theme }) =>
    isDarkMode
      ? theme.backgroundModule
      : 'white'};
  box-shadow: 0px 10px 24px 0px rgba(0, 0, 0, 0.15);
`

const CardTitleText = styled.p`
  margin: 0;
  font-size: 20px;
`

const CardBodyText = styled.p`
  margin: 0;
`
/*
const Tab = styled.p<{ isDarkMode: boolean, isSelected: boolean }>`
  font-size: 20px;
  display: inline;
  margin: 0 16px;
  cursor: pointer;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid black;
  background: ${({ isDarkMode, isSelected, theme }) =>
    isSelected
      ? isDarkMode
        ? '#ffffff11'
        : 'white'
      : ''};
  :hover {
    background: ${({ isDarkMode, isSelected, theme }) =>
      isDarkMode
        ? '#ffffff11'
        : 'white'};
  }
  transition: ${({ theme }) => `${theme.transition.duration.medium} ${theme.transition.timing.ease} background-color`};
`
*/
const OpenPoolManagementButtonStyled = styled.div<{ isDarkMode: boolean }>`
  font-size: 20px;
  cursor: pointer;
  padding: 0px 24px;
  border-radius: 8px;
  border: 1px solid black;
  :hover {
    background: ${({ isDarkMode, theme }) =>
      isDarkMode
        ? '#ffffff11'
        : 'white'};
  }
  transition: ${({ theme }) => `${theme.transition.duration.medium} ${theme.transition.timing.ease} background-color`};
`

const OrderTypeContainer = styled.div`
  margin: 50px 20px 20px 20px;
`
//position: fixed;
//bottom: 50px;

const OrderTypeSelector = styled.div<{ isDarkMode: boolean, isSelected?:boolean|undefined }>`
  cursor: pointer;
  margin: 0px 10px;
  display: inline-block;
  padding: 0 20px;
  border-radius: 24px;
  color: ${({ theme }) => theme.textPrimary};
  background-color: ${({ isDarkMode, isSelected, theme }) =>
    isSelected
      ? isDarkMode
        ? '#2C3444'
        : '#ccddff'
      : isDarkMode
        ? theme.backgroundModule
        : 'white'};
  border: 1px solid ${({ isSelected, theme, isDarkMode }) =>
    isSelected
      ? (isDarkMode ? theme.backgroundInteractive : theme.textTertiary)
      : `transparent`};
  box-shadow: 0px 10px 24px 0px rgba(0, 0, 0, 0.15);
  transition: ${({ theme }) => `${theme.transition.duration.medium} ${theme.transition.timing.ease} border`};
  &:hover {
    border: 1px solid ${({ theme, isDarkMode }) => (isDarkMode ? theme.backgroundInteractive : theme.textTertiary)};
  }
`

const OrderTypeSelectorTextContainer = styled(CenteringDiv)<{ isDarkMode: boolean }>`
  width: 140px;
  font-size: 20px;
  font-weight: 400;
  color: ${({ isDarkMode }) =>
    isDarkMode
      ? 'white'
      : 'black'};
`

const Tab = styled.div<{ isDarkMode: boolean, isSelected?:boolean|undefined }>`
  cursor: pointer;
  margin: 0px 10px;
  display: inline-block;
  padding: 0 20px;
  border-radius: 24px;
  color: ${({ theme }) => theme.textPrimary};
  background-color: ${({ isDarkMode, isSelected, theme }) =>
    isSelected
      ? isDarkMode
        ? '#2C3444'
        : '#ccddff'
      : isDarkMode
        ? theme.backgroundModule
        : 'white'};
  border: 1px solid ${({ isSelected, theme, isDarkMode }) =>
    isSelected
      ? (isDarkMode ? theme.backgroundInteractive : theme.textTertiary)
      : `transparent`};
  box-shadow: 0px 10px 24px 0px rgba(0, 0, 0, 0.15);
  transition: ${({ theme }) => `${theme.transition.duration.medium} ${theme.transition.timing.ease} border`};
  &:hover {
    border: 1px solid ${({ theme, isDarkMode }) => (isDarkMode ? theme.backgroundInteractive : theme.textTertiary)};
  }
`

const TabTextContainer = styled(CenteringDiv)<{ isDarkMode: boolean }>`
  width: 140px;
  font-size: 16px;
  font-weight: 400;
  color: ${({ isDarkMode }) =>
    isDarkMode
      ? 'white'
      : 'black'};
`

export default function GridOrderPoolPage(props:any) {
  const navigate = useNavigate()
  const { account, chainId, provider } = useWeb3React()
  const nucleusState = useNucleusState() as any
  const isDarkMode = useIsDarkMode()
  const { poolID } = props
  const poolManagementState = usePoolManagementState()

  // dismiss warning if all imported tokens are in active lists
  const defaultTokens = useAllTokens()
  const urlLoadedTokens = [] as any[]
  const importTokensNotInDefault = useMemo(
    () =>
      urlLoadedTokens &&
      urlLoadedTokens
        .filter((token: Token) => {
          return !(token.address in defaultTokens)
        })
        .filter((token: Token) => {
          // Any token addresses that are loaded from the shorthands map do not need to show the import URL
          const supported = supportedChainId(chainId)
          if (!supported) return true
          return !Object.keys(TOKEN_SHORTHANDS).some((shorthand) => {
            const shorthandTokenAddress = TOKEN_SHORTHANDS[shorthand][supported]
            return shorthandTokenAddress && shorthandTokenAddress === token.address
          })
        }),
    [chainId, defaultTokens, urlLoadedTokens]
  )

  const theme = useTheme()

  // toggle wallet when disconnected
  const toggleWalletModal = useToggleWalletModal()

  // for expert mode
  const [isExpertMode] = useExpertModeManager()
  // swap state
  const currentState = usePoolManagementState()
  const { pairs, deposits, withdraws, recipient } = currentState
  const {
    currenciesById,
    currencyBalancesById,
    atLeastOnePairsInfoFilled,
    allPairsInfoFilled,
    atLeastOneDepositAmountFilled,
    atLeastOneWithdrawAmountFilled,
  } = useDerivedPoolManagementInfo()

  const { onCurrencySelection, onPriceInput, onDepositAmountInput, onWithdrawAmountInput, onReplacePoolManagementState, onClearPoolManagementState } = usePoolManagementActionHandlers()

  const { address: recipientAddress } = useENSAddress(recipient)

  const addTransaction = useTransactionAdder()

  // modal and loading
  const [{ showConfirm, errorMessage, attemptingTxn, txHash, showModal }, setModalState] = useState<{
    showConfirm: boolean
    attemptingTxn: boolean
    errorMessage: string | undefined
    txHash: string | undefined
    showModal: string | undefined
  }>({
    showConfirm: false,
    attemptingTxn: false,
    errorMessage: undefined,
    txHash: undefined,
    showModal: undefined,
  })

  const handleConfirmDismiss = useCallback(() => {
    setModalState({ showConfirm: false, attemptingTxn, errorMessage, txHash, showModal:undefined })
  }, [attemptingTxn, errorMessage, txHash])

  const handlePriceInput = useCallback(
    (pairIndex:number, field:PriceField, price:string) => {
      onPriceInput(pairIndex, field, price)
    }, []
  )

  const handleDepositAmountInput = useCallback(
    (depositIndex:number, amount:string) => {
      onDepositAmountInput(depositIndex, amount)
    }, []
  )

  const parsedDepositAmounts = useMemo(() => {
    return deposits.map(deposit => {
      try {
        return tryParseCurrencyAmount(deposit.typedAmount, currenciesById[deposit.currencyId||''])
      } catch(e) {
        return undefined
      }
    })
  }, [deposits, currenciesById])

  const walletBalances = useMemo(() => {
    return deposits.map((deposit) => {
      return currencyBalancesById[deposit?.currencyId||'']
    })
  }, [deposits, currencyBalancesById])

  const depositAboveWalletBalances = useMemo(() => {
    return deposits.map((deposit,depositIndex) => {
      try {
        if(!parsedDepositAmounts[depositIndex] || !walletBalances[depositIndex]) return false
        return (parsedDepositAmounts[depositIndex] as any).greaterThan(walletBalances[depositIndex])
      } catch(e) { return false }
    })
  }, [deposits, walletBalances])

  const areAnyDepositsAboveBalances = useMemo(() => {
    return depositAboveWalletBalances.filter(x => !!x).length > 0
  }, [depositAboveWalletBalances])

  // get the max amounts user can deposit
  const maxDepositAmounts = useMemo(() => {
    return deposits.map((deposit) => {
      return maxAmountSpend(currencyBalancesById[deposit?.currencyId||''])
    })
  }, [deposits, currencyBalancesById])

  const atMaxDepositAmounts = useMemo(() => {
    return maxDepositAmounts.map((maxAmount) => {
      return false
    })
  }, [maxDepositAmounts])

  const maxDepositTokens = 20
  const depositIndices = []
  for(let i = 0; i < maxDepositTokens; i++) depositIndices.push(i)

  const fiatValuesPerTokenDeposit = depositIndices.map((depositIndex:number) => {
    const currencyAmount = (() => {
      try {
        const deposit = deposits[depositIndex]
        const currency = currenciesById[deposit.currencyId||'']
        //const c2 = (currency.tokenInfo || currency) as any
        const c2 = currency.wrapped
        //console.log("in fiatValuesPerTokenDeposit() 1", {depositIndex, deposit, currency, c2})
        if(!c2 || !c2.decimals) return undefined
        const value = '1'
        const parsedAmount = parseUnits(value, c2.decimals).toString()
        const currencyAmount = CurrencyAmount.fromRawAmount(c2, parsedAmount)
        //console.log("in fiatValuesPerTokenDeposit() 2", {depositIndex, deposit, currency, c2, parsedAmount, currencyAmount})
        return currencyAmount
      } catch(e) {
        return undefined
      }
    })()
    const stablecoinValue = useStablecoinValue(currencyAmount)
    //if(depositIndex < 2) console.log("in fiatValuesPerTokenDeposit() 3", {stablecoinValue, depositIndex, currencyAmount})
    return stablecoinValue
  })

  const fiatValuesForDepositAmount = depositIndices.map((depositIndex:number) => {
    const currencyAmount = (() => {
      try {
        const deposit = deposits[depositIndex]
        const currency = currenciesById[deposit.currencyId||'']
        const value = deposit.typedAmount
        if(!currency || !value) {
          return undefined
        }
        const c1 = currency as any
        const c2 = currency.wrapped || currency
        const decimals = (c2.tokenInfo || c2).decimals
        const parsedAmount = parseUnits(value, decimals).toString()
        const currencyAmount = CurrencyAmount.fromRawAmount(currency, parsedAmount)
        return currencyAmount
      } catch(e) {
        return undefined
      }
    })()
    const stablecoinValue = useStablecoinValue(currencyAmount)
    return stablecoinValue
  })

  const approvals = depositIndices.map((depositIndex:number) => {
    const typedAmount = depositIndex >= deposits.length ? '' : deposits[depositIndex].typedAmount
    const currency = depositIndex >= deposits.length ? undefined : currenciesById[deposits[depositIndex].currencyId||'']
    return useApproveCallback(
      tryParseCurrencyAmount(typedAmount, currency),
      chainId ? HYDROGEN_NUCLEUS_ADDRESSES[chainId] : undefined
    )
  })

  const areAnyTokensAwaitingApproval = useMemo(() => {
    for(const depositIndex in deposits) {
      const approvalState = approvals[depositIndex][0]
      if(approvalState == ApprovalState.NOT_APPROVED || approvalState == ApprovalState.PENDING) return true
    }
    return false
  }, [approvals, deposits])

  const handleWithdrawAmountInput = useCallback(
    (withdrawIndex:number, amount:string) => {
      onWithdrawAmountInput(withdrawIndex, amount)
    }, []
  )

  const parsedWithdrawAmounts = useMemo(() => {
    return withdraws.map(withdraw => {
      try {
        return tryParseCurrencyAmount(withdraw.typedAmount, currenciesById[withdraw.currencyId||''])
      } catch(e) {
        return undefined
      }
    })
  }, [withdraws, currenciesById])

  //const walletBalances = useMemo(() => {
    //return withdraws.map((withdraw) => {
      //return currencyBalancesById[withdraw?.currencyId||'']
    //})
  //}, [withdraws, currencyBalancesById])

  const pool = nucleusState?.pools[poolID]
  const poolBalances = nucleusState?.internalBalancesByPool[poolID]

  //console.log("LimitOrderPoolPage() 1", {pool, poolBalances, withdraws, currencyBalancesById, walletBalances})

  const poolBalances2 = useMemo(() => {
    return withdraws.map((withdraw) => {
      const currencyId = withdraw?.currencyId||''
      const token = currenciesById[currencyId]
      //return '0'
      const balStr = formatUnits(poolBalances[currencyId] || '0', token.decimals)
      //return tryParseCurrencyAmount(withdraw?.typedAmount||"0", token)
      return tryParseCurrencyAmount2(balStr, token)
    })
  }, [withdraws, poolBalances])

  //console.log("LimitOrderPoolPage() 2", {pool, poolBalances, withdraws, currencyBalancesById, walletBalances, poolBalances2})

  const withdrawAbovePoolBalances = useMemo(() => {
    return withdraws.map((withdraw,withdrawIndex) => {
      try {
        if(!parsedWithdrawAmounts[withdrawIndex] || !poolBalances2[withdrawIndex]) return false
        return (parsedWithdrawAmounts[withdrawIndex] as any).greaterThan(poolBalances2[withdrawIndex])
      } catch(e) { return false }
    })
  }, [withdraws, walletBalances])

  const areAnyWithdrawsAboveBalances = useMemo(() => {
    return withdrawAbovePoolBalances.filter(x => !!x).length > 0
  }, [withdrawAbovePoolBalances])

  // get the max amounts user can withdraw
  const maxWithdrawAmounts = useMemo(() => {
    //return withdraws.map((withdraw) => {
    return withdraws.map((withdraw,withdrawId) => {
      //return maxAmountSpend(currencyBalancesById[withdraw?.currencyId||''])
      return maxAmountSpend(poolBalances2[withdrawId])
    })
  }, [withdraws, currencyBalancesById])

  const atMaxWithdrawAmounts = useMemo(() => {
    return maxWithdrawAmounts.map((maxAmount) => {
      return false
    })
  }, [maxWithdrawAmounts])

  const maxWithdrawTokens = 20
  const withdrawIndices = []
  for(let i = 0; i < maxWithdrawTokens; i++) withdrawIndices.push(i)

  const fiatValuesPerTokenWithdraw = withdrawIndices.map((withdrawIndex:number) => {
    const currencyAmount = (() => {
      try {
        const withdraw = withdraws[withdrawIndex]
        const currency = currenciesById[withdraw.currencyId||'']
        //const c2 = (currency.tokenInfo || currency) as any
        const c2 = currency.wrapped
        //console.log("in fiatValuesPerTokenWithdraw() 1", {withdrawIndex, withdraw, currency, c2})
        if(!c2 || !c2.decimals) return undefined
        const value = '1'
        const parsedAmount = parseUnits(value, c2.decimals).toString()
        const currencyAmount = CurrencyAmount.fromRawAmount(c2, parsedAmount)
        //console.log("in fiatValuesPerTokenWithdraw() 2", {withdrawIndex, withdraw, currency, c2, parsedAmount, currencyAmount})
        return currencyAmount
      } catch(e) {
        return undefined
      }
    })()
    const stablecoinValue = useStablecoinValue(currencyAmount)
    //if(withdrawIndex < 2) console.log("in fiatValuesPerTokenWithdraw() 3", {stablecoinValue, withdrawIndex, currencyAmount})
    return stablecoinValue
  })

  const fiatValuesForWithdrawAmount = withdrawIndices.map((withdrawIndex:number) => {
    const currencyAmount = (() => {
      try {
        const withdraw = withdraws[withdrawIndex]
        const currency = currenciesById[withdraw.currencyId||'']
        const value = withdraw.typedAmount
        if(!currency || !value) {
          return undefined
        }
        const c1 = currency as any
        const c2 = currency.wrapped || currency
        const decimals = (c2.tokenInfo || c2).decimals
        const parsedAmount = parseUnits(value, decimals).toString()
        const currencyAmount = CurrencyAmount.fromRawAmount(currency, parsedAmount)
        return currencyAmount
      } catch(e) {
        return undefined
      }
    })()
    const stablecoinValue = useStablecoinValue(currencyAmount)
    return stablecoinValue
  })

  const arePricesUnordered = useMemo(() => {
    return pairs.map((pair,pairIndex) => {
      try {
        if(!stringValueIsPositiveFloat(pair.typedValueBuyPrice) || !stringValueIsPositiveFloat(pair.typedValueSellPrice)) return false
        const quoteCurrencyId = pair.QUOTE_TOKEN.currencyId || ''
        if(!quoteCurrencyId) return false
        const quoteCurrency = currenciesById[quoteCurrencyId]
        if(!quoteCurrency) return false
        const buyPrice = parseUnits(pair.typedValueBuyPrice, quoteCurrency.tokenInfo.decimals)
        const sellPrice = parseUnits(pair.typedValueSellPrice, quoteCurrency.tokenInfo.decimals)
        return buyPrice.gt(sellPrice)
      } catch(e) {
        return false
      }
    })
  }, [pairs])

  const areAnyPricesUnordered = useMemo(() => {
    for(const unordered of arePricesUnordered) {
      if(unordered) return true
    }
    return false
  }, [pairs])

  const addIsUnsupported = false
  const nucleusInterface = useMemo(() => new Interface(nucleusAbi), [nucleusAbi])

  async function handleDeposit() {
    // checks
    if (!chainId || !provider || !account) return
    if(!HYDROGEN_NUCLEUS_ADDRESSES[chainId]) return
    if(areAnyDepositsAboveBalances || areAnyTokensAwaitingApproval || !atLeastOneDepositAmountFilled) return
    // encode transaction
    const userExternalLocation = HydrogenNucleusHelper.externalAddressToLocation(account)
    //const userInternalLocation = HydrogenNucleusHelper.internalAddressToLocation(account)
    const poolLocation = HydrogenNucleusHelper.poolIDtoLocation(poolID)

    const currencyIds = deposits.map((deposit) => deposit.currencyId).filter(x=>!!x) as string[]

    const txdatas = deposits.map((deposit,depositIndex) => {
      const parsedAmount = parsedDepositAmounts[depositIndex] as any
      if(!parsedAmount) return undefined
      const amount = currencyAmountToString(parsedAmount)
      if(!amount || amount == '0') return undefined
      const currency = currenciesById[deposit.currencyId||'']
      /*
      if(currency.isNative) {
        const address = currency.wrapped.address
        gasTokenAmount = amount
        return {
          token: address,
          amount: amount,
          location: userInternalLocation,
        }
      } else {
        const address = currency.address
        //console.log("encoding tokenSource", {depositIndex, deposit, currency, address})
        return {
          token: address,
          amount: amount,
          location: userExternalLocation,
        }
      }
      */
      const address = currency.address
      return nucleusInterface.encodeFunctionData("tokenTransfer", [{
        token: address,
        amount: amount,
        src: userExternalLocation,
        dst: poolLocation
      }])
    }).filter(x=>!!x)

    if(txdatas.length == 0) return
    const calldata = (txdatas.length == 1
      ? (txdatas[0] || "0x")
      : nucleusInterface.encodeFunctionData("multicall", [txdatas])
    )

    let txn: { to: string; data: string; value: string } = {
      to: HYDROGEN_NUCLEUS_ADDRESSES[chainId],
      data: calldata,
      value: '0',
    }

    setModalState({ attemptingTxn: true, showConfirm, errorMessage: undefined, txHash: undefined, showModal })

    const currencyIds2:any[] = []
    const currencyAmountsRaws2:any[] = []
    for(let i = 0; i < deposits.length; i++) {
      const deposit = deposits[i]
      if(!!deposit.currencyId && !!deposit.typedAmount && parseFloat(deposit.typedAmount) > 0) {
        currencyIds2.push(currencyIds[i])
        currencyAmountsRaws2.push(parseUnits(deposit.typedAmount, currenciesById[deposit.currencyId||''].decimals).toString())
      }
    }

    provider
      .getSigner()
      .estimateGas(txn)
      .then((estimate) => {
        const newTxn = {
          ...txn,
          gasLimit: calculateGasMargin(estimate),
        }

        return provider
          .getSigner()
          .sendTransaction(newTxn)
          .then((response: TransactionResponse) => {
            setModalState({ attemptingTxn: false, showConfirm, errorMessage: undefined, txHash: response.hash, showModal })
            addTransaction(response, {
              type: TransactionType.DEPOSIT,
              currencyIds: currencyIds2,
              currencyAmountRaws: currencyAmountsRaws2,
              poolID,
            })
            response.wait(1).then(() => {
              handleResetPoolManagementState()
            })
          })
      })
      .catch((error) => {
        console.error('Failed to send transaction', error)
        setModalState({
          attemptingTxn: false,
          showConfirm,
          errorMessage: error.message,
          txHash: undefined,
          showModal,
        })
        // we only care if the error is something _other_ than the user rejected the tx
        if (error?.code !== 4001) {
          console.error(error)
        }
      })
  }

  async function handleWithdraw() {
    // checks
    if (!chainId || !provider || !account) return
    if(!HYDROGEN_NUCLEUS_ADDRESSES[chainId]) return
    if(areAnyWithdrawsAboveBalances || !atLeastOneWithdrawAmountFilled) return
    // encode transaction
    const userExternalLocation = HydrogenNucleusHelper.externalAddressToLocation(account)
    //const userInternalLocation = HydrogenNucleusHelper.internalAddressToLocation(account)
    const poolLocation = HydrogenNucleusHelper.poolIDtoLocation(poolID)

    const currencyIds = withdraws.map((withdraw) => withdraw.currencyId).filter(x=>!!x) as string[]

    const txdatas = withdraws.map((withdraw,withdrawIndex) => {
      const parsedAmount = parsedWithdrawAmounts[withdrawIndex] as any
      if(!parsedAmount) return undefined
      const amount = currencyAmountToString(parsedAmount)
      if(!amount || amount == '0') return undefined
      const currency = currenciesById[withdraw.currencyId||'']
      /*
      if(currency.isNative) {
        const address = currency.wrapped.address
        gasTokenAmount = amount
        return {
          token: address,
          amount: amount,
          location: userInternalLocation,
        }
      } else {
        const address = currency.address
        //console.log("encoding tokenSource", {withdrawIndex, withdraw, currency, address})
        return {
          token: address,
          amount: amount,
          location: userExternalLocation,
        }
      }
      */
      const address = currency.address
      return nucleusInterface.encodeFunctionData("tokenTransfer", [{
        token: address,
        amount: amount,
        src: poolLocation,
        dst: userExternalLocation,
      }])
    }).filter(x=>!!x)

    if(txdatas.length == 0) return
    const calldata = (txdatas.length == 1
      ? (txdatas[0] || "0x")
      : nucleusInterface.encodeFunctionData("multicall", [txdatas])
    )

    let txn: { to: string; data: string; value: string } = {
      to: HYDROGEN_NUCLEUS_ADDRESSES[chainId],
      data: calldata,
      value: '0',
    }

    setModalState({ attemptingTxn: true, showConfirm, errorMessage: undefined, txHash: undefined, showModal })

    const currencyIds2:any[] = []
    const currencyAmountsRaws2:any[] = []
    for(let i = 0; i < withdraws.length; i++) {
      const withdraw = withdraws[i]
      if(!!withdraw.currencyId && !!withdraw.typedAmount && parseFloat(withdraw.typedAmount) > 0) {
        currencyIds2.push(currencyIds[i])
        currencyAmountsRaws2.push(parseUnits(withdraw.typedAmount, currenciesById[withdraw.currencyId||''].decimals).toString())
      }
    }

    provider
      .getSigner()
      .estimateGas(txn)
      .then((estimate) => {
        const newTxn = {
          ...txn,
          gasLimit: calculateGasMargin(estimate),
        }

        return provider
          .getSigner()
          .sendTransaction(newTxn)
          .then((response: TransactionResponse) => {
            setModalState({ attemptingTxn: false, showConfirm, errorMessage: undefined, txHash: response.hash, showModal })
            addTransaction(response, {
              type: TransactionType.WITHDRAW,
              currencyIds: currencyIds2,
              currencyAmountRaws: currencyAmountsRaws2,
              poolID,
            })
            response.wait(1).then(() => {
              handleResetPoolManagementState()
            })
          })
      })
      .catch((error) => {
        console.error('Failed to send transaction', error)
        setModalState({
          attemptingTxn: false,
          showConfirm,
          errorMessage: error.message,
          txHash: undefined,
          showModal,
        })
        // we only care if the error is something _other_ than the user rejected the tx
        if (error?.code !== 4001) {
          console.error(error)
        }
      })
  }

  async function handleSetPrices() {
    console.log("todo: handleSetPrices()")
  }

  const [isManageCardOpen, setIsManageCardOpen] = useState(false)
  const [openTab, setOpenTab] = useState("deposit")

  async function onReplacePoolManagementStateWithDelay(newState:any) {
    async function _sleeper(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    await _sleeper(0);
    onReplacePoolManagementState(newState)
  }

  // reset after successful transaction
  async function handleResetPoolManagementState() {
    const newState = JSON.parse(JSON.stringify(currentState))
    for(let i = 0; i < deposits.length; i++) {
      newState.deposits[i].typedAmount = ''
    }
    for(let i = 0; i < withdraws.length; i++) {
      newState.withdraws[i].typedAmount = ''
    }
    await onReplacePoolManagementStateWithDelay(newState)
  }

  // on first load, has no deposits or withdraws. this adds a blank with the pool tokenA
  /*
  useEffect(() => {
    if(deposits.length == 0 || withdraws.length == 0) {
      const tokenA = Object.keys(pool.tradeRequests)[0]
      const newState = JSON.parse(JSON.stringify(currentState))
      if(deposits.length == 0) {
        newState.deposits = [{currencyId: tokenA, typedAmount: ''}]
      }
      if(withdraws.length == 0) {
        newState.withdraws = [{currencyId: tokenA, typedAmount: ''}]
      }
      onReplacePoolManagementState(newState)
    }
  }, [poolBalances, deposits, currentState])
  */
  // scroll on page view or poolID changed
  const [previousPoolID, setPreviousPoolID] = useState("0")
  useMemo(async () => {
    if(poolID != previousPoolID) {
      window.scrollTo(0, 0)
      setPreviousPoolID(poolID)
      const tokenAs = Object.keys(pool.tradeRequests)
      const newState = JSON.parse(JSON.stringify(currentState))
      //if(deposits.length == 0) {
      //newState.deposits = [{currencyId: tokenA, typedAmount: ''}]
      newState.deposits = tokenAs.map((tokenA) => ({currencyId: tokenA, typedAmount: ''}))
      //}
      //if(withdraws.length == 0) {
      //newState.withdraws = [{currencyId: tokenA, typedAmount: ''}]
      newState.withdraws = tokenAs.map((tokenA) => ({currencyId: tokenA, typedAmount: ''}))
      //}
      await onReplacePoolManagementStateWithDelay(newState)
    }
  }, [poolID, previousPoolID])

  const HptImage = () => (
    <HptImageCardContainer>
      <HptImageCard src={`https://assets.hydrogendefi.xyz/hpt/${chainId}/${poolID}.svg`} />
    </HptImageCardContainer>
  )

  const pricesUnorderedButtons = (
    <RowBetween>
      {pairs.map((pair,pairIndex) => {
        if(!arePricesUnordered[pairIndex]) return undefined
        const symbol0 = currenciesById[pair.BASE_TOKEN.currencyId||'']?.tokenInfo.symbol || "token0"
        const symbol1 = currenciesById[pair.QUOTE_TOKEN.currencyId||'']?.tokenInfo.symbol || "token1"
        return (
          <ButtonPrimary
            disabled={true}
            width={'100%'}
            key={pairIndex}
          >
            {symbol0}/{symbol1} prices unordered
          </ButtonPrimary>
        )
      })}
    </RowBetween>
  )

  const insufficientWalletBalanceButtons = (
    <RowBetween>
      {deposits.map((deposit,depositIndex) => {
        if(!depositAboveWalletBalances[depositIndex]) return undefined
        const currency = currenciesById[deposit.currencyId||'']
        const symbol = (currency.tokenInfo || currency).symbol || "tokens"
        return (
          <ButtonPrimary
            disabled={true}
            width={'100%'}
            key={depositIndex}
          >
            Insufficient {symbol}
          </ButtonPrimary>
        )
      })}
    </RowBetween>
  )

  const insufficientPoolBalanceButtons = (
    <RowBetween>
      {withdraws.map((withdraw,withdrawIndex) => {
        if(!withdrawAbovePoolBalances[withdrawIndex]) return undefined
        const currency = currenciesById[withdraw.currencyId||'']
        const symbol = (currency.tokenInfo || currency).symbol || "tokens"
        return (
          <ButtonPrimary
            disabled={true}
            width={'100%'}
            key={withdrawIndex}
          >
            Insufficient {symbol}
          </ButtonPrimary>
        )
      })}
    </RowBetween>
  )

  const tokenApprovalButtons = (
    <RowBetween>
      {deposits.map((deposit,depositIndex) => {
        try {
          const approvalState = approvals[depositIndex][0]
          const currency = currenciesById[deposit.currencyId||'']
          //console.log("in tokenApprovalButtons", {depositIndex, deposit, approvalState, currency, currenciesById, currencyId:deposit.currencyId})
          const tokenInfo = currency.tokenInfo || currency
          const symbol = tokenInfo.symbol
          //const symbol = currenciesById[deposit.currencyId||'']?.tokenInfo.symbol
          return (approvalState == ApprovalState.NOT_APPROVED || approvalState == ApprovalState.PENDING) && (
            <ButtonPrimary
              onClick={approvals[depositIndex][1]}
              disabled={approvals[depositIndex][0] === ApprovalState.PENDING}
              width={'100%'}
            >
              {approvals[depositIndex][0] === ApprovalState.PENDING ? (
                <Dots>
                  {`Approving ${symbol}`}
                </Dots>
              ) : (
                `Approve ${symbol}`
              )}
            </ButtonPrimary>
          )
        } catch(e) {
          return undefined
        }
      })}
    </RowBetween>
  )

  const depositButton = (
    <RowBetween>
      <ButtonError
        onClick={() => {
          setModalState({
            attemptingTxn: false,
            errorMessage: undefined,
            showConfirm: true,
            txHash: undefined,
            showModal: "deposit",
          })
        }}
        disabled={false}
        error={false}
      >
        Deposit
      </ButtonError>
    </RowBetween>
  )

  const withdrawButton = (
    <RowBetween>
      <ButtonError
        onClick={() => {
          setModalState({
            attemptingTxn: false,
            errorMessage: undefined,
            showConfirm: true,
            txHash: undefined,
            showModal: "withdraw",
          })
        }}
        disabled={false}
        error={false}
      >
        Withdraw
      </ButtonError>
    </RowBetween>
  )
  /*
  const buttons = (allPairsInfoFilled && atLeastOneDepositAmountFilled && (
    addIsUnsupported ? (
      <ButtonPrimary disabled={true} $borderRadius="12px" padding="12px">
        <ThemedText.DeprecatedMain mb="4px">
          <Trans>Unsupported Asset</Trans>
        </ThemedText.DeprecatedMain>
      </ButtonPrimary>
    ) : !account ? (
      <ButtonLight onClick={toggleWalletModal} $borderRadius="12px" padding="12px">
        <Trans>Connect Wallet</Trans>
      </ButtonLight>
    ) : (
      <AutoColumn gap="md">
        {areAnyPricesUnordered ? (
          pricesUnorderedButtons
        ) : areAnyDepositsAboveBalances ? (
          insufficientWalletBalanceButtons
        ) : areAnyTokensAwaitingApproval ? (
          tokenApprovalButtons
        ) : (
          placeGridOrderButton
        )}
      </AutoColumn>
    )
  ))
  */
  const depositButtons = (atLeastOneDepositAmountFilled ? (
    addIsUnsupported ? (
      <ButtonPrimary disabled={true} $borderRadius="12px" padding="12px">
        <ThemedText.DeprecatedMain mb="4px">
          <Trans>Unsupported Asset</Trans>
        </ThemedText.DeprecatedMain>
      </ButtonPrimary>
    ) : !account ? (
      <ButtonLight onClick={toggleWalletModal} $borderRadius="12px" padding="12px">
        <Trans>Connect Wallet</Trans>
      </ButtonLight>
    ) : (
      <AutoColumn gap="md">
        {areAnyDepositsAboveBalances ? (
          insufficientWalletBalanceButtons
        ) : areAnyTokensAwaitingApproval ? (
          tokenApprovalButtons
        ) : (
          depositButton
        )}
      </AutoColumn>
    )
  ): (
    <div style={{visibility:"hidden"}}>
      {depositButton}
    </div>
  ))

  const withdrawButtons = (atLeastOneWithdrawAmountFilled ? (
    addIsUnsupported ? (
      <ButtonPrimary disabled={true} $borderRadius="12px" padding="12px">
        <ThemedText.DeprecatedMain mb="4px">
          <Trans>Unsupported Asset</Trans>
        </ThemedText.DeprecatedMain>
      </ButtonPrimary>
    ) : !account ? (
      <ButtonLight onClick={toggleWalletModal} $borderRadius="12px" padding="12px">
        <Trans>Connect Wallet</Trans>
      </ButtonLight>
    ) : (
      <AutoColumn gap="md">
        {areAnyWithdrawsAboveBalances ? (
          insufficientPoolBalanceButtons
        ) : (
          withdrawButton
        )}
      </AutoColumn>
    )
  ): (
    <div style={{visibility:"hidden"}}>
      {withdrawButton}
    </div>
  ))

  const OpenPoolManagementButton = () => (
    <OrderTypeContainer onClick={()=>{setIsManageCardOpen(true)}}>
      <OrderTypeSelector isDarkMode={isDarkMode}>
        <OrderTypeSelectorTextContainer isDarkMode={isDarkMode}>
          <p>Manage pool</p>
        </OrderTypeSelectorTextContainer>
      </OrderTypeSelector>
    </OrderTypeContainer>
  )

  // if pool is known
  return (
    <ContentLayout style={{display:"inline"}}>
      <div>
          <ConfirmDepositModal
            isOpen={showConfirm && showModal == "deposit"}
            trade={undefined}
            fiatValues={fiatValuesForDepositAmount}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            onConfirm={handleDeposit}
            swapErrorMessage={errorMessage}
            onDismiss={handleConfirmDismiss}
            poolID={poolID}
          />
          <ConfirmWithdrawModal
            isOpen={showConfirm && showModal == "withdraw"}
            trade={undefined}
            fiatValues={fiatValuesForWithdrawAmount}
            attemptingTxn={attemptingTxn}
            txHash={txHash}
            recipient={recipient}
            onConfirm={handleWithdraw}
            swapErrorMessage={errorMessage}
            onDismiss={handleConfirmDismiss}
            poolID={poolID}
          />
      </div>
      <CenteringDiv>
        <div style={{marginTop:"40px"}}>
          <div>
            <CenteringDiv>

              <FirstRowContainer>
                <FirstRowContainerLeft>
                  <HptImage/>
                </FirstRowContainerLeft>
                <FirstRowSpacer/>
                <FirstRowContainerRight>
                  <PoolCard poolID={poolID} style={{minHeight:"350px"}}/>
                  <CenteringDiv style={{width:"350px",marginTop:"20px"}}>
                    <a href={`${getChainInfo(chainId)?.analyticsLink}pools/${poolID}`} target="_blank" style={{textDecoration:"none"}}>
                      <p style={{margin:"0"}}>View pool analytics</p>
                    </a>
                  </CenteringDiv>
                </FirstRowContainerRight>
              </FirstRowContainer>
              {/*
              <div>
                <HptImageCardContainer>
                  <HptImageCard src={`https://assets.hydrogendefi.xyz/hpt/${chainId}/${poolID}.svg`} />
                </HptImageCardContainer>
                <div style={{display:"inline"}}>
                  <PoolCard poolID={poolID}/>
                </div>
              </div>
              */}
            </CenteringDiv>
          </div>

          <div style={{margin:"32px 0 0 0", width:"100%"}}>
            {/*
            <CenteringDiv>
              <h2 style={{margin:"32px 0"}}>Pool management coming soon</h2>
            </CenteringDiv>
            <CenteringDiv>
              <a href={`${getChainInfo(chainId)?.analyticsLink}pools/${poolID}`} target="_blank" style={{textDecoration:"none"}}>
                <p style={{margin:"0"}}>View pool analytics</p>
              </a>
            </CenteringDiv>
            */}
            <CenteringDiv style={{width:"100%"}}>
              {pool.owner != account ? null : (
                !isManageCardOpen ? (
                  <OpenPoolManagementButton/>
                ) : (
                  <SwapWrapper style={{width:"100%"}}>
                    <div>
                      <CenteringDiv>
                        <div style={{margin:"18px 0 36px 0"}}>
                          {/*
                          <Tab onClick={()=>setOpenTab("deposit")} isSelected={openTab=="deposit"} isDarkMode={isDarkMode}>Deposit</Tab>
                          <Tab onClick={()=>setOpenTab("withdraw")} isSelected={openTab=="withdraw"} isDarkMode={isDarkMode}>Withdraw</Tab>
                          <Tab onClick={()=>setOpenTab("setprices")} isSelected={openTab=="setprices"} isDarkMode={isDarkMode}>Set Prices</Tab>
                          */}
                          <Tab isDarkMode={isDarkMode} isSelected={openTab=="deposit"} onClick={()=>setOpenTab("deposit")}>
                            <TabTextContainer isDarkMode={isDarkMode}>
                              <p>Deposit</p>
                            </TabTextContainer>
                          </Tab>
                          <Tab isDarkMode={isDarkMode} isSelected={openTab=="withdraw"} onClick={()=>setOpenTab("withdraw")}>
                            <TabTextContainer isDarkMode={isDarkMode}>
                              <p>Withdraw</p>
                            </TabTextContainer>
                          </Tab>
                          <Tab isDarkMode={isDarkMode} isSelected={openTab=="setprices"} onClick={()=>setOpenTab("setprices")}>
                            <TabTextContainer isDarkMode={isDarkMode}>
                              <p>Set Prices</p>
                            </TabTextContainer>
                          </Tab>
                        </div>
                      </CenteringDiv>
                    </div>
                    <div>
                      <CenteringDiv>
                        <div>
                          {openTab == "deposit" && (
                            <div>
                              <CenteringDiv>
                                <div style={{marginBottom:"12px"}}>
                                  <RowBetween paddingBottom="20px">
                                    <ThemedText.DeprecatedLabel>
                                      <Trans>Deposit Amounts</Trans>
                                    </ThemedText.DeprecatedLabel>
                                  </RowBetween>
                                </div>
                              </CenteringDiv>
                              <AutoColumn gap="md">
                                {deposits.map((deposit:any,depositIndex:number) => (
                                  <CurrencyInputPanel2
                                    key={deposit.currencyId}
                                    value={deposit.typedAmount}
                                    onUserInput={(amount:string)=>{handleDepositAmountInput(depositIndex, amount)}}
                                    onMax={()=>{handleDepositAmountInput(depositIndex, maxDepositAmounts[depositIndex]?.toExact()??'')}}
                                    showMaxButton={!atMaxDepositAmounts[depositIndex]}
                                    currency={currenciesById[deposit.currencyId||""] ?? null}
                                    fiatValue={fiatValuesForDepositAmount[depositIndex]}
                                    id={`deposit-amount-${deposit.currencyId}`}
                                    isOptional={atLeastOneDepositAmountFilled}
                                    showCommonBases
                                    locked={false}
                                    error={depositAboveWalletBalances[depositIndex]}
                                  />
                                ))}
                                {depositButtons}
                              </AutoColumn>
                            </div>
                          )}
                          {openTab == "withdraw" && (
                            <div>
                              <CenteringDiv>
                                <div style={{marginBottom:"12px"}}>
                                  <RowBetween paddingBottom="20px">
                                    <ThemedText.DeprecatedLabel>
                                      <Trans>Withdraw Amounts</Trans>
                                    </ThemedText.DeprecatedLabel>
                                  </RowBetween>
                                </div>
                              </CenteringDiv>
                              <AutoColumn gap="md">
                                {withdraws.map((withdraw:any,withdrawIndex:number) => (
                                  <CurrencyInputPanel2
                                    key={withdraw.currencyId}
                                    value={withdraw.typedAmount}
                                    onUserInput={(amount:string)=>{handleWithdrawAmountInput(withdrawIndex, amount)}}
                                    onMax={()=>{handleWithdrawAmountInput(withdrawIndex, maxWithdrawAmounts[withdrawIndex]?.toExact()??'')}}
                                    showMaxButton={!atMaxWithdrawAmounts[withdrawIndex]}
                                    currency={currenciesById[withdraw.currencyId||""] ?? null}
                                    fiatValue={fiatValuesForWithdrawAmount[withdrawIndex]}
                                    id={`withdraw-amount-${withdraw.currencyId}`}
                                    isOptional={atLeastOneWithdrawAmountFilled}
                                    showCommonBases
                                    locked={false}
                                    error={withdrawAbovePoolBalances[withdrawIndex]}
                                    overrideBalance={poolBalances2[withdrawIndex]}
                                  />
                                ))}
                                {withdrawButtons}
                              </AutoColumn>
                            </div>
                          )}
                          {openTab == "setprices" && (
                            <div>
                              <CenteringDiv>
                                <div style={{marginBottom:"12px"}}>
                                  <RowBetween paddingBottom="20px">
                                    <ThemedText.DeprecatedLabel>
                                      <Trans>Set Prices</Trans>
                                    </ThemedText.DeprecatedLabel>
                                  </RowBetween>
                                </div>
                              </CenteringDiv>
                              {/*
                              <AutoColumn gap="md">
                                <>
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
                                    </RowBetween>
                                  </AutoColumn>
                                  <PriceSelectors
                                    buyPrice={buyPrice}
                                    sellPrice={sellPrice}
                                    onBuyPriceInput={(price:string)=>{handlePriceInput(pairIndex, PriceField.BUY_PRICE, price)}}
                                    onSellPriceInput={(price:string)=>{handlePriceInput(pairIndex, PriceField.SELL_PRICE, price)}}
                                    currencyBase={currencyBase}
                                    currencyQuote={currencyQuote}
                                  />
                                  {priceString && (
                                    <CenteringDiv>
                                      <MarketPriceText>
                                        Current market price: {priceString} {currencyQuote?.symbol} per {currencyBase?.symbol}
                                      </MarketPriceText>
                                    </CenteringDiv>
                                  )}
                                  {messages.length > 0 && (
                                    <div>
                                      <div style={{marginTop:"0.5rem"}}/>
                                      {messages.map((message:any,messageIndex:number) => (
                                        <CenteringDiv key={messageIndex}>
                                          <PairCardMessageText style={{color:message.color}}>
                                            {message.text}
                                          </PairCardMessageText>
                                        </CenteringDiv>
                                      ))}
                                    </div>
                                  )}
                                </>
                              </AutoColumn>
                              */}
                            </div>
                          )}
                        </div>
                      </CenteringDiv>
                    </div>
                  </SwapWrapper>
                )
              )}
            </CenteringDiv>
          </div>

        </div>
      </CenteringDiv>
    </ContentLayout>
  )
}
