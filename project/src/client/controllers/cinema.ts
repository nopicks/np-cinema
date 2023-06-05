import { GetModuleConfig } from "../../shared/config";
import { Delay } from "../../shared/utils/tools";
import { RegisterUICallback } from "../utils/tools";

let isInCinema = null;
let cinemaData: ClientCinemaData = null;
let cinemaTick = null;
let dui = null;

export const InitCinemas = (): void => {
    const config = exports['np-config'].GetModuleConfig('np-cinema:main');

    for (const location of config.locations) {
        if (!location.enabled) continue;

        createPolytarget(location);
    }
};

const createPolytarget = (location: LocationConfig): void => {
    globalThis.exports['np-polytarget'].AddBoxZone(
        `${location.prefix}_${location.id}`,
        location.polytarget.position,
        location.polytarget.width,
        location.polytarget.length,
        {
            heading: location.polytarget.heading,
            minZ: location.polytarget.minZ,
            minX: location.polytarget.minX,
        },
    );
    globalThis.exports['np-polytarget'].AddBoxZone(
        `${location.prefix}_${location.id}_exit`,
        location.polytarget.position,
        location.polytarget.width,
        location.polytarget.length,
        {
            heading: location.polytarget.heading,
            minZ: location.polytarget.minZ,
            minX: location.polytarget.minX,
        },
    );
    globalThis.exports['np-interact'].AddPeekEntryByPolyTarget(
        `${location.prefix}_${location.id}`,
        [
            {
                NPXEvent: 'np-cinema:getActiveCinemas',
                id: 'cinema_getactive',
                icon: 'box-open',
                label: 'go to cinema',
                parameters: {
                    cinema: location.id,
                },
            },
            {
                NPXEvent: 'np-cinema:openCinema',
                id: 'cinema_open',
                icon: 'box-open',
                label: 'start your own room',
                parameters: {
                    cinema: location.id,
                },
            },
        ],
        {
            distance: { radius: 2.0 },
            isEnabled: () => true,
        }
    );
    globalThis.exports['np-interact'].AddPeekEntryByPolyTarget(
        `${location.prefix}_${location.id}`,
        [
            {
                NPXEvent: 'np-cinema:getActiveCinemas',
                id: 'cinema_getactive',
                icon: 'box-open',
                label: 'go to cinema',
                parameters: {
                    cinema: location.id,
                },
            },
        ],
        {
            distance: { radius: 2.0 },
            isEnabled: () => true,
        },
    );
    if (location.sets) {
        globalThis.exports['np-polytarget'].AddBoxZone(
            
        )
    }
};

RPC.register('np-cinema:getActiveCinemas', async (params: { cinema: string }) => {
    if (!params.cinema) return;

    const rooms: { name: string; has_password: boolean; members: number }[] = await RPC.execute(
        'np-cinema:getActiveCinemas',
        params.cinema,
    );

    if (!rooms) return;

    const context = rooms.map((room) => {
        return {
            icon: 'booth-curtain',
            title: room.name,
            titleRight: room.members,
            actions: 'np-cinema:joinCinema',
            key: {
                cinema: params.cinema,
                room: room.name,
                has_password: room.has_password,
            },
        };
    });
});

RegisterUICallback(
    'np-cinema:joinCinema',
    async (params: { key: { cinema: string; room: string; has_password: boolean } }, cb) => {
        cb({ data: [], meta: { ok: true, message: '' } });

        if (!params.key.cinema || !params.key.room) return;

        let password = null;
        if (params.key.has_password) {
            await Delay(100);
            const prompt = await global.exports['np-ui'].OpenInputMenu(
                [
                    {
                        name: 'password',
                        icon: 'password',
                        label: 'Cinema password',
                        type: 'password',
                        _type: 'password',
                    },
                ],
                (values) => {
                    return values && values.password;
                },
            );
            if (!prompt || !prompt.password) return;
            password = prompt.password;
        }

        const room = await RPC.execute('np-cinema:joinCinema', params.key.cinema, params.key.room, password);

        if (!room) return emit('DoLongHudText', 'Could not join room, make sure the password is correct if there is one.', 2);
        emit('DoLongHudText', 'Joined room...Please wait');
    },
);

on('np-cinema:openCinema', async (params: { cinema: string }) => {
    if (!params.cinema) return;

    // todo: add saved room selection
    const prompt = await global.exports['np-ui'].OpenInputMenu(
        [
            {
                name: 'name',
                icon: 'pencil-alt',
                label: 'Cinema Name',
            },
            {
                name: 'password',
                icon: 'password',
                label: 'Cinema password (leave blank if open)',
                type: 'password',
                _type: 'password',
            },
        ],
        (values) => {
            return values && values.name;
        },
    );

});

onNet('np-cinema:joinedCinema', async (cinema: string, name: string, _cinemaData: any) => {
    isInCinema = cinema;

    cinemaData = {
        playlist: [],
        pastVideos: [],
        time: 0,
        volume: 50,
        ..._cinemaData,
    };

    global.exports['np-ui'].openApplication('cinema-control', {
        show: true,
        volume: cinemaData.volume,
    });
    
    global.exports['np-ui'].SetUIFocus(false, false);

    if (cinemaTick) {
        clearInterval(cinemaTick);
    }

    cinemaTick = setInterval(async () => {
        await Delay(4);

        if (IsControlJustPressed(0, 25)) {
            global.exports['np-ui'].SetUIFocus(true, true);
        }
    });

    dui = global.exports['np-lib'].getDui('nui://np-cinema/html/index.html', 1920, 1080);
    AddReplaceTexture('xee_news_cinema_txd', 'xee_news_cinema_bigscreen', dui.dictionary, dui.texture);
});

on('np-cinema:getTime', (requester: number) => {
    if (!isInCinema || !cinemaData) return;

    emitNet('np-cinema:returnTime', requester, cinemaData.time);
});


on('np-cinema:setTime', (time: number) => {
    if (!isInCinema || !cinemaData) return;

    cinemaData.time = time;
    // todo: set time in player
});

on('onResourceStop', (resourceName: string) => {
    if (resourceName !== 'np-cinema') return;

    if (cinemaTick) {
        clearInterval(cinemaTick);
    }
    RemoveReplaceTexture('xee_news_cinema_txd', 'xee_news_cinema_bigscreen');
    if (dui) {
        exports['np-lib'].releaseDui(dui.id);
    }
});

RegisterUICallback('np-cinema:changeVolume', (params: { volume: number }, cb) => {
    if (!isInCinema || !cinemaData) return;

    cinemaData.volume = params.volume;
    exports['np-lib'].sendDuiMessage(dui.id, {
        resource: 'np-cinema',
        type: 'set-volume',
        data: {
            volume: params.volume,
        },
    });
    cb({ data: [], meta: { ok: true, message: '' } });
});

const playVideo = (video: string) => {
    cinemaData.paused = false;
    exports['np-lib'].sendDuiMessage(dui.id, {
        resource: 'np-cinema',
        type: 'set-video',
        data: {
            url: video,
        },
    });
    exports['np-lib'].sendDuiMessage(dui.id, {
        resource: 'np-cinema',
        type: 'set-volume',
        data: {
            volume: cinemaData.volume,
        },
    });
    exports['np-ui'].sendAppEvent('cinema-control', {
        paused: false,
    });
};

RegisterUICallback('np-cinema:add', async (_, cb) => {
    const input = await global.exports['np-ui'].OpenInputMenu(
        [
            {
                name: 'url',
                icon: 'link',
                label: 'YouTube URL',
            },
        ],
        (values) => {
            return values && values.url;
        },
    );
    if (!input || !input.url)
        return;
    const url: string = input.url;
    let videoId = url;
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1];
    } else if (url.includes('youtube.com/shorts/')) {
        videoId = url.split('shorts/')[1];
    }
    console.log(videoId);

    if (!videoId) return;
    
    emitNet('np-cinema:queueVideo', isInCinema, cinemaData.name, videoId);
});

onNet('np-cinema:queuedVideo', (videoId: string, characterName: string) => {
    emit('DoLongHudText', `${characterName} added a video to the queue.`);
    cinemaData.playlist.push(videoId);
    cinemaData.pastVideos.push(videoId);

    if (cinemaData.paused && cinemaData.playlist.length == 1) {
        playVideo(videoId);
    }
});

RegisterUICallback('np-cinema:next', (_, cb) => {
    if (!isInCinema || !cinemaData) return;

    console.log(cinemaData);
    if (cinemaData.playlist.length > 0) {
        emitNet('np-cinema:nextVideo', isInCinema, cinemaData.name);
    } else {
        emit('DoLongHudText', 'No more videos in the queue.');
    }
});

// old
// onNet('np-cinema:nextVideo', (video: string, name: string) => {
//     emit('DoLongHudText', `${name} skipped the video.`);
//     cinemaData.playlist.shift();
//     if (cinemaData.playlist.length > 0) {
//         playVideo(cinemaData.playlist[0]);
//     }
// });

onNet('np-cinema:nextVideo', (video: string, name?: string) => {
    if (name) {
        emit('DoLongHudText', `${name} skipped the video.`);
    }
    const index = cinemaData.playlist.findIndex((v) => v.video == video);
    console.log(video, cinemaData.currentVideo);
    if (index > -1) {
        for (let i = 0; i < index; i++) {
            cinemaData.playlist.shift();
        }
    }
    if (cinemaData.playlist.length > 0) {
        playVideo(cinemaData.playlist[0].video);
    }
});

onNet('np-cinema:resetPlaylists', (playlist: Video[], pastVideos: Video[]) => {
    cinemaData.playlist = playlist;
    cinemaData.pastVideos = pastVideos;

    exports['np-ui'].sendAppEvent('cinema-control', {
        playlist: cinemaData.pastVideos,
    });

    if (cinemaData.playlist.length > 0) {
        playVideo(cinemaData.playlist[0].video);
    }
});

RegisterUICallback('np-cinema:playVideo', (data: { video: string }, cb) => {
    cb({ data: [], meta: { ok: true, message: '' } });
    if (!isInCinema || !cinemaData) return;

    emitNet('np-cinema:addVideo', isInCinema, cinemaData.name, data.video);
});

RegisterUICallback('np-cinema:removeVideo', (data: { video: string }, cb) => {
    cb({ data: [], meta: { ok: true, message: '' } });
    if (!isInCinema || !cinemaData) return;

    emitNet('np-cinema:removeVideo', isInCinema, cinemaData.name, data.video);
});

RegisterUICallback('np-cinema:pause', (_, cb) => {
    cb({ data: [], meta: { ok: true, message: '' } });
    if (!isInCinema || !cinemaData) return;

    emitNet('np-cinema:paused', isInCinema, cinemaData.name, !cinemaData.paused);
});

RegisterUICallback('np-cinema:play', (_, cb) => {
    cb({ data: [], meta: { ok: true, message: '' } });
    if (!isInCinema || !cinemaData) return;

    emitNet('np-cinema:paused', isInCinema, cinemaData.name, !cinemaData.paused);
});

onNet('np-cinema:paused', (paused: boolean, name: string) => {
    emit('DoLongHudText', `${name} ${paused ? 'paused' : 'unpaused'} the video.`);

    cinemaData.paused = paused;
    exports['np-lib'].sendDuiMessage(dui.id, {
        resource: 'np-cinema',
        type: 'set-paused',
        data: {
            paused,
        },
    });
    exports['np-ui'].sendAppEvent('cinema-control', {
        paused,
    });
});

onNet('np-cinema:removeVideo', (video: string, name: string) => {
    console.log(video, name);
    const index = cinemaData.playlist.findIndex((v) => v.video == video);
    if (index > -1) {
        cinemaData.playlist.splice(index, 1);
    }

    const pastIndex = cinemaData.pastVideos.findIndex((v) => v.video == video);
    if (pastIndex > -1) {
        cinemaData.pastVideos.splice(pastIndex, 1);
    }

    emit('DoLongHudText', `${name} removed a video from the queue.`);

    exports['np-ui'].sendAppEvent('cinema-control', {
        playlist: cinemaData.pastVideos,
    });
});

RegisterNuiCallbackType('time');
on('__cfx_nui:time', (data: { time: number }, cb) => {
    if (!isInCinema || !cinemaData) return;

    cinemaData.time = data.time;
});

RegisterUICallback('np-cinema:advance', (data: { time: number }, cb) => {
    if (!isInCinema || !cinemaData) return;

    emitNet('np-cinema:setTime', isInCinema, cinemaData.name, cinemaData.time + data.time);
});

RegisterUICallback('np-cinema:seek', async (_, cb) => {
    await Delay(100);

    const input = await global.exports['np-ui'].OpenInputMenu(
        [
            {
                name: 'time',
                icon: 'time',
                label: 'time',
                _defaultValue: cinemaData.time.toFixed(0) ?? 0,
            },
        ],
        (values) => {
            return values && values.time;
        },
    );

    if (!input || !input.time) return;

    const time: number = parseInt(input.time);
    if (!time) return;

    emitNet('np-cinema:setTime', isInCinema, cinemaData.name, time);
});

onNet('np-cinema:setTime', (time: number, name: string) => {
    emit('DoLongHudText', `${name} advanced the video to ${time.toFixed(0)} seconds.`);

    cinemaData.time = time;
    exports['np-lib'].sendDuiMessage(dui.id, {
        resource: 'np-cinema',
        type: 'set-time',
        data: {
            time,
        },
    });
});

RegisterUICallback('np-cinema:viewPlaylist', (_, cb) => {
    if (!isInCinema || !cinemaData) {
        return cb({ data: [[], null], meta: { ok: true, message: '' } });
    }

    cb({ data: [cinemaData.pastVideos, cinemaData.currentVideo], meta: { ok: true, message: '' } });
});

// RegisterUICallback('np-cinema:viewPlaylist', (_, cb) => {
//     if (!isInCinema || !cinemaData) {
//         return cb({
//             data: {
//                 playlist: [], 
//                 currentVideo: null,
//             },
//             meta: { ok: true, message: '' },
//         });
//     }

//     cb({
//         data: {
//             playlist: cinemaData.pastVideos,
//             currentVideo: cinemaData.currentVideo,
//         },
//         meta: { ok: true, message: '' },
//     });
// });

RegisterNuiCallbackType('end');
on('__cfx_nui:end', (data: { currentVideo: string }, cb) => {
    if (!isInCinema || !cinemaData) return;

    console.log(data.currentVideo, cinemaData.currentVideo);

    if (data.currentVideo !== cinemaData.currentVideo) return;

    emitNet('np-cinema:videoEnded', isInCinema, cinemaData.name, cinemaData.currentVideo);
});