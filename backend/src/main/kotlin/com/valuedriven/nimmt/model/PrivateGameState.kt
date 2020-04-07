package com.valuedriven.nimmt.model

data class PrivateGameState(val roundNumber: Int,
                            val playerState: PlayerState,
                            val rows: List<Row>) {
}