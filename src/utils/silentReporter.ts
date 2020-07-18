import { Reporter } from '../helpers/reporter'

export const silentReporter: Reporter = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
