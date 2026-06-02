import SwiftUI
import WidgetKit

/// Lock-screen / StandBy accessory widget. One widget serves all three accessory
/// families; the system renders these in a desaturated/tinted mode, so we lean
/// on gauges + plain text rather than the app's colors.
struct LockWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let data: WidgetData

  private var caloriesLeft: Int { Int(data.calories.left) }
  private var proteinLeft: Int { Int(max(0, data.protein.left)) }
  private var glasses: Int { Int(data.water.glasses) }
  private var waterGoal: Int { Int(data.water.goal) }

  var body: some View {
    switch family {
    case .accessoryCircular:
      Gauge(value: min(1, max(0, data.calories.pct))) {
        Text("kcal")
      } currentValueLabel: {
        Text("\(caloriesLeft)")
          .minimumScaleFactor(0.5)
          .lineLimit(1)
      }
      .gaugeStyle(.accessoryCircular)
      .widgetAccentable()
      .widgetBackground(Color.clear)

    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 2) {
        Text("\(caloriesLeft) kcal left")
          .font(.headline)
          .widgetAccentable()
        Text("Protein \(proteinLeft)g left")
          .font(.caption)
        Text("Water \(glasses)/\(waterGoal)")
          .font(.caption)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .widgetBackground(Color.clear)

    case .accessoryInline:
      Label("\(caloriesLeft) kcal left", systemImage: "flame.fill")
        .widgetBackground(Color.clear)

    default:
      EmptyView()
    }
  }
}

struct FuelLockWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FuelLock", provider: FuelProvider()) { entry in
      LockWidgetView(data: entry.data)
    }
    .configurationDisplayName("Fuel")
    .description("Calories, protein, and water on the lock screen.")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
