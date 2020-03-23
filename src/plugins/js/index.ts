import * as path from 'path'
import upperFirst from 'lodash.upperfirst'
import camelCase from 'lodash.camelcase'
import { Helpers } from '../../helpers'
import convertLogic from './convert-logic'
import renderJS from './render-ast'
import * as JSAST from './js-ast'
import { resolveImportPath } from './utils'

export const format = 'js'

export const parseFile = async (
  filePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  }
): Promise<string> => {
  let jsAST: JSAST.JSNode | undefined

  const logicNode = helpers.config.logicFiles[filePath]
  if (logicNode) {
    if (
      logicNode.type !== 'topLevelDeclarations' ||
      !logicNode.data.declarations.length
    ) {
      return ''
    }
    jsAST = convertLogic(logicNode, filePath, helpers)
  }

  if (!jsAST) {
    return ''
  }

  // only output file if we passed an output option
  const outputFile =
    typeof options['output'] !== 'undefined' ? helpers.fs.writeFile : undefined

  return `${renderJS(jsAST, { outputFile, reporter: helpers.reporter })}`
}

export const parseWorkspace = async (
  workspacePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  }
): Promise<void> => {
  const imports: string[] = []

  await Promise.all(
    helpers.config.logicPaths
      .concat(helpers.config.documentPaths)
      .map(async filePath => {
        const swiftContent = await parseFile(filePath, helpers, options)
        if (!swiftContent) {
          return
        }
        const name = upperFirst(
          camelCase(path.basename(filePath, path.extname(filePath)))
        )
        const outputPath = path.join(path.dirname(filePath), `${name}.js`)

        imports.push(outputPath)

        await helpers.fs.writeFile(outputPath, swiftContent)
      })
  )

  await helpers.fs.writeFile(
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
      .join('\n\n')}`
  )

  // await helpers.fs.copyDir(
  //   path.join(__dirname, '../../../static/js'),
  //   './lona-helpers'
  // )
}
