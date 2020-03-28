package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.Id
import java.util.*

data class GameState(val gameId: UUID,
                     val playerStates: Map<Id, PlayerState>,
                     val rows: List<Row>,
                     val roundNumber: Int) {
}