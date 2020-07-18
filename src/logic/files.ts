import fs from 'fs'
import { IFS, match } from 'buffs'
import path from 'path'

export function componentFilePaths(fs: IFS, workspacePath: string): string[] {
  return match(fs, workspacePath, { includePatterns: ['**/*.cmp'] }).map(file =>
    path.join(workspacePath, file)
  )
}

export function logicFilePaths(fs: IFS, workspacePath: string): string[] {
  return match(fs, workspacePath, {
    includePatterns: ['**/*.logic'],
  }).map(file => path.join(workspacePath, file))
}

export function documentFilePaths(fs: IFS, workspacePath: string): string[] {
  return match(fs, workspacePath, { includePatterns: ['**/*.md'] }).map(file =>
    path.join(workspacePath, file)
  )
}

export function libraryFilePaths(): string[] {
  const libraryPath = path.join(__dirname, 'library')

  return match(fs, libraryPath, { includePatterns: ['**/*.logic'] }).map(file =>
    path.join(libraryPath, file)
  )
}

export function decode<T>(
  fs: IFS,
  filePath: string,
  decoder: (data: string) => T
): T {
  const data = fs.readFileSync(filePath, 'utf8')
  const ast = decoder(data)
  return ast
}
