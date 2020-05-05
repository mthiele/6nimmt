package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.PlayerId

data class PrivateRoundState(val stepNumber: Int,
                             val playerState: PlayerState,
                             val playedCards: Map<PlayerId, Card?>,
                             val rows: List<Row>,
                             val numberOfPlayers: Int) {
}