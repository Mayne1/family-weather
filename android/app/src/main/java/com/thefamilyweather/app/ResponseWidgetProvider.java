package com.thefamilyweather.app;
import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.*;
public class ResponseWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)render(c,m,id);}
    static void updateAll(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);for(int id:m.getAppWidgetIds(new ComponentName(c,ResponseWidgetProvider.class)))render(c,m,id);}
    static void render(Context c,AppWidgetManager m,int id){
        RemoteViews v=new RemoteViews(c.getPackageName(),R.layout.response_widget);
        String a="Sign in inside the app",b="See announcement replies and RSVPs",status="Tap to open your account";
        try{
            JSONObject d=new JSONObject(c.getSharedPreferences("response-widgets",0).getString("snapshot","{}"));
            long time=d.optLong("checkedAt",0);boolean signedIn=d.optBoolean("signedIn",false);
            if(signedIn&&time>0){
                String stamp=new SimpleDateFormat("h:mm a",Locale.getDefault()).format(new Date(time));
                if(System.currentTimeMillis()-time<86400000 && time<=System.currentTimeMillis()+300000){
                    a=d.optInt("announcements")+" announcements · "+d.optInt("announcementReplies")+" replies";
                    b="RSVPs: "+d.optInt("going")+" going · "+d.optInt("maybe")+" maybe · "+d.optInt("declined")+" no";
                    status=(d.optBoolean("partial")?"Partial · ":"")+"Checked "+stamp+" · Open app to refresh";
                }else{a="Open app to refresh replies";b="Saved counts are out of date";status="Last checked "+stamp;}
            }else if(signedIn){a="Open app to sync replies";b="Your account summary is not available yet";status="Refreshes while the app is open";}
        }catch(Exception ignored){}
        v.setTextViewText(R.id.response_announcements,a);v.setTextViewText(R.id.response_invitations,b);v.setTextViewText(R.id.response_status,status);
        int flags=PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT;
        Intent news=new Intent(c,MainActivity.class).setData(Uri.parse("familyweather://announcements")).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        Intent events=new Intent(c,MainActivity.class).setData(Uri.parse("familyweather://events")).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.response_announcements,PendingIntent.getActivity(c,id*2,news,flags));
        v.setOnClickPendingIntent(R.id.response_invitations,PendingIntent.getActivity(c,id*2+1,events,flags));
        v.setOnClickPendingIntent(R.id.response_root,PendingIntent.getActivity(c,id*2,news,flags));
        m.updateAppWidget(id,v);
    }
}
