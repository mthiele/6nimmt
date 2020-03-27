export interface Game {
    readonly id: string;
    readonly activePlayers: Player[];
}

export interface Player {
    readonly name: string;
}