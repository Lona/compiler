import fs from 'fs'
import path from 'path'
import { createFs, copy } from 'buffs'
import Helpers from '../../../helpers'
import plugin from '../index'

const workspacePath = path.join(__dirname, '../../../../examples/workspace')

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

  it('converts workspace', async () => {
    const source = createFs()

    copy(fs, source, workspacePath, '/')

    const helpers = Helpers(source, '/')

    await plugin.convertWorkspace('/', helpers, { output: '/tokens.json' })

    const tokens = JSON.parse(source.readFileSync('/tokens.json', 'utf8'))

    expect(tokens).toMatchSnapshot()
  })
})
