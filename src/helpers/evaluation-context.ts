import * as fs from 'fs'
import * as path from 'path'
import { Config } from '../utils/config'
import * as LogicAST from './logic-ast'
import * as LogicScope from './logic-scope'
import * as LogicUnify from './logic-unify'
import * as LogicEvaluate from './logic-evaluate'
import { Reporter } from './reporter'
import { uuid, nonNullable } from '../utils'

/**
 * Iterates through the import declaration of the program
 * and "resolve them", eg. returns a program that contains both
 * the content of imported files and the current program
 */
function resolveImports(
  program: LogicAST.AST.Program,
  reporter: Reporter,
  existingImports: string[] = []
): LogicAST.AST.Program {
  return {
    type: 'program',
    data: {
      id: uuid(),
      block: program.data.block
        .map(x => {
          if (x.type !== 'declaration') {
            return [x]
          }
          if (x.data.content.type !== 'importDeclaration') {
            return [x]
          }

          const libraryName = x.data.content.data.name.name

          if (existingImports.indexOf(libraryName) !== -1) {
            return [x]
          }

          const libraryPath = path.join(
            __dirname,
            '../../static/logic',
            `${libraryName}.logic`
          )
          const libraryExists = fs.existsSync(libraryPath)

          if (!libraryExists) {
            reporter.error(
              `Failed to find library ${libraryName} at path ${libraryPath}`
            )
            return [x]
          }

          const library = LogicAST.makeProgram(
            JSON.parse(fs.readFileSync(libraryPath, 'utf8'))
          )

          if (!library) {
            reporter.error(`Failed to import library ${libraryName}`)
            return [x]
          }

          const resolvedLibrary = resolveImports(
            library,
            reporter,
            existingImports.concat(libraryName)
          )

          return [x, ...resolvedLibrary.data.block]
        })
        .reduce((prev, x) => prev.concat(x), []),
    },
  }
}

export const generate = (config: Config, reporter: Reporter) => {
  const standardLibsPath = path.join(__dirname, '../../static/logic')
  const standardLibs = fs.readdirSync(standardLibsPath)

  const libraryFiles: LogicAST.AST.Program[] = standardLibs.map(
    x =>
      LogicAST.makeProgram(
        JSON.parse(fs.readFileSync(path.join(standardLibsPath, x), 'utf8'))
      ) as LogicAST.AST.Program
  )

  const standardLibsProgram = LogicAST.joinPrograms(libraryFiles)

  const logicPrograms = Object.keys(config.logicFiles)
    .map(k => {
      const node = LogicAST.makeProgram(config.logicFiles[k])
      if (!node) {
        return undefined
      }
      return {
        in: k,
        node,
      }
    })
    .filter(nonNullable)

  const scopeContext = LogicScope.build(
    [{ node: standardLibsProgram, in: 'standard library' }].concat(
      logicPrograms
    ),
    reporter
  )

  const programNode = LogicAST.joinPrograms([
    standardLibsProgram,
    ...logicPrograms.map(x => x.node),
  ])

  const unificationContext = LogicUnify.makeUnificationContext(
    programNode,
    scopeContext,
    reporter
  )
  const substitution = LogicUnify.unify(
    unificationContext.constraints,
    reporter
  )

  const evaluationContext = LogicEvaluate.evaluate(
    programNode,
    programNode,
    scopeContext,
    unificationContext,
    substitution,
    reporter
  )

  return evaluationContext
}
