import * as path from 'path'
import { Helpers } from '../../helpers'
import { Plugin } from '../index'
import { ConvertedWorkspace, ConvertedFile } from './documentation-ast'
import { convert } from './convert'
import { findChildPages } from './utils'

export { ConvertedWorkspace, ConvertedFile }

export const convertFile = async (
  filePath: string,
  helpers: Helpers
): Promise<ConvertedFile> => {
  const documentNode = helpers.config.componentFiles[filePath]

  if (!documentNode) {
    throw new Error(`${filePath} is not a documentation file`)
  }

  const name = path.basename(filePath, path.extname(filePath))
  const outputPath = path.join(path.dirname(filePath), `${name}.mdx`)

  const value = {
    mdxString: convert(documentNode, helpers),
    children: findChildPages(documentNode),
  }

  const file: ConvertedFile = {
    inputPath: filePath,
    outputPath,
    name,
    contents: {
      type: 'documentationPage',
      value,
    },
  }

  return file
}

// depending on whether we have an output or not,
// we return the doc or write it to disk
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

  await helpers.fs.writeFile('docs.json', JSON.stringify(workspace, null, '  '))
}

type ExpectedOptions = {}
export default {
  format: 'documentation',
  convertWorkspace,
} as Plugin<ExpectedOptions, ConvertedWorkspace | void>
