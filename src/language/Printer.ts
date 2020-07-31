import { doc, Doc } from 'prettier'
import {
  Definition,
  RootNodeValue,
  NodeDefinition,
  Field,
  FieldValue,
} from './Parser'
import { StateDefinition, Token, Rule, Builders } from './Lexer'
import { type } from 'os'

const {
  builders: { concat, line, indent, join },
} = doc

export interface LinePrintCommand {
  type: 'line'
}

export interface IndentPrintCommand<T> {
  type: 'indent'
  value: T
}

export interface JoinPrintCommand<T> {
  type: 'join'
  value: T
  separator?: T
  leading?: T
  tailing?: T
}

export type PrintCommand<T> =
  | LinePrintCommand
  | IndentPrintCommand<T>
  | JoinPrintCommand<T>

export interface CommandPrintPattern<T> {
  type: 'command'
  value: PrintCommand<T>
}

export interface LiteralPrintPattern {
  type: 'literal'
  value: string
}

export interface IndexReferencePrintPattern {
  type: 'index'
  value: number
}

export interface TokenReferencePrintPattern {
  type: 'token'
  value: string
}

export interface SelfReferencePrintPattern {
  type: 'self'
  value: string
}

export interface NodeReferencePrintPattern {
  type: 'node'
  value: string
}

export interface SequencePrintPattern<T> {
  type: 'sequence'
  value: T[]
}

export type TokenPrintPattern =
  | LiteralPrintPattern
  | IndexReferencePrintPattern
  | CommandPrintPattern<TokenPrintPattern>
  | SequencePrintPattern<TokenPrintPattern>

export type FieldPrintPattern =
  | LiteralPrintPattern
  | TokenReferencePrintPattern
  | NodeReferencePrintPattern
  | CommandPrintPattern<FieldPrintPattern>
  | SequencePrintPattern<FieldPrintPattern>

export type NodePrintPattern =
  | LiteralPrintPattern
  | TokenReferencePrintPattern
  | SelfReferencePrintPattern
  | CommandPrintPattern<NodePrintPattern>
  | SequencePrintPattern<NodePrintPattern>

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
      case 'command':
        throw new Error('cmd not handed')
        return ''
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

  formatCommand = <V, P>(
    command: PrintCommand<P>,
    value: V,
    f: (pattern: P, value: V) => Doc
  ): Doc => {
    switch (command.type) {
      case 'line': {
        return line
      }
      case 'indent': {
        return indent(f(command.value, value))
      }
      case 'join': {
        const normalize = <T>(value: T | T[]): T[] =>
          value instanceof Array ? value : [value]

        const separator = command.separator
          ? f(command.separator, value)
          : undefined

        const elements = normalize(f(command.value, value))

        return separator ? join(separator, elements) : concat(elements)
      }
    }
  }

  formatNodePrintPattern = (
    value: RootNodeValue,
    nodeName: string,
    printPattern: NodePrintPattern
  ): Doc => {
    // console.log('print node', value)

    switch (printPattern.type) {
      case 'command': {
        const command = printPattern.value

        return this.formatCommand(
          command,
          { value, nodeName },
          (pattern, { value, nodeName }) =>
            this.formatNodePrintPattern(value, nodeName, pattern)
        )
      }
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
    value: FieldValue,
    nodeName: string,
    fieldName: string,
    printPattern: FieldPrintPattern
  ): Doc => {
    // console.log(`print field ${nodeName}.${fieldName}`, value)

    switch (printPattern.type) {
      case 'command': {
        const command = printPattern.value

        return this.formatCommand(
          command,
          { value, nodeName, fieldName },
          (pattern, { value, nodeName, fieldName }) =>
            this.formatField(value, nodeName, fieldName, pattern)
        )
      }
      case 'literal': {
        return printPattern.value
      }
      case 'token': {
        const rule = this.findRule(printPattern.value)

        const token = Builders.token(printPattern.value, {
          groups: [String(value)],
        })

        // console.log(
        //   'format token',
        //   this.formatTokenPrintPattern(token, rule.print),
        //   `${nodeName}.${fieldName} = ${value}`
        // )

        return this.formatTokenPrintPattern(token, rule.print)
      }
      case 'node': {
        const node = this.findNodeDefinition(printPattern.value)

        if (!node.print) return ''

        return this.formatNodePrintPattern(
          value as RootNodeValue,
          node.name,
          node.print
        )
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

  formatNode = (value: RootNodeValue, nodeName: string): Doc => {
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

export function nodeReferencePrintPattern(
  value: string
): NodeReferencePrintPattern {
  return { type: 'node', value }
}

export function selfReferencePrintPattern(
  value: string
): SelfReferencePrintPattern {
  return { type: 'self', value }
}

export function sequencePrintPattern<T>(value: T[]): SequencePrintPattern<T> {
  return { type: 'sequence', value }
}

export function commandPrintPattern<T>(
  value: PrintCommand<T>
): CommandPrintPattern<T> {
  return { type: 'command', value }
}

export function joinCommandPrintPattern<T>(value: T): CommandPrintPattern<T> {
  return { type: 'command', value: { type: 'join', value } }
}
