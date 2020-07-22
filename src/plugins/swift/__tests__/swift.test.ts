import path from 'path'
import fs from 'fs'
import { createFs, copy, toJSON, match } from 'buffs'
import plugin from '../index'
import { createHelpers } from '../../../helpers'

const workspacePath = path.join(__dirname, '../../../../examples/workspace')
const fixturesPath = path.join(__dirname, '../../__tests__/fixtures')

const tokensBlock = (string: string) => '```tokens\n' + string + '\n```\n'

// TODO: Test more kinds of Swift
describe('Swift', () => {
  it('generates swift', async () => {
    const source = createFs({
      'lona.json': JSON.stringify({}),
      'Colors.md': tokensBlock(`let color: Color = #color(css: "pink")`),
    })

    const helpers = createHelpers(source, '/')

    await plugin.convertWorkspace('/', helpers, { output: '/output' })

    const colors = source.readFileSync('/output/Colors.swift', 'utf8')

    expect(colors).toMatchSnapshot()
  })

  it('converts workspace', async () => {
    const source = createFs()

    copy(fs, source, workspacePath, '/')

    const helpers = createHelpers(source, '/')

    await plugin.convertWorkspace('/', helpers, { output: '/output' })

    const files = toJSON(source, '/output')

    // No need to test helper files
    Object.keys(files).forEach(file => {
      if (file.startsWith('/output/lona-helpers/')) {
        delete files[file]
      }
    })

    expect(files).toMatchSnapshot()
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

        const helpers = createHelpers(source, '/')

        await plugin.convertWorkspace('/', helpers, { output: '/output' })

        expect(
          source.readFileSync('/output/Fixture.swift', 'utf8')
        ).toMatchSnapshot(fixture)
      }
    })
  })
})
