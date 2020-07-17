import * as path from 'path'
import { Helpers } from '../../helpers'
import { Plugin } from '../index'
import { ConvertedWorkspace, ConvertedFile } from './tokensAst'
import { convert } from './convert'

export { ConvertedWorkspace, ConvertedFile }

export const convertFile = async (
  filePath: string,
  helpers: Helpers
): Promise<ConvertedFile> => {
  const logicNode = helpers.config.logicFiles[filePath]

  if (!logicNode) {
    throw new Error(`${filePath} is not a token file`)
  }

  const name = path.basename(filePath, path.extname(filePath))
  const outputPath = path.join(path.dirname(filePath), `${name}.flat.json`)

  const file: ConvertedFile = {
    inputPath: filePath,
    outputPath,
    name,
    contents: {
      type: 'flatTokens',
      value: convert(logicNode, helpers),
    },
  }

  return file
}

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
  let workspace: ConvertedWorkspace

  if (!helpers.evaluationContext) {
    helpers.reporter.warn('Failed to evaluate workspace.')
    workspace = { flatTokensSchemaVersion: '0.0.1', files: [] }
  } else {
    workspace = {
      files: await Promise.all(
        helpers.config.logicPaths
          .concat(helpers.config.documentPaths)
          .map(x => convertFile(x, helpers))
      ),
      flatTokensSchemaVersion: '0.0.1',
    }
  }

  if (!options.output) {
    return workspace
  }

  await helpers.fs.writeFile(
    'tokens.json',
    JSON.stringify(workspace, null, '  ')
  )
}

type ExpectedOptions = {}
const plugin: Plugin<ExpectedOptions, ConvertedWorkspace | void> = {
  format: 'tokens',
  convertWorkspace,
}
export default plugin
