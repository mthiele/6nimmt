import { Card, PlayerState } from "./Game"

export const START_ROUND = "startRound"
export const PLAY_CARD = "playCard"

export type MessageTypes = StartRoundMessage | PlayCardMessage

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
}
