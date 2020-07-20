import { createFs, toJSON } from 'buffs'
import plugin from '../index'
import Helpers from '../../../helpers'

const tokensBlock = (string: string) => '```tokens\n' + string + '\n```\n'

// TODO: Test more kinds of JS
describe('JS', () => {
  it('generates js', async () => {
    const source = createFs({
      'lona.json': JSON.stringify({}),
      'Colors.md': tokensBlock(`let color: Color = #color(css: "pink")`),
    })

    const helpers = Helpers(source, '/')

    await plugin.convertWorkspace('/', helpers, { output: '/output' })

    const index = source.readFileSync('/output/index.js', 'utf8')
    const colors = source.readFileSync('/output/Colors.js', 'utf8')

    expect(index).toMatchSnapshot()
    expect(colors).toMatchSnapshot()
  })
})
