export type NextAction = { type: 'next'; value: string }

export type PushAction = { type: 'push'; value: string }

export type PopAction = { type: 'pop' }

export type Action = NextAction | PushAction | PopAction

export type LiteralPrintPattern = {
  type: 'literal'
  value: string
}

export type SequencePrintPattern = {
  type: 'sequence'
  value: PrintPattern[]
}

export type IndexReferencePrintPattern = {
  type: 'indexReference'
  value: number
}

export type PrintPattern =
  | LiteralPrintPattern
  | SequencePrintPattern
  | IndexReferencePrintPattern

export type Rule = {
  name: string
  pattern: string
  action?: Action
  discard: boolean
  print: PrintPattern
}

export type StateDefinition = {
  name: string
  rules: Rule[]
}

export type SimpleStateDefinition = {
  name?: string
  rules: Omit<Rule, 'action'>[]
}

export type Token = {
  type: string
  value: string
  groups: string[]
  position: {
    start: number
    end: number
  }
}

function memoize<I, O>(f: (value: I) => O): (value: I) => O {
  const cache: Map<I, O> = new Map()

  return (value: I): O => {
    if (!cache.has(value)) {
      cache.set(value, f(value))
    }

    return cache.get(value)!
  }
}

const getRegExp = memoize(
  (pattern: string): RegExp => new RegExp('^(?:' + pattern + ')')
)

export class Lexer {
  state: string[]
  stateDefinitions: StateDefinition[]

  constructor(
    states: SimpleStateDefinition | StateDefinition[],
    initialState?: string
  ) {
    const normalized: StateDefinition[] =
      states instanceof Array
        ? states
        : [{ ...states, name: states.name ?? 'main' }]
    this.state = [initialState ?? normalized[0].name]
    this.stateDefinitions = normalized
  }

  get currentState() {
    return this.state[this.state.length - 1]
  }

  tokenize(source: string) {
    let length = source.length
    let pos = 0
    let tokens: Token[] = []

    main: while (pos < length) {
      const currentState = this.currentState

      const stateDefinition = this.stateDefinitions.find(
        definition => definition.name === currentState
      )

      if (!stateDefinition) {
        throw new Error(`Invalid lexer state: ${currentState}`)
      }

      const { rules } = stateDefinition

      const slice = source.slice(pos)

      for (let rule of rules) {
        let regExp = getRegExp(rule.pattern)

        const match = slice.match(regExp)

        if (match) {
          const [value, ...groups] = match

          if (value.length === 0 && !rule.action) {
            throw new Error(
              'Lexer stalled: no input consumed and no action taken.'
            )
          }

          if (rule.discard !== true) {
            tokens.push({
              type: rule.name,
              value,
              groups,
              position: {
                start: pos,
                end: pos + value.length,
              },
            })
          }

          if (rule.action) {
            switch (rule.action.type) {
              case 'next':
                this.state[this.state.length - 1] = rule.action.value
                break
              case 'push':
                this.state.push(rule.action.value)
                break
              case 'pop':
                this.state.pop()
                break
            }
          }

          pos += value.length

          continue main
        }
      }

      console.error(
        `Failed to parse: ${slice}\n`,
        currentState,
        rules.map(rule => rule.pattern)
      )

      break
    }

    return tokens
  }
}

export namespace Builders {
  export function rule(
    name: string,
    options: {
      pattern?: string
      discard?: boolean
      action?: Action
      print?: PrintPattern
    } = {}
  ): Rule {
    const pattern = options.pattern ?? name

    return {
      name,
      pattern,
      discard: options.discard ?? false,
      print: options.print ?? { type: 'literal', value: pattern },
      action: options.action,
    }
  }

  export function literalPrintPattern(value: string): LiteralPrintPattern {
    return { type: 'literal', value }
  }

  export function referencePrintPattern(
    value: number
  ): IndexReferencePrintPattern {
    return { type: 'indexReference', value }
  }

  export function sequencePrintPattern(
    value: PrintPattern[]
  ): SequencePrintPattern {
    return { type: 'sequence', value }
  }
}
