package com.thefamilyweather.app;

import android.app.PendingIntent;
import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class WeatherWidgetProvider extends AppWidgetProvider {
    static final int JOB_ID = 4911;
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences("family-weather-widgets", Context.MODE_PRIVATE); }
    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        for (int id : ids) render(c, manager, id, false);
        refresh(c);
    }
    static void refresh(Context c) {
        JobScheduler scheduler = (JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        scheduler.schedule(new JobInfo.Builder(JOB_ID, new ComponentName(c, WeatherWidgetService.class))
            .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setMinimumLatency(0).build());
    }
    @Override public void onDeleted(Context c, int[] ids) {
        SharedPreferences.Editor editor = prefs(c).edit();
        for (int id : ids) for (String key : new String[]{"city", "lat", "lon", "data", "time"}) editor.remove(key + id);
        editor.apply();
    }
    @Override public void onDisabled(Context c) { ((JobScheduler)c.getSystemService(Context.JOB_SCHEDULER_SERVICE)).cancel(JOB_ID); }
    static String number(JSONObject obj, String key, String suffix) {
        if (obj == null || obj.isNull(key)) return "—";
        double value = obj.optDouble(key, Double.NaN);
        return Double.isFinite(value) ? Math.round(value) + suffix : "—";
    }
    static void render(Context c, AppWidgetManager manager, int id, boolean offline) {
        SharedPreferences p = prefs(c);
        String city = p.getString("city" + id, "Choose a city");
        RemoteViews views = new RemoteViews(c.getPackageName(), R.layout.weather_widget);
        views.setTextViewText(R.id.widget_city, city);
        long time = p.getLong("time" + id, 0);
        boolean expired = time == 0 || System.currentTimeMillis() - time >= 7200000;
        views.setTextViewText(R.id.widget_temperature, "—");
        views.setTextViewText(R.id.widget_details, "Open app for weather");
        views.setTextViewText(R.id.widget_status, "Tap the city to set up");
        try {
            JSONObject data = new JSONObject(p.getString("data" + id, "{}"));
            if (!expired && data.optBoolean("ok")) {
                views.setTextViewText(R.id.widget_temperature, number(data.optJSONObject("current"), "temp_f", "°"));
                SimpleDateFormat date = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                date.setTimeZone(TimeZone.getTimeZone(data.optString("timezone", "America/Los_Angeles")));
                String today = date.format(new Date()); JSONObject day = null;
                org.json.JSONArray days = data.optJSONArray("days");
                if (days != null) for (int i = 0; i < days.length(); i++) if (today.equals(days.getJSONObject(i).optString("date"))) { day = days.getJSONObject(i); break; }
                views.setTextViewText(R.id.widget_details, "H " + number(day,"temp_max_f","°") + "  L " + number(day,"temp_min_f","°") + "  ·  Rain today " + number(day,"precip_prob_pct","%"));
            }
            if (time > 0) {
                String stamp = new SimpleDateFormat("h:mm a", Locale.getDefault()).format(new Date(time));
                views.setTextViewText(R.id.widget_status, (expired ? "Out of date · " : offline ? "Saved · " : "Updated ") + stamp);
            } else if (p.contains("city" + id)) views.setTextViewText(R.id.widget_status, offline ? "Weather unavailable · retry later" : "Checking weather…");
        } catch (Exception ignored) { views.setTextViewText(R.id.widget_status, "Weather unavailable"); }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(c,id,new Intent(c,MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP),flags));
        views.setOnClickPendingIntent(R.id.widget_city, PendingIntent.getActivity(c,id,new Intent(c,WeatherWidgetConfigureActivity.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id),flags));
        manager.updateAppWidget(id, views);
    }
}
