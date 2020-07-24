import { LogicAST as AST } from '@lona/serialization'
import NamespaceVisitor from '../namespaceVisitor'
import { ScopeVisitor } from '../scopeVisitor'
import { TypeCheckerVisitor } from '../typeChecker'
import { EvaluationVisitor } from '../evaluationVisitor'
import { createNode } from './createNode'
import { compact } from '../../utils/sequence'
import { findNode, findNodes } from '../traversal'
import { FunctionCallExpression } from './FunctionCallExpression'
import { EnterReturnValue, LeaveReturnValue } from 'tree-visit'

export type SyntaxNodeType = AST.SyntaxNode['type']

export interface INode {
  syntaxNode: AST.SyntaxNode
  children(): INode[]
  type: SyntaxNodeType
  id: string
}

export class Node<T extends AST.SyntaxNode> implements INode {
  syntaxNode: T

  constructor(syntaxNode: T) {
    this.syntaxNode = syntaxNode
  }

  get type(): SyntaxNodeType {
    return this.syntaxNode.type
  }

  get id(): string {
    return this.syntaxNode.data.id
  }

  children() {
    return compact(AST.subNodes(this.syntaxNode).map(createNode))
  }

  find(
    predicate: (node: AST.SyntaxNode) => boolean
  ): AST.SyntaxNode | undefined {
    return findNode(this.syntaxNode, predicate)
  }

  findAll(predicate: (node: AST.SyntaxNode) => boolean): AST.SyntaxNode[] {
    return findNodes(this.syntaxNode, predicate)
  }
}

export interface INamespaceContributor extends INode {
  namespaceEnter(visitor: NamespaceVisitor): EnterReturnValue
  namespaceLeave(visitor: NamespaceVisitor): LeaveReturnValue
}

export interface IScopeContributor extends INode {
  scopeEnter(visitor: ScopeVisitor): EnterReturnValue
  scopeLeave(visitor: ScopeVisitor): LeaveReturnValue
}

export interface ITypeCheckerContributor extends INode {
  typeCheckerEnter(visitor: TypeCheckerVisitor): EnterReturnValue
  typeCheckerLeave(visitor: TypeCheckerVisitor): LeaveReturnValue
}

export interface IEvaluationContributor extends INode {
  evaluationEnter(visitor: EvaluationVisitor): EnterReturnValue
}

export interface IDeclaration
  extends INode,
    INamespaceContributor,
    IScopeContributor {}

export interface ITypeAnnotation extends INode, IScopeContributor {}

export interface IExpression extends INode, IScopeContributor {}

export interface ILiteral
  extends INode,
    ITypeCheckerContributor,
    IEvaluationContributor {}
