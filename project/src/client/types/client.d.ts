interface ClientCinemaData {
    name: string;
    playlist: [];
    pastVideos: string[];
    currentVideo: string | null;
    paused: boolean;
    volume: number;
    time: number;
}