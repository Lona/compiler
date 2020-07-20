import path from 'path'
import fs from 'fs'
import { createFs, copy, toJSON } from 'buffs'
import plugin from '../index'
import Helpers from '../../../helpers'

const workspacePath = path.join(__dirname, '../../../../examples/workspace')

const tokensBlock = (string: string) => '```tokens\n' + string + '\n```\n'

// TODO: Test more kinds of Swift
describe('Swift', () => {
  it('generates swift', async () => {
    const source = createFs({
      'lona.json': JSON.stringify({}),
      'Colors.md': tokensBlock(`let color: Color = #color(css: "pink")`),
    })

    const helpers = Helpers(source, '/')

    await plugin.convertWorkspace('/', helpers, { output: '/output' })

    const colors = source.readFileSync('/output/Colors.swift', 'utf8')

    expect(colors).toMatchSnapshot()
  })

  it('converts workspace', async () => {
    const source = createFs()

    copy(fs, source, workspacePath, '/')

    const helpers = Helpers(source, '/')

    await plugin.convertWorkspace('/', helpers, { output: '/output' })

    expect(toJSON(source, '/output')).toMatchSnapshot()
  })
})
