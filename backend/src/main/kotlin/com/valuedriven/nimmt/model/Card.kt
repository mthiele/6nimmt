package com.valuedriven.nimmt.model

data class Card(val value: Int) {
    fun getPoints(): Int {
        return when {
            value == 55 -> 7
            value % 10 == 0 -> 3
            value % 5 == 0 -> 2
            value % 11 == 0 -> 5
            else -> 1
        }
    }
}