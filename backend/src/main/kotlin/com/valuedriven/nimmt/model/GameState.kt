package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.PlayerId

data class GameState(val roundNumber: Int,
                     val playerStates: Map<PlayerId, PlayerState>,
                     val rows: List<Row>) {
}