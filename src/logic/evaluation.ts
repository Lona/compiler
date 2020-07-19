import { LogicAST as AST } from '@lona/serialization'
import { EvaluationVisitor } from './evaluationVisitor'
import { createEvaluationVisitor } from './nodes/createNode'
import { Value } from './runtime/value'
import { Scope } from './scope'
import { TypeChecker } from './typeChecker'
import { Substitution } from './typeUnifier'
import { Reporter } from '../utils/reporter'
import { declarationPathTo } from './ast'
import { assertNever } from '../utils/typeHelpers'

const STANDARD_LIBRARY = 'standard library'

export function evaluateIsTrue(
  context: EvaluationContext,
  expression: AST.Expression
) {
  const condition = context.evaluate(expression.data.id)
  return (
    (condition &&
      condition.type.type === 'constructor' &&
      condition.type.name === 'Boolean' &&
      condition.memory.type === 'bool' &&
      condition.memory.value) ||
    false
  )
}

export type Thunk = {
  label: string
  dependencies: string[]
  f: (args: Value[]) => Value
}

/**
 * The evaluation context of the Lona Workspace.
 */
export class EvaluationContext {
  values: { [uuid: string]: Value } = {}
  thunks: { [uuid: string]: Thunk } = {}
  reporter?: Reporter

  constructor(reporter?: Reporter) {
    this.reporter = reporter
  }

  add(uuid: string, thunk: Thunk) {
    this.thunks[uuid] = thunk
  }

  addValue(uuid: string, value: Value) {
    this.values[uuid] = value
  }

  /**
   * Evaluate the id to a value, resolving any dependency along the way
   */
  evaluate(
    uuid: string,
    reporter: Reporter | undefined = this.reporter
  ): Value | undefined {
    const value = this.values[uuid]

    if (value) return value

    const thunk = this.thunks[uuid]

    if (!thunk) {
      reporter?.error(`no thunk for ${uuid}`)
      return undefined
    }

    const resolvedDependencies = thunk.dependencies.map(x =>
      this.evaluate(x, reporter)
    )

    if (resolvedDependencies.some(x => !x)) {
      reporter?.error(
        `Failed to evaluate thunk ${uuid} (${thunk.label}) - missing dep ${
          thunk.dependencies[resolvedDependencies.findIndex(x => !x)]
        }`
      )
      return undefined
    }

    const result = thunk.f(resolvedDependencies as Value[])
    this.values[uuid] = result

    return result
  }

  copy() {
    const newContext = new EvaluationContext(this.reporter)
    newContext.thunks = { ...this.thunks }
    newContext.values = { ...this.values }
    return newContext
  }
}

const evaluateNode = (
  node: AST.SyntaxNode,
  visitor: EvaluationVisitor
): EvaluationContext => {
  // TODO: Handle stopping
  const context = AST.subNodes(node).reduce<EvaluationContext>(
    (prev, subNode) => {
      return evaluateNode(subNode, visitor)
    },
    visitor.evaluation
  )

  if (!context) return context

  switch (node.type) {
    case 'identifierExpression':
    case 'none':
    case 'boolean':
    case 'number':
    case 'string':
    case 'color':
    case 'array':
    case 'literalExpression':
    case 'memberExpression':
    case 'record':
    case 'variable':
    case 'enumeration':
    case 'function':
    case 'functionCallExpression':
      const visitorNode = createEvaluationVisitor(node)

      if (visitorNode) {
        visitorNode.evaluationEnter(visitor)
      }

      break
    case 'assignmentExpression': {
      visitor.add(node.data.left.data.id, {
        label:
          'Assignment for ' +
          declarationPathTo(visitor.rootNode, node.data.left.data.id).join('.'),
        dependencies: [node.data.right.data.id],
        f: values => values[0],
      })
      break
    }
    case 'functionType':
    case 'typeIdentifier':
    case 'program':
    case 'parameter':
    case 'value':
    case 'topLevelParameters':
    case 'topLevelDeclarations':
    case 'enumerationCase': // handled in 'enumeration'
    case 'argument': // handled in 'functionCallExpression'
    case 'namespace':
    case 'importDeclaration':
    case 'placeholder':
    case 'return': // handled in 'function'
    case 'loop': // handled in 'function'
    case 'branch': // handled in 'function'
    case 'expression':
    case 'declaration': {
      break
    }
    default: {
      assertNever(node)
    }
  }

  return context
}

export const evaluate = (
  rootNode: AST.SyntaxNode,
  scope: Scope,
  typeChecker: TypeChecker,
  substitution: Substitution,
  reporter: Reporter
): EvaluationContext => {
  const visitor = new EvaluationVisitor(
    rootNode,
    scope,
    typeChecker,
    substitution,
    reporter
  )

  return evaluateNode(rootNode, visitor)
}
