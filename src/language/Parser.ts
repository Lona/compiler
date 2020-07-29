import { Token } from './Lexer'
import { inspect } from 'util'
import { withOptions } from 'tree-visit'

type Result<T> =
  | {
      type: 'success'
      value: T
    }
  | { type: 'failure'; value: string[] }

type ParseResult<T> = Result<T> & { tokens: Token[] }

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

export type Pattern =
  | ReferencePattern
  | SequencePattern
  | OrPattern
  | ManyPattern

export type Field = {
  name: string
  pattern: Pattern
}

export type EnumNode = {
  type: 'enum'
  name: string
  pattern: SequencePattern
  fields: Field[]
}

export type RecordNode = {
  type: 'record'
  name: string
  pattern: Pattern
  fields: Field[]
}

export type Node = EnumNode | RecordNode

export type Definition = {
  nodes: Node[]
}

type TokenReferenceMatch = {
  type: 'token'
  reference: TokenReference
  match: Token
}

type FieldReferenceMatch = {
  type: 'field'
  reference: FieldReference
  match: PatternMatch
}

type NodeReferenceMatch = {
  type: 'node'
  reference: NodeReference
  match: Value
}

type ReferenceMatch =
  | TokenReferenceMatch
  | FieldReferenceMatch
  | NodeReferenceMatch

type ReferencePatternMatch = {
  type: 'reference'
  pattern: ReferencePattern
  match: ReferenceMatch
}

type SequencePatternMatch = {
  type: 'sequence'
  pattern: SequencePattern
  match: PatternMatch[]
}

type OrPatternMatch = {
  type: 'or'
  pattern: OrPattern
  match: PatternMatch
}

type ManyPatternMatch = {
  type: 'many'
  pattern: ManyPattern
  match: PatternMatch[]
}

type PatternMatch =
  | ReferencePatternMatch
  | SequencePatternMatch
  | OrPatternMatch
  | ManyPatternMatch

type RecordValue = {
  [key: string]: unknown
}

type Value = RecordValue

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
          throw new Error('No way to resolve match')
        case 'node':
          return match.match.match
      }
    }
    default:
      throw new Error('No way to resolve match')
  }
}

export class Parser {
  definition: Definition

  constructor(definition: Definition) {
    this.definition = definition
  }

  parse(
    tokens: Token[],
    startNode: string = this.definition.nodes[0].name
  ): Result<unknown> {
    const currentNode = this.definition.nodes.find(
      node => node.name === startNode
    )

    if (!currentNode) {
      throw new Error(`Failed to find node: ${startNode}`)
    }

    return this.parseNode(currentNode, tokens)
  }

  parseNode(node: Node, tokens: Token[]): ParseResult<Value> {
    switch (node.type) {
      case 'enum': {
        return failure(['enum not supported'], tokens)
      }
      case 'record': {
        return this.parseRecord(node, tokens)
      }
    }
  }

  // parseEnum(node: EnumNode, tokens: Token[]): Result<unknown> {
  //   for (let pattern of node.pattern.value) {
  //     if ()
  //   }
  // }

  parseRecord(node: RecordNode, tokens: Token[]): ParseResult<RecordValue> {
    const { pattern } = node

    const result = this.parsePattern(pattern, tokens)

    if (result.type !== 'success') return result

    const recordValue: RecordValue = {}

    matchTree.visit(result.value, patternMatch => {
      if (
        patternMatch.type === 'reference' &&
        patternMatch.match.type === 'field' &&
        patternMatch.match.reference.nodeName === node.name
      ) {
        const fieldName = patternMatch.match.reference.fieldName

        if (fieldName in recordValue) {
          throw new Error(
            `Field ${fieldName} of ${node.name} already set in another path`
          )
        }

        recordValue[fieldName] = resolveReference(patternMatch.match.match)
      }
    })

    // console.log('record', inspect(recordValue, undefined, null, true))

    return success(recordValue, result.tokens)
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
          [`Failed to match 'or' pattern: ${inspect(pattern)}`],
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
    }
  }

  parseReference(
    reference: Reference,
    tokens: Token[]
  ): ParseResult<ReferenceMatch> {
    switch (reference.type) {
      case 'token': {
        const [token, ...rest] = tokens

        if (token && `Token.${token.type}` === reference.name) {
          return success(
            { type: reference.type, reference, match: token },
            rest
          )
        }

        break
      }
      case 'field': {
        const { nodeName, fieldName } = reference

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

    return failure([`Failed to parse reference: ${inspect(reference)}`], tokens)
  }
}
