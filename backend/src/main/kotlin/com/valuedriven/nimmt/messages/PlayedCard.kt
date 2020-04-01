package com.valuedriven.nimmt.messages

import com.valuedriven.nimmt.PlayerId
import com.valuedriven.nimmt.model.Card

data class PlayedCard(val player: PlayerId, val card: Card) {
}