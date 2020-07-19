import * as path from 'path'
import { Helpers } from '../../helpers'
import { Plugin } from '../index'
import { ConvertedWorkspace, ConvertedFile } from './documentationAst'
import { convert } from './convert'
import { findChildPages } from './utils'

export { ConvertedWorkspace, ConvertedFile }

export const convertFile = async (
  filePath: string,
  helpers: Helpers
): Promise<ConvertedFile> => {
  const logicFile = helpers.module.documentFiles.find(
    file => file.sourcePath === filePath
  )

  if (!logicFile) {
    throw new Error(`${filePath} is not a document file`)
  }

  const name = path.basename(filePath, path.extname(filePath))
  const outputPath = path.join(path.dirname(filePath), `${name}.mdx`)

  const root = { children: logicFile.mdxContent }

  const value = {
    mdxString: convert(root, helpers),
    children: findChildPages(root),
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
  let workspace: ConvertedWorkspace = {
    files: await Promise.all(
      helpers.module.documentFiles.map(file =>
        convertFile(file.sourcePath, helpers)
      )
    ),
    flatTokensSchemaVersion: '0.0.1',
  }

  if (!options.output) {
    return workspace
  }

  await helpers.fs.writeFileSync(
    'docs.json',
    JSON.stringify(workspace, null, '  '),
    'utf8'
  )
}
type ExpectedOptions = {}
const plugin: Plugin<ExpectedOptions, ConvertedWorkspace | void> = {
  format: 'documentation',
  convertWorkspace,
}
export default plugin
