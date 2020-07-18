export default class ScopeStack<K extends string, V> {
  public scopes: { [key: string]: V }[] = [{}]

  public get(key: K): V | void {
    let scope = [...this.scopes].reverse().find(scope => key in scope)
    return scope ? scope[key] : undefined
  }

  public set(key: K, value: V) {
    this.scopes[this.scopes.length - 1][key] = value
  }

  public push() {
    this.scopes.push({})
  }

  public pop(): { [key: string]: V } | undefined {
    return this.scopes.pop()
  }

  public flattened(): { [key: string]: V } {
    return Object.assign({}, ...this.scopes)
  }

  public copy() {
    const stack = new ScopeStack<K, V>()
    stack.scopes = this.scopes.map(scope => ({ ...scope }))
    return stack
  }
}
