import * as fs from 'fs'
import * as path from 'path'
import { Config } from '../utils/config'
import * as LogicAST from './logic-ast'
import * as LogicScope from './logic-scope'
import * as LogicUnify from './logic-unify'
import * as LogicEvaluate from './logic-evaluate'
import { Reporter } from './reporter'
import uuid from '../utils/uuid'

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
  const preludePath = path.join(__dirname, '../../static/logic')
  const preludeLibs = fs.readdirSync(preludePath)

  const libraryFiles: LogicAST.AST.Program[] = preludeLibs.map(
    x =>
      LogicAST.makeProgram(
        JSON.parse(fs.readFileSync(path.join(preludePath, x), 'utf8'))
      ) as LogicAST.AST.Program
  )

  const preludeProgram = LogicAST.joinPrograms(libraryFiles)

  const preludeScope = LogicScope.build(preludeProgram, reporter)

  let programNode = LogicAST.joinPrograms(
    Object.values(config.logicFiles).map(LogicAST.makeProgram)
  )

  programNode = resolveImports(programNode, reporter)

  const scopeContext = LogicScope.build(programNode, reporter, preludeScope)

  programNode = LogicAST.joinPrograms([preludeProgram, programNode])

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
