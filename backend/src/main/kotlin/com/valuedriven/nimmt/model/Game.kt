package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.GameId
import com.valuedriven.nimmt.PlayerId
import java.util.*

data class Game(val id: GameId,
                val creator: PlayerId,
                val started: Boolean,
                val activePlayers: List<PlayerId>,
                val points: Map<PlayerId, List<Int>>) {
}