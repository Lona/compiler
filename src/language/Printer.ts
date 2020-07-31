import { doc, Doc } from 'prettier'
import { Definition, NodeValue, NodeDefinition, Field } from './Parser'
import { StateDefinition, Token, Rule, Builders } from './Lexer'

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

export type IndexReferencePrintPattern = {
  type: 'index'
  value: number
}

export type TokenReferencePrintPattern = {
  type: 'token'
  value: string
}

export type SelfReferencePrintPattern = {
  type: 'self'
  value: string
}

export type CommandPrintPattern = {
  type: 'command'
  value: PrintCommand
}

export type TokenPrintPattern =
  | LiteralPrintPattern
  | IndexReferencePrintPattern
  | { type: 'sequence'; value: TokenPrintPattern[] }

export type FieldPrintPattern =
  | LiteralPrintPattern
  | TokenReferencePrintPattern
  | { type: 'sequence'; value: FieldPrintPattern[] }

export type NodePrintPattern =
  | LiteralPrintPattern
  | TokenReferencePrintPattern
  | SelfReferencePrintPattern
  | { type: 'sequence'; value: NodePrintPattern[] }

export function literalPrintPattern(value: string): LiteralPrintPattern {
  return { type: 'literal', value }
}

export function indexReferencePrintPattern(
  value: number
): IndexReferencePrintPattern {
  return { type: 'index', value }
}

export function tokenReferencePrintPattern(
  value: string
): TokenReferencePrintPattern {
  return { type: 'token', value }
}

export function selfReferencePrintPattern(
  value: string
): SelfReferencePrintPattern {
  return { type: 'self', value }
}

export function sequencePrintPattern<T>(
  value: T[]
): { type: 'sequence'; value: T[] } {
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

  private findNodeDefinition(name: string): NodeDefinition {
    const node = this.parserDefinition.nodes.find(node => node.name === name)

    if (!node) {
      throw new Error(`Couldn't find node for name: ${name}`)
    }

    return node
  }

  private findFieldDefinition(nodeName: string, fieldName: string): Field {
    const field = this.findNodeDefinition(nodeName).fields.find(
      field => field.name === fieldName
    )

    if (!field) {
      throw new Error(`Couldn't find node for name: ${fieldName}`)
    }

    return field
  }

  private findRule(name: string): Rule {
    const rule = this.rules.find(rule => rule.name === name)

    if (!rule) {
      throw new Error(`Couldn't find rule for token: ${name}`)
    }

    return rule
  }

  formatToken = (token: Token): Doc => {
    const rule = this.findRule(token.type)

    return rule.print ? this.formatTokenPrintPattern(token, rule.print) : ''
  }

  formatTokens = (tokens: Token[]): Doc => {
    return concat(tokens.map(this.formatToken))
  }

  formatTokenPrintPattern = (
    token: Token,
    printPattern: TokenPrintPattern
  ): Doc => {
    switch (printPattern.type) {
      case 'literal': {
        return printPattern.value
      }
      case 'index':
        return token.groups[printPattern.value]
      case 'sequence': {
        return concat(
          printPattern.value.map(value =>
            this.formatTokenPrintPattern(token, value)
          )
        )
      }
    }
  }

  formatNodePrintPattern = (
    value: NodeValue,
    nodeName: string,
    printPattern: NodePrintPattern
  ): Doc => {
    switch (printPattern.type) {
      case 'literal': {
        return printPattern.value
      }
      case 'token': {
        const rule = this.findRule(printPattern.value)

        const token = Builders.token(printPattern.value)

        return this.formatTokenPrintPattern(token, rule.print)
      }
      case 'self':
        const field = this.findFieldDefinition(nodeName, printPattern.value)

        if (!field.print) return ''

        return this.formatField(
          value[printPattern.value],
          nodeName,
          printPattern.value,
          field.print
        )

      case 'sequence': {
        return concat(
          printPattern.value.map(pattern =>
            this.formatNodePrintPattern(value, nodeName, pattern)
          )
        )
      }
    }
  }

  formatField = (
    value: unknown,
    nodeName: string,
    fieldName: string,
    printPattern: FieldPrintPattern
  ): Doc => {
    switch (printPattern.type) {
      case 'literal': {
        return printPattern.value
      }
      case 'token': {
        const rule = this.findRule(printPattern.value)

        const token = Builders.token(printPattern.value, {
          groups: [String(value)],
        })

        return this.formatTokenPrintPattern(token, rule.print)
      }
      case 'sequence': {
        return concat(
          printPattern.value.map(pattern =>
            this.formatField(value, nodeName, fieldName, pattern)
          )
        )
      }
    }
  }

  formatNode = (value: NodeValue, nodeName: string): Doc => {
    const node = this.findNodeDefinition(nodeName)

    if (!node.print) return ''

    return this.formatNodePrintPattern(value, nodeName, node.print)
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
