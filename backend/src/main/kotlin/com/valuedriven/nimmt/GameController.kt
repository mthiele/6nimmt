package com.valuedriven.nimmt

import com.valuedriven.nimmt.model.*
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.stereotype.Controller
import java.lang.RuntimeException
import java.security.Principal
import java.util.*

@Controller
class GameController(private val simpMessagingTemplate: SimpMessagingTemplate) {

    // FIXME concurrency?
    private val games = mutableListOf<Game>()
    private val players = mutableMapOf<Id, Player>()

    @MessageMapping("/createPlayer")
    fun createPlayer(playerName: String, user: Principal, headerAccessor: SimpMessageHeaderAccessor) {
        val newPlayer = Player(name = playerName, id = user.name, sessionId = headerAccessor.sessionId.orEmpty(), inGame = null)
        players.putIfAbsent(user.name, newPlayer)

        simpMessagingTemplate.convertAndSendToUser(user.name, "/queue/player", newPlayer)
        simpMessagingTemplate.convertAndSend("/topic/players", players.values)
    }

    @MessageMapping("/createNewGame")
    fun startNewGame(user: Principal, headerAccessor: SimpMessageHeaderAccessor) {
        if (checkIfPlayerAlreadyHasGame(user.name)) return

        val gameId = UUID.randomUUID()
        val newGame = Game(id = gameId, creator = user.name, activePlayers = listOf(user.name), started = false)
        games.add(newGame)
        simpMessagingTemplate.convertAndSendToUser(user.name, "/queue/game", newGame)
        simpMessagingTemplate.convertAndSend("/topic/games", games)

        playerJoinsGame(user, gameId)
    }

    @MessageMapping("/listGames")
    @SendToUser("/queue/games")
    fun listGames(): List<Game> {
        return games;
    }

    @MessageMapping("/listPlayers")
    @SendToUser("/queue/players")
    fun listPlayers(): List<Player> {
        return players.values.toList()
    }

    @MessageMapping("/joinGame")
    fun joinGame(user: Principal, game: Game) {
        if (checkIfPlayerAlreadyHasGame(user.name)) return

        val gameIndex = games.indexOf(game)
        games[gameIndex] = game.copy(id = game.id, activePlayers = game.activePlayers.plus(user.name), started = false)
        simpMessagingTemplate.convertAndSend("/topic/games", games)

        playerJoinsGame(user, game.id)
    }

    @MessageMapping("/startGame")
    fun startGame(game: Game, user: Principal) {
        if (game.creator != user.name) {
            throw RuntimeException("Cannot start a game if not creator")
        }

        val random = Random()

        val cards = (1..104)
                .map { value -> Card(value) }
                .toMutableList()

        val playerStates = game.activePlayers
                .map { PlayerState(Heap(emptyList()), Deck(deal10Cards(cards, random)), null) }

        val rows = (1..4)
                .map { Row(number = it, cards = assign1Card(cards, random)) }

        simpMessagingTemplate.convertAndSend("/topic/activeGames/" + game.id, GameState(game.id, game.activePlayers.zip(playerStates).toMap(), rows, 1))

        val gameIndex = games.indexOf(game)
        games[gameIndex] = game.copy(id = game.id, creator = game.creator, activePlayers = game.activePlayers, started = true)
        simpMessagingTemplate.convertAndSend("/topic/games", games)
    }

    private fun playerJoinsGame(user: Principal, gameId: UUID?) {
        players[user.name]?.let { player ->
            players.replace(user.name, player.copy(name = player.name, id = player.id, sessionId = player.sessionId, inGame = gameId))
            simpMessagingTemplate.convertAndSend("/topic/players", players.values)
        }
    }

    private fun deal10Cards(cards: MutableList<Card>, random: Random) =
            IntArray(10).map { cards.removeAt(random.nextInt(cards.size)) }

    private fun assign1Card(cards: MutableList<Card>, random: Random) =
            listOf(cards.removeAt(random.nextInt(cards.size)))

    private fun checkIfPlayerAlreadyHasGame(player: Id): Boolean {
        return games.any { it.activePlayers.contains(player) || it.creator == player }
    }
}