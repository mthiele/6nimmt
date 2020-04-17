package com.valuedriven.nimmt

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer
import org.springframework.util.MultiValueMap
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import java.security.Principal
import java.util.*


typealias PlayerId = String
typealias GameId = String

@SpringBootApplication
class Application

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}


@Configuration
@EnableWebSocketMessageBroker
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
class WebSocketConfig : WebSocketMessageBrokerConfigurer {
    override fun configureMessageBroker(config: MessageBrokerRegistry) {
        config.enableSimpleBroker("/topic", "/queue", "/user")
        config.setApplicationDestinationPrefixes("/app")
        config.setUserDestinationPrefix("/user");
    }

    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        registration.interceptors(SessionChannelInterceptor())
    }

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry
                .addEndpoint("/websocket")
                .setAllowedOrigins("*")
    }
}

class StompPrincipal(private val name: String) : Principal {
    override fun getName(): String {
        return name;
    }

}

@Configuration
class WebSocketSecurityConfig : AbstractSecurityWebSocketMessageBrokerConfigurer() {
    override fun configureInbound(messages: MessageSecurityMetadataSourceRegistry) {
        messages.anyMessage().authenticated()
                .anyMessage().permitAll()
    }

    override fun sameOriginDisabled(): Boolean {
        return true
    }
}

@Configuration
@EnableGlobalMethodSecurity(prePostEnabled = true, securedEnabled = true)
@EnableWebSecurity
class SecurityConfig : WebSecurityConfigurerAdapter() {
    override fun configure(http: HttpSecurity) {
        http
                .authorizeRequests()
                .antMatchers("/**").permitAll()
                .anyRequest().authenticated()
    }
}

class SessionChannelInterceptor : ChannelInterceptor {

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*> {
        val accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor::class.java)!!
        val nativeHeaders = message.headers.get(StompHeaderAccessor.NATIVE_HEADERS, MultiValueMap::class.java)
        if (nativeHeaders != null && StompCommand.CONNECT == accessor.command) {
            val tokenList = nativeHeaders["token"]
            val id =
                    if (tokenList.isNullOrEmpty() || tokenList[0] == "")
                        UUID.randomUUID()
                    else
                        tokenList[0]
            val user = StompPrincipal(id.toString())
            accessor.user = user
        }
        return message
    }

}