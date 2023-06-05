import * as Controllers from './controllers';

const ResourceName = GetCurrentResourceName();

on("onClientResourceStart", async (resource: string) => {
    if (resource !== ResourceName) return;
    await Controllers.Init();
});