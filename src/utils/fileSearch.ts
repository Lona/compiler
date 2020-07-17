import * as Glob from 'glob'
import * as path from 'path'

/**
 * Search for files respecting the glob pattern in the workspace.
 *
 * @returns an array of relative paths
 */
export const sync = (
  workspacePath: string,
  glob: string,
  options: { ignore?: string[] } = {}
) => {
  return Glob.sync(glob, { ...options, cwd: workspacePath })
}
