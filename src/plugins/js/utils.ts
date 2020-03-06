import * as path from 'path'

export function resolveImportPath(from: string, to: string) {
  const relativePath = path
    .relative(path.dirname(from), to)
    .replace(path.extname(to), '')

  return relativePath.indexOf('.') === 0 ? relativePath : `./${relativePath}`
}
