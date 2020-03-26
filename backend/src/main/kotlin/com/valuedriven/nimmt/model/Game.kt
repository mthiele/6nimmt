package com.valuedriven.nimmt.model

import java.util.*

data class Game(val id: UUID, val activePlayers: List<Player>) {
}