import { LogicAST as AST } from '@lona/serialization'
import { createExpressionNode, createNode } from './createNode'
import { IExpression, Node, INode } from './interfaces'
import { TypeChecker } from '../typeChecker'
import {
  IdentifierTypeAnnotation,
  FunctionTypeAnnotation,
} from './typeAnnotations'
import { Substitution, substitute } from '../typeUnifier'
import { StaticType } from '../staticType'

export class FunctionParameterDefaultValue extends Node<
  AST.FunctionParameterDefaultValue
> {
  get expression(): IExpression | undefined {
    switch (this.syntaxNode.type) {
      case 'none':
        return undefined
      case 'value':
        return createExpressionNode(this.syntaxNode.data.expression)
    }
  }
}

export class FunctionParameter extends Node<AST.FunctionParameter> {
  get name(): string {
    return this.namePattern.name
  }

  get namePattern(): AST.Pattern {
    switch (this.syntaxNode.type) {
      case 'parameter':
        return this.syntaxNode.data.localName
      case 'placeholder':
        throw new Error('Invalid type')
    }
  }

  get defaultValue(): FunctionParameterDefaultValue {
    switch (this.syntaxNode.type) {
      case 'parameter':
        return createNode(
          this.syntaxNode.data.defaultValue
        ) as FunctionParameterDefaultValue
      case 'placeholder':
        throw new Error('Invalid type')
    }
  }

  get typeAnnotation(): FunctionTypeAnnotation | IdentifierTypeAnnotation {
    switch (this.syntaxNode.type) {
      case 'parameter':
        return createNode(this.syntaxNode.data.annotation) as
          | FunctionTypeAnnotation
          | IdentifierTypeAnnotation
      case 'placeholder':
        throw new Error('Invalid type')
    }
  }

  getType(typeChecker: TypeChecker, substitution: Substitution): StaticType {
    const type = typeChecker.nodes[this.namePattern.id]

    const resolvedType = substitute(substitution, type)

    return resolvedType
  }
}
