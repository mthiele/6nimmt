package com.valuedriven.nimmt.messages

import com.valuedriven.nimmt.model.Card

sealed class Message<T>(val messageType: String, val payload: T)
class StartRoundMessage(payload: StartRound) : Message<StartRound>("startRound", payload)
class PlayCardMessage(payload: Card) : Message<Card>("playCard", payload)