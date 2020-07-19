import * as fs from 'fs'
import * as path from 'path'

/**
 * Returns true if the path is a Lona workspace directory (containing a `lona.json`)
 */
export const isWorkspacePath = (workspacePath: string): boolean => {
  return fs.existsSync(path.join(workspacePath, 'lona.json'))
}
