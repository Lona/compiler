export function assertNever(x: never): never {
  throw new Error('Unknown type: ' + x['type'])
}

export function typeNever(x: never, reporter: (s: string) => void) {
  reporter('Unknown type: ' + x['type'])
}
