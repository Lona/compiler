import fs from 'fs'
import {
  decodeDocument,
  decodeLogic,
  extractProgramFromAST,
  LogicAST as AST,
} from '@lona/serialization'
import { IFS } from 'buffs'
import { evaluate, EvaluationContext } from './evaluation'
import {
  componentFilePaths,
  decode,
  documentFilePaths,
  libraryFilePaths,
} from './files'
import { createNamespace, mergeNamespaces, Namespace } from './namespace'
import { createScopeContext, mergeScopes, Scope } from './scope'
import { createUnificationContext, TypeChecker } from './typeChecker'
import { Substitution, unify } from './typeUnifier'
import { joinPrograms, makeProgram } from '../helpers/logicAst'

type LogicFile = {
  isLibrary: boolean
  sourcePath: string
  rootNode: AST.TopLevelDeclarations
}

export type ModuleContext = {
  componentFiles: LogicFile[]
  typeChecker: TypeChecker
  substitution: Substitution
  evaluationContext: EvaluationContext
  isValidProgram: boolean
}

export function createModule(
  workspaceFs: IFS,
  workspacePath: string
): ModuleContext {
  const componentFiles = componentFilePaths(workspaceFs, workspacePath).map(
    sourcePath => ({
      isLibrary: false,
      sourcePath,
      rootNode: decode(
        workspaceFs,
        sourcePath,
        decodeLogic
      ) as AST.TopLevelDeclarations,
    })
  )

  const files: LogicFile[] = [
    ...libraryFilePaths().map(sourcePath => ({
      isLibrary: true,
      sourcePath,
      // Always read library files from the real FS
      rootNode: decode(fs, sourcePath, decodeLogic) as AST.TopLevelDeclarations,
    })),
    ...componentFiles,
    ...documentFilePaths(workspaceFs, workspacePath).map(sourcePath => ({
      isLibrary: false,
      sourcePath,
      rootNode: decode(workspaceFs, sourcePath, data =>
        extractProgramFromAST(decodeDocument(data))
      ),
    })),
  ]

  const namespace: Namespace = mergeNamespaces(
    files.map(logicFile => createNamespace(logicFile.rootNode))
  )

  const scope: Scope = mergeScopes(
    files.map(logicFile =>
      createScopeContext(logicFile.rootNode, namespace, undefined, console)
    )
  )

  const programNode = joinPrograms(
    files.map(logicFile => makeProgram(logicFile.rootNode))
  )

  const typeChecker = createUnificationContext(programNode, scope, console)

  const substitution = unify(typeChecker.constraints, console)

  const evaluationContext = evaluate(
    programNode,
    scope,
    typeChecker,
    substitution,
    console
  )

  return {
    componentFiles,
    typeChecker,
    substitution,
    evaluationContext,
    isValidProgram:
      scope.undefinedIdentifierExpressions.size === 0 &&
      scope.undefinedMemberExpressions.size === 0 &&
      scope.undefinedTypeIdentifiers.size === 0,
  }
}
