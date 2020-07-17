import * as path from 'path'
import upperFirst from 'lodash.upperfirst'
import camelCase from 'lodash.camelcase'
import { Plugin } from '../index'
import { Helpers } from '../../helpers'
import convertLogic from './convertLogic'
import renderSwift from './renderAst'
import * as SwiftAST from './swiftAst'

export const convertFile = async (
  filePath: string,
  helpers: Helpers & {
    emitFile?: (filePath: string, data: string) => Promise<void>
  },
  options: {
    [key: string]: unknown
  }
): Promise<string> => {
  let swiftAST: SwiftAST.SwiftNode | undefined

  const logicNode = helpers.config.logicFiles[filePath]
  if (logicNode) {
    if (
      logicNode.type !== 'topLevelDeclarations' ||
      !logicNode.data.declarations.length
    ) {
      return ''
    }
    swiftAST = convertLogic(logicNode, helpers)
  }

  if (!swiftAST) {
    return ''
  }

  // only output file if we passed an output option
  const outputFile =
    typeof options['output'] !== 'undefined' ? helpers.fs.writeFile : undefined

  return `import Foundation

#if canImport(UIKit)
  import UIKit
#elseif canImport(AppKit)
  import AppKit
#endif

${renderSwift(swiftAST, { outputFile, reporter: helpers.reporter })}`
}

const convertWorkspace = async (
  workspacePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  }
): Promise<void> => {
  await Promise.all(
    helpers.config.logicPaths
      .concat(helpers.config.documentPaths)
      .map(async filePath => {
        const swiftContent = await convertFile(filePath, helpers, options)
        if (!swiftContent) {
          return
        }
        const name = upperFirst(
          camelCase(path.basename(filePath, path.extname(filePath)))
        )
        const outputPath = path.join(path.dirname(filePath), `${name}.swift`)

        await helpers.fs.writeFile(outputPath, swiftContent)
      })
  )

  await helpers.fs.copyDir(
    path.join(__dirname, '../../../static/swift'),
    './lona-helpers'
  )
}

type ExpectedOptions = {}
const plugin: Plugin<ExpectedOptions, void> = {
  format: 'swift',
  convertWorkspace,
}
export default plugin
