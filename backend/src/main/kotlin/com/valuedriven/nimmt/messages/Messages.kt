package com.valuedriven.nimmt.messages

import com.valuedriven.nimmt.model.Card
import com.valuedriven.nimmt.model.PrivateGameState
import com.valuedriven.nimmt.model.Row

sealed class Message<T>(val messageType: String, val payload: T?)
class StartGameMessage(): Message<Void>("startGame", null)
class StartRoundMessage(payload: PrivateGameState) : Message<PrivateGameState>("startRound", payload)
class PlayCardMessage(payload: Card) : Message<Card>("playCard", payload)
class PlayedCardMessage(payload: PlayedCardHidden): Message<PlayedCardHidden>("playedCard", payload)
class RevealAllPlayedCardsMessage(payload: List<PlayedCard>): Message<List<PlayedCard>>("revealAllPlayedCards", payload)
class SelectRowMessage(payload: Int?): Message<Int?>("selectRow", payload)
class SelectedRowMessage(payload: Int): Message<Int>("selectedRow", payload)
class UpdatedRowsMessage(payload: List<Row>): Message<List<Row>>("updatedRows", payload)