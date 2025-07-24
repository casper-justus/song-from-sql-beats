package com.example.songfromsqlbeats;

import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.util.List;

import io.supabase.client.rpc.PostgrestRpc;

public class PlaylistActivity extends AppCompatActivity {

    private RecyclerView songsRecyclerView;
    private SongAdapter songAdapter;
    private List<Song> songs;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_playlist);

        songsRecyclerView = findViewById(R.id.songsRecyclerView);
        songsRecyclerView.setLayoutManager(new LinearLayoutManager(this));

        String playlistId = getIntent().getStringExtra("playlistId");
        Supabase.getSongs(playlistId, new PostgrestRpc.Callback() {
            @Override
            public void onResponse(String response) {
                songs = new Gson().fromJson(response, new TypeToken<List<Song>>() {}.getType());
                songAdapter = new SongAdapter(songs);
                songsRecyclerView.setAdapter(songAdapter);
            }

            @Override
            public void onError(Exception e) {
                // Handle error
            }
        });
    }
}
