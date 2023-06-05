export async function Delay(pTime) {
    return new Promise<void>((resolve) => setTimeout(() => resolve(), pTime));
}