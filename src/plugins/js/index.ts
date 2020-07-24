import * as path from 'path'
import upperFirst from 'lodash.upperfirst'
import camelCase from 'lodash.camelcase'
import { Helpers } from '../../helpers'
import { Plugin } from '../index'
import convertLogic from './convertLogic'
import renderJS from './renderAst'
import * as JSAST from './jsAst'
import { generateTranspiledImport } from './utils'
import { LogicFile } from '../../logic/module'

const convertWorkspace = async (
  workspacePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  }
): Promise<void> => {
  if (typeof options.output !== 'string') {
    throw new Error('Output option required when generating JS')
  }

  const { output } = options

  try {
    helpers.fs.mkdirSync(output, { recursive: true })
  } catch (e) {
    // Directory already exists
  }

  const imports: string[] = []

  await Promise.all(
    helpers.module.sourceFiles.map(file => {
      const outputText = convertFile(file, helpers)

      if (!outputText) return

      const sourcePath = file.sourcePath

      const name = upperFirst(
        camelCase(path.basename(sourcePath, path.extname(sourcePath)))
      )

      const relativePath = path.relative(workspacePath, sourcePath)

      const outputPath = path.join(
        output,
        path.dirname(relativePath),
        `${name}.js`
      )

      imports.push(outputPath)

      helpers.fs.writeFileSync(outputPath, outputText, 'utf8')
    })
  )

  helpers.fs.writeFileSync(
    path.join(output, 'index.js'),
    `${imports
      .map((importPath, i) => generateTranspiledImport(output, importPath, i))
      .join('\n\n')}`,
    'utf8'
  )
}

function convertFile(file: LogicFile, helpers: Helpers): string {
  const rootNode = file.rootNode

  if (
    rootNode.type !== 'topLevelDeclarations' ||
    !rootNode.data.declarations.length
  ) {
    return ''
  }

  let jsAST: JSAST.JSNode = convertLogic(rootNode, file.sourcePath, helpers)

  return `${renderJS(jsAST, { reporter: helpers.reporter })}`
}

type ExpectedOptions = {
  framework?: 'react' | 'react-native' | 'react-sketchapp'
}

const plugin: Plugin<ExpectedOptions, void> = {
  format: 'js',
  convertWorkspace,
}

export default plugin
