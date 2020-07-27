import { LogicGenerationContext } from './LogicGenerationContext'

export const convertNativeType = (
  typeName: string,
  _context: LogicGenerationContext
): string => {
  switch (typeName) {
    case 'Boolean':
      return 'Bool'
    case 'Number':
      return 'CGFloat'
    case 'WholeNumber':
      return 'Int'
    case 'String':
      return 'String'
    case 'Optional':
      return 'Optional'
    case 'URL':
      return 'Image'
    case 'Color':
      return 'Color'
    default:
      return typeName
  }
}
