package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.PlayerId

data class RoundState(val stepNumber: Int,
                      val playerStates: Map<PlayerId, PlayerState>,
                      val rows: List<Row>) {
}