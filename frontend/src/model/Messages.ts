import { Card, PlayerState, Row, PlayerId } from "./Game"

export const START_GAME = "startGame"
export const START_ROUND = "startRound"
export const PLAY_CARD = "playCard"
export const PLAYED_CARD = "playedCard"
export const REVEAL_ALL_CARDS = "revealAllPlayedCards"

export type MessageTypes = StartedGameMessage | StartRoundMessage | PlayCardMessage | PlayedCardMessage | RevealAllCardsMessage

export interface StartedGameMessage {
    readonly messageType: typeof START_GAME
}

export interface StartRoundMessage {
    readonly messageType: typeof START_ROUND
    readonly payload: StartRound
}

export interface StartRound {
    readonly roundNumber: number
    readonly playerState: PlayerState
    readonly rows: Row[]
}

export interface PlayCardMessage {
    readonly messageType: typeof PLAY_CARD
    readonly payload: Card
}

export const playCard = (payload: Card): PlayCardMessage => {
    return {
        messageType: PLAY_CARD,
        payload,
    }
}

export interface PlayedCardMessage {
    readonly messageType: typeof PLAYED_CARD
    readonly payload: PlayedCard
}

export interface PlayCardHidden {
    readonly player: PlayerId
}

export interface RevealAllCardsMessage {
    readonly messageType: typeof REVEAL_ALL_CARDS
    readonly payload: PlayedCard[]
}

export interface PlayedCard {
    readonly player: PlayerId
    readonly card: Card
}
