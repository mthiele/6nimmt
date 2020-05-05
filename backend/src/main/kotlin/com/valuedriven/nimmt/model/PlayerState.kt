package com.valuedriven.nimmt.model

data class PlayerState(val heap: List<Card>, val deck: List<Card>, val playedCard: Card?, val placedCard: Boolean) {
}