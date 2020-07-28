export type NextAction = { type: 'next'; value: string }

export type PushAction = { type: 'push'; value: string }

export type PopAction = { type: 'pop' }

export type Action = NextAction | PushAction | PopAction

export type Rule = {
  name: string
  pattern: string | RegExp
  action?: Action
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

  private regExpCache: { [key: string]: RegExp } = {}

  getRegExp(pattern: string | RegExp) {
    const key = typeof pattern === 'string' ? pattern : pattern.source

    if (key in this.regExpCache) {
      return this.regExpCache[key]
    }

    const regExp = getRegExp(pattern)

    this.regExpCache[key] = regExp

    return regExp
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
        let regExp = this.getRegExp(rule.pattern)

        const match = slice.match(regExp)

        if (match) {
          const [value, ...groups] = match

          if (value.length === 0 && !rule.action) {
            throw new Error(
              'Lexer stalled: no input consumed and no action taken.'
            )
          }

          tokens.push({
            type: rule.name,
            value,
            groups,
            position: {
              start: pos,
              end: pos + value.length,
            },
          })

          if (rule.action) {
            switch (rule.action.type) {
              case 'next':
                this.state[this.state.length - 1] = rule.action.value
                break
              case 'push':
                this.state.push(rule.action.value)
                break
              case 'pop':
                this.state.pop
                break
            }
          }

          pos += value.length

          continue main
        }
      }

      console.error(
        `Failed to parse: ${slice.slice}\n`,
        currentState,
        rules.map(rule => rule.pattern)
      )

      break
    }

    return tokens
  }
}

function getRegExp(re: string | RegExp): RegExp {
  let source
  if (typeof re === 'string') {
    source = re
  } else if (re instanceof RegExp) {
    source = re.source
  } else {
    throw new Error(
      'rules must start with a match string or regular expression'
    )
  }

  const matchOnlyAtLineStart = source.length > 0 && source[0] === '^'

  return new RegExp(
    '^(?:' + (matchOnlyAtLineStart ? source.substr(1) : source) + ')'
  )
}
