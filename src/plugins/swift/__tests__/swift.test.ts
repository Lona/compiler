import { createFs } from 'buffs'
import { convertFile } from '../index'
import Helpers from '../../../helpers'

const tokensBlock = (string: string) => '```tokens\n' + string + '\n```\n'

// TODO: Test more kinds of Swift
describe('Swift', () => {
  it('generates swift', async () => {
    const source = createFs({
      'lona.json': JSON.stringify({}),
      'Colors.md': tokensBlock(`let color: Color = #color(css: "pink")`),
    })

    const helpers = await Helpers(source, '/')
    const converted = await convertFile('/Colors.md', helpers, {})

    expect(converted).toMatchSnapshot()
  })
})
