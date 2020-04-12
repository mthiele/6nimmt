package com.valuedriven.nimmt.model

data class PrivateRoundState(val stepNumber: Int,
                             val playerState: PlayerState,
                             val rows: List<Row>) {
}