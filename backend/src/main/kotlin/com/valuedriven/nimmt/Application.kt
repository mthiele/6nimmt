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
                println("********************** ")
                return StompPrincipal(UUID.randomUUID().toString())
            }

            @Throws(Exception::class)
            fun beforeHandshake(
                    request: ServerHttpRequest,
                    response: ServerHttpResponse?,
                    wsHandler: WebSocketHandler?,
                    attributes: MutableMap<String, String>): Boolean {
                if (request is ServletServerHttpRequest) {
                    val session = request.servletRequest.session
                    attributes["sessionId"] = session.id
                }
                return true
            }
        }
        registry
                .addEndpoint("/gs-guide-websocket")
                .setAllowedOrigins("*")
                .setHandshakeHandler(handshakeHandler)
        registry
                .addEndpoint("/gs-guide-websocket")
                .setAllowedOrigins("*")
                .setHandshakeHandler(handshakeHandler).withSockJS()
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
                .headers { headers ->
                    headers
                            // allow same origin to frame our site to support iframe SockJS
                            .frameOptions { frameOptions -> frameOptions.sameOrigin() }
                }
                .authorizeRequests()
                .antMatchers("/**").permitAll()
                .anyRequest().authenticated()
    }
}
