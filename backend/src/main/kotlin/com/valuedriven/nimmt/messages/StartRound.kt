package com.valuedriven.nimmt.messages

import com.valuedriven.nimmt.model.PlayerState
import com.valuedriven.nimmt.model.Row

data class StartRound(val roundNumber: Int,
                      val playerState: PlayerState,
                      val rows: List<Row>) {
}