import { Token } from './Lexer'
import { inspect } from 'util'

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
  value: string
}

export type NodeReference = {
  type: 'node'
  value: string
}

export type Reference = TokenReference | NodeReference

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

type ReferencePatternMatch = {
  pattern: ReferencePattern
  match: Token
}

type SequencePatternMatch = {
  pattern: SequencePattern
  match: PatternMatch[]
}

type OrPatternMatch = {
  pattern: OrPattern
  match: PatternMatch
}

type ManyPatternMatch = {
  pattern: ManyPattern
  match: PatternMatch[]
}

type PatternMatch =
  | ReferencePatternMatch
  | SequencePatternMatch
  | OrPatternMatch
  | ManyPatternMatch

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

    switch (currentNode.type) {
      case 'enum': {
        return failure(['enum not supported'], tokens)
      }
      case 'record': {
        const result = this.parseRecord(currentNode, tokens)

        if (result.type === 'failure') return result

        return { type: 'success', value: result.value }
      }
    }
  }

  // parseEnum(node: EnumNode, tokens: Token[]): Result<unknown> {
  //   for (let pattern of node.pattern.value) {
  //     if ()
  //   }
  // }

  parseRecord(node: RecordNode, tokens: Token[]): ParseResult<PatternMatch> {
    const { pattern } = node

    const match = this.parsePattern(pattern, tokens)

    return match
    // return success(, tokens)
  }

  parsePattern(pattern: Pattern, tokens: Token[]): ParseResult<PatternMatch> {
    switch (pattern.type) {
      case 'reference': {
        const result = this.parseReference(pattern.value, tokens)

        if (result.type === 'failure') return result

        return success({ pattern, match: result.value }, result.tokens)
      }
      case 'sequence': {
        const initialValue: ParseResult<SequencePatternMatch> = success(
          { pattern, match: [] },
          tokens
        )

        return pattern.value.reduce((result, item, index) => {
          if (result.type === 'failure') return result

          const newResult = this.parsePattern(item, result.tokens)

          if (newResult.type === 'failure') return newResult

          return success(
            {
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
              pattern,
              match: newResult.value,
            },
            newResult.tokens
          )
        }, initialValue)
      }
      case 'many': {
        let result: ParseResult<ManyPatternMatch> = success(
          { pattern, match: [] },
          tokens
        )

        while (tokens.length > 0) {
          const maybeResult = this.parsePattern(pattern.value, result.tokens)

          if (maybeResult.type === 'failure') break

          // Can't happen
          if (result.type == 'failure') break

          result = success(
            { pattern, match: [...result.value.match, maybeResult.value] },
            maybeResult.tokens
          )
        }

        return result
      }
    }
  }

  parseReference(reference: Reference, tokens: Token[]): ParseResult<Token> {
    switch (reference.type) {
      case 'token': {
        const [token, ...rest] = tokens

        if (token && `Token.${token.type}` === reference.value) {
          return success(token, rest)
        }
      }
    }

    return failure([`Failed to parse reference: ${inspect(reference)}`], tokens)
  }
}
