import * as path from 'path'
import * as fs from 'fs'

import { Plugin } from './plugins'
import { findPlugin, isWorkspacePath, config } from './utils'
import Helpers from './helpers'

// export some types for the plugins
export type Config = config.Config
export { Helpers, Plugin }

export const getConfig = async (workspacePath: string) => {
  const resolvedPath = path.resolve(workspacePath)

  if (!(await isWorkspacePath(resolvedPath))) {
    throw new Error(
      'The path provided is not a Lona Workspace. A workspace must contain a `lona.json` file.'
    )
  }

  return await config.load(resolvedPath)
}

export function convert(
  fileOrWorkspacePath: string,
  format: string,
  options?: {
    [argName: string]: unknown
  }
): Promise<unknown>
export function convert<ExpectedOptions, Result>(
  fileOrWorkspacePath: string,
  format: Plugin<ExpectedOptions, Result>,
  options?: ExpectedOptions & { output?: string }
): Promise<Result>

export async function convert<ExpectedOptions, Result>(
  workspacePath: string,
  format: string | Plugin<ExpectedOptions, Result>,
  options?: {
    [argName: string]: unknown
  }
) {
  const resolvedPath = path.resolve(workspacePath)

  const formatter =
    typeof format === 'string' ? findPlugin<ExpectedOptions>(format) : format

  if (!(await isWorkspacePath(resolvedPath))) {
    throw new Error(
      'The path provided is not a Lona Workspace. A workspace must contain a `lona.json` file.'
    )
  }

  const helpers = await Helpers(resolvedPath, (options || {}).output)

  return formatter.convertWorkspace(workspacePath, helpers, {
    ...((helpers.config.format || {})[formatter.format] || {}),
    ...(options || {}),
  })
}
