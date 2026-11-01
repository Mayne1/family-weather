package com.thefamilyweather.app;

final class WeatherWidgetValues {
    static boolean trusted(String source) { return "nws".equals(source) || "open-meteo".equals(source); }
    static boolean expired(long fetchedAt, long now) { return fetchedAt <= 0 || fetchedAt > now + 300000 || now - fetchedAt >= 7200000; }
    static boolean freshObservation(String stamp, long now) {
        if (stamp == null || stamp.isEmpty()) return false;
        for (String pattern : new String[]{"yyyy-MM-dd'T'HH:mm:ssXXX", "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"}) {
            java.text.SimpleDateFormat format = new java.text.SimpleDateFormat(pattern, java.util.Locale.US);
            format.setLenient(false);
            java.text.ParsePosition position = new java.text.ParsePosition(0);
            java.util.Date date = format.parse(stamp,position);
            if (date != null && position.getIndex()==stamp.length()) return now-date.getTime()<7200000 && date.getTime()-now<=300000;
        }
        return false;
    }
    static String number(Double value, String suffix) { return value == null || !Double.isFinite(value) ? "—" : Math.round(value) + suffix; }
}
