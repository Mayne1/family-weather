package com.thefamilyweather.app;

final class WeatherWidgetValues {
    static boolean trusted(String source) { return "nws".equals(source) || "open-meteo".equals(source); }
    static boolean expired(long fetchedAt, long now) { return fetchedAt <= 0 || fetchedAt > now + 300000 || now - fetchedAt >= 7200000; }
    static String number(Double value, String suffix) { return value == null || !Double.isFinite(value) ? "—" : Math.round(value) + suffix; }
}
