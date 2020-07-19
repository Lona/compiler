import * as path from 'path'
import upperFirst from 'lodash.upperfirst'
import camelCase from 'lodash.camelcase'
import { Helpers } from '../../helpers'
import { Plugin } from '../index'
import convertLogic from './convertLogic'
import renderJS from './renderAst'
import * as JSAST from './jsAst'
import { resolveImportPath } from './utils'

export const convertFile = async (
  filePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  }
): Promise<string> => {
  let jsAST: JSAST.JSNode | undefined

  const rootNode = helpers.module.logicFiles.find(
    file => file.sourcePath === filePath
  )?.rootNode

  if (rootNode) {
    if (
      rootNode.type !== 'topLevelDeclarations' ||
      !rootNode.data.declarations.length
    ) {
      return ''
    }

    jsAST = convertLogic(rootNode, filePath, helpers)
  }

  if (!jsAST) return ''

  return `${renderJS(jsAST, { reporter: helpers.reporter })}`
}

const convertWorkspace = async (
  workspacePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  }
): Promise<void> => {
  const imports: string[] = []

  await Promise.all(
    helpers.module.logicFiles.map(async file => {
      const outputText = await convertFile(file.sourcePath, helpers, options)

      if (!outputText) return

      const name = upperFirst(
        camelCase(path.basename(file.sourcePath, path.extname(file.sourcePath)))
      )

      const outputPath = path.join(path.dirname(file.sourcePath), `${name}.js`)

      imports.push(outputPath)

      helpers.fs.writeFileSync(outputPath, outputText, 'utf8')
    })
  )

  helpers.fs.writeFileSync(
    './index.js',
    `${imports
      .map(
        (x, i) => `var __lona_import_${i} = require("${resolveImportPath(
          './index.js',
          x
        )}");
Object.keys(__lona_import_${i}).forEach(function (key) {
  Object.defineProperty(module.exports, key, {
    enumerable: true,
    get: function get() {
      return __lona_import_${i}[key];
    }
  });
})`
      )
      .join('\n\n')}`,
    'utf8'
  )

  // await helpers.fs.copyDir(
  //   path.join(__dirname, '../../../static/js'),
  //   './lona-helpers'
  // )
}

type ExpectedOptions = {
  framework?: 'react' | 'react-native' | 'react-sketchapp'
}
const plugin: Plugin<ExpectedOptions, void> = {
  format: 'js',
  convertWorkspace,
}
export default plugin
