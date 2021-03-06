import { Plugin } from '../plugins'

/**
 * Support requiring both CommonJS `module.exports` and ES5 `export` modules
 *
 * @param path The path to `require`
 */
const requireInterop = (path: string): any => {
  const obj = require(path)
  return obj && obj.__esModule && obj['default'] ? obj['default'] : obj
}

/** Look for a plugin in
 * - FORMAT is FORMAT starts with a `.` or a `/` (heuristic for a path)
 * - node_modules/@lona/compiler-FORMAT
 * - node_modules/lona-compiler-FORMAT
 * - ../plugins/FORMAT
 */
export const findPlugin = <ExpectedOptions>(
  format: string
): Plugin<ExpectedOptions> => {
  try {
    if (format.startsWith('.') || format.startsWith('/')) {
      return requireInterop(format)
    }
    throw new Error('not a path')
  } catch (err) {
    try {
      return requireInterop(`@lona/compiler-${format}`)
    } catch (err) {
      try {
        return requireInterop(`lona-compiler-${format}`)
      } catch (err) {
        try {
          return requireInterop(`../plugins/${format}`)
        } catch (err) {
          console.error(err)
          throw new Error(`Could not find plugin ${format}`)
        }
      }
    }
  }
}
