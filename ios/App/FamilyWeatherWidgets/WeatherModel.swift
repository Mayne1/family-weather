import Foundation

struct WidgetWeather: Codable {
    struct Current: Codable { var temp_f: Double?; var weather_code: Int?; var observed_at: String? }
    struct Day: Codable { var date: String; var temp_max_f: Double?; var temp_min_f: Double?; var precip_prob_pct: Double? }
    var ok: Bool
    var label: String
    var source: String?
    var timezone: String?
    var current: Current?
    var days: [Day]
    func currentTemperature(asOf now: Date = Date()) -> Double? {
        guard let value = current?.temp_f, value.isFinite, let stamp = current?.observed_at else { return nil }
        let formatter = ISO8601DateFormatter()
        let plain = formatter.date(from: stamp)
        formatter.formatOptions.insert(.withFractionalSeconds)
        guard let observed = plain ?? formatter.date(from: stamp), now.timeIntervalSince(observed) < 7200, observed.timeIntervalSince(now) <= 300 else { return nil }
        return value
    }
    var verified: Bool { ok && ["nws", "open-meteo"].contains(source ?? "") }
    var today: Day? {
        let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: timezone ?? "America/Los_Angeles")
        return days.first { $0.date == formatter.string(from: Date()) }
    }
    var symbol: String {
        switch current?.weather_code ?? -1 {
        case 200..<300: return "cloud.bolt.rain.fill"
        case 300..<600: return "cloud.rain.fill"
        case 600..<700: return "cloud.snow.fill"
        case 700..<800: return "cloud.fog.fill"
        case 800: return "sun.max.fill"
        case 801...802: return "cloud.sun.fill"
        case 803...899: return "cloud.fill"
        default: return "thermometer.medium"
        }
    }
}
