export type PlayerId = string

export interface Game {
    readonly id: string;
    readonly creator: string;
    readonly activePlayers: PlayerId[];
    readonly points: {[name: string]: Number};
    readonly started: boolean;
}

export interface Player {
    readonly name: string;
    readonly id: PlayerId;
    readonly inGame: string | undefined;
}

export interface PlayerState {
    readonly heap: Card[]
    readonly deck: Card[]
    readonly playedCard: Card | undefined   
}

export interface Card {
    readonly value: number
    readonly points: number
}

export interface Row {
    readonly number: number
    readonly cards: Card[]
}