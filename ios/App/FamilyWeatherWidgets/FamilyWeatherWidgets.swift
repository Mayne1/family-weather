import WidgetKit
import SwiftUI
import AppIntents

struct WidgetCity: AppEntity, Codable {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "City"
    static var defaultQuery = WidgetCityQuery()
    var id: String
    var label: String
    var lat: Double
    var lon: Double
    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(label)") }
    static let stockton = WidgetCity(id: "37.9577,-121.2908|Stockton, CA", label: "Stockton, CA", lat: 37.9577, lon: -121.2908)
}
struct WidgetCityQuery: EntityStringQuery {
    func entities(for identifiers: [String]) async throws -> [WidgetCity] {
        identifiers.compactMap { id in
            let parts = id.split(separator: "|", maxSplits: 1)
            guard parts.count == 2 else { return nil }
            let coords = parts[0].split(separator: ",")
            guard parts.count == 2, coords.count == 2, let lat = Double(coords[0]), let lon = Double(coords[1]), abs(lat) <= 90, abs(lon) <= 180 else { return nil }
            return WidgetCity(id: id, label: String(parts[1]), lat: lat, lon: lon)
        }
    }
    func suggestedEntities() async throws -> [WidgetCity] { [.stockton] }
    func entities(matching string: String) async throws -> [WidgetCity] {
        guard string.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 else { return [.stockton] }
        var url = URLComponents(string: "https://thefamilyweather.com/api/locations/search")!
        url.queryItems = [URLQueryItem(name: "q", value: string)]
        let (data, response) = try await URLSession.shared.data(for: URLRequest(url: url.url!, timeoutInterval: 15))
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        struct Search: Decodable { var ok: Bool; var suggestions: [Candidate] }
        struct Candidate: Decodable { var label: String; var lat: Double; var lon: Double }
        let result = try JSONDecoder().decode(Search.self, from: data)
        guard result.ok else { throw URLError(.badServerResponse) }
        return result.suggestions.filter { $0.lat.isFinite && $0.lon.isFinite && abs($0.lat) <= 90 && abs($0.lon) <= 180 }.map { WidgetCity(id: "\($0.lat),\($0.lon)|\($0.label)", label: $0.label, lat: $0.lat, lon: $0.lon) }
    }
}
struct WeatherWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Family Weather"
    static var description = IntentDescription("Choose the city to show on this widget.")
    @Parameter(title: "City") var city: WidgetCity?
}
struct WeatherEntry: TimelineEntry, Codable {
    var date: Date
    var city: WidgetCity
    var weather: WidgetWeather?
    var fetchedAt: Date?
    var offline = false
    var expired: Bool { fetchedAt.map { max(Date(), date).timeIntervalSince($0) >= 7200 || $0.timeIntervalSince(Date()) > 300 } ?? true }
    var temperature: String {
        guard !expired, let value = weather?.currentTemperature(asOf: max(Date(), date)), value.isFinite else { return "—" }
        return "\(Int(value.rounded()))°"
    }
    var footer: String { expired ? "Open app to update" : offline ? "Saved weather" : "Today’s forecast" }
}
struct WeatherProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> WeatherEntry { WeatherEntry(date: .now, city: .stockton) }
    func snapshot(for configuration: WeatherWidgetIntent, in context: Context) async -> WeatherEntry {
        await load(configuration.city ?? .stockton)
    }
    func timeline(for configuration: WeatherWidgetIntent, in context: Context) async -> Timeline<WeatherEntry> {
        let entry = await load(configuration.city ?? .stockton)
        let expiry = (entry.fetchedAt ?? Date()).addingTimeInterval(7200)
        // Expire displayed observations even if the system delays our next network refresh.
        var expired = entry; expired.date = max(Date().addingTimeInterval(60), expiry)
        return Timeline(entries: [entry, expired], policy: .after(Date().addingTimeInterval(1800 + Double.random(in: 0...180))))
    }
    private func load(_ city: WidgetCity) async -> WeatherEntry {
        let key = "weather-cache-\(city.id)"
        do {
            var url = URLComponents(string: "https://thefamilyweather.com/api/weather/home")!
            url.queryItems = [URLQueryItem(name: "lat", value: String(city.lat)), URLQueryItem(name: "lon", value: String(city.lon))]
            let (data, response) = try await URLSession.shared.data(for: URLRequest(url: url.url!, timeoutInterval: 15))
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
            let weather = try JSONDecoder().decode(WidgetWeather.self, from: data)
            guard weather.verified else { throw URLError(.badServerResponse) }
            let entry = WeatherEntry(date: .now, city: city, weather: weather, fetchedAt: .now)
            UserDefaults.standard.set(try JSONEncoder().encode(entry), forKey: key)
            return entry
        } catch {
            if let data = UserDefaults.standard.data(forKey: key), var cached = try? JSONDecoder().decode(WeatherEntry.self, from: data) {
                cached.date = .now; cached.offline = true; return cached
            }
            return WeatherEntry(date: .now, city: city, offline: true)
        }
    }
}
struct WeatherWidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: WeatherEntry
    func number(_ value: Double?, suffix: String) -> String {
        guard !entry.expired, let value, value.isFinite else { return "—" }
        return "\(Int(value.rounded()))\(suffix)"
    }
    var body: some View {
        Group {
            switch family {
            case .accessoryCircular:
                VStack(spacing: 1) {
                    Image(systemName: entry.expired ? "thermometer.medium" : (entry.weather?.symbol ?? "thermometer.medium")).font(.caption)
                    Text(entry.temperature).font(.system(.title3, design: .rounded, weight: .semibold)).minimumScaleFactor(0.7)
                }.accessibilityLabel("\(entry.city.label), \(entry.temperature), \(entry.footer)")
            case .accessoryInline:
                Label("\(entry.city.label) \(entry.temperature)", systemImage: entry.expired ? "thermometer.medium" : (entry.weather?.symbol ?? "thermometer.medium"))
            default:
                VStack(alignment: .leading, spacing: 3) {
                    Text(entry.city.label).font(.caption.weight(.semibold)).lineLimit(1)
                    HStack(spacing: 5) {
                        Image(systemName: entry.expired ? "thermometer.medium" : (entry.weather?.symbol ?? "thermometer.medium"))
                        Text(entry.temperature).font(.title2.weight(.semibold))
                        if !entry.expired { Text("H \(number(entry.weather?.today?.temp_max_f, suffix: "°")) · L \(number(entry.weather?.today?.temp_min_f, suffix: "°"))").font(.caption2).lineLimit(1).minimumScaleFactor(0.7) }
                    }
                    if !entry.expired {
                        Text("Rain today \(number(entry.weather?.today?.precip_prob_pct, suffix: "%"))\(entry.offline ? " · Saved" : "")").font(.caption2)
                    } else { Text(entry.footer).font(.caption2) }
                }
            }
        }
        .foregroundStyle(.white)
        .containerBackground(for: .widget) { Color(red: 0.04, green: 0.23, blue: 0.19) }
        .widgetURL(URL(string: "familyweather://home"))
    }
}
@main
struct FamilyWeatherWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "FamilyWeatherConditions", intent: WeatherWidgetIntent.self, provider: WeatherProvider()) { WeatherWidgetView(entry: $0) }
            .configurationDisplayName("Family Weather")
            .description("Local temperature, today’s high and low, and rain chance. Choose a city for each widget.")
            .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline, .systemSmall])
    }
}
