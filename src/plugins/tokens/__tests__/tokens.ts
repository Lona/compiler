import Helpers from '../../../helpers'
import { convertFile } from '../index'
import { createFs } from 'buffs'

const tokensBlock = (string: string) => '```tokens\n' + string + '\n```\n'

// TODO: Test more kinds of tokens
describe('Tokens', () => {
  it('generates tokens', async () => {
    const source = createFs({
      'lona.json': JSON.stringify({}),
      'Colors.md': tokensBlock(`let color: Color = #color(css: "pink")`),
    })

    const helpers = await Helpers(source, '/')
    const converted = await convertFile('/Colors.md', helpers)

    expect(converted).toMatchSnapshot()
  })
})
