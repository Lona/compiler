import * as path from 'path'
import * as fs from 'fs'
import * as serialization from '@lona/serialization'

import * as fileSearch from './fileSearch'

type LonaJSON = {
  ignore: string[]
  [key: string]: any
}

export type Config = {
  version: string
  workspacePath: string
  componentPaths: string[]
  documentPaths: string[]
  logicPaths: string[]
  componentFiles: {
    [filePath: string]: {
      children: serialization.MDXAST.Content[]
    }
  }
  logicFiles: { [filePath: string]: serialization.LogicAST.SyntaxNode }
} & LonaJSON

export function load(workspacePath: string): Promise<Config>
export function load(
  workspacePath: string,
  options: {
    forEvaluation: boolean
    fs: { readFile(filePath: string): Promise<string> }
  }
): Promise<Config>
export async function load(
  workspacePath: string,
  options?: {
    forEvaluation?: boolean
    fs?: { readFile(filePath: string): Promise<string> }
  }
): Promise<Config> {
  const lonaFile = JSON.parse(
    await fs.promises.readFile(path.join(workspacePath, 'lona.json'), 'utf-8')
  ) as LonaJSON

  if (!lonaFile.ignore) {
    lonaFile.ignore = ['**/node_modules/**', '**/.git/**']
  }

  const componentPaths = fileSearch.sync(
    workspacePath,
    '**/*.component',
    lonaFile
  )
  const documentPaths = fileSearch.sync(workspacePath, '**/*.md', lonaFile)
  const logicPaths = fileSearch.sync(workspacePath, '**/*.logic', lonaFile)

  const logicFiles: {
    [filePath: string]: serialization.LogicAST.SyntaxNode
  } = {}
  const componentFiles: {
    [filePath: string]: {
      children: serialization.MDXAST.Content[]
    }
  } = {}

  if (options && options.forEvaluation && options.fs) {
    const fs = options.fs
    await Promise.all(
      logicPaths
        .map(x =>
          fs
            .readFile(x)
            .then(data =>
              serialization.decodeLogic(data, undefined, { filePath: x })
            )
            .then(ast => {
              logicFiles[x] = ast
            })
        )
        .concat(
          documentPaths.map(x =>
            fs
              .readFile(x)
              .then(data => serialization.decodeDocument(data, undefined, x))
              .then(ast => {
                componentFiles[x] = ast
                logicFiles[x] = serialization.extractProgramFromAST(ast)
              })
          )
        )
    )
  }

  return {
    ...lonaFile,
    workspacePath,
    componentPaths,
    documentPaths,
    logicPaths,
    logicFiles,
    componentFiles,
    version: require('../../package.json').version,
  }
}
