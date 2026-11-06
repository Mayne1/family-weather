package com.thefamilyweather.app;

import android.app.job.JobService;
import android.app.job.JobParameters;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.SharedPreferences;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class WeatherWidgetService extends JobService {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private Future<?> task;
    private volatile boolean stopped;
    static JSONObject get(String address) throws Exception {
        HttpURLConnection conn = (HttpURLConnection)new URL(address).openConnection();
        conn.setConnectTimeout(10000); conn.setReadTimeout(15000);
        try {
            if (conn.getResponseCode() != 200) throw new java.io.IOException("Weather request failed");
            try (java.io.InputStream stream = conn.getInputStream(); java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096]; int size;
                while ((size = stream.read(buffer)) != -1) { out.write(buffer,0,size); if(out.size()>1048576) throw new java.io.IOException("Response too large"); }
                return new JSONObject(out.toString(StandardCharsets.UTF_8.name()));
            }
        } finally { conn.disconnect(); }
    }
    @Override public boolean onStartJob(JobParameters params) {
        stopped = false;
        task = executor.submit(() -> {
            AppWidgetManager manager = AppWidgetManager.getInstance(this);
            int[] ids = manager.getAppWidgetIds(new ComponentName(this,WeatherWidgetProvider.class));
            SharedPreferences prefs = WeatherWidgetProvider.prefs(this);
            for (int id : ids) {
                if (stopped) return;
                if (!prefs.contains("lat" + id)) continue;
                String lat = prefs.getString("lat" + id, ""), lon = prefs.getString("lon" + id, "");
                boolean offline = false;
                try {
                    JSONObject data = get("https://thefamilyweather.com/api/weather/home?lat=" + Double.parseDouble(lat) + "&lon=" + Double.parseDouble(lon));
                    if (!data.optBoolean("ok") || !WeatherWidgetValues.trusted(data.optString("source"))) throw new java.io.IOException("Weather unavailable");
                    if (!stopped && lat.equals(prefs.getString("lat"+id,"")) && lon.equals(prefs.getString("lon"+id,""))) prefs.edit().putString("data"+id,data.toString()).putLong("time"+id,System.currentTimeMillis()).apply();
                } catch (Exception e) { offline = true; }
                if (!stopped) WeatherWidgetProvider.render(this,manager,id,offline);
            }
            if (!stopped) jobFinished(params,false);
        });
        return true;
    }
    @Override public boolean onStopJob(JobParameters params) { stopped = true; if(task != null)task.cancel(true); return true; }
    @Override public void onDestroy() { stopped = true; executor.shutdownNow(); super.onDestroy(); }
}
