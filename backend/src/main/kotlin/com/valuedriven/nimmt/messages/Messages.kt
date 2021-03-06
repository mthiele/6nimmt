package com.valuedriven.nimmt.messages

import com.valuedriven.nimmt.model.Card
import com.valuedriven.nimmt.model.PrivateRoundState
import com.valuedriven.nimmt.model.Row

sealed class Message<T>(val messageType: String, val payload: T?) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as Message<*>

        if (messageType != other.messageType) return false
        if (payload != other.payload) return false

        return true
    }

    override fun hashCode(): Int {
        var result = messageType.hashCode()
        result = 31 * result + (payload?.hashCode() ?: 0)
        return result
    }
}
class StartGameMessage() : Message<Void>("startGame", null)
class StartStepMessage(payload: PrivateRoundState) : Message<PrivateRoundState>("startStep", payload)
class PlayCardMessage(payload: Card) : Message<Card>("playCard", payload)
class PlayedCardMessage(payload: PlayedCardHidden) : Message<PlayedCardHidden>("playedCard", payload)
class RevealAllPlayedCardsMessage(payload: List<PlayedCard>) : Message<List<PlayedCard>>("revealAllPlayedCards", payload)
class SelectRowMessage(payload: Int?) : Message<Int?>("selectRow", payload)
class SelectedRowMessage(payload: Int) : Message<Int>("selectedRow", payload)
class UpdatedRowsMessage(payload: List<Row>) : Message<List<Row>>("updatedRows", payload)
class RoundFinishedMessage(payload: RoundFinished) : Message<RoundFinished>("roundFinished", payload)