import { InitCinemas } from "./cinema";

export async function Init(): Promise<void> {
    await InitCinemas();
}