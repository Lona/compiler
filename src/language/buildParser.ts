import { Helpers } from '../helpers'
import { LogicAST as AST } from '@lona/serialization'
import { EnumerationDeclaration } from '../logic/nodes/EnumerationDeclaration'
import { FunctionCallExpression } from '../logic/nodes/FunctionCallExpression'
import { IdentifierExpression } from '../logic/nodes/IdentifierExpression'
import { IExpression } from '../logic/nodes/interfaces'
import { LiteralExpression } from '../logic/nodes/LiteralExpression'
import { ArrayLiteral } from '../logic/nodes/literals'
import { MemberExpression } from '../logic/nodes/MemberExpression'
import { RecordDeclaration } from '../logic/nodes/RecordDeclaration'
import { VariableDeclaration } from '../logic/nodes/VariableDeclaration'
import {
  Definition,
  Field,
  Parser,
  Pattern,
  RecordNodeDefinition,
  EnumNodeDefinition,
  OrPattern,
  field,
  manyField,
} from './Parser'
import {
  getPrintAttributeExpression,
  getNodePrintPattern,
  getFieldPrintPattern,
} from './buildPrinter'
import {
  FieldPrintPattern,
  sequencePrintPattern,
  joinCommandPrintPattern,
  tokenReferencePrintPattern,
  nodeReferencePrintPattern,
  selfReferencePrintPattern,
} from './Printer'
import { inspect } from 'util'

export function isParser(
  node: RecordDeclaration | EnumerationDeclaration
): boolean {
  return node.attributes.some(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'parse'
  )
}

function getPattern(resolvedSelf: string, node: IExpression): Pattern {
  if (
    node instanceof FunctionCallExpression &&
    node.callee instanceof IdentifierExpression
  ) {
    switch (node.callee.name) {
      case 'or':
        return {
          type: node.callee.name,
          value: Object.values(node.argumentExpressionNodes).map(
            getPattern.bind(null, resolvedSelf)
          ),
        }
      case 'many':
      case 'option': {
        return {
          type: node.callee.name,
          value: Object.values(node.argumentExpressionNodes).map(
            getPattern.bind(null, resolvedSelf)
          )[0],
        }
      }
    }
  } else if (
    node instanceof LiteralExpression &&
    node.literal instanceof ArrayLiteral
  ) {
    return {
      type: 'sequence',
      value: node.literal.elements.map(getPattern.bind(null, resolvedSelf)),
    }
  } else if (node instanceof MemberExpression) {
    const names = node.names.map(name =>
      name === 'self' ? resolvedSelf : name
    )

    if (names[0] === 'Token') {
      return {
        type: 'reference',
        value: {
          type: 'token',
          name: names[1],
        },
      }
    } else {
      return {
        type: 'reference',
        value: {
          type: 'field',
          nodeName: names[0],
          fieldName: names[1],
        },
      }
    }
  } else if (node instanceof IdentifierExpression) {
    return {
      type: 'reference',
      value: {
        type: 'node',
        name: node.name,
      },
    }
  }

  throw new Error('Invalid pattern')
}

export function getParseAttribute(
  name: string,
  attributes: FunctionCallExpression[]
): Pattern | undefined {
  const attribute = attributes.find(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'parse'
  )

  if (!attribute) return

  const { pattern } = attribute.argumentExpressionNodes

  return getPattern(name, pattern)
}

export function getEnumParseAttribute(
  node: EnumerationDeclaration
): Pattern | undefined {
  const attribute = node.attributes.find(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'parse'
  )

  if (!attribute) return

  const { pattern } = attribute.argumentExpressionNodes

  // Use default enum pattern
  if (!pattern) {
    return {
      type: 'or',
      value: node.cases.map(enumCase => {
        return {
          type: 'reference',
          value: {
            type: 'field',
            nodeName: node.name,
            fieldName: enumCase.data.name.name,
          },
        }
      }),
    }
  } else {
    return getParseAttribute(node.name, node.attributes)
  }
}

function inferFieldPattern(
  fieldName: string,
  annotation: Extract<AST.TypeAnnotation, { type: 'typeIdentifier' }>,
  nodeNames: string[]
): Pattern | undefined {
  const typeName = annotation.data.identifier.string

  if (nodeNames.includes(typeName)) {
    return {
      type: 'reference',
      value: { type: 'node', name: typeName },
    }
  } else if (
    typeName === 'Array' &&
    annotation.data.genericArguments[0].type === 'typeIdentifier'
  ) {
    const pattern = inferFieldPattern(
      fieldName,
      annotation.data.genericArguments[0],
      nodeNames
    )

    if (!pattern) return

    return {
      type: 'many',
      value: pattern,
    }
  } else if (
    typeName === 'Optional' &&
    annotation.data.genericArguments[0].type === 'typeIdentifier'
  ) {
    const pattern = inferFieldPattern(
      fieldName,
      annotation.data.genericArguments[0],
      nodeNames
    )

    if (!pattern) return

    return {
      type: 'option',
      value: pattern,
    }
  } else if (typeName === 'String') {
    return {
      type: 'reference',
      value: {
        type: 'token',
        name: fieldName,
      },
    }
  }
}

function getRecordNode(
  declaration: RecordDeclaration,
  nodeNames: string[]
): RecordNodeDefinition {
  const printAttribute = getPrintAttributeExpression(declaration.attributes)

  return {
    type: 'record',
    name: declaration.name,
    pattern: getParseAttribute(declaration.name, declaration.attributes)!,
    print: printAttribute ? getNodePrintPattern(printAttribute) : undefined,
    fields: declaration.variables.flatMap((variable): Field[] => {
      const pattern = getParseAttribute(variable.name, variable.attributes)
      const printAttribute = getPrintAttributeExpression(variable.attributes)

      if (pattern) {
        return [
          field({
            name: variable.name,
            pattern,
            ...(printAttribute && {
              print: getFieldPrintPattern(printAttribute),
            }),
          }),
        ]
      }

      const annotation = variable.syntaxNode.data.annotation

      // Try to infer a pattern from the type annotation
      if (annotation && annotation.type === 'typeIdentifier') {
        const pattern = inferFieldPattern(variable.name, annotation, nodeNames)

        if (pattern) {
          if (pattern.type === 'many') {
            return [
              manyField({
                name: variable.name,
                pattern,
                ...(printAttribute && {
                  print: getFieldPrintPattern(printAttribute),
                }),
              }),
            ]
          }

          return [
            field({
              name: variable.name,
              pattern,
              ...(printAttribute && {
                print: getFieldPrintPattern(printAttribute),
              }),
            }),
          ]
        }
      }

      return []
    }),
  }
}

function getEnumNode(
  declaration: EnumerationDeclaration,
  nodeNames: string[]
): EnumNodeDefinition {
  return {
    type: 'enum',
    name: declaration.name,
    pattern: getEnumParseAttribute(declaration)! as OrPattern,
    print: selfReferencePrintPattern(),
    fields: declaration.cases.flatMap((enumCase): Field[] => {
      const attributes = enumCase.data.attributes.map(
        attribute => new FunctionCallExpression(attribute)
      )
      const pattern = getParseAttribute(enumCase.data.name.name, attributes)
      const printAttribute = getPrintAttributeExpression(attributes)

      if (pattern) {
        return [
          field({
            name: enumCase.data.name.name,
            pattern,
            ...(printAttribute && {
              print: getFieldPrintPattern(printAttribute),
            }),
          }),
        ]
      }

      // Try to infer a pattern from the type annotation
      if (
        enumCase.data.associatedValues[0] &&
        enumCase.data.associatedValues[0].type === 'associatedValue'
      ) {
        const annotation = enumCase.data.associatedValues[0].data.annotation

        if (annotation && annotation.type === 'typeIdentifier') {
          const pattern = inferFieldPattern(
            enumCase.data.name.name,
            annotation,
            nodeNames
          )

          if (pattern) {
            return [
              field({
                name: enumCase.data.name.name,
                pattern,
                ...(printAttribute && {
                  print: getFieldPrintPattern(printAttribute),
                }),
              }),
            ]
          }
        }
      }

      return []
    }),
  }
}

export function buildParserDefinition(
  nodes: (EnumerationDeclaration | RecordDeclaration)[]
): Definition {
  const parserNodes = nodes.filter(isParser)
  const nodeNames = parserNodes.map(node => node.name)

  return {
    nodes: parserNodes.map(node => {
      if (node instanceof RecordDeclaration) {
        return getRecordNode(node, nodeNames)
      } else {
        return getEnumNode(node, nodeNames)
      }
    }),
  }
}

export function buildParser(
  nodes: (EnumerationDeclaration | RecordDeclaration)[]
): Parser {
  return new Parser(buildParserDefinition(nodes))
}
