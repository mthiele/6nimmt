package com.valuedriven.nimmt.model

import java.util.*

data class GameState(val gameId: UUID,
                     val playerStates: Map<Player, PlayerState>,
                     val rows: List<Row>,
                     val roundNumber: Int) {
}