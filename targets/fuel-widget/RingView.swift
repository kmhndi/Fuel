import SwiftUI

/// A circular progress ring with content centered inside it. Starts at 12
/// o'clock and fills clockwise — matches the Android SVG rings.
struct RingView<Content: View>: View {
  let pct: Double
  let color: Color
  let track: Color
  var lineWidth: CGFloat = 10
  @ViewBuilder var label: () -> Content

  var body: some View {
    ZStack {
      Circle()
        .stroke(track, lineWidth: lineWidth)
      Circle()
        .trim(from: 0, to: max(0, min(1, pct)))
        .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        .rotationEffect(.degrees(-90))
      label()
        .padding(lineWidth + 2)
    }
  }
}
