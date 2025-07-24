package com.example.songfromsqlbeats;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import io.supabase.client.SupabaseClient;
import io.supabase.client.rpc.PostgrestRpc;

public class LikedSongsFragment extends Fragment {

    private RecyclerView likedSongsRecyclerView;
    private PlaylistAdapter likedSongsAdapter;
    private List<Playlist> likedSongs = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_liked_songs, container, false);

        likedSongsRecyclerView = view.findViewById(R.id.likedSongsRecyclerView);
        likedSongsRecyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        likedSongsAdapter = new PlaylistAdapter(likedSongs);
        likedSongsRecyclerView.setAdapter(likedSongsAdapter);

        fetchLikedSongs();

        return view;
    }

    private void fetchLikedSongs() {
        SupabaseClient client = Supabase.getInstance();
        client.from("liked_songs").select("*").execute(new PostgrestRpc.Callback() {
            @Override
            public void onResponse(String response) {
                // Parse the response and update the likedSongs list
                // This is a simplified example, you would need to use a JSON parsing library like Gson
                // to parse the response into a list of Playlist objects.
                // For now, we will just add some dummy data.
                likedSongs.add(new Playlist("3", "Liked Song 1", "Artist 1"));
                likedSongs.add(new Playlist("4", "Liked Song 2", "Artist 2"));
                getActivity().runOnUiThread(() -> likedSongsAdapter.notifyDataSetChanged());
            }

            @Override
            public void onError(Exception e) {
                // Handle error
            }
        });
    }
}
