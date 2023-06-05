interface CinemaRoom {
    source: number;
    name: string;
    password?: string;
    members: number[];
    playlist: [];
    pastVideos: [];
    currentVideo?: string;
    paused: boolean;
}