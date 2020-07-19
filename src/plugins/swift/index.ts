import * as fs from 'fs'
import * as path from 'path'
import upperFirst from 'lodash.upperfirst'
import camelCase from 'lodash.camelcase'
import { Plugin } from '../index'
import { Helpers } from '../../helpers'
import convertLogic from './convertLogic'
import renderSwift from './renderAst'
import * as SwiftAST from './swiftAst'
import { copy } from 'buffs'

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

    swiftAST = convertLogic(rootNode, helpers)
  }

  if (!swiftAST) return ''

  return `import Foundation

#if canImport(UIKit)
  import UIKit
#elseif canImport(AppKit)
  import AppKit
#endif

${renderSwift(swiftAST, { reporter: helpers.reporter })}`
}

const convertWorkspace = async (
  workspacePath: string,
  helpers: Helpers,
  options: {
    [key: string]: unknown
  }
): Promise<void> => {
  await Promise.all(
    helpers.module.logicFiles.map(async file => {
      const outputText = await convertFile(file.sourcePath, helpers, options)

      if (!outputText) return

      const name = upperFirst(
        camelCase(path.basename(file.sourcePath, path.extname(file.sourcePath)))
      )

      const outputPath = path.join(
        path.dirname(file.sourcePath),
        `${name}.swift`
      )

      helpers.fs.writeFileSync(outputPath, outputText, 'utf8')
    })
  )

  copy(
    fs,
    helpers.fs,
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
