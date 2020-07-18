import { LogicAST as AST } from '@lona/serialization'
import { EnumerationDeclaration } from './EnumerationDeclaration'
import { FunctionCallExpression } from './FunctionCallExpression'
import { FunctionDeclaration } from './FunctionDeclaration'
import { IdentifierExpression } from './IdentifierExpression'
import {
  IDeclaration,
  IEvaluationContributor,
  IExpression,
  ILiteral,
  INode,
  IScopeContributor,
  ITypeCheckerContributor,
  ITypeAnnotation,
} from './interfaces'
import { LiteralExpression } from './LiteralExpression'
import {
  ArrayLiteral,
  BooleanLiteral,
  ColorLiteral,
  NoneLiteral,
  NumberLiteral,
  StringLiteral,
} from './literals'
import { MemberExpression } from './MemberExpression'
import { NamespaceDeclaration } from './NamespaceDeclaration'
import { RecordDeclaration } from './RecordDeclaration'
import { VariableDeclaration } from './VariableDeclaration'
import {
  IdentifierTypeAnnotation,
  FunctionTypeAnnotation,
} from './typeAnnotations'
import {
  FunctionParameter,
  FunctionParameterDefaultValue,
} from './FunctionParameter'

export function createTypeAnnotationNode(
  syntaxNode: AST.SyntaxNode
): ITypeAnnotation | undefined {
  switch (syntaxNode.type) {
    case 'typeIdentifier':
      return new IdentifierTypeAnnotation(syntaxNode)
    case 'functionType':
      return new FunctionTypeAnnotation(syntaxNode)
    default:
      return undefined
  }
}

export function createLiteralNode(
  syntaxNode: AST.SyntaxNode
): ILiteral | undefined {
  switch (syntaxNode.type) {
    case 'boolean':
      return new BooleanLiteral(syntaxNode)
    case 'number':
      return new NumberLiteral(syntaxNode)
    case 'string':
      return new StringLiteral(syntaxNode)
    case 'none':
      return new NoneLiteral(syntaxNode)
    case 'color':
      return new ColorLiteral(syntaxNode)
    case 'array':
      return new ArrayLiteral(syntaxNode)
    default:
      return undefined
  }
}

export function createExpressionNode(
  syntaxNode: AST.SyntaxNode
): IExpression | undefined {
  switch (syntaxNode.type) {
    case 'identifierExpression':
      return new IdentifierExpression(syntaxNode)
    case 'memberExpression':
      return new MemberExpression(syntaxNode)
    case 'functionCallExpression':
      return new FunctionCallExpression(syntaxNode)
    case 'literalExpression':
      return new LiteralExpression(syntaxNode)
    default:
      return undefined
  }
}

export function createDeclarationNode(
  syntaxNode: AST.SyntaxNode
): IDeclaration | undefined {
  switch (syntaxNode.type) {
    case 'variable':
      return new VariableDeclaration(syntaxNode)
    case 'record':
      return new RecordDeclaration(syntaxNode)
    case 'enumeration':
      return new EnumerationDeclaration(syntaxNode)
    case 'function':
      return new FunctionDeclaration(syntaxNode)
    case 'namespace':
      return new NamespaceDeclaration(syntaxNode)
    default:
      return undefined
  }
}

function isScopeVisitor(node: INode): node is IScopeContributor {
  return 'scopeEnter' in node || 'scopeLeave' in node
}

function isTypeCheckerVisitor(node: INode): node is ITypeCheckerContributor {
  return 'typeCheckerEnter' in node || 'typeCheckerLeave' in node
}

function isEvaluationVisitor(node: INode): node is IEvaluationContributor {
  return 'evaluationEnter' in node
}

const nodeCache: { [key: string]: INode } = {}

export function createNode(syntaxNode: AST.SyntaxNode): INode | undefined {
  const id = syntaxNode.data.id

  if (id in nodeCache) {
    return nodeCache[id]
  }

  let node: INode | undefined =
    createDeclarationNode(syntaxNode) ||
    createTypeAnnotationNode(syntaxNode) ||
    createExpressionNode(syntaxNode) ||
    createLiteralNode(syntaxNode)

  if (!node) {
    switch (syntaxNode.type) {
      case 'parameter':
        node = new FunctionParameter(syntaxNode as AST.FunctionParameter)
        break
      case 'value':
      case 'none':
        node = new FunctionParameterDefaultValue(
          syntaxNode as AST.FunctionParameterDefaultValue
        )
        break
    }
  }

  if (node) {
    nodeCache[id] = node
  }

  return node
}

export function createScopeVisitor(
  syntaxNode: AST.SyntaxNode
): IScopeContributor | undefined {
  const node = createNode(syntaxNode)

  return node && isScopeVisitor(node) ? node : undefined
}

export function createTypeCheckerVisitor(
  syntaxNode: AST.SyntaxNode
): ITypeCheckerContributor | undefined {
  const node = createNode(syntaxNode)

  return node && isTypeCheckerVisitor(node) ? node : undefined
}

export function createEvaluationVisitor(
  syntaxNode: AST.SyntaxNode
): IEvaluationContributor | undefined {
  const node = createNode(syntaxNode)

  return node && isEvaluationVisitor(node) ? node : undefined
}
