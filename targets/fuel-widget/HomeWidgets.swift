import SwiftUI
import WidgetKit

// MARK: - Shared views

/// A small (2x2) widget: section title, then a big progress ring with a number
/// centered in it. Used by Calories and Protein.
struct SmallRingWidgetView: View {
  let title: String
  let big: String
  let unit: String
  let pct: Double
  let color: Color
  let pal: Palette

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(title)
        .font(.system(size: 11, weight: .semibold))
        .tracking(1)
        .foregroundStyle(pal.textSecondary)
      RingView(pct: pct, color: color, track: pal.track, lineWidth: 10) {
        VStack(spacing: 1) {
          Text(big)
            .font(.system(size: 26, weight: .bold))
            .foregroundStyle(pal.textPrimary)
            .minimumScaleFactor(0.5)
            .lineLimit(1)
          Text(unit)
            .font(.system(size: 11))
            .foregroundStyle(pal.textSecondary)
        }
      }
      .aspectRatio(1, contentMode: .fit)
      .frame(maxWidth: .infinity)
    }
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .widgetBackground(pal.gradient)
  }
}

/// One ring + caption, used as a column in the medium Summary widget.
struct MetricColumn: View {
  let label: String
  let value: String
  let pct: Double
  let color: Color
  let pal: Palette

  var body: some View {
    VStack(spacing: 8) {
      RingView(pct: pct, color: color, track: pal.track, lineWidth: 9) {
        Text(value)
          .font(.system(size: 15, weight: .bold))
          .foregroundStyle(pal.textPrimary)
          .minimumScaleFactor(0.5)
          .lineLimit(1)
      }
      .aspectRatio(1, contentMode: .fit)
      Text(label)
        .font(.system(size: 11))
        .foregroundStyle(pal.textSecondary)
    }
  }
}

struct WaterWidgetView: View {
  let data: WidgetData
  private var pal: Palette { data.palette }
  private var pct: Double { data.water.goal > 0 ? data.water.glasses / data.water.goal : 0 }

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("WATER")
        .font(.system(size: 11, weight: .semibold))
        .tracking(1)
        .foregroundStyle(pal.textSecondary)
      ZStack(alignment: .bottomTrailing) {
        RingView(pct: pct, color: pal.water, track: pal.track, lineWidth: 10) {
          VStack(spacing: 1) {
            Text("\(Int(data.water.glasses))")
              .font(.system(size: 26, weight: .bold))
              .foregroundStyle(pal.textPrimary)
              .minimumScaleFactor(0.5)
              .lineLimit(1)
            Text("of \(Int(data.water.goal))")
              .font(.system(size: 11))
              .foregroundStyle(pal.textSecondary)
          }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: .infinity)

        if #available(iOS 17.0, *) {
          Button(intent: AddWaterIntent()) {
            Image(systemName: "plus")
              .font(.system(size: 18, weight: .bold))
              .foregroundStyle(pal.accent)
              .frame(width: 40, height: 40)
              .background(Circle().fill(pal.track))
          }
          .buttonStyle(.plain)
        }
      }
    }
    .padding(14)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .widgetBackground(pal.gradient)
  }
}

struct SummaryWidgetView: View {
  let data: WidgetData
  private var pal: Palette { data.palette }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("TODAY")
        .font(.system(size: 11, weight: .semibold))
        .tracking(1)
        .foregroundStyle(pal.textSecondary)
      HStack(spacing: 14) {
        MetricColumn(
          label: "kcal",
          value: data.calories.over
            ? "+\(Int(abs(data.calories.left)))"
            : "\(Int(data.calories.left))",
          pct: data.calories.pct,
          color: data.calories.over ? pal.over : pal.accent,
          pal: pal
        )
        MetricColumn(
          label: "protein",
          value: "\(Int(max(0, data.protein.left)))g",
          pct: data.protein.pct,
          color: pal.protein,
          pal: pal
        )
        MetricColumn(
          label: "water",
          value: "\(Int(data.water.glasses))/\(Int(data.water.goal))",
          pct: data.water.goal > 0 ? data.water.glasses / data.water.goal : 0,
          color: pal.water,
          pal: pal
        )
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .padding(16)
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    .widgetBackground(pal.gradient)
  }
}

// MARK: - Widgets

struct CaloriesWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FuelCalories", provider: FuelProvider()) { entry in
      let d = entry.data
      SmallRingWidgetView(
        title: "CALORIES",
        big: d.calories.over ? "+\(Int(abs(d.calories.left)))" : "\(Int(d.calories.left))",
        unit: d.calories.over ? "kcal over" : "kcal left",
        pct: d.calories.pct,
        color: d.calories.over ? d.palette.over : d.palette.accent,
        pal: d.palette
      )
    }
    .configurationDisplayName("Calories")
    .description("Calories remaining today.")
    .supportedFamilies([.systemSmall])
  }
}

struct ProteinWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FuelProtein", provider: FuelProvider()) { entry in
      let d = entry.data
      let done = d.protein.left <= 0
      SmallRingWidgetView(
        title: "PROTEIN",
        big: done ? "done" : "\(Int(d.protein.left))",
        unit: done ? "goal hit" : "g left",
        pct: d.protein.pct,
        color: d.palette.protein,
        pal: d.palette
      )
    }
    .configurationDisplayName("Protein")
    .description("Protein remaining today.")
    .supportedFamilies([.systemSmall])
  }
}

struct WaterWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FuelWater", provider: FuelProvider()) { entry in
      WaterWidgetView(data: entry.data)
    }
    .configurationDisplayName("Water")
    .description("Track glasses — tap + to log one.")
    .supportedFamilies([.systemSmall])
  }
}

struct SummaryWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "FuelSummary", provider: FuelProvider()) { entry in
      SummaryWidgetView(data: entry.data)
    }
    .configurationDisplayName("Today")
    .description("Calories, protein, and water at a glance.")
    .supportedFamilies([.systemMedium])
  }
}
