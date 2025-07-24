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

public class LibraryFragment extends Fragment {

    private RecyclerView playlistsRecyclerView;
    private PlaylistAdapter playlistAdapter;
    private List<Playlist> playlists = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_library, container, false);

        playlistsRecyclerView = view.findViewById(R.id.playlistsRecyclerView);
        playlistsRecyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        playlistAdapter = new PlaylistAdapter(playlists);
        playlistsRecyclerView.setAdapter(playlistAdapter);

        fetchPlaylists();

        return view;
    }

    private void fetchPlaylists() {
        SupabaseClient client = Supabase.getInstance();
        client.from("playlists").select("*").execute(new PostgrestRpc.Callback() {
            @Override
            public void onResponse(String response) {
                // Parse the response and update the playlists list
                // This is a simplified example, you would need to use a JSON parsing library like Gson
                // to parse the response into a list of Playlist objects.
                // For now, we will just add some dummy data.
                playlists.add(new Playlist("1", "My Playlist", "A collection of my favorite songs."));
                playlists.add(new Playlist("2", "Chill Vibes", "Relaxing tunes for a lazy afternoon."));
                getActivity().runOnUiThread(() -> playlistAdapter.notifyDataSetChanged());
            }

            @Override
            public void onError(Exception e) {
                // Handle error
            }
        });
    }
}
