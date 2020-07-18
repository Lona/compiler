import { Reporter } from './reporter'

export const silentReporter: Reporter = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
