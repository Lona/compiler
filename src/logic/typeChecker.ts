import * as LogicTraversal from '../helpers/logicTraversal'
import { LogicAST as AST } from '@lona/serialization'
import { MultiMap } from './multiMap'
import { UUID } from './namespace'
import { createTypeCheckerVisitor } from './nodes/createNode'
import { Scope } from './scope'
import { bool, StaticType } from './staticType'
import { forEach } from './syntaxNode'
import { Constraint, substitute, Substitution } from './typeUnifier'
import { assertNever } from '../utils'
import { Reporter } from '../utils/reporter'

class LogicNameGenerator {
  private prefix: string
  private currentIndex = 0
  constructor(prefix: string = '') {
    this.prefix = prefix
  }
  next() {
    this.currentIndex += 1
    let name = this.currentIndex.toString(36)
    return `${this.prefix}${name}`
  }
}

export type TypeChecker = {
  constraints: Constraint[]
  nodes: { [key: string]: StaticType }
  patternTypes: { [key: string]: StaticType }
  typeNameGenerator: LogicNameGenerator
}

const makeEmptyContext = (): TypeChecker => ({
  constraints: [],
  nodes: {},
  patternTypes: {},
  typeNameGenerator: new LogicNameGenerator('?'),
})

export class TypeCheckerVisitor {
  typeChecker: TypeChecker = makeEmptyContext()
  scope: Scope
  reporter: Reporter
  traversalConfig = LogicTraversal.emptyConfig()

  constructor(scope: Scope, reporter: Reporter) {
    this.scope = scope
    this.reporter = reporter
  }

  setType(id: UUID, type: StaticType) {
    this.typeChecker.nodes[id] = type
  }

  getType(id: UUID): StaticType {
    return this.typeChecker.nodes[id]
  }

  specificIdentifierType(
    scope: Scope,
    unificationContext: TypeChecker,
    id: string
  ): StaticType {
    const patternId = scope.expressionToPattern[id]

    if (!patternId) {
      return {
        type: 'variable',
        value: unificationContext.typeNameGenerator.next(),
      }
    }

    const scopedType = unificationContext.patternTypes[patternId]

    if (!scopedType) {
      return {
        type: 'variable',
        value: unificationContext.typeNameGenerator.next(),
      }
    }

    return this.replaceGenericsWithVars(
      () => unificationContext.typeNameGenerator.next(),
      scopedType
    )
  }

  unificationType(
    genericsInScope: [string, string][],
    getName: () => string,
    typeAnnotation: AST.TypeAnnotation
  ): StaticType {
    if (typeAnnotation.type === 'typeIdentifier') {
      const { string, isPlaceholder } = typeAnnotation.data.identifier
      if (isPlaceholder) {
        return {
          type: 'variable',
          value: getName(),
        }
      }
      const generic = genericsInScope.find(g => g[0] === string)
      if (generic) {
        return {
          type: 'generic',
          name: generic[1],
        }
      }
      const parameters = typeAnnotation.data.genericArguments.map(arg =>
        this.unificationType(genericsInScope, getName, arg)
      )
      return {
        type: 'constant',
        name: string,
        parameters,
      }
    }
    if (typeAnnotation.type === 'placeholder') {
      return {
        type: 'variable',
        value: getName(),
      }
    }
    return {
      type: 'variable',
      value: 'Function type error',
    }
  }

  genericNames = (type: StaticType): string[] => {
    if (type.type === 'variable') {
      return []
    }
    if (type.type === 'constant') {
      return type.parameters
        .map(this.genericNames)
        .reduce((prev, x) => prev.concat(x), [])
    }
    if (type.type === 'generic') {
      return [type.name]
    }
    if (type.type === 'function') {
      return type.arguments
        .map(x => x.type)
        .concat(type.returnType)
        .map(this.genericNames)
        .reduce((prev, x) => prev.concat(x), [])
    }
    assertNever(type)
  }

  replaceGenericsWithVars(getName: () => string, type: StaticType) {
    let substitution: Substitution = new MultiMap()

    this.genericNames(type).forEach(name =>
      substitution.set(
        { type: 'generic', name },
        { type: 'variable', value: getName() }
      )
    )

    return substitute(substitution, type)
  }
}

const build = (
  node: AST.SyntaxNode,
  visitor: TypeCheckerVisitor
): TypeChecker => {
  const { typeChecker, traversalConfig, scope } = visitor

  traversalConfig.needsRevisitAfterTraversingChildren = true

  switch (node.type) {
    case 'record':
    case 'variable':
    case 'enumeration':
    case 'function':
    case 'identifierExpression':
    case 'memberExpression':
    case 'functionCallExpression':
    case 'literalExpression':
    case 'boolean':
    case 'number':
    case 'none':
    case 'string':
    case 'color':
    case 'array':
      const visitorNode = createTypeCheckerVisitor(node)

      if (visitorNode) {
        if (traversalConfig._isRevisit) {
          visitorNode.typeCheckerLeave(visitor)
        } else {
          visitorNode.typeCheckerEnter(visitor)
        }
        return typeChecker
      }

      break
    case 'branch': {
      if (!traversalConfig._isRevisit) {
        // the condition needs to be a Boolean
        visitor.setType(node.data.condition.data.id, bool)
      }
      break
    }
    case 'loop': {
      if (!traversalConfig._isRevisit) {
        // the condition needs to be a Boolean
        visitor.setType(node.data.expression.data.id, bool)
      }
      break
    }
    case 'placeholder': {
      // Using 'placeholder' here may cause problems, since
      // placeholder is ambiguous in our LogicAST TS types
      if (traversalConfig._isRevisit) {
        visitor.setType(node.data.id, {
          type: 'variable',
          value: typeChecker.typeNameGenerator.next(),
        })
      }
      break
    }
    case 'return': // already handled in the revisit of the function declaration
    case 'parameter': // already handled in the function call
    case 'functionType':
    case 'typeIdentifier':
    case 'declaration':
    case 'importDeclaration':
    case 'namespace':
    case 'assignmentExpression':
    case 'program':
    case 'enumerationCase':
    case 'value':
    case 'topLevelDeclarations':
    case 'topLevelParameters':
    case 'argument':
    case 'expression':
      break
    default:
      assertNever(node)
  }

  return typeChecker
}

export const createUnificationContext = (
  rootNode: AST.SyntaxNode,
  scope: Scope,
  reporter: Reporter
): TypeChecker => {
  const visitor = new TypeCheckerVisitor(scope, reporter)

  forEach(rootNode, visitor.traversalConfig, node => {
    build(node, visitor)
  })

  return visitor.typeChecker
}
