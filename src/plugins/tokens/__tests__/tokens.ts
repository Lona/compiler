import Helpers from '../../../helpers'
import plugin from '../index'
import { createFs } from 'buffs'

const tokensBlock = (string: string) => '```tokens\n' + string + '\n```\n'

// TODO: Test more kinds of tokens
describe('Tokens', () => {
  it('generates tokens', async () => {
    const source = createFs({
      'lona.json': JSON.stringify({}),
      'Colors.md': tokensBlock(`let color: Color = #color(css: "pink")`),
    })

    const helpers = Helpers(source, '/')
    const converted = await plugin.convertWorkspace('/', helpers, {})

    expect(converted).toMatchSnapshot()
  })

  it('generates tokens with function call', async () => {
    const source = createFs({
      'lona.json': JSON.stringify({}),
      'Colors.md': tokensBlock(
        `let testSaturate: Color = Color.saturate(color: #color(css: "pink"), factor: 0.3)`
      ),
    })

    const helpers = Helpers(source, '/')
    const converted = await plugin.convertWorkspace('/', helpers, {})

    expect(converted).toMatchSnapshot()
  })
})
