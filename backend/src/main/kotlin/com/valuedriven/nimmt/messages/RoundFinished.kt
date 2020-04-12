package com.valuedriven.nimmt.messages

import com.valuedriven.nimmt.PlayerId
import com.valuedriven.nimmt.model.RoundState

data class RoundFinished(val roundState: RoundState,
                         val points: Map<PlayerId, List<Int>>,
                         val isGameFinished: Boolean) {
}