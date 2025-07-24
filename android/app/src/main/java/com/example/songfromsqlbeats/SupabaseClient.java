package com.example.songfromsqlbeats;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.util.List;

import io.supabase.client.SupabaseClient;
import io.supabase.client.rpc.PostgrestRpc;

public class Supabase {
    private static final String SUPABASE_URL = "https://dqckopgetuodqhgnhhxw.supabase.co";
    private static final String SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxY2tvcGdldHVvZHFoZ25oaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExOTM5NzYsImV4cCI6MjA2Njc2OTk3Nn0.0PJ5KWUbjI4dupIxScguEf0CrYKtN-uVpVTRxHNi54w";

    private static SupabaseClient instance;

    public static synchronized SupabaseClient getInstance() {
        if (instance == null) {
            instance = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        return instance;
    }

    public static void getSongs(String playlistId, PostgrestRpc.Callback callback) {
        getInstance().from("playlist_songs")
                .select("songs(*)")
                .eq("playlist_id", playlistId)
                .execute(callback);
    }

    public static void getArtist(String artistId, PostgrestRpc.Callback callback) {
        getInstance().from("artists")
                .select("name")
                .eq("id", artistId)
                .single()
                .execute(callback);
    }
}
