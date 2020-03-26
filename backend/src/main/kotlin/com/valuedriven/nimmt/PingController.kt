package com.valuedriven.nimmt

import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.stereotype.Controller


@Controller
class PingController {
    @MessageMapping("/ping")
    @SendTo("/topic/message")
    @Throws(Exception::class)
    fun greeting(ping: Ping): Message? {
        return Message("Hello!")
    }
}