interface LocationConfig {
    id: string;
    prefix: string;
    sets: boolean;
    polytarget: {
        position: number;
        width: number;
        length: number;
        heading: number;
        minX: number;
        minZ: number;
    }
}