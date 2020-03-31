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

export interface PlayerState {
    readonly heap: Heap
    readonly deck: Deck
    readonly playedCard: Card | undefined   
}

export interface Heap {
    readonly cards: Card[]
}

export interface Deck {
    readonly cards: Card[]
}

export interface Card {
    readonly value: number
    readonly points: number
}

export interface Row {
    readonly number: number
    readonly cards: Card[]
}