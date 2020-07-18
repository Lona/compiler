import { LogicAST as AST } from '@lona/serialization'
import { Namespace, UUID } from './namespace'
import ScopeStack from './scopeStack'
import { ScopeVisitor } from './scopeVisitor'
import { Reporter } from '../helpers/reporter'
import { silentReporter } from '../utils/silentReporter'

export class Scope {
  // References to the pattern they're defined by (e.g. the record name or function argument)
  identifierExpressionToPattern: { [key: string]: UUID } = {}
  memberExpressionToPattern: { [key: string]: UUID } = {}
  typeIdentifierToPattern: { [key: string]: UUID } = {}

  // Undefined identifiers for better error messages
  undefinedIdentifierExpressions = new Set<UUID>()
  undefinedMemberExpressions = new Set<UUID>()
  undefinedTypeIdentifiers = new Set<UUID>()

  // These keep track of the current scope
  valueNames = new ScopeStack<string, UUID>()
  typeNames = new ScopeStack<string, UUID>()

  get namesInScope(): string[] {
    return Object.keys(this.valueNames.flattened())
  }

  get expressionToPattern(): { [key: string]: UUID } {
    return {
      ...this.identifierExpressionToPattern,
      ...this.memberExpressionToPattern,
    }
  }
}

function mergeSets<T>(sets: Set<T>[]): Set<T> {
  return new Set<T>(sets.flatMap(set => [...set]))
}

export function mergeScopes(scopes: Scope[]) {
  const result = new Scope()

  result.identifierExpressionToPattern = Object.assign(
    {},
    ...scopes.map(scope => scope.identifierExpressionToPattern)
  )
  result.memberExpressionToPattern = Object.assign(
    {},
    ...scopes.map(scope => scope.memberExpressionToPattern)
  )
  result.typeIdentifierToPattern = Object.assign(
    {},
    ...scopes.map(scope => scope.typeIdentifierToPattern)
  )

  result.undefinedIdentifierExpressions = mergeSets(
    scopes.map(scope => scope.undefinedIdentifierExpressions)
  )
  result.undefinedMemberExpressions = mergeSets(
    scopes.map(scope => scope.undefinedMemberExpressions)
  )
  result.undefinedTypeIdentifiers = mergeSets(
    scopes.map(scope => scope.undefinedTypeIdentifiers)
  )

  return result
}

export function createScopeContext(
  rootNode: AST.SyntaxNode,
  namespace: Namespace,
  targetId: UUID | undefined = undefined,
  reporter: Reporter = silentReporter
): Scope {
  const scope = new Scope()

  let visitor = new ScopeVisitor(namespace, scope, reporter, targetId)

  visitor.traverse(rootNode)

  return scope
}
