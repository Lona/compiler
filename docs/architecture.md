# Compiler architecture

The compiler is built around a plugin architecture. Each format (or target) is defined by a plugin. Some plugins are shipped with the compiler (`js` or `swift`) while other can be installed with npm (`android`).

When calling `lona convert ./workspace --format=swift`, the compiler [will dynamically look for](../src/utils/find-plugin.ts) a `swift` plugin (in this order):

- a `@lona/compiler-swift` package
- a `lona-compiler-swift` package
- a folder `swift` in the compiler (in `src/plugins/swift`)

## Plugin API

A plugin is an object with a given [interface](../src/plugins/index.ts):

```ts
type Plugin = {
  format: string
  parseFile(
    filePath: string,
    helpers: Helpers,
    options: {
      [argName: string]: unknown
    }
  ): Promise<any>
  parseWorkspace(
    workspacePath: string,
    helpers: Helpers,
    options: {
      [argName: string]: unknown
    }
  ): Promise<any>
}
```

## Plugin's Helpers

A plugin is passed some helpers from the compiler. They contains some methods abstracting the file system, the evaluation context of the workspace, a reporter (to centralize the logs), the workspace's configuration, etc.

More information [here](../src/helpers/index.ts).

## Plugin's Options

Any option passed to the compiler will be passed to the plugin (so when calling `lona convert ./workspace --format=swift --foo=bar`, the swift plugin will receive `{ format: 'swift', foo: 'bar' }` as the `options` parameter).

Alternatively, options can be defined in the `lona.json` file of a workspace:

```json
{
  "format": {
    "swift": {
      "foo": "bar"
    }
  }
}
```

## Usual Plugin Anatomy

It's up to you to structure your plugin as you want - but for the core plugins, we use a structure that seems to work well.

A plugin consists of 4 different parts:

- the external API. `parseWorkspace` is very similar every time: loop through all the tokens and components files, call `parseFile` for each of them, and copy some static files to polyfill the standard library if any.
- the format AST. It is very likely that the AST of the target format will have some difference with the Logic AST.
- A conversion between the Logic AST and the format AST. This includes a map between the logic standard library and the format AST.
- A printer of the format AST. We use [prettier](https://prettier.io) to pretty print so the printer is really just a format AST to prettier AST conversion.

Decoupling the Logic <-> Format <-> Printer means that updating a plugin when the logic AST or standard library is updated is easier.
