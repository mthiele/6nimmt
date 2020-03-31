package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.Id

data class GameState(val roundNumber: Int,
                     val playerStates: Map<Id, PlayerState>,
                     val rows: List<Row>) {
}