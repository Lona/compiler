import { doc, Doc } from 'prettier'
import { Definition, Value } from './Parser'
import { StateDefinition, Token, Rule } from './Lexer'

const {
  builders: { concat },
} = doc

export type LinePrintCommand = { type: 'line' }

export type IndentPrintCommand = { type: 'indent'; value: PrintCommand }

export type ConcatPrintCommand = { type: 'concat'; value: PrintCommand[] }

export type JoinPrintCommand = {
  type: 'join'
  value: PrintCommand[]
  leading?: PrintCommand
  tailing?: PrintCommand
}

export type PrintCommand =
  | LinePrintCommand
  | IndentPrintCommand
  | ConcatPrintCommand
  | JoinPrintCommand

export type LiteralPrintPattern = {
  type: 'literal'
  value: string
}

export type SequencePrintPattern = {
  type: 'sequence'
  value: PrintPattern[]
}

export type IndexReference = {
  type: 'index'
  value: number
}

export type TokenReference = {
  type: 'token'
  value: string
}

export type SelfReference = {
  type: 'self'
  value: string
}

export type Reference = IndexReference | TokenReference | SelfReference

export type ReferencePrintPattern = {
  type: 'reference'
  value: Reference
}

export type CommandPrintPattern = {
  type: 'command'
  value: PrintCommand
}

export type PrintPattern =
  | LiteralPrintPattern
  | SequencePrintPattern
  | ReferencePrintPattern

export function literalPrintPattern(value: string): LiteralPrintPattern {
  return { type: 'literal', value }
}

export function indexReferencePrintPattern(
  value: number
): ReferencePrintPattern {
  return { type: 'reference', value: { type: 'index', value } }
}

export function tokenReferencePrintPattern(
  value: string
): ReferencePrintPattern {
  return { type: 'reference', value: { type: 'token', value } }
}

export function selfReferencePrintPattern(
  value: string
): ReferencePrintPattern {
  return { type: 'reference', value: { type: 'self', value } }
}

export function sequencePrintPattern(
  value: PrintPattern[]
): SequencePrintPattern {
  return { type: 'sequence', value }
}

export class Printer {
  lexerDefinition: StateDefinition[]
  parserDefinition: Definition

  get rules(): Rule[] {
    return this.lexerDefinition.flatMap(state => state.rules)
  }

  constructor(
    lexerDefinition: StateDefinition[],
    parserDefinition: Definition = { nodes: [] }
  ) {
    this.lexerDefinition = lexerDefinition
    this.parserDefinition = parserDefinition
  }

  formatToken = (token: Token): Doc => {
    const rule = this.rules.find(rule => rule.name === token.type)

    if (!rule) {
      throw new Error(`Couldn't find rule for token: ${token.type}`)
    }

    return rule.print ? this.formatPrintPattern(token, rule.print) : ''
  }

  formatTokens(tokens: Token[]): Doc {
    return concat(tokens.map(this.formatToken))
  }

  formatReference = (token: Token, reference: Reference): Doc => {
    switch (reference.type) {
      case 'index':
        return token.groups[reference.value]
      case 'token': {
        const rule = this.rules.find(rule => rule.name === token.type)

        if (!rule) {
          throw new Error(`Couldn't find rule for token: ${token.type}`)
        }

        return this.formatPrintPattern(token, rule.print)
      }
      case 'self':
        throw new Error('self not handled yet')
    }
  }

  formatPrintPattern = (token: Token, printPattern: PrintPattern): Doc => {
    switch (printPattern.type) {
      case 'literal': {
        return printPattern.value
      }
      case 'reference': {
        return this.formatReference(token, printPattern.value)
      }
      case 'sequence': {
        return concat(
          printPattern.value.map(value => this.formatPrintPattern(token, value))
        )
      }
    }
  }

  print(
    document: Doc,
    options: doc.printer.Options = {
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    }
  ) {
    return doc.printer.printDocToString(document, options).formatted
  }
}
