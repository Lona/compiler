import { doc, Doc } from 'prettier'
import { Definition, Value } from './Parser'
import { StateDefinition, Token, PrintPattern } from './Lexer'

const {
  builders: { concat },
} = doc

export function formatToken(
  lexerDefinition: StateDefinition[],
  token: Token
): Doc {
  const rules = lexerDefinition.flatMap(state => state.rules)

  const rule = rules.find(rule => rule.name === token.type)

  if (!rule) {
    throw new Error(`Couldn't find rule for token: ${token.type}`)
  }

  function formatPrintPattern(printPattern: PrintPattern): Doc {
    switch (printPattern.type) {
      case 'literal': {
        return printPattern.value
      }
      case 'indexReference': {
        return token.groups[printPattern.value]
      }
      case 'sequence': {
        return concat(printPattern.value.map(formatPrintPattern))
      }
    }
  }

  return rule.print ? formatPrintPattern(rule.print) : ''
}

export function formatTokens(
  lexerDefinition: StateDefinition[],
  tokens: Token[]
): Doc {
  return concat(tokens.map(formatToken.bind(null, lexerDefinition)))
}

export function print(
  document: Doc,
  options: doc.printer.Options = {
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
  }
) {
  return doc.printer.printDocToString(document, options).formatted
}
