import * as fs from 'fs'
import * as path from 'path'

export type FSWrapper = {
  readFile(filePath: string): Promise<string>
  writeFile(filePath: string, data: string): Promise<void>
  copyDir(dirPath: string, output?: string): Promise<void>
}

export const createFSWrapper = (
  workspacePath: string,
  _outputPath?: unknown
): FSWrapper => {
  const outputPath =
    typeof _outputPath === 'string'
      ? _outputPath
      : path.join(process.cwd(), 'lona-generated')
  const fsWrapper = {
    readFile(filePath: string) {
      return fs.promises.readFile(
        path.resolve(workspacePath, filePath),
        'utf-8'
      )
    },
    writeFile(filePath: string, data: string) {
      const resolvedPath = path.resolve(outputPath, filePath)
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })
      return fs.promises.writeFile(resolvedPath, data, 'utf-8')
    },
    async copyDir(dirPath: string, output: string = '.') {
      const resolvedPath = path.resolve(workspacePath, dirPath)
      const files = await fs.promises.readdir(resolvedPath)

      await Promise.all(
        files.map(async x => {
          if (
            (await fs.promises.stat(path.join(resolvedPath, x))).isDirectory()
          ) {
            return
          }

          return fsWrapper.writeFile(
            path.join(output, x),
            await fsWrapper.readFile(path.join(dirPath, x))
          )
        })
      )
    },
  }

  return fsWrapper
}
