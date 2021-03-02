package com.valuedriven.nimmt

import com.valuedriven.nimmt.messages.*
import com.valuedriven.nimmt.model.*
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.stereotype.Controller
import org.springframework.web.socket.messaging.SessionConnectEvent
import org.springframework.web.socket.messaging.SessionDisconnectEvent
import java.security.Principal


@Controller
class GameController(
        private val playerService: PlayerService,
        private val gameService: GameService) {

    companion object {
        val logger: Logger = LoggerFactory.getLogger(GameController::class.java)
    }

    @EventListener
    fun onSocketDisconnected(event: SessionDisconnectEvent) {
        val header = StompHeaderAccessor.wrap(event.message)
        header.user?.let { playerService.disconnect(it) }
    }

    @EventListener
    fun onSocketReconnected(event: SessionConnectEvent) {
        val header = StompHeaderAccessor.wrap(event.message)
        header.user?.let { playerService.reconnect(it) }
    }

    @MessageMapping("/logout")
    fun logout(user: Principal) {
        playerService.logout(user)
    }

    @MessageMapping("/createPlayer")
    fun createPlayer(playerName: String, user: Principal) {
        playerService.createPlayer(playerName, user)
    }

    @MessageMapping("/createNewGame")
    fun createNewGame(user: Principal, headerAccessor: SimpMessageHeaderAccessor) {
        val gameId = gameService.startNewGame(user)
        playerService.playerJoinsGame(user, gameId)
    }

    @MessageMapping("/listGames")
    @SendToUser("/queue/games")
    fun listGames(): List<Game> {
        return gameService.listGames(playerService.activePlayers())
    }

    @MessageMapping("/listPlayers")
    @SendToUser("/queue/players")
    fun listPlayers(): List<Player> {
        return playerService.activePlayers()
    }

    @MessageMapping("/roundState/{gameId}")
    fun getRoundState(user: Principal, @DestinationVariable gameId: GameId) {
        gameService.getRoundState(user, gameId)
    }

    @MessageMapping("/joinGame")
    fun joinGame(user: Principal, game: Game) {
        if (gameService.joinGame(user, game)) playerService.playerJoinsGame(user, game.id)
    }

    @MessageMapping("/startGame")
    fun startGame(game: Game, user: Principal) {
        gameService.startGame(game, user)
    }

    @MessageMapping("/games/{gameId}/playCard")
    fun playCard(user: Principal, @DestinationVariable gameId: GameId, message: PlayCardMessage) {
        gameService.playCard(user, gameId, message)
    }

    @MessageMapping("/games/{gameId}/selectedRow")
    fun rowSelection(user: Principal, @DestinationVariable gameId: GameId, message: SelectedRowMessage) {
        gameService.rowSelection(user, gameId, message)
    }

    @MessageMapping("/games/{gameId}/startNewRound")
    fun startNewRound(user: Principal, @DestinationVariable gameId: GameId) {
        gameService.startNewRound(user, gameId)
    }

    @MessageMapping("/games/{gameId}/leave")
    fun leaveGame(user: Principal, @DestinationVariable gameId: GameId) {
        logger.info("${user.name} leaves game $gameId")

        val playersLeaving = gameService.leaveGame(user, gameId)
        playerService.playersLeaveGame(playersLeaving)
    }

}
