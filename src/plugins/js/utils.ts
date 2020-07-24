import * as path from 'path'

export function resolveImportPath(
  outputPath: string,
  from: string,
  to: string
) {
  const relativePath = path
    .relative(path.dirname(path.join(outputPath, from)), to)
    .replace(path.extname(to), '')

  return relativePath.indexOf('.') === 0 ? relativePath : `./${relativePath}`
}

export function generateTranspiledImport(
  outputPath: string,
  importPath: string,
  index: number
) {
  return `var __lona_import_${index} = require("${resolveImportPath(
    outputPath,
    'index.js',
    importPath
  )}");
Object.keys(__lona_import_${index}).forEach(function (key) {
  Object.defineProperty(module.exports, key, {
    enumerable: true,
    get: function get() {
      return __lona_import_${index}[key];
    }
  });
})`
}
