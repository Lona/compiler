export class NodePath {
  components: string[] = []

  pushComponent(name: string) {
    this.components = [...this.components, name]
  }

  popComponent() {
    this.components = this.components.slice(0, -1)
  }

  pathString(finalComponent?: string): string {
    const components =
      typeof finalComponent === 'string'
        ? [...this.components, finalComponent]
        : this.components

    return components.join('.')
  }
}
