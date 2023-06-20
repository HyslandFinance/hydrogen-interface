import { BigNumber } from '@ethersproject/bignumber'
import { SwapRouter, Trade } from '@uniswap/router-sdk'
import { Currency, Percent, TradeType } from '@uniswap/sdk-core'
import { FeeOptions } from '@uniswap/v3-sdk'
import { useWeb3React } from '@web3-react/core'
import { HYDROGEN_NUCLEUS_ADDRESSES } from 'constants/addresses'
import { useMemo } from 'react'
import nucleusAbi from 'data/abi/Hydrogen/HydrogenNucleus.json'

import { useArgentWalletContract } from './useArgentWalletContract'
import useENS from './useENS'
import { SignatureData } from './useERC20Permit'
import { ethers } from 'ethers'
import HydrogenNucleusHelper from 'lib/utils/HydrogenNucleusHelper'
const { AddressZero } = ethers.constants

interface SwapCall {
  address: string
  calldata: string
  value: string
}

/**
 * Returns the swap calls that can be used to make the trade
 * @param trade trade to execute
 * @param allowedSlippage user allowed slippage
 * @param recipientAddressOrName the ENS name or address of the recipient of the swap output
 * @param signatureData the signature data of the permit of the input token amount, if available
 */
export function useSwapCallArguments(
  trade: any,
  allowedSlippage: Percent,
  recipientAddressOrName: string | null | undefined,
  signatureData: SignatureData | null | undefined,
  deadline: BigNumber | undefined,
  feeOptions: FeeOptions | undefined
): SwapCall[] {
  const { account, chainId, provider } = useWeb3React()

  const { address: recipientAddress } = useENS(recipientAddressOrName)
  const recipient = recipientAddressOrName === null ? account : recipientAddress
  const argentWalletContract = useArgentWalletContract()

  const nucleusAddress = chainId ? HYDROGEN_NUCLEUS_ADDRESSES[chainId] : undefined
  const nucleusInterface = useMemo(() => new ethers.utils.Interface(nucleusAbi), [nucleusAbi])

  return useMemo(() => {
    if (!trade || !recipient || !provider || !account || !chainId || !deadline || !nucleusAddress) return []
    const userExternalLocation = HydrogenNucleusHelper.externalAddressToLocation(recipient)
    const userInternalLocation = HydrogenNucleusHelper.internalAddressToLocation(recipient)

    const route = trade.route
    const hydrogenRoute = route.hydrogenRoute
    const paths = hydrogenRoute.paths
    // null case
    if(!paths || paths.length == 0) {
      return []
    }
    // single hop case
    else if(paths.length == 1 && paths[0].hops.length == 1) {
      const hop = paths[0].hops[0]
      const calldata = nucleusInterface.encodeFunctionData("executeMarketOrder", [{
        poolID: hop.poolID,
        tokenA: paths[0].tokenList[1],
        tokenB: paths[0].tokenList[0],
        amountA: hop.amountAMT,
        amountB: hop.amountBMT,
        locationA: userExternalLocation,
        locationB: userExternalLocation,
        flashSwapCallee: AddressZero,
        callbackData: "0x"
      }])
      const value = "0"
      return [
        {
          address: nucleusAddress,
          calldata,
          value,
        },
      ]
    }
    // multi hop case
    else {
      const txdatas = []
      txdatas.push(nucleusInterface.encodeFunctionData("tokenTransfer", [{
        token: route.inputAmount.currency.tokenInfo.address,
        amount: hydrogenRoute.swapType == "exactIn" ? hydrogenRoute.amount : hydrogenRoute.quote,
        src: userExternalLocation,
        dst: userInternalLocation
      }]))
      for(const path of paths) {
        for(let hopIndex = 0; hopIndex < path.hops.length; hopIndex++) {
          const hop = path.hops[hopIndex]
          txdatas.push(nucleusInterface.encodeFunctionData("executeMarketOrder", [{
            poolID: hop.poolID,
            tokenA: path.tokenList[hopIndex+1],
            tokenB: path.tokenList[hopIndex],
            amountA: hop.amountAMT,
            amountB: hop.amountBMT,
            locationA: userInternalLocation,
            locationB: userInternalLocation,
            flashSwapCallee: AddressZero,
            callbackData: "0x"
          }]))
        }
      }
      txdatas.push(nucleusInterface.encodeFunctionData("tokenTransfer", [{
        token: route.outputAmount.currency.tokenInfo.address,
        amount: hydrogenRoute.swapType == "exactIn" ? hydrogenRoute.quote : hydrogenRoute.amount,
        src: userInternalLocation,
        dst: userExternalLocation
      }]))
      const calldata = nucleusInterface.encodeFunctionData("multicall", [txdatas])
      const value = "0"
      return [
        {
          address: nucleusAddress,
          calldata,
          value,
        },
      ]
    }
  }, [
    account,
    allowedSlippage,
    argentWalletContract,
    chainId,
    deadline,
    feeOptions,
    provider,
    recipient,
    signatureData,
    trade,
  ])
}
