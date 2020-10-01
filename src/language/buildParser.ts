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
  Lexer,
  Parser,
  Pattern,
  Token,
  or,
  many,
  option,
  sequence,
  consume,
  thunk,
  ManyPattern,
  OrPattern,
  OptionPattern,
  ConsumePattern,
  ParserPattern,
} from 'language-tools'
// import {
//   Definition,
//   Field,
//   Parser,
//   Pattern,
//   RecordNodeDefinition,
//   EnumNodeDefinition,
//   OrPattern,
//   field,
//   manyField,
//   enumNodeDefinition,
//   recordNodeDefinition,
//   FieldAnnotation,
//   StringFieldAnnotation,
//   NodeFieldAnnotation,
//   optionField,
// } from './Parser'
// import {
//   getPrintAttributeExpression,
//   getNodePrintPattern,
//   getFieldPrintPattern,
// } from './buildPrinter'
// import {
//   FieldPrintPattern,
//   sequencePrintPattern,
//   joinCommandPrintPattern,
//   tokenReferencePrintPattern,
//   nodeReferencePrintPattern,
//   selfReferencePrintPattern,
// } from './Printer'
import { inspect } from 'util'
import { isNode } from '../logic/ast'

export type ParserPatternMap = Record<string, ParserPattern>

export type StringFieldAnnotation = { type: 'string' }

export type NodeFieldAnnotation = { type: 'node'; value: string }

export type ManyFieldAnnotation = {
  type: 'many'
  value: StringFieldAnnotation | NodeFieldAnnotation
}

export type OptionFieldAnnotation = {
  type: 'option'
  value: StringFieldAnnotation | NodeFieldAnnotation
}

export type FieldAnnotation =
  | StringFieldAnnotation
  | NodeFieldAnnotation
  | OptionFieldAnnotation
  | ManyFieldAnnotation

export type ManyField = {
  type: 'many'
  name: string
  annotation: ManyFieldAnnotation
  pattern: ManyPattern<string>
}

export type OptionField = {
  type: 'option'
  name: string
  annotation: OptionFieldAnnotation
  pattern: OptionPattern<string>
}

export type StandardField = {
  type: 'standard'
  name: string
  annotation: StringFieldAnnotation | NodeFieldAnnotation
  pattern: Pattern<string>
}

export type Field = StandardField | ManyField | OptionField

export type EnumNodeDefinition = {
  type: 'enum'
  name: string
  pattern: OrPattern<string>
  fields: Field[]
}

export type RecordNodeDefinition = {
  type: 'record'
  name: string
  pattern: Pattern<string>
  fields: Field[]
}

export type NodeDefinition = EnumNodeDefinition | RecordNodeDefinition

export function isParser(
  node: RecordDeclaration | EnumerationDeclaration
): boolean {
  return node.attributes.some(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'parse'
  )
}

type Context = {
  lexer: Lexer
  getPattern: (name: string) => Pattern<string>
}

function getPattern(
  context: Context,
  resolvedSelf: string,
  node: IExpression
): Pattern<string> {
  if (
    node instanceof FunctionCallExpression &&
    node.callee instanceof IdentifierExpression
  ) {
    switch (node.callee.name) {
      case 'or':
        return or(
          Object.values(node.argumentExpressionNodes).map(child =>
            getPattern(context, resolvedSelf, child)
          )
        )
      case 'many':
        return many(
          Object.values(node.argumentExpressionNodes).map(child =>
            getPattern(context, resolvedSelf, child)
          )[0]
        )
      case 'option': {
        return option(
          Object.values(node.argumentExpressionNodes).map(child =>
            getPattern(context, resolvedSelf, child)
          )[0]
        )
      }
    }
  } else if (
    node instanceof LiteralExpression &&
    node.literal instanceof ArrayLiteral
  ) {
    return sequence(
      node.literal.elements.map(child =>
        getPattern(context, resolvedSelf, child)
      )
    )
  } else if (node instanceof MemberExpression) {
    const names = node.names.map(name =>
      name === 'self' ? resolvedSelf : name
    )

    context.lexer.stateDefinitions.flatMap(definition =>
      definition.rules.map(rule => rule.pattern)
    )

    if (names[0] === 'Token') {
      return consume(names[1])
    } else {
      return thunk(() => context.getPattern(names[0]))
    }
  }

  throw new Error('Invalid pattern')
}

export function getParseAttribute(
  context: Context,
  name: string,
  attributes: FunctionCallExpression[]
): Pattern<string> | undefined {
  const attribute = attributes.find(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'parse'
  )

  if (!attribute) return

  const { pattern } = attribute.argumentExpressionNodes

  return getPattern(context, name, pattern)
}

export function getEnumParseAttribute(
  context: Context,
  node: EnumerationDeclaration
): Pattern<string> | undefined {
  const attribute = node.attributes.find(
    attribute =>
      attribute.callee instanceof IdentifierExpression &&
      attribute.callee.name === 'parse'
  )

  if (!attribute) return

  const { pattern } = attribute.argumentExpressionNodes

  console.log(pattern)

  // Use default enum pattern
  if (!pattern) {
    // throw new Error('Enum not handled yet')
    return or([])
    // return or(
    //   node.cases.map(enumCase => {
    //     return {
    //       type: 'reference',
    //       value: {
    //         type: 'field',
    //         nodeName: node.name,
    //         fieldName: enumCase.data.name.name,
    //       },
    //     }
    //   }),
    // )
  } else {
    return getParseAttribute(context, node.name, node.attributes)
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
): Pattern<string> {
  switch (fieldAnnotation.type) {
    case 'option':
      const pattern = inferFieldPattern(
        variableName,
        fieldAnnotation.value,
        options
      )

      return option(pattern)
    case 'many': {
      const pattern = inferFieldPattern(
        variableName,
        fieldAnnotation.value,
        options
      )

      return many(pattern)
    }
    case 'node': {
      throw new Error('node pattern not handled yet')
      // if (!options.nodeNames.includes(fieldAnnotation.value)) {
      //   throw new Error(`Invalid node reference: ${fieldAnnotation.value}`)
      // }

      // return {
      //   type: 'reference',
      //   value: { type: 'node', name: fieldAnnotation.value },
      // }
    }
    case 'string': {
      if (!options.tokenNames.includes(variableName)) {
        throw new Error(
          `Couldn't infer token type for: ${variableName} (${variableName} isn't a defined token)`
        )
      }

      return consume(variableName)
    }
  }
}

function getRecordNode(
  context: Context,
  declaration: RecordDeclaration,
  options: Options
): RecordNodeDefinition {
  // const printAttribute = getPrintAttributeExpression(declaration.attributes)

  return recordNodeDefinition({
    name: declaration.name,
    pattern: getParseAttribute(
      context,
      declaration.name,
      declaration.attributes
    )!,
    // print: printAttribute ? getNodePrintPattern(printAttribute) : undefined,
    fields: declaration.variables.flatMap((variable): Field[] => {
      const name = variable.name

      try {
        const annotation = fieldAnnotation(variable.syntaxNode.data.annotation)
        const pattern =
          getParseAttribute(context, name, variable.attributes) ??
          inferFieldPattern(name, annotation, options)
        // const printAttribute = getPrintAttributeExpression(variable.attributes)

        if (pattern.type === 'many' && annotation.type === 'many') {
          return [
            manyField({
              name: name,
              annotation,
              pattern,
              // ...(printAttribute && {
              //   print: getFieldPrintPattern(printAttribute),
              // }),
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
              // ...(printAttribute && {
              //   print: getFieldPrintPattern(printAttribute),
              // }),
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
            // ...(printAttribute && {
            //   print: getFieldPrintPattern(printAttribute),
            // }),
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
  context: Context,
  declaration: EnumerationDeclaration,
  options: Options
): EnumNodeDefinition {
  return enumNodeDefinition({
    name: declaration.name,
    pattern: getEnumParseAttribute(context, declaration)! as OrPattern<string>,
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
          getParseAttribute(context, name, attributes) ??
          inferFieldPattern(name, annotation, options)
        // const printAttribute = getPrintAttributeExpression(attributes)

        return [
          field({
            name: name,
            annotation: fieldAnnotation(associatedValues[0].data.annotation),
            pattern,
            // ...(printAttribute && {
            //   print: getFieldPrintPattern(printAttribute),
            // }),
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

export function buildParserPatterns(
  context: Context,
  nodes: (EnumerationDeclaration | RecordDeclaration)[],
  parserOptions: ParserDefinitionOptions
): Record<string, NodeDefinition> {
  const parserNodes = nodes.filter(isParser)
  const nodeNames = parserNodes.map(node => node.name)
  const options: Options = { ...parserOptions, nodeNames }

  return Object.fromEntries(
    parserNodes
      .map(node => {
        if (node instanceof RecordDeclaration) {
          return getRecordNode(context, node, options)
        } else {
          return getEnumNode(context, node, options)
        }
      })
      .map(node => [node.name, node])
  )
}

// export function buildParser(
//   context: Context,
//   nodes: (EnumerationDeclaration | RecordDeclaration)[],
//   parserOptions: ParserDefinitionOptions
// ): Parser<Token, Token> {
//   return new Parser({
//     matchToken: (token: Token, type: string) => token.type === type,
//     tokenToValue: (token: Token) => token,
//   })

//   // return new Parser(buildParserDefinition(context, nodes, parserOptions))
// }

export function recordNodeDefinition({
  name,
  pattern,
  fields,
}: {
  name: string
  pattern: Pattern<string>
  fields: Field[]
}): RecordNodeDefinition {
  return {
    type: 'record',
    name,
    pattern,
    fields,
  }
}

export function enumNodeDefinition({
  name,
  pattern,
  fields,
}: {
  name: string
  pattern: OrPattern<string>
  fields: Field[]
}): EnumNodeDefinition {
  return {
    type: 'enum',
    name,
    pattern,
    fields,
  }
}

export function optionFieldAnnotation(
  value: StringFieldAnnotation | NodeFieldAnnotation
): OptionFieldAnnotation {
  return { type: 'option', value }
}

export function manyFieldAnnotation(
  value: StringFieldAnnotation | NodeFieldAnnotation
): ManyFieldAnnotation {
  return { type: 'many', value }
}

export function standardField({
  name,
  annotation,
  pattern,
}: {
  name: string
  annotation: StringFieldAnnotation | NodeFieldAnnotation
  pattern: Pattern<string>
}): StandardField {
  return {
    type: 'standard',
    name,
    annotation,
    pattern,
  }
}

export function manyField({
  name,
  annotation,
  pattern,
}: {
  name: string
  annotation: ManyFieldAnnotation
  pattern: ManyPattern<string>
}): ManyField {
  return {
    type: 'many',
    name,
    annotation,
    pattern,
  }
}

export function optionField({
  name,
  annotation,
  pattern,
}: {
  name: string
  annotation: OptionFieldAnnotation
  pattern: OptionPattern<string>
}): OptionField {
  return {
    type: 'option',
    name,
    annotation,
    pattern,
  }
}

export function field({
  name,
  annotation,
  pattern,
}: {
  name: string
  annotation: FieldAnnotation
  pattern: Pattern<string>
}): Field {
  if (annotation.type === 'option' || pattern.type === 'option') {
    if (!(annotation.type === 'option' && pattern.type === 'option')) {
      throw new Error(`Option field type mismatch for field: ${name}`)
    }

    return optionField({ name, annotation, pattern })
  }

  if (annotation.type === 'many' || pattern.type === 'many') {
    if (!(annotation.type === 'many' && pattern.type === 'many')) {
      throw new Error(`Many field type mismatch for field: ${name}`)
    }

    return manyField({ name, annotation, pattern })
  }

  return standardField({ name, annotation, pattern })
}
