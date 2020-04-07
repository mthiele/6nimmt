package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.PlayerId
import java.util.*

data class Player(val name: String, val id: PlayerId, val inGame: UUID?) {
}