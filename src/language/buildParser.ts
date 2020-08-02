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
  enumNodeDefinition,
  recordNodeDefinition,
  FieldAnnotation,
  StringFieldAnnotation,
  NodeFieldAnnotation,
  optionField,
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
import { isNode } from '../logic/ast'

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

function simpleTypeName(annotation?: AST.TypeAnnotation): string[] {
  if (!annotation) {
    throw new Error('Type annotations are required for parser variables')
  }

  if (annotation.type !== 'typeIdentifier') {
    throw new Error('Only type identifiers are supported for parser patterns')
  }

  const typeName = annotation.data.identifier.string

  return [
    typeName,
    ...(annotation.data.genericArguments.length > 0
      ? simpleTypeName(annotation.data.genericArguments[0])
      : []),
  ]
}

function fieldAnnotation(annotation?: AST.TypeAnnotation): FieldAnnotation {
  const names = simpleTypeName(annotation)

  function determineType(
    name: string
  ): StringFieldAnnotation | NodeFieldAnnotation {
    if (name === 'String') {
      return { type: 'string' }
    } else {
      return { type: 'node', value: name }
    }
  }

  if (names.length === 1) {
    return determineType(names[0])
  } else if (names.length === 2) {
    const [container, inner] = names

    if (container === 'Array') {
      return { type: 'many', value: determineType(inner) }
    }
  }

  throw new Error(`Complex types not supported yet: ${annotation}`)
}

function inferFieldPattern(
  variableName: string,
  fieldAnnotation: FieldAnnotation,
  options: Options
): Pattern {
  switch (fieldAnnotation.type) {
    case 'option':
    case 'many': {
      const pattern = inferFieldPattern(
        variableName,
        fieldAnnotation.value,
        options
      )

      return {
        type: fieldAnnotation.type,
        value: pattern,
      }
    }
    case 'node': {
      if (!options.nodeNames.includes(fieldAnnotation.value)) {
        throw new Error(`Invalid node reference: ${fieldAnnotation.value}`)
      }

      return {
        type: 'reference',
        value: { type: 'node', name: fieldAnnotation.value },
      }
    }
    case 'string': {
      if (!options.tokenNames.includes(variableName)) {
        throw new Error(
          `Couldn't infer token type for: ${variableName} (${variableName} isn't a defined token)`
        )
      }

      return {
        type: 'reference',
        value: { type: 'token', name: variableName },
      }
    }
  }
}

function getRecordNode(
  declaration: RecordDeclaration,
  options: Options
): RecordNodeDefinition {
  const printAttribute = getPrintAttributeExpression(declaration.attributes)

  return recordNodeDefinition({
    name: declaration.name,
    pattern: getParseAttribute(declaration.name, declaration.attributes)!,
    print: printAttribute ? getNodePrintPattern(printAttribute) : undefined,
    fields: declaration.variables.flatMap((variable): Field[] => {
      const name = variable.name

      try {
        const annotation = fieldAnnotation(variable.syntaxNode.data.annotation)
        const pattern =
          getParseAttribute(name, variable.attributes) ??
          inferFieldPattern(name, annotation, options)
        const printAttribute = getPrintAttributeExpression(variable.attributes)

        if (pattern.type === 'many' && annotation.type === 'many') {
          return [
            manyField({
              name: name,
              annotation,
              pattern,
              ...(printAttribute && {
                print: getFieldPrintPattern(printAttribute),
              }),
            }),
          ]
        }

        if (pattern.type === 'many' || annotation.type === 'many') {
          throw new Error('Many type mismatch')
        }

        if (pattern.type === 'option' && annotation.type === 'option') {
          return [
            optionField({
              name: name,
              annotation,
              pattern,
              ...(printAttribute && {
                print: getFieldPrintPattern(printAttribute),
              }),
            }),
          ]
        }

        if (pattern.type === 'option' || annotation.type === 'option') {
          throw new Error('option type mismatch')
        }

        return [
          field({
            name: name,
            annotation,
            pattern,
            ...(printAttribute && {
              print: getFieldPrintPattern(printAttribute),
            }),
          }),
        ]
      } catch (error) {
        console.error(
          `Error converting record field: ${declaration.name}.${name}`
        )
        throw new Error(error)
      }
    }),
  })
}

function getEnumNode(
  declaration: EnumerationDeclaration,
  options: Options
): EnumNodeDefinition {
  return enumNodeDefinition({
    name: declaration.name,
    pattern: getEnumParseAttribute(declaration)! as OrPattern,
    fields: declaration.cases.flatMap((enumCase): Field[] => {
      const name = enumCase.data.name.name

      try {
        const attributes = enumCase.data.attributes.map(
          attribute => new FunctionCallExpression(attribute)
        )

        const associatedValues = enumCase.data.associatedValues.filter(isNode)

        if (associatedValues.length === 0) {
          throw new Error('Parser enums must have at least 1 associated value')
        }

        const annotation = fieldAnnotation(associatedValues[0].data.annotation)
        const pattern =
          getParseAttribute(name, attributes) ??
          inferFieldPattern(name, annotation, options)
        const printAttribute = getPrintAttributeExpression(attributes)

        return [
          field({
            name: name,
            annotation: fieldAnnotation(associatedValues[0].data.annotation),
            pattern,
            ...(printAttribute && {
              print: getFieldPrintPattern(printAttribute),
            }),
          }),
        ]
      } catch (error) {
        console.error(
          `Error converting enum field: ${declaration.name}.${name}`
        )
        throw new Error(error)
      }
    }),
  })
}

export type ParserDefinitionOptions = {
  tokenizerName: string
  tokenNames: string[]
}

type Options = ParserDefinitionOptions & {
  nodeNames: string[]
}

export function buildParserDefinition(
  nodes: (EnumerationDeclaration | RecordDeclaration)[],
  parserOptions: ParserDefinitionOptions
): Definition {
  const parserNodes = nodes.filter(isParser)
  const nodeNames = parserNodes.map(node => node.name)
  const options: Options = { ...parserOptions, nodeNames }

  return {
    nodes: parserNodes.map(node => {
      if (node instanceof RecordDeclaration) {
        return getRecordNode(node, options)
      } else {
        return getEnumNode(node, options)
      }
    }),
  }
}

export function buildParser(
  nodes: (EnumerationDeclaration | RecordDeclaration)[],
  parserOptions: ParserDefinitionOptions
): Parser {
  return new Parser(buildParserDefinition(nodes, parserOptions))
}
