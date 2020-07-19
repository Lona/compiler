import fs from 'fs'
import path from 'path'
import {
  decodeDocument,
  decodeLogic,
  extractProgramFromAST,
  LogicAST as AST,
  MDXAST,
} from '@lona/serialization'
import { IFS, match } from 'buffs'
import { evaluate, EvaluationContext } from './evaluation'
import { createNamespace, mergeNamespaces, Namespace } from './namespace'
import { createScopeContext, mergeScopes, Scope } from './scope'
import { createUnificationContext, TypeChecker } from './typeChecker'
import { Substitution, unify } from './typeUnifier'
import { joinPrograms, makeProgram } from './ast'

type LogicFile = {
  isLibrary: boolean
  sourcePath: string
  rootNode: AST.TopLevelDeclarations
  mdxContent: MDXAST.Content[]
}

export type ModuleContext = {
  componentFiles: LogicFile[]
  libraryFiles: LogicFile[]
  documentFiles: LogicFile[]
  logicFiles: LogicFile[]
  scope: Scope
  typeChecker: TypeChecker
  substitution: Substitution
  evaluationContext: EvaluationContext
  isValidProgram: boolean
}

export function createModule(
  workspaceFs: IFS,
  workspacePath: string
): ModuleContext {
  const libraryFiles: LogicFile[] = libraryFilePaths().map(sourcePath => ({
    isLibrary: true,
    sourcePath,
    // Always read library files from the real FS
    rootNode: decodeLogic(
      fs.readFileSync(sourcePath, 'utf8')
    ) as AST.TopLevelDeclarations,
    mdxContent: [],
  }))

  const componentFiles: LogicFile[] = componentFilePaths(
    workspaceFs,
    workspacePath
  ).map(sourcePath => ({
    isLibrary: false,
    sourcePath,
    rootNode: decodeLogic(
      workspaceFs.readFileSync(sourcePath, 'utf8')
    ) as AST.TopLevelDeclarations,
    mdxContent: [],
  }))

  const documentFiles: LogicFile[] = documentFilePaths(
    workspaceFs,
    workspacePath
  ).map(sourcePath => {
    const decoded = decodeDocument(workspaceFs.readFileSync(sourcePath, 'utf8'))

    return {
      isLibrary: false,
      sourcePath,
      rootNode: extractProgramFromAST(decoded),
      mdxContent: decoded.children,
    }
  })

  const files: LogicFile[] = [
    ...libraryFiles,
    ...componentFiles,
    ...documentFiles,
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
    libraryFiles,
    documentFiles,
    get logicFiles() {
      return [...documentFiles]
    },
    scope,
    typeChecker,
    substitution,
    evaluationContext,
    isValidProgram:
      scope.undefinedIdentifierExpressions.size === 0 &&
      scope.undefinedMemberExpressions.size === 0 &&
      scope.undefinedTypeIdentifiers.size === 0,
  }
}

function componentFilePaths(fs: IFS, workspacePath: string): string[] {
  return match(fs, workspacePath, { includePatterns: ['**/*.cmp'] }).map(file =>
    path.join(workspacePath, file)
  )
}

// TODO: Read logic files
// function logicFilePaths(fs: IFS, workspacePath: string): string[] {
//   return match(fs, workspacePath, {
//     includePatterns: ['**/*.logic'],
//   }).map(file => path.join(workspacePath, file))
// }

function documentFilePaths(fs: IFS, workspacePath: string): string[] {
  return match(fs, workspacePath, { includePatterns: ['**/*.md'] }).map(file =>
    path.join(workspacePath, file)
  )
}

function libraryFilePaths(): string[] {
  const libraryPath = path.join(__dirname, 'library')

  return match(fs, libraryPath, { includePatterns: ['**/*.logic'] }).map(file =>
    path.join(libraryPath, file)
  )
}
