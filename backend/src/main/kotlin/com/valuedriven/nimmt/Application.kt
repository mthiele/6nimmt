package com.valuedriven.nimmt

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Configuration
import org.springframework.http.server.ServerHttpRequest
import org.springframework.http.server.ServerHttpResponse
import org.springframework.http.server.ServletServerHttpRequest
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import org.springframework.web.socket.server.support.DefaultHandshakeHandler
import java.security.Principal
import java.util.*

typealias Id = String

@SpringBootApplication
class Application

fun main(args: Array<String>) {
    runApplication<Application>(*args)
}


@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig : WebSocketMessageBrokerConfigurer {
    override fun configureMessageBroker(config: MessageBrokerRegistry) {
        config.enableSimpleBroker("/topic", "/queue")
        config.setApplicationDestinationPrefixes("/app")
        config.setUserDestinationPrefix("/user");
    }

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        val handshakeHandler = object : DefaultHandshakeHandler() {
            override fun determineUser(request: ServerHttpRequest,
                                       wsHandler: WebSocketHandler,
                                       attributes: Map<String, Any>): Principal? {
                return StompPrincipal(UUID.randomUUID().toString())
            }
        }
        registry
                .addEndpoint("/gs-guide-websocket")
                .setAllowedOrigins("*")
                .setHandshakeHandler(handshakeHandler)
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
