package com.thefamilyweather.app;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import org.json.JSONObject;
@CapacitorPlugin(name="ResponseWidgets")
public class ResponseWidgetsPlugin extends Plugin {
    @PluginMethod public void save(PluginCall call) {
        try {
            JSONObject clean=new JSONObject();clean.put("signedIn",Boolean.TRUE.equals(call.getBoolean("signedIn",false)));
            JSObject data=call.getObject("summary");
            if(data!=null && clean.getBoolean("signedIn")){
                for(String key:new String[]{"announcements","announcementReplies","events","going","maybe","declined","waiting"}){
                    double n=data.optDouble(key,Double.NaN);
                    if(!Double.isFinite(n)||n<0||n>10000000||n!=Math.floor(n)){call.reject("Invalid response count");return;}
                    clean.put(key,(int)n);
                }
                double checked=data.optDouble("checkedAt",Double.NaN);
                if(!Double.isFinite(checked)||checked<=0||checked>System.currentTimeMillis()+300000){call.reject("Invalid snapshot time");return;}
                clean.put("checkedAt",(long)checked);clean.put("partial",data.optBoolean("partial",false));
            }
            getContext().getSharedPreferences("response-widgets",0).edit().putString("snapshot",clean.toString()).apply();
            ResponseWidgetProvider.updateAll(getContext());call.resolve();
        }catch(Exception e){call.reject("Could not update response widget");}
    }
}
