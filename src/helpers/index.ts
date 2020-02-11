import { LogicAST } from '@lona/serialization'
import { config as Config } from '../utils'
import { generate as generateEvaluationContext } from './evaluation-context'
import { EvaluationContext } from './logic-evaluate'
import { createStandardLibraryResolver } from './hardcoded-mapping'
import { Reporter, defaultReporter } from './reporter'
import { FSWrapper, createFSWrapper } from './fs'
export { HardcodedMap } from './hardcoded-mapping'
export { EvaluationContext } from './logic-evaluate'
import { TraversalConfig, reduce } from './logic-traversal'
import {
  makeProgram,
  declarationPathTo,
  findParentNode,
  findNode,
} from './logic-ast'

/**
 * Helpers passed to every plugins. They contains some methods abstracting
 * the file system, the evaluation context of the workspace,
 * a reporter (to centralize the logs), the workspace's configuration, etc.
 */
export type Helpers = {
  fs: FSWrapper
  reporter: Reporter
  config: Config.Config
  /**
   * The evaluation context of the Lona Workspace.
   *
   * It contains some mapping between the identifiers and what they reference,
   * eg. `Optional.none` -> the function declaration in Prelude.logic
   * which is used to evaluate `Optional.none` to
   * `{ type: unit, memory: { type: 'unit' } }` for example. It takes care of
   * the scope of the identifier to determine the reference.
   *
   * Additionally, it keeps track of where declaration are from.
   */
  evaluationContext: EvaluationContext | undefined
  /**
   * Takes a hardcoded map `standard library -> node` and creates a function
   * which returns a node if the Logic node passed as argument is from
   * the standard library.
   *
   * Depending on the context, the hardcoded map might use the
   * evaluation context to evaluate the Logic node instead of trying to translate
   * the standard library method into the target format.
   */
  createStandardLibraryResolver: typeof createStandardLibraryResolver
  ast: {
    /** Tries to make a program out of any Logic node */
    makeProgram: (node: LogicAST.SyntaxNode) => LogicAST.Program | undefined
    /** A set of methods to help traverse the AST */
    traversal: {
      declarationPathTo: (
        node: LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier,
        id: string
      ) => string[]
      /** Find the node with the matching id */
      findNode: (
        rootNode: LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier,
        id: string
      ) =>
        | LogicAST.SyntaxNode
        | LogicAST.Pattern
        | LogicAST.Identifier
        | undefined
      /** Find the parent of the node with the matching id */
      findParentNode: (
        rootNode: LogicAST.SyntaxNode | LogicAST.Pattern | LogicAST.Identifier,
        id: string
      ) => LogicAST.SyntaxNode | undefined
      /**
       * The `reduce()` method executes a reducer function (that you provide)
       * on each node of the AST, resulting in a single output value.
       *
       * Your reducer function's returned value is assigned to the accumulator,
       * whose value is remembered across each iteration throughout the AST,
       * and ultimately becomes the final, single resulting value.
       *
       * The traversal is depth-first, you can specify whether it should be
       * pre-order or post-order in the config.
       */
      reduce: <T>(
        node: LogicAST.SyntaxNode,
        callbackfn: (
          previousValue: T,
          currentNode: LogicAST.SyntaxNode,
          config: TraversalConfig
        ) => T,
        initialResult: T,
        config?: TraversalConfig
      ) => T
    }
  }
}

export type PreludeFlags = {
  [id: string]:
    | LogicAST.RecordDeclaration
    | LogicAST.EnumerationDeclaration
    | LogicAST.NamespaceDeclaration
}

export default async (
  workspacePath: string,
  outputPath?: unknown,
  _reporter?: Reporter
): Promise<Helpers> => {
  const fsWrapper = createFSWrapper(workspacePath, outputPath)

  const config = await Config.load(workspacePath, {
    forEvaluation: true,
    fs: fsWrapper,
  })

  let cachedEvaluationContext: EvaluationContext | undefined

  const reporter = _reporter || defaultReporter

  return {
    fs: fsWrapper,
    config,
    get evaluationContext() {
      if (cachedEvaluationContext) {
        return cachedEvaluationContext
      }
      cachedEvaluationContext = generateEvaluationContext(config, reporter)
      return cachedEvaluationContext
    },
    createStandardLibraryResolver,
    reporter,
    ast: {
      makeProgram,
      traversal: {
        declarationPathTo,
        findNode,
        findParentNode,
        reduce,
      },
    },
  }
}
