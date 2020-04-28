package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.GameId
import com.valuedriven.nimmt.PlayerId

data class Player(val name: String, val id: PlayerId, val inGame: GameId?, val active: Boolean) {
}