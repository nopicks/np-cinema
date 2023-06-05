import { InitCinema } from "./cinema";
import { InitEvents } from "./events";

export async function Init(): Promise<void> {
    await InitEvents();
    await InitCinema();
}
