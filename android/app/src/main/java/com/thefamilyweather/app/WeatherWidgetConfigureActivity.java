package com.thefamilyweather.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.widget.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.URLEncoder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class WeatherWidgetConfigureActivity extends Activity {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private int widgetId;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved); setResult(RESULT_CANCELED);
        widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);
        if(widgetId==AppWidgetManager.INVALID_APPWIDGET_ID){finish();return;}
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);int pad=(int)(24*getResources().getDisplayMetrics().density);root.setPadding(pad,pad,pad,pad);
        TextView title=new TextView(this);title.setText("Family Weather widget");title.setTextSize(24);root.addView(title);
        TextView help=new TextView(this);help.setText("Search for a city, then select the correct place. This widget uses its own saved city.");root.addView(help);
        EditText query=new EditText(this);query.setHint("City and state or country");query.setSingleLine(true);root.addView(query);
        Button search=new Button(this);search.setText("Find city");root.addView(search);
        TextView status=new TextView(this);root.addView(status);
        ListView results=new ListView(this);root.addView(results,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
        search.setOnClickListener(v->{String text=query.getText().toString().trim();if(text.length()<2){status.setText("Enter at least two characters.");return;}
            search.setEnabled(false);status.setText("Finding places…");results.setAdapter(null);
            executor.submit(()->{try{
                JSONObject data=WeatherWidgetService.get("https://thefamilyweather.com/api/locations/search?q="+URLEncoder.encode(text,"UTF-8"));
                JSONArray places=data.getJSONArray("suggestions");String[] labels=new String[places.length()];for(int i=0;i<labels.length;i++)labels[i]=places.getJSONObject(i).getString("label");
                runOnUiThread(()->{if(isFinishing()||isDestroyed())return;search.setEnabled(true);status.setText(labels.length==0?"No matches. Include a state or country.":"Choose your city:");results.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_list_item_1,labels));
                    results.setOnItemClickListener((parent,view,pos,row)->{try{JSONObject city=places.getJSONObject(pos);double lat=city.getDouble("lat"),lon=city.getDouble("lon");if(!Double.isFinite(lat)||!Double.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw new IllegalArgumentException();
                        WeatherWidgetProvider.prefs(this).edit().putString("city"+widgetId,labels[pos]).putString("lat"+widgetId,Double.toString(lat)).putString("lon"+widgetId,Double.toString(lon)).remove("data"+widgetId).remove("time"+widgetId).apply();
                        WeatherWidgetProvider.render(this,AppWidgetManager.getInstance(this),widgetId,false);WeatherWidgetProvider.refresh(this);
                        setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId));finish();
                    }catch(Exception e){status.setText("Could not save that city. Try another.");}});
                });
            }catch(Exception e){runOnUiThread(()->{if(!isFinishing()&&!isDestroyed()){search.setEnabled(true);status.setText("Location search unavailable. Please try again.");}});}});
        });
    }
    @Override protected void onDestroy(){executor.shutdownNow();super.onDestroy();}
}
