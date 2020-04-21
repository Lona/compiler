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

export const convertWorkspace = async (
  workspacePath: string,
  outputPath: unknown,
  formatter: Plugin,
  options?: {
    [argName: string]: unknown
  }
) => {
  const helpers = await Helpers(workspacePath, outputPath)

  return formatter.convertWorkspace(workspacePath, helpers, {
    ...((helpers.config.format || {})[formatter.format] || {}),
    ...(options || {}),
  })
}

export const convert = async (
  fileOrWorkspacePath: string,
  format: string,
  options?: {
    [argName: string]: unknown
  }
) => {
  const resolvedPath = path.resolve(fileOrWorkspacePath)
  const formatter = findPlugin(format)

  if (!(await isWorkspacePath(resolvedPath))) {
    throw new Error(
      'The path provided is not a Lona Workspace. A workspace must contain a `lona.json` file.'
    )
  }

  return convertWorkspace(
    resolvedPath,
    (options || {}).output,
    formatter,
    options
  )
}
