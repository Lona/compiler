import { ComponentVisitor } from './ComponentVisitor'
import { LonaView, LonaStackOrientation, LonaViewConstructor } from './LonaView'

export class LonaStack extends LonaView {
  orientation: LonaStackOrientation

  constructor(node: LonaViewConstructor, visitor: ComponentVisitor) {
    super(node, visitor)

    const { callee } = node

    this.orientation =
      callee.name === 'HorizontalStack' ? 'HorizontalStack' : 'VerticalStack'
  }
}
