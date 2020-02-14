# Lona Compiler

![Build and Test](https://github.com/Lona/compiler/workflows/Build%20and%20Test/badge.svg)

The Lona Compiler is a CLI tool for generating cross-platform UI code from JSON definitions.

The Lona Compiler is published on `npm` as `@lona/compiler`.

## Usage

### Installation

First, install the compiler with:

```bash
npm install --global @lona/compiler
```

You may also install locally to your current project if you prefer, by removing the `--global`.

### Commands

For each command, you'll choose a code generation `target`: `swift`, `js`, or `xml`.

Each target as a specific set of options.

In the case of `js`, the `--framework` option can have a few values:

- `reactnative`: [React Native](https://facebook.github.io/react-native/) (default)
- `reactdom`: [React DOM](https://reactjs.org)
- `reactsketchapp`: [React SketchApp](http://airbnb.io/react-sketchapp/)

### Examples

Here are a handful of examples. You can check out the scripts section of the `package.json` to see more targets/frameworks -- there is a `snapshot` command for each compiler target.

#### Generate workspace

This will generate the colors, text styles, shadows, custom types, and all components, writing them to `output-directory` in the same structure as the input workspace directory.

```bash
lona convert [path-to-workspace-directory] --target=js --output=[output-directory]
```

#### Generate single file

This will output the generated file code to `stdout`.

```bash
lona convert [path-to-file] --target=js
```

## Contributing

To build the compiler from source, follow these steps.

This project is written in TypeScript.

### Setup: Install dependencies with yarn

From this directory, run:

```bash
yarn
```

> Note: If you don't have yarn installed already, you can download it with npm: `npm install --global yarn`

### Running commands

The above examples can now be run by replacing `lona` with `ts-node src/bin.ts`.
