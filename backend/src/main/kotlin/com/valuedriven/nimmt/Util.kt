package com.valuedriven.nimmt

object Util {
    private val charPool : List<Char> = ('a'..'z') + ('A'..'Z') + ('0'..'9')
    fun randomString(length: Int) = (1..length)
            .map { kotlin.random.Random.nextInt(0, charPool.size) }
            .map(charPool::get)
            .joinToString("")

    fun <E> Iterable<E>.replace(old: E, new: E) = map { if (it == old) new else it }
}