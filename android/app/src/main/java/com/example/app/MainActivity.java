package com.example.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;

// Import the plugins
import com.getcapacitor.community.audio.NativeAudio;
import com.whitestein.securestorage.SecureStoragePlugin;
import com.getcapacitor.localnotifications.LocalNotifications;
import com.getcapacitor.pushnotifications.PushNotifications;
import com.background.service.BackgroundService;
import com.getcapacitor.splashscreen.SplashScreenPlugin;


public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Initializes the Bridge
    this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
      // Add your plugins here
      add(NativeAudio.class);
      add(SecureStoragePlugin.class);
      add(LocalNotifications.class);
      add(PushNotifications.class);
      add(BackgroundService.class);
      add(SplashScreenPlugin.class);
    }});
  }
}
