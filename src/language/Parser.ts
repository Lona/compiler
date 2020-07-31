import { Token } from './Lexer'
import { inspect } from 'util'
import { withOptions } from 'tree-visit'
import { PrintPattern } from './Printer'

type Result<T> =
  | {
      type: 'success'
      value: T
    }
  | { type: 'failure'; value: string[] }

export type ParseResult<T> = Result<T> & { tokens: Token[] }

function success<T>(value: T, tokens: Token[]): ParseResult<T> {
  return { type: 'success', value, tokens }
}

function failure<T>(value: string[], tokens: Token[]): ParseResult<T> {
  return { type: 'failure', value, tokens }
}

export type TokenReference = {
  type: 'token'
  name: string
}

export type NodeReference = {
  type: 'node'
  name: string
}

export type FieldReference = {
  type: 'field'
  nodeName: string
  fieldName: string
}

export type Reference = TokenReference | NodeReference | FieldReference

export type ReferencePattern = {
  type: 'reference'
  value: Reference
}

export type SequencePattern = {
  type: 'sequence'
  value: Pattern[]
}

export type OrPattern = {
  type: 'or'
  value: Pattern[]
}

export type ManyPattern = {
  type: 'many'
  value: Pattern
}

export type OptionPattern = {
  type: 'option'
  value: Pattern
}

export type Pattern =
  | ReferencePattern
  | SequencePattern
  | OrPattern
  | ManyPattern
  | OptionPattern

export type Field = {
  name: string
  pattern: Pattern
  print?: PrintPattern
}

export type EnumNodeDefinition = {
  type: 'enum'
  name: string
  pattern: OrPattern
  fields: Field[]
  print?: PrintPattern
}

export type RecordNodeDefinition = {
  type: 'record'
  name: string
  pattern: Pattern
  fields: Field[]
  print?: PrintPattern
}

export type NodeDefinition = EnumNodeDefinition | RecordNodeDefinition

export type Definition = {
  nodes: NodeDefinition[]
}

export type TokenReferenceMatch = {
  type: 'token'
  reference: TokenReference
  match: Token
}

export type FieldReferenceMatch = {
  type: 'field'
  reference: FieldReference
  match: PatternMatch
}

export type NodeReferenceMatch = {
  type: 'node'
  reference: NodeReference
  match: NodeValue
}

export type ReferenceMatch =
  | TokenReferenceMatch
  | FieldReferenceMatch
  | NodeReferenceMatch

export type ReferencePatternMatch = {
  type: 'reference'
  pattern: ReferencePattern
  match: ReferenceMatch
}

export type SequencePatternMatch = {
  type: 'sequence'
  pattern: SequencePattern
  match: PatternMatch[]
}

export type OrPatternMatch = {
  type: 'or'
  pattern: OrPattern
  match: PatternMatch
}

export type ManyPatternMatch = {
  type: 'many'
  pattern: ManyPattern
  match: PatternMatch[]
}

export type OptionPatternMatch = {
  type: 'option'
  pattern: OptionPattern
  match?: PatternMatch
}

export type PatternMatch =
  | ReferencePatternMatch
  | SequencePatternMatch
  | OrPatternMatch
  | ManyPatternMatch
  | OptionPatternMatch

export type RecordNodeValue = {
  [key: string]: unknown
}

export type EnumNodeValue = {
  type: string
  [key: string]: unknown
}

export type NodeValue = RecordNodeValue | EnumNodeValue

const matchTree = withOptions({
  getChildren: (match: PatternMatch): PatternMatch[] => {
    switch (match.type) {
      case 'reference':
        switch (match.match.type) {
          case 'token':
            return []
          case 'field':
            return [match.match.match]
          case 'node':
            return []
        }
      case 'sequence':
        return match.match
      case 'or':
        return [match.match]
      case 'many':
        return match.match
      case 'option':
        return match.match ? [match.match] : []
    }
  },
})

function resolveReference(match: PatternMatch): unknown {
  switch (match.type) {
    case 'reference': {
      switch (match.match.type) {
        case 'token':
          return match.match.match.groups[0]
        case 'field':
          throw new Error('No way to resolve field match')
        case 'node':
          return match.match.match
      }
    }
    case 'many': {
      // TODO: Is choosing the first match the right default?
      return match.match.map(resolveReference)
    }
    case 'sequence': {
      // TODO: Is choosing the first match the right default?
      return resolveReference(match.match[0])
    }
    default:
      throw new Error(`No way to resolve match ${inspect(match)}`)
  }
}

export class Parser {
  definition: Definition

  constructor(definition: Definition) {
    this.definition = definition
  }

  parse(tokens: Token[], startNode: string): ParseResult<NodeValue> {
    const currentNode = this.definition.nodes.find(
      node => node.name === startNode
    )

    if (!currentNode) {
      throw new Error(`Failed to find node: ${startNode}`)
    }

    return this.parseNode(currentNode, tokens)
  }

  parseNode(node: NodeDefinition, tokens: Token[]): ParseResult<NodeValue> {
    switch (node.type) {
      case 'enum': {
        return this.parseEnum(node, tokens)
      }
      case 'record': {
        return this.parseRecord(node, tokens)
      }
    }
  }

  parseRecord(
    node: RecordNodeDefinition,
    tokens: Token[]
  ): ParseResult<RecordNodeValue> {
    const { pattern } = node

    const result = this.parsePattern(pattern, tokens)

    if (result.type !== 'success') return result

    const recordValue: RecordNodeValue = {}

    matchTree.visit(result.value, patternMatch => {
      if (
        patternMatch.type === 'reference' &&
        patternMatch.match.type === 'field' &&
        patternMatch.match.reference.nodeName === node.name
      ) {
        const fieldName = patternMatch.match.reference.fieldName

        if (fieldName in recordValue) {
          throw new Error(
            `Field ${fieldName} of ${node.name} already set in another path (or recursively?)`
          )
        }

        recordValue[fieldName] = resolveReference(patternMatch.match.match)
      }
    })

    // console.log('record', inspect(recordValue, undefined, null, true))

    return success(recordValue, result.tokens)
  }

  parseEnum(
    node: EnumNodeDefinition,
    tokens: Token[]
  ): ParseResult<EnumNodeValue> {
    const { pattern } = node

    const result = this.parsePattern(pattern, tokens) as ParseResult<
      OrPatternMatch
    >

    if (result.type !== 'success') return result

    const field = node.fields.find(
      field =>
        result.value.match.pattern.type === 'reference' &&
        result.value.match.pattern.value.type === 'field' &&
        result.value.match.pattern.value.fieldName === field.name
    )

    if (!field) {
      throw new Error('Invalid enum match')
    }

    const enumValue: EnumNodeValue = {
      type: field.name,
      ...(result.value.match.type === 'reference' &&
        result.value.match.match.type === 'field' && {
          value: resolveReference(result.value.match.match.match),
        }),
    }

    return success(enumValue, result.tokens)
  }

  parsePattern(pattern: Pattern, tokens: Token[]): ParseResult<PatternMatch> {
    switch (pattern.type) {
      case 'reference': {
        const result = this.parseReference(pattern.value, tokens)

        if (result.type === 'failure') return result

        return success(
          { type: 'reference', pattern, match: result.value },
          result.tokens
        )
      }
      case 'sequence': {
        const initialValue: ParseResult<SequencePatternMatch> = success(
          { type: 'sequence', pattern, match: [] },
          tokens
        )

        return pattern.value.reduce((result, item, index) => {
          if (result.type === 'failure') return result

          const newResult = this.parsePattern(item, result.tokens)

          if (newResult.type === 'failure') return newResult

          return success(
            {
              type: 'sequence',
              pattern,
              match: [...result.value.match, newResult.value],
            },
            newResult.tokens
          )
        }, initialValue)
      }
      case 'or': {
        const initialValue: ParseResult<OrPatternMatch> = failure(
          [`Failed to match 'or' pattern: ${inspect(pattern, false, 5)}`],
          tokens
        )

        return pattern.value.reduce((result, item) => {
          if (result.type === 'success') return result

          const newResult = this.parsePattern(item, result.tokens)

          if (newResult.type === 'failure') return result

          return success(
            {
              type: 'or',
              pattern,
              match: newResult.value,
            },
            newResult.tokens
          )
        }, initialValue)
      }
      case 'many': {
        let result: ParseResult<ManyPatternMatch> = success(
          { type: 'many', pattern, match: [] },
          tokens
        )

        while (tokens.length > 0) {
          const maybeResult = this.parsePattern(pattern.value, result.tokens)

          if (maybeResult.type === 'failure') break

          // Can't happen
          if (result.type == 'failure') break

          result = success(
            {
              type: 'many',
              pattern,
              match: [...result.value.match, maybeResult.value],
            },
            maybeResult.tokens
          )
        }

        return result
      }
      case 'option': {
        const result = this.parsePattern(pattern.value, tokens)

        if (result.type === 'failure') {
          return success(
            {
              type: 'option',
              pattern,
            },
            result.tokens
          )
        }

        return success(
          {
            type: 'option',
            pattern,
            match: result.value,
          },
          result.tokens
        )
      }
    }
  }

  parseReference(
    reference: Reference,
    tokens: Token[]
  ): ParseResult<ReferenceMatch> {
    switch (reference.type) {
      case 'token': {
        const [token, ...rest] = tokens

        if (token && token.type === reference.name) {
          return success(
            { type: reference.type, reference, match: token },
            rest
          )
        }

        return failure(
          [`Failed to parse token reference: ${inspect(reference)}`],
          tokens
        )
      }
      case 'field': {
        const { nodeName, fieldName } = reference

        // console.log('find field', nodeName, fieldName)

        const currentNode = this.definition.nodes.find(
          node => node.name === nodeName
        )

        if (!currentNode) {
          throw new Error(`Invalid node reference: ${nodeName}`)
        }

        const currentField = currentNode.fields.find(
          field => field.name === fieldName
        )

        if (!currentField) {
          throw new Error(`Invalid field reference: ${fieldName}`)
        }

        const result = this.parsePattern(currentField.pattern, tokens)

        if (result.type === 'failure') return result

        return success(
          { type: reference.type, reference, match: result.value },
          result.tokens
        )
      }
      case 'node': {
        const { name: nodeName } = reference

        // console.log('find node name', nodeName)

        const currentNode = this.definition.nodes.find(
          node => node.name === nodeName
        )

        if (!currentNode) {
          throw new Error(`Invalid node reference: ${nodeName}`)
        }

        const result = this.parseNode(currentNode, tokens)

        if (result.type === 'failure') return result

        return success(
          { type: reference.type, reference, match: result.value },
          result.tokens
        )
      }
    }
  }
}
