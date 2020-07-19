import * as path from 'path'
import * as fs from 'fs'

import { Plugin } from './plugins'
import Helpers from './helpers'
import { findPlugin } from './utils/plugin'
import { isWorkspacePath } from './utils/workspace'

export async function convert<ExpectedOptions, Result>(
  workspacePath: string,
  plugin: string | Plugin<ExpectedOptions, Result>,
  options: {
    output?: string
    [argName: string]: unknown
  } = {}
): Promise<unknown> {
  const resolvedPath = path.resolve(workspacePath)

  if (!isWorkspacePath(resolvedPath)) {
    throw new Error(
      'The path provided is not a Lona Workspace. A workspace must contain a `lona.json` file.'
    )
  }

  const helpers = Helpers(fs, resolvedPath, {
    outputPath: options.output,
  })

  const pluginFunction =
    typeof plugin === 'string' ? findPlugin<ExpectedOptions>(plugin) : plugin

  return pluginFunction.convertWorkspace(workspacePath, helpers, {
    ...((helpers.config.format || {})[pluginFunction.format] || {}),
    ...(options || {}),
  })
}
