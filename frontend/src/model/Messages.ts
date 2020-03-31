import { Card, PlayerState, Row } from "./Game"

export const START_GAME = "startGame"
export const START_ROUND = "startRound"
export const PLAY_CARD = "playCard"

export type MessageTypes = StartedGameMessage | StartRoundMessage | PlayCardMessage

export interface StartedGameMessage {
    readonly messageType: typeof START_GAME
}

export interface StartRoundMessage {
    readonly messageType: typeof START_ROUND
    readonly payload: StartRound
}

export interface PlayCardMessage {
    readonly messageType: typeof PLAY_CARD
    readonly payload: Card
}

export const playCard = (payload: Card) : PlayCardMessage => {
    return {
        messageType: PLAY_CARD,
        payload,
    }
}

export interface StartRound {
    readonly roundNumber: number
    readonly playerState: PlayerState
    readonly rows: Row[]
}
