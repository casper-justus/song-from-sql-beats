package com.example.songfromsqlbeats;

public class Album {
    private String id;
    private String title;
    private String artistId;
    private String coverUrl;

    public Album(String id, String title, String artistId, String coverUrl) {
        this.id = id;
        this.title = title;
        this.artistId = artistId;
        this.coverUrl = coverUrl;
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getArtistId() {
        return artistId;
    }

    public String getCoverUrl() {
        return coverUrl;
    }
}
