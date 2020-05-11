import { Helpers } from '../helpers'

export interface Plugin<
  ExpectedOptions extends { [argName: string]: any } = {
    [argName: string]: unknown
  },
  T = unknown
> {
  format: string
  convertWorkspace(
    workspacePath: string,
    helpers: Helpers,
    options: {
      [argName: string]: unknown
    }
  ): Promise<T>
}
