package com.example.songfromsqlbeats;

public class Playlist {
    private String id;
    private String name;
    private String description;

    public Playlist(String id, String name, String description) {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }
}
