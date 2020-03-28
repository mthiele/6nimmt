package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.Id
import java.util.*

data class Game(val id: UUID, val creator: Id, val activePlayers: List<Id>, val started: Boolean) {
}