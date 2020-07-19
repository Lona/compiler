export type Reporter = {
  info(...args: any[]): void
  log(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}

export const defaultReporter: Reporter = {
  info: console.info.bind(console),
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

export const silentReporter: Reporter = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
}
