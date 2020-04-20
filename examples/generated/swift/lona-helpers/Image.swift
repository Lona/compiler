import Foundation

#if canImport(UIKit)
  import UIKit
  public typealias Image = UIImage
#elseif canImport(AppKit)
  import Cocoa
  public typealias Image = NSImage
#endif
