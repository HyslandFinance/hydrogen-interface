// eslint-disable-next-line no-restricted-imports
import { t } from '@lingui/macro'
/**
 * This is hacking out the revert reason from the ethers provider thrown error however it can.
 * This object seems to be undocumented by ethers.
 * @param error an error from the ethers provider
 */
export function faucetDripErrorToUserReadableMessage(error: any): string {
  if (error.code) {
    switch (error.code) {
      case 4001:
        return t`Transaction rejected`
    }
  }
  return t`Faucet error`
}
