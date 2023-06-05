import axios from 'axios';
import { GetModuleConfig } from '../../shared/config';

const openCinemas: { [cinema: string]: { [name: string]: CinemaRoom } } = {};

export const InitCinema = (): void => {
    const config = exports['np-config'].GetModuleConfig('np-cinema:main');

    for (const location of config.locations) {
        if (!location.enabled) continue;

        openCinemas[location.id] = {};
    }
};

RPC.register('np-cinema:openCinema', (source: number, cinema: string, name: string, password?: string) => {
    if (!openCinemas[cinema]) {
        emitNet('DoLongHudText', source, 'This cinema does not exists', 2);
        return false;
    }
    if (openCinemas[cinema][name]) {
        emitNet('DoLongHudText', source, 'A cinema already exists with this name', 2);
        return false;
    }

    // todo: deduct some moneys

    openCinemas[cinema][name] = {
        source,
        password,
        name,
        members: [],
        playlist: [],
        pastVideos: [],
        currentVideo: null,
        paused: true,
    };

    return true;
});

RPC.register('np-cinema:getActiveCinemas', (source: number, cinema: string) => {
    if (!openCinemas[cinema]) {
        emitNet('DoLongHudText', source, 'This cinema does not exists', 2);
        return false;
    }

    const cinemas = Object.values(openCinemas[cinema]);
    return cinemas.map((cinema) => ({
        name: cinema.name,
        has_password: cinema.password != null,
        members: cinema.members.length,
    }));
});

RPC.register('np-cinema:joinCinema', (source: number, cinema: string, room: string, password: string) => {
    if (!openCinemas[cinema]) {
        emitNet('DoLongHudText', source, 'This cinema does not exists', 2);
        return false;
    }

    const cinemaRoom = openCinemas[cinema][room];
    if (!cinemaRoom) {
        emitNet('DoLongHudText', source, 'This room does not exists', 2);
        return false;
    }

    if (cinemaRoom.password != null && cinemaRoom.password !== password) {
        emitNet('DoLongHudText', source, 'Incorrect password', 2);
        return false;
    }

    cinemaRoom.members.push(source);
    emitNet('DoLongHudText', source, 'You have joined the cinema', 2);
    emitNet('np-cinema:joinedCinema', source, cinema, room, {
        name: room,
        playlist: cinemaRoom.playlist,
        pastVideos: cinemaRoom.pastVideos,
        currentVideo: cinemaRoom.currentVideo,
        paused: cinemaRoom.paused,
    });

    const config = exports['np-config'].GetModuleConfig('np-cinema:main');
    const location = config.locations.find((i) => i.id === cinema);
    const position = location.position;

    SetEntityCoords(GetPlayerPed(source), position.x, position.y, position.z, true, false, false, false);
    global.exports['np-infinity'].SetWorld(source, room, 'inactive', false);

    return true;
});

onNet('np-cinema:leftCinema', (cinema: string) => {
    if (!openCinemas[cinema]) {
        return false;
    }

    const config = exports['np-config'].GetModuleConfig('np-cinema:main');
    const location = config.locations.find((i) => i.id === cinema);

    const cinemaRoom = Object.keys(openCinemas[cinema]).find((room) => openCinemas[cinema][room].members.includes(source));
    if (!cinemaRoom) {
        global.exports['np-infinity'].ResetWorld(source);
        SetEntityCoords(
            GetPlayerPed(source),
            location.exitPosition.x,
            location.exitPosition.y,
            location.exitPosition.z,
            true,
            false,
            false,
            false,
        );
        return false;
    }

    openCinemas[cinema][cinemaRoom].members = openCinemas[cinema][cinemaRoom].members.filter((member) => source);

    if (openCinemas[cinema][cinemaRoom].members.length === 0) {
        delete openCinemas[cinema][cinemaRoom];
    }
    global.exports['np-infinity'].ResetWorld(source);
    SetEntityCoords(
        GetPlayerPed(source),
        location.exitPosition.x,
        location.exitPosition.y,
        location.exitPosition.z,
        true,
        false,
        false,
        false,
    );
    return true;
});

onNet('np-cinema:queueVideo', async (cinema: string, roomName: string, video: string) => {
    const _source = +source;
    if (!openCinemas[cinema]) return false;

    const cinemaRoom = openCinemas[cinema][roomName];
    if (!cinemaRoom) return false;

    const title = await getVideoTitle(video);

    // cinemaRoom.playlist.push({
    //     video,
    //     title,
    // });
    // cinemaRoom.pastVideos.push({
    //     video,
    //     title
    // });
    if (cinemaRoom.playlist.length == 1) {
        cinemaRoom.paused = false;
        cinemaRoom.currentVideo = video;
    }
    passToCinemaMembers(
        cinemaRoom,
        'np-cinema:queuedVideo',
        {video, title},
        getCharacterName(_source)
    );
});

const getVideoTitle = async (video: string): Promise<string> => {
    const response = await axios(`https://noembed.com/embed?dataType=json&url=https://www.youtube.com/watch?v=${video}`);
    return response.data.title;
};

onNet('np-cinema:nextVideo', (cinema: string, roomName: string) => {
    const _source = +source;
    if (!openCinemas[cinema]) return false;

    const cinemaRoom = openCinemas[cinema][roomName];
    if (!cinemaRoom) return false;

    if (cinemaRoom.playlist.length === 0) return false;

    const video = cinemaRoom.playlist.shift();
    if (!video) return false;

    cinemaRoom.currentVideo = video;
    cinemaRoom.paused = false;
    passToCinemaMembers(cinemaRoom, 'np-cinema:nextVideo', video, getCharacterName(_source));
});

onNet('np-cinema:removeVideo', (cinema: string, roomName: string, video: string) => {
    const _source = +source;
    if (!openCinemas[cinema]) return false;

    const cinemaRoom = openCinemas[cinema][roomName];
    if (!cinemaRoom) return false;

    const index = cinemaRoom.playlist.findIndex((v) => v.video === video);
    if (index === -1) return false;

    const removedVideo = cinemaRoom.playlist.splice(index, 1);

    const pastIndex = cinemaRoom.pastVideos.findIndex((v) => v.video === video);
    if (pastIndex > -1) {
        cinemaRoom.pastVideos.splice(pastIndex, 1);
    }

    passToCinemaMembers(cinemaRoom, 'np-cinema:removeVideo', removedVideo[0], getCharacterName(_source))
});

onNet('np-cinema:addVideo', (cinema: string, roomName: string, video: string) => {
    const _source = +source;
    if (!openCinemas[cinema]) return false;

    const cinemaRoom = openCinemas[cinema][roomName];
    if (!cinemaRoom) return false;

    const videoIndex = cinemaRoom.playlist.findIndex((v) => v.video === video);
    if (videoIndex === -1) return false;

    for (let i = 0; i < videoIndex; i++) {
        cinemaRoom.playlist.shift();
    }

    const pastIndex = cinemaRoom.pastVideos.findIndex((v) => v.video === video);
    if (pastIndex > -1) {
        for (let i = 0; i < pastIndex; i++) {
            cinemaRoom.pastVideos.shift();
        }
    }

    cinemaRoom.currentVideo = cinemaRoom.playlist[0].video;
    cinemaRoom.paused = false;
    passToCinemaMembers(cinemaRoom, 'np-cinema:resetPlaylists', cinemaRoom.playlist, getCharacterName(_source));
});

onNet('np-cinema:paused', (cinema: string, roomName: string, state: boolean) => {
    const _source = +source;
    if (!openCinemas[cinema]) return false;

    const cinemaRoom = openCinemas[cinema][roomName];
    if (!cinemaRoom) return false;

    cinemaRoom.paused = state;
    passToCinemaMembers(cinemaRoom, 'np-cinema:paused', state, getCharacterName(_source));
});

onNet('np-cinema:setTime', (cinema: string, roomName: string, time: number) => {
    const _source = +source;
    if (!openCinemas[cinema]) return false;

    const cinemaRoom = openCinemas[cinema][roomName];
    if (!cinemaRoom) return false;

    passToCinemaMembers(cinemaRoom, 'np-cinema:setTime', time, getCharacterName(_source));
});

onNet('np-cinema:videoEnded', (cinema: string, roomName: string, currentVideo: string) => {
    const _source = +source;
    if (!openCinemas[cinema]) return false;

    const cinemaRoom = openCinemas[cinema][roomName];
    if (!cinemaRoom) return false;

    console.log(cinemaRoom.currentVideo, currentVideo);

    if (cinemaRoom.currentVideo !== currentVideo) return false;

    // cinemaRoom.playlist.shift();
    const nextVideo = cinemaRoom.playlist[0];
    cinemaRoom.currentVideo = nextVideo.video;
    
    console.log(nextVideo);

    passToCinemaMembers(cinemaRoom, 'np-cinema:nextVideo', nextVideo.video);
});

const passToCinemaMembers = (room: CinemaRoom, event: string, ...args: any[]) => {
    for (const member of room.members) {
        console.log(member);
        emitNet(event, member, ...args);
    }
};

const getCharacterName = (source: number): string => {
    const user = NPX.getModule('Player').GetUser(source);
    if (!user) return '';

    return `${user.character.first_name} ${user.character.last_name}`
};