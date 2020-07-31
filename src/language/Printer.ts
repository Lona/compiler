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

  formatTokenReference = (token: Token, reference: Reference): Doc => {
    switch (reference.type) {
      case 'index':
        return token.groups[reference.value]
      case 'token':
      case 'self':
        throw new Error(
          `${reference.type} can only be used in parser node pattern, not token pattern.`
        )
    }
  }

  formatTokenPrintPattern = (token: Token, printPattern: PrintPattern): Doc => {
    switch (printPattern.type) {
      case 'literal': {
        return printPattern.value
      }
      case 'reference': {
        return this.formatTokenReference(token, printPattern.value)
      }
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
    printPattern: PrintPattern
  ): Doc => {
    switch (printPattern.type) {
      case 'literal': {
        return printPattern.value
      }
      case 'reference': {
        const reference = printPattern.value

        switch (reference.type) {
          case 'index':
            throw new Error('Index reference not supported on nodes')
          case 'token': {
            const rule = this.findRule(reference.value)

            const token = Builders.token(reference.value)

            return this.formatTokenPrintPattern(token, rule.print)
          }
          case 'self':
            const field = this.findFieldDefinition(nodeName, reference.value)

            if (!field.print) return ''

            return this.formatField(
              value[reference.value],
              nodeName,
              reference.value,
              field.print
            )
        }
      }
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
    printPattern: PrintPattern
  ): Doc => {
    switch (printPattern.type) {
      case 'literal': {
        return printPattern.value
      }
      case 'reference': {
        const reference = printPattern.value

        switch (reference.type) {
          case 'index':
            throw new Error('Index not handled yet')
          case 'token': {
            const rule = this.findRule(reference.value)

            const token = Builders.token(reference.value, {
              groups: [String(value)],
            })

            return this.formatTokenPrintPattern(token, rule.print)
          }
          case 'self':
            throw new Error('self reference not supported on fields')
        }
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
