package com.valuedriven.nimmt.model

import com.valuedriven.nimmt.Id
import java.util.*

data class Player(val name: String, val id: Id, val sessionId: String, val inGame: UUID?) {
}