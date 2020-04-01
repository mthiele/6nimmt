package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.PlayerId
import java.util.*

data class Game(val id: UUID, val creator: PlayerId, val activePlayers: List<PlayerId>, val started: Boolean) {
}