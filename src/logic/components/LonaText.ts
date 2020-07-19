import { ComponentVisitor } from './ComponentVisitor'
import { Decode } from '../runtime/value'
import { LonaView, LonaViewConstructor } from './LonaView'
import { silentReporter } from '../../utils/reporter'

export class LonaText extends LonaView {
  value?: string

  constructor(node: LonaViewConstructor, visitor: ComponentVisitor) {
    super(node, visitor)

    const { argumentExpressionNodes } = node

    if ('value' in argumentExpressionNodes) {
      const expression = argumentExpressionNodes['value']
      const value = visitor.evaluation.evaluate(expression.id, silentReporter)
      if (value) {
        const text = Decode.string(value)
        if (text) {
          this.value = text
        } else {
          throw new Error('Failed to decode logic string value')
        }
      } else {
        visitor.addViewAttributeAssignment(this.name, 'text', expression)
      }
    }
  }
}
