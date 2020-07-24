import * as path from 'path'
import { Helpers } from '../../helpers'
import { Plugin } from '../index'
import { ConvertedWorkspace, ConvertedFile } from './tokensAst'
import { convert } from './convert'
import { LogicFile } from '../../logic/module'

export { ConvertedWorkspace, ConvertedFile }

// depending on whether we have an output or not,
// we return the tokens or write them to disk
function convertWorkspace(
  workspacePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  } & { output?: never }
): Promise<ConvertedWorkspace>

function convertWorkspace(
  workspacePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  } & { output?: string }
): Promise<void>

async function convertWorkspace(
  workspacePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  }
): Promise<ConvertedWorkspace | void> {
  let workspace: ConvertedWorkspace = {
    files: helpers.module.documentFiles.map(file =>
      convertFile(workspacePath, file, helpers)
    ),
    flatTokensSchemaVersion: '0.0.1',
  }

  if (typeof options.output !== 'string') return workspace

  helpers.fs.writeFileSync(
    options.output,
    JSON.stringify(workspace, null, 2),
    'utf8'
  )
}

function convertFile(workspacePath: string, file: LogicFile, helpers: Helpers) {
  const filePath = file.sourcePath
  const name = path.basename(filePath, path.extname(filePath))
  const outputPath = path.join(path.dirname(filePath), `${name}.flat.json`)

  const result: ConvertedFile = {
    inputPath: path.relative(workspacePath, filePath),
    outputPath: path.relative(workspacePath, outputPath),
    name,
    contents: {
      type: 'flatTokens',
      value: convert(file.rootNode, helpers),
    },
  }

  return result
}

const plugin: Plugin<{}, ConvertedWorkspace | void> = {
  format: 'tokens',
  convertWorkspace,
}

export default plugin
