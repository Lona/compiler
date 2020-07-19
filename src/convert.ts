import * as path from 'path'
import * as fs from 'fs'

import { Plugin } from './plugins'
import Helpers from './helpers'
import { findPlugin } from './utils/findPlugin'
import { isWorkspacePath } from './utils/isWorkspacePath'

export async function convert<ExpectedOptions, Result>(
  workspacePath: string,
  plugin: string | Plugin<ExpectedOptions, Result>,
  options: {
    output?: string
    [argName: string]: unknown
  } = {}
) {
  const resolvedPath = path.resolve(workspacePath)

  const formatter =
    typeof plugin === 'string' ? findPlugin<ExpectedOptions>(plugin) : plugin

  if (!(await isWorkspacePath(resolvedPath))) {
    throw new Error(
      'The path provided is not a Lona Workspace. A workspace must contain a `lona.json` file.'
    )
  }

  const helpers = await Helpers(fs, resolvedPath, {
    outputPath: options.output,
  })

  return formatter.convertWorkspace(workspacePath, helpers, {
    ...((helpers.config.format || {})[formatter.format] || {}),
    ...(options || {}),
  })
}
