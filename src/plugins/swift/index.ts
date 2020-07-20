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
    helpers.fs.mkdirSync(output)
  } catch (e) {
    // Directory already exists
  }

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
      `${name}.swift`
    )

    helpers.fs.writeFileSync(outputPath, outputText, 'utf8')
  })

  copy(
    fs,
    helpers.fs,
    path.join(__dirname, '../../../static/swift'),
    './lona-helpers'
  )
}

function convertFile(file: LogicFile, helpers: Helpers) {
  const rootNode = file.rootNode

  if (
    rootNode.type !== 'topLevelDeclarations' ||
    !rootNode.data.declarations.length
  ) {
    return ''
  }

  const swiftAST: SwiftAST.SwiftNode = convertLogic(rootNode, helpers)

  return `import Foundation

#if canImport(UIKit)
  import UIKit
#elseif canImport(AppKit)
  import AppKit
#endif

${renderSwift(swiftAST, { reporter: helpers.reporter })}`
}

const plugin: Plugin<{}, void> = {
  format: 'swift',
  convertWorkspace,
}

export default plugin
