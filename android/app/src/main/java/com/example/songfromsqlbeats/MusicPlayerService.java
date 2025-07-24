package com.example.songfromsqlbeats;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.IBinder;

import androidx.annotation.Nullable;

import com.google.android.exoplayer2.ExoPlayer;

public class MusicPlayerService extends Service implements AudioManager.OnAudioFocusChangeListener {

    private ExoPlayer player;
    private AudioManager audioManager;

    @Override
    public void onCreate() {
        super.onCreate();
        player = new ExoPlayer.Builder(this).build();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        int result = audioManager.requestAudioFocus(this, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            // Start playback
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        player.release();
        audioManager.abandonAudioFocus(this);
    }

    @Override
    public void onAudioFocusChange(int focusChange) {
        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_GAIN:
                // Resume playback
                break;
            case AudioManager.AUDIOFOCUS_LOSS:
                // Stop playback
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                // Pause playback
                break;
            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                // Lower the volume
                break;
        }
    }
}
