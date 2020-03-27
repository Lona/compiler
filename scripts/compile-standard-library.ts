/**
 * Pre-compile the standard library.
 * The generated files are in /static/logic
 */
import * as fs from 'fs'
import * as path from 'path'
import * as serialization from '@lona/serialization'
import * as LogicAST from '../src/helpers/logic-ast'

const preludePath = path.join(__dirname, '../standard-library')
const preludeLibs = fs.readdirSync(preludePath)

const outputPath = path.join(__dirname, '../static/logic')

fs.mkdirSync(outputPath, { recursive: true })

preludeLibs.forEach(x => {
  fs.writeFileSync(
    path.join(outputPath, x),
    JSON.stringify(
      LogicAST.makeProgram(
        JSON.parse(
          serialization.convertLogic(
            fs.readFileSync(path.join(preludePath, x), 'utf8'),
            serialization.SERIALIZATION_FORMAT.JSON,
            {
              filePath: x,
            }
          )
        )
      ),
      null,
      '  '
    )
  )
})
