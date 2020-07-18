import { IExpression } from '../nodes/interfaces'
import { EvaluationContext } from '../evaluation'
import { ComponentContext } from '../component'
export class ComponentVisitor {
  componentContext: ComponentContext = {
    intrinsicNameCount: {},
    viewAttributeAssignment: {},
  }
  evaluation: EvaluationContext

  constructor(evaluation: EvaluationContext) {
    this.evaluation = evaluation
  }

  private createIntrinsicNameCount(type: string): number {
    const count = this.componentContext.intrinsicNameCount[type] || 1

    this.componentContext.intrinsicNameCount[type] = count + 1

    return count
  }

  createIntrinsicName(type: string): string {
    const count = this.createIntrinsicNameCount(type)

    return count === 1 ? type.toLowerCase() : `${type.toLowerCase()}${count}`
  }

  addViewAttributeAssignment(viewId: string, key: string, value: IExpression) {
    const assignments =
      this.componentContext.viewAttributeAssignment[viewId] || {}

    assignments[key] = value

    this.componentContext.viewAttributeAssignment[viewId] = assignments
  }
}
