import Foundation

#if canImport(UIKit)
  import UIKit
  public typealias Font = UIFont
  public typealias FontDescriptor = UIFontDescriptor
#elseif canImport(AppKit)
  import AppKit
  public typealias Font = NSFont
  public typealias FontDescriptor = NSFontDescriptor
#endif
