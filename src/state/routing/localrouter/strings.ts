import { BigNumber } from '@ethersproject/bignumber'
const BN = BigNumber
import { getAddress } from '@ethersproject/address'
import { hexlify, zeroPad } from '@ethersproject/bytes'
import { WeiPerEther, MaxUint256, AddressZero, Zero } from '@ethersproject/constants'
import { formatUnits } from '@ethersproject/units'

// returns a number in its full 32 byte hex representation
export function toBytes32(bn: BigNumber) {
  return hexlify(zeroPad(BN.from(bn).toHexString(), 32));
}

// same as above without leading 0x
export function toAbiEncoded(bn: BigNumber) {
  return toBytes32(bn).substring(2);
}

// same as above but a list
export function abiEncodeArgs(list: BigNumber[]) {
  return list.map(toAbiEncoded).join('');
}

// print the contract name and address in table format
export function logContractAddress(contractName:string, address:string) {
  console.log(`| ${rightPad(contractName,28)} | \`${rightPad(address,42)}\` |`)
}

// logs a UTC timestamp and a status
export function logStatus(status="", timestamp=-1) {
  if(timestamp == -1) timestamp = Math.floor(Date.now()/1000) // optional param, use seconds not ms
  console.log(`${formatTimestamp(timestamp)} ${status}`)
}

// adds chars to the left of a string
// s=base, l=length, f=filler
export function leftPad(s:any, l:number, f=' ') {
  let s2 = `${s}`
  while(s2.length < l) s2 = `${f}${s2}`
  return s2
}

// adds chars to the right of a string
// s=base, l=length, f=filler
export function rightPad(s:any, l:number, f=' ') {
  let s2 = `${s}`
  while(s2.length < l) s2 = `${s2}${f}`
  return s2
}

// like ethers.utils.formatUnits()
// except keeps trailing zeros
export function formatUnits2(n:BigNumber, dec:number) {
  var s = formatUnits(n, dec)
  while(s.length - s.indexOf('.') <= dec) s = `${s}0`
  return s
}

// returns a function that formats numbers to given decimals
export function formatNumber(params:any) {
  // formatter function
  function f(n:any) {
    if(typeof n == "number") n = `${n}`
    var str = `${parseInt(n).toLocaleString()}`
    if(!params || !params.decimals || params.decimals <= 0) return str
    var i = n.indexOf(".")
    var str2 = (i == -1) ? '' : n.substring(i+1)
    str2 = rightPad(str2.substring(0,params.decimals), params.decimals, '0')
    str = `${str}.${str2}`
    return str
  }
  return f
}

// formats a unix timestamp (in seconds) to UTC string representation
// mm:dd:yyyy hh:mm:ss
export function formatTimestamp(timestamp:number) {
  let d = new Date(timestamp * 1000)
  return `${leftPad(d.getUTCMonth()+1,2,"0")}/${leftPad(d.getUTCDate(),2,"0")}/${d.getUTCFullYear()} ${leftPad(d.getUTCHours(),2,"0")}:${leftPad(d.getUTCMinutes(),2,"0")}:${leftPad(d.getUTCSeconds(),2,"0")}`
}

// converts an integer to a hex string
export function intToHex(n:number) {
  return "0x"+n.toString(16)
}

// formats a BigNumber into a string representation of a float
// like ethers.utils.formatUnits() except keeps trailing zeros
export function formatUnitsFull(amount:any, decimals=18) {
  var s = amount.toString()
  while(s.length <= decimals) s = `0${s}`
  var i = s.length - decimals
  var s2 = `${s.substring(0,i)}.${s.substring(i,s.length)}`
  return s2
}

// given a bignumber, converts it to an integer respecting decimals
// will throw if the number cannot be safely represented as a js number type
export function bignumberToNumber(bn:BigNumber, decimals=18) {
  return parseInt(formatUnits(bn, decimals))
}

export function formatPPM(ppm:any) {
  ppm = BN.from(ppm);
  var L = ppm.div(10000).toString();
  var R = ppm.mod(10000).toString();
  while(R.length < 4) R = `0${R}`;
  while(R.length > 1 && R[R.length-1] == "0") R = R.substring(0, R.length-1);
  return `${L}.${R}%`;
}
