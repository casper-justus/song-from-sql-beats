package com.example.songfromsqlbeats;

import android.content.Context;
import android.content.Intent;

public class MusicPlayer {

    private static MusicPlayer instance;

    private MusicPlayer() {
    }

    public static synchronized MusicPlayer getInstance() {
        if (instance == null) {
            instance = new MusicPlayer();
        }
        return instance;
    }

    public void play(Context context) {
        Intent intent = new Intent(context, MusicPlayerService.class);
        context.startService(intent);
    }

    public void pause(Context context) {
        Intent intent = new Intent(context, MusicPlayerService.class);
        context.stopService(intent);
    }
}
