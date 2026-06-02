import SwiftUI
import WidgetKit

extension Color {
  /// Parse a "#RRGGBB" or "#RRGGBBAA" hex string. Falls back to the mint accent.
  init(hex: String) {
    let s = hex.trimmingCharacters(in: CharacterSet(charactersIn: "# "))
    var value: UInt64 = 0
    guard Scanner(string: s).scanHexInt64(&value) else {
      self = Color(red: 0.13, green: 0.83, blue: 0.65)
      return
    }
    let r, g, b, a: Double
    switch s.count {
    case 8:
      r = Double((value & 0xFF00_0000) >> 24) / 255
      g = Double((value & 0x00FF_0000) >> 16) / 255
      b = Double((value & 0x0000_FF00) >> 8) / 255
      a = Double(value & 0x0000_00FF) / 255
    default:
      r = Double((value & 0xFF0000) >> 16) / 255
      g = Double((value & 0x00FF00) >> 8) / 255
      b = Double(value & 0x0000FF) / 255
      a = 1
    }
    self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
  }
}

/// Colors derived from the snapshot's theme + accent. Mirrors src/theme.ts so
/// the widgets read as an extension of the app's "indigo glass" look.
struct Palette {
  let isDark: Bool
  let accent: Color

  let protein = Color(hex: "#A78BFA")
  let water = Color(hex: "#60A5FA")
  let over = Color(hex: "#F87171")

  var textPrimary: Color { isDark ? Color(hex: "#EDEBFF") : Color(hex: "#11161F") }
  var textSecondary: Color { isDark ? Color(hex: "#A6A2C9") : Color(hex: "#667085") }
  var track: Color {
    (isDark ? Color(hex: "#EDEBFF") : Color(hex: "#11161F")).opacity(isDark ? 0.16 : 0.12)
  }
  var gradient: LinearGradient {
    let stops = isDark
      ? [Color(hex: "#1E1B4B"), Color(hex: "#0B0A1F")]
      : [Color(hex: "#F4F2FF"), Color(hex: "#E8E9FB")]
    return LinearGradient(colors: stops, startPoint: .topLeading, endPoint: .bottomTrailing)
  }
}

extension WidgetData {
  var palette: Palette { Palette(isDark: theme != "light", accent: Color(hex: accent)) }
}

extension View {
  /// WidgetKit requires a declared container background when built with the
  /// iOS 17 SDK; on iOS 16 we fall back to a plain background.
  @ViewBuilder
  func widgetBackground<Background: View>(_ background: Background) -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(for: .widget) { background }
    } else {
      self.background(background)
    }
  }
}
