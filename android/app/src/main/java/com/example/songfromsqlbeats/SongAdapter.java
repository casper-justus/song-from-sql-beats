package com.example.songfromsqlbeats;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import java.util.List;

import io.supabase.client.rpc.PostgrestRpc;

public class SongAdapter extends RecyclerView.Adapter<SongAdapter.ViewHolder> {

    private List<Song> songs;

    public SongAdapter(List<Song> songs) {
        this.songs = songs;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_song, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Song song = songs.get(position);
        holder.titleTextView.setText(song.getTitle());

        Supabase.getArtist(song.getArtistId(), new PostgrestRpc.Callback() {
            @Override
            public void onResponse(String response) {
                JsonObject jsonObject = new Gson().fromJson(response, JsonObject.class);
                String artistName = jsonObject.get("name").getAsString();
                holder.artistTextView.setText(artistName);
            }

            @Override
            public void onError(Exception e) {
                // Handle error
            }
        });

        holder.playButton.setOnClickListener(v -> {
            MusicPlayer.getInstance().play(v.getContext());
        });
    }

    @Override
    public int getItemCount() {
        return songs.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        public TextView titleTextView;
        public TextView artistTextView;
        public ImageButton playButton;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            titleTextView = itemView.findViewById(R.id.titleTextView);
            artistTextView = itemView.findViewById(R.id.artistTextView);
            playButton = itemView.findViewById(R.id.playButton);
        }
    }
}
