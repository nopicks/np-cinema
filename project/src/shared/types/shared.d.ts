interface ModuleConfigEntry {
    configId: string;
    data: Record<string, any>;
}

interface CinemaData {
    name: string;
    playlist: string[];
    pastVideos: string[];
    currentVideo: string | null;
    paused: boolean;
}