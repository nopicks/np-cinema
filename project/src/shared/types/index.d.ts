declare const AsyncExports: any 

declare class RPC {
    static register(name: string, cb: (source: number, ...args: any) => any): void 
    static execute(name: string, ...args: any): any
}

declare class NPX {
    static getModule(name: any): any
}

declare namespace NPX {
    class Events {
        static addHook(name: string, cb: (...args: any) => any): void
        static start(): Promise<void>
    }

    class Procedures {
        static register(name: string, cb: (source: number, ...args: any) => any): void 
        static execute(name: string, ...args: any): any
    }
}