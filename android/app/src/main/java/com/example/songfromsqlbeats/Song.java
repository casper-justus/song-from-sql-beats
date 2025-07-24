package com.example.songfromsqlbeats;

public class Song {
    private String id;
    private String title;
    private String artistId;
    private String albumId;
    private String url;

    public Song(String id, String title, String artistId, String albumId, String url) {
        this.id = id;
        this.title = title;
        this.artistId = artistId;
        this.albumId = albumId;
        this.url = url;
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

    public String getAlbumId() {
        return albumId;
    }

    public String getUrl() {
        return url;
    }
}
