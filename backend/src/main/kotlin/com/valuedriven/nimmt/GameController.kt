package com.valuedriven.nimmt

import com.valuedriven.nimmt.model.*
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.SendTo
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.stereotype.Controller
import java.security.Principal
import java.util.*

@Controller
class GameController {
    private val games = mutableListOf<Game>()
    private val players = mutableMapOf<Id, Player>()

    @MessageMapping("/createPlayer")
    @SendTo("/topic/players")
    fun createPlayer(playerName: String, user: Principal, headerAccessor: SimpMessageHeaderAccessor): List<Player> {
        val newPlayer = Player(name = playerName, id = user.name, sessionId = headerAccessor.sessionId.orEmpty())
        players.putIfAbsent(user.name, newPlayer)
        return players.values.toList()
    }

    @MessageMapping("/createNewGame")
    @SendTo("/topic/games")
    fun startNewGame(user: Principal, headerAccessor: SimpMessageHeaderAccessor): List<Game> {
        val player = players[user.name]
        if (checkIfPlayerAlreadyHasGame(player)) return games
        val gameId = UUID.randomUUID()
        val newGame = Game(gameId, player?.let { listOf(it) }.orEmpty())
        games.add(newGame);
        return games
    }

    @MessageMapping("/listGames")
    @SendToUser("/queue/games")
    fun listGames(): List<Game> {
        return games;
    }

    @MessageMapping("/joinGame")
    @SendTo("/topic/games")
    fun joinGame(user: Principal, game: Game): List<Game> {
        val player = players[user.name]
        if (checkIfPlayerAlreadyHasGame(player)) return games

        val gameIndex = games.indexOf(game)
        val gameToUpdate = games[gameIndex]

        games[gameIndex] = gameToUpdate.copy(id = gameToUpdate.id, activePlayers = when (player) {
            null -> gameToUpdate.activePlayers
            else -> gameToUpdate.activePlayers.plus(player)
        })

        return games
    }

    @MessageMapping("/startGame")
    @SendTo("/topic/activeGames")
    fun startGame(game: Game): GameState {
        val random = Random()

        val cards = (1..104)
                .map { value -> Card(value) }
                .toMutableList()

        val playerStates = game.activePlayers
                .map { PlayerState(Heap(emptyList()), Deck(deal10Cards(cards, random)), null) }

        val rows = IntArray(4)
                .map { Row(number = it + 1, cards = assign1Card(cards, random)) }

        return GameState(game.id, game.activePlayers.zip(playerStates).toMap(), rows, 1)
    }

    private fun deal10Cards(cards: MutableList<Card>, random: Random) =
            IntArray(10).map { cards.removeAt(random.nextInt(cards.size)) }

    private fun assign1Card(cards: MutableList<Card>, random: Random) =
            listOf(cards.removeAt(random.nextInt(cards.size)))

    private fun checkIfPlayerAlreadyHasGame(player: Player?): Boolean {
        if (games.any { it.activePlayers.contains(player) }) {
            return true
        }
        return false
    }
}