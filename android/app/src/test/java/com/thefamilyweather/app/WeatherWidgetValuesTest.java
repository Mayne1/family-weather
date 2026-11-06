package com.thefamilyweather.app;
import org.junit.Test;
import static org.junit.Assert.*;
public class WeatherWidgetValuesTest {
    @Test public void missingReadingsDoNotBecomeZeroWeather() {
        assertEquals("—",WeatherWidgetValues.number(null,"°"));
        assertEquals("—",WeatherWidgetValues.number(Double.NaN,"°"));
        assertEquals("0°",WeatherWidgetValues.number(0.0,"°"));
        assertEquals("0%",WeatherWidgetValues.number(0.0,"%"));
        assertEquals("-4°",WeatherWidgetValues.number(-4.2,"°"));
    }
    @Test public void cacheExpiresAtTwoHoursAndRejectsFutureClockErrors() {
        long now=100000000;
        assertTrue(WeatherWidgetValues.expired(0,now));
        assertFalse(WeatherWidgetValues.expired(now-7199999,now));
        assertTrue(WeatherWidgetValues.expired(now-7200000,now));
        assertTrue(WeatherWidgetValues.expired(now+600000,now));
    }
    @Test public void onlyRecentTimestampedObservationsBecomeCurrentTemperature() throws Exception {
        long now=new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX",java.util.Locale.US).parse("2026-11-01T12:00:00Z").getTime();
        assertFalse(WeatherWidgetValues.freshObservation(null,now));
        assertFalse(WeatherWidgetValues.freshObservation("bad",now));
        assertTrue(WeatherWidgetValues.freshObservation("2026-11-01T11:00:00+00:00",now));
        assertTrue(WeatherWidgetValues.freshObservation("2026-11-01T11:00:00.000Z",now));
        assertFalse(WeatherWidgetValues.freshObservation("2026-11-01T10:00:00Z",now));
        assertFalse(WeatherWidgetValues.freshObservation("2026-11-01T13:00:00Z",now));
    }
    @Test public void unverifiedFallbackDoesNotBecomeConfirmedWidgetWeather() {
        assertTrue(WeatherWidgetValues.trusted("nws"));
        assertTrue(WeatherWidgetValues.trusted("open-meteo"));
        assertFalse(WeatherWidgetValues.trusted("family-weather"));
        assertFalse(WeatherWidgetValues.trusted(null));
    }
}
