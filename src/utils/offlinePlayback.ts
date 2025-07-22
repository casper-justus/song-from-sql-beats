import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface Song {
  id: string; // Unique ID for the song
  title: string;
  artist: string;
  album: string;
  artworkUrl: string; // URL to album art for the notification
  streamUrl: string;  // The original streaming URL
  localPath?: string; // Will store the 'file://...' path if downloaded
  isDownloaded: boolean; // Flag to track download status
}

// Function to download a song
export async function downloadSong(song: Song): Promise<string | undefined> {
  try {
    const fileName = `${song.id}.mp3`; // Use a unique filename, e.g., based on ID

    // Ensure the music directory exists
    try {
      await Filesystem.mkdir({
        path: 'music',
        directory: Directory.Data,
        recursive: true // Make sure parent directories are created
      });
    } catch(e) {
      // Ignore error if directory already exists
    }

    const { uri } = await Filesystem.downloadFile({
      path: `music/${fileName}`,
      directory: Directory.Data,
      url: song.streamUrl,
      progress: true,
    });

    console.log(`Download complete for ${song.title}! Local path: ${uri}`);

    // Update the song object to reflect its downloaded status
    song.localPath = uri;
    song.isDownloaded = true;
    // You'll want to save this updated song object to your app's persistent storage
    // (e.g., IndexedDB, local storage, or a custom file managed by Filesystem)

    return uri; // Return the local file URI
  } catch (error) {
    console.error(`Error downloading ${song.title}:`, error);
    // Handle specific errors like network issues, storage full, etc.
    return undefined;
  }
}

// Function to check if a song is already downloaded
export async function isSongDownloaded(songId: string): Promise<string | undefined> {
  try {
    const fileName = `${songId}.mp3`;
    const { uri: filePath } = await Filesystem.getUri({
      directory: Directory.Data,
      path: `music/${fileName}`,
    });
    // If getUri succeeds, the file exists. We can also use Filesystem.stat for a more explicit check.
    const fileStats = await Filesystem.stat({
      directory: Directory.Data,
      path: `music/${fileName}`,
    });
    if (fileStats && fileStats.type === 'file') {
      console.log(`Song ${songId} found locally at: ${filePath}`);
      return filePath;
    }
    return undefined;
  } catch (e) {
    // If stat or getUri throws, the file likely doesn't exist
    // console.warn(`Song ${songId} not found locally.`);
    return undefined;
  }
}

// Function to delete a downloaded song
export async function deleteDownloadedSong(songId: string): Promise<void> {
  try {
    const fileName = `${songId}.mp3`;
    await Filesystem.deleteFile({
      directory: Directory.Data,
      path: `music/${fileName}`,
    });
    console.log(`Song ${songId} deleted from local storage.`);
    // Update your app's internal state to reflect the deletion
  } catch (e) {
    console.error(`Error deleting song ${songId}:`, e);
  }
}
