import { Card, PlayerState, Row, PlayerId } from "./Game"

export const START_GAME = "startGame"
export const START_ROUND = "startRound"
export const PLAY_CARD = "playCard"
export const PLAYED_CARD = "playedCard"
export const REVEAL_ALL_CARDS = "revealAllPlayedCards"
export const SELECT_ROW = "selectRow"
export const SELECTED_ROW = "selectedRow"
export const UPDATED_ROWS = "updatedRows"
export const GAME_FINISHED = "gameFinished"

export type MessageTypes =
    StartedGameMessage
    | StartRoundMessage
    | PlayCardMessage
    | PlayedCardMessage
    | RevealAllCardsMessage
    | SelectRowMessage
    | SelectedRowMessage
    | UpdatedRowsMessage
    | GameFinishedMessage

export interface StartedGameMessage {
    readonly messageType: typeof START_GAME
}

export interface StartRoundMessage {
    readonly messageType: typeof START_ROUND
    readonly payload: GameState
}

export interface GameState {
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

export interface SelectRowMessage {
    readonly messageType: typeof SELECT_ROW
    readonly payload: number | undefined
}

export interface SelectedRowMessage {
    readonly messageType: typeof SELECTED_ROW
    readonly payload: number
}

export const selectRowMessage = (row: number): SelectRowMessage => ({
    messageType: SELECT_ROW,
    payload: row,
})

export interface UpdatedRowsMessage {
    readonly messageType: typeof UPDATED_ROWS
    readonly payload: Row[]
}

export interface EndGameState {
    readonly roundNumber: number
    readonly playerStates: {[name: string]: PlayerState}
    readonly rows: Row[]
}

export interface GameFinishedMessage {
    readonly messageType: typeof GAME_FINISHED
    readonly payload: EndGameState
}
