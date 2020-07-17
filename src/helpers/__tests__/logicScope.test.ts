import * as fs from 'fs'
import * as path from 'path'
import * as serialization from '@lona/serialization'
import * as LogicAST from '../logicAst'
import { build } from '../logicScope'
import { defaultReporter } from '../reporter'

let id = 0
jest.mock('uuid', () => ({ v4: () => '' + id++ }))

function buildScope(filePaths: string[]) {
  const programs = filePaths.map(
    x =>
      LogicAST.makeProgram(
        JSON.parse(
          serialization.convertLogic(
            fs.readFileSync(path.join(__dirname, x), 'utf8'),
            serialization.SERIALIZATION_FORMAT.JSON
          )
        )
      ) as LogicAST.AST.Program
  )

  return {
    programs,
    scope: build(
      filePaths.map((x, i) => ({ node: programs[i], in: x })),
      defaultReporter
    ),
  }
}

describe('Scope', () => {
  beforeEach(() => {
    id = 0
  })

  test('simple reference', () => {
    const { scope, programs } = buildScope([
      './fixtures/simple-reference.logic',
    ])

    expect(Object.keys(scope.identifierToPattern).length).toBe(1)

    const aIdentifier = Object.keys(scope.identifierToPattern)[0]

    expect(
      (LogicAST.findNode(programs[0], aIdentifier) as LogicAST.AST.Identifier)
        .string
    ).toBe('a')
    expect(
      (LogicAST.findNode(
        programs[0],
        scope.identifierToPattern[aIdentifier].pattern
      ) as LogicAST.AST.Pattern).name
    ).toBe('a')

    expect(
      scope.patternToIdentifier[scope.identifierToPattern[aIdentifier].pattern]
        .identifier
    ).toBe(aIdentifier)

    expect(scope.identifierToPattern).toMatchSnapshot()
  })
})
