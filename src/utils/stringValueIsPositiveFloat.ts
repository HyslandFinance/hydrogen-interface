import { parseUnits } from '@ethersproject/units'

export function stringValueIsPositiveFloat(s:string) {
  try {
    if(!s || s.length == 0) return false
    const bn = parseUnits(s, 30)
    if(bn.lte(0)) return false
    return true
  } catch(e) {
    return false
  }
}
