export interface Game {
    readonly id: string;
    readonly creator: string;
    readonly activePlayers: string[];
    readonly started: boolean;
}

export interface Player {
    readonly name: string;
    readonly id: string;
    readonly sessionId: string;
    readonly inGame: string | undefined;
}