import Foundation
@main struct WeatherModelChecks {
    static func main() throws {
        let decoder = JSONDecoder()
        let missing = try decoder.decode(WidgetWeather.self, from: Data(#"{"ok":true,"label":"Test","current":{"temp_f":null},"days":[]}"#.utf8))
        precondition(missing.current?.temp_f == nil)
        precondition(missing.today == nil)
        precondition(!missing.verified)
        precondition(missing.symbol == "thermometer.medium")
        let thunder = try decoder.decode(WidgetWeather.self, from: Data(#"{"ok":true,"label":"Test","source":"nws","current":{"temp_f":0,"weather_code":211},"days":[]}"#.utf8))
        precondition(thunder.verified)
        precondition(thunder.current?.temp_f == 0, "Freezing zero is a valid temperature")
        precondition(thunder.symbol == "cloud.bolt.rain.fill")
        let rain = try decoder.decode(WidgetWeather.self, from: Data(#"{"ok":true,"label":"Test","current":{"weather_code":500},"days":[]}"#.utf8))
        precondition(rain.symbol == "cloud.rain.fill")
        do {
            _ = try decoder.decode(WidgetWeather.self, from: Data(#"{"ok":true,"label":"Test","current":{"temp_f":"bad"},"days":[]}"#.utf8))
            preconditionFailure("Malformed numeric data must not look like weather")
        } catch is DecodingError { }
        print("Widget model: nulls, real zero, missing days, storm/rain symbols and malformed data pass")
    }
}
