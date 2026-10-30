package com.thefamilyweather.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The app bundles its UI locally. Clear stale WebView copies after an APK update.
        getBridge().getWebView().clearCache(true);
    }
}
