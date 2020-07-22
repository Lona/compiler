import path from 'path'
import fs from 'fs'
import { createFs, toJSON, copy, match } from 'buffs'
import plugin from '../index'
import Helpers from '../../../helpers'

const workspacePath = path.join(__dirname, '../../../../examples/workspace')
const fixturesPath = path.join(__dirname, '../../../../fixtures')

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

  it('converts workspace', async () => {
    const source = createFs()

    copy(fs, source, workspacePath, '/')

    const helpers = Helpers(source, '/')

    await plugin.convertWorkspace('/', helpers, { output: '/output' })

    expect(toJSON(source, '/output')).toMatchSnapshot()
  })

  describe('Fixtures', () => {
    it('converts', async () => {
      const fixtures = match(fs, fixturesPath, { includePatterns: ['**/*.md'] })

      for (let fixture of fixtures) {
        const source = createFs({
          'lona.json': JSON.stringify({}),
          'Fixture.md': fs.readFileSync(
            path.join(fixturesPath, fixture),
            'utf8'
          ),
        })

        const helpers = Helpers(source, '/')

        await plugin.convertWorkspace('/', helpers, { output: '/output' })

        expect(
          source.readFileSync('/output/Fixture.js', 'utf8')
        ).toMatchSnapshot(fixture)
      }
    })
  })
})
