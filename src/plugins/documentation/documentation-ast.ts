export type ConvertedFileContents = {
  type: 'documentationPage'
  value: {
    mdxString: string
    children: Array<string>
  }
}

export interface ConvertedFile {
  inputPath: string
  outputPath: string
  name: string
  contents: ConvertedFileContents
}

export interface ConvertedWorkspace {
  files: Array<ConvertedFile>
  flatTokensSchemaVersion: string
}
