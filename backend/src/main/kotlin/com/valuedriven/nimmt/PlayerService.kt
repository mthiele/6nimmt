package com.valuedriven.nimmt

import com.valuedriven.nimmt.model.Player
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service
import java.security.Principal
import java.util.*
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

@Service
class PlayerService(
        private val simpMessagingTemplate: SimpMessagingTemplate,
        private val gameService: GameService) {

    private val players = mutableMapOf<PlayerId, Player>()
    private val scheduler = Executors.newSingleThreadScheduledExecutor()
    private val disconnectingPlayers = mutableMapOf<PlayerId, ScheduledFuture<*>>()

    companion object {
        val logger: Logger = LoggerFactory.getLogger(PlayerService::class.java)
    }

    fun disconnect(user: Principal) {
        logger.info("disconnect: ${user.name} (${players[user.name]?.name})")

        val scheduledFuture = scheduler.schedule({
            players[user.name]?.let { player -> players[user.name] = player.copy(active = false) }
            gameService.leaveGame(user)
        }, 90, TimeUnit.SECONDS)
        disconnectingPlayers[user.name] = scheduledFuture
    }

    fun reconnect(user: Principal) {
        logger.info("re-connect: ${user.name} (${players[user.name]?.name})")

        disconnectingPlayers[user.name]?.cancel(true)
        players[user.name]?.let { player -> players[user.name] = player.copy(active = true) }
    }

    fun logout(user: Principal) {
        logger.info("logout: ${user.name} (${players[user.name]?.name})")

        gameService.leaveGame(user)
        players.remove(user.name)
        simpMessagingTemplate.convertAndSend("/topic/players", activePlayers())
    }

    fun createPlayer(playerName: String, user: Principal) {
        // use a random ID as the given user could be a cached older user
        val newPlayer = Player(name = playerName, id = UUID.randomUUID().toString(), inGame = null, active = true)
        players.putIfAbsent(newPlayer.id, newPlayer)

        logger.info("create player: ${user.name} (${players[user.name]?.name})")

        simpMessagingTemplate.convertAndSendToUser(user.name, "/queue/player", newPlayer)
        simpMessagingTemplate.convertAndSend("/topic/players", activePlayers())
    }

    fun playerJoinsGame(user: Principal, gameId: GameId?) {
        players[user.name]?.let { player ->
            players.replace(user.name, player.copy(inGame = gameId, active = true))
            simpMessagingTemplate.convertAndSend("/topic/players", activePlayers())
        }
    }

    fun playersLeaveGame(playersLeaving: List<PlayerId>) {
        playersLeaving.forEach {
            players.compute(it) { _, player -> player?.copy(inGame = null) }
        }
        simpMessagingTemplate.convertAndSend("/topic/players", activePlayers())
    }

    fun activePlayers() = players.values.filter { it.active }


}