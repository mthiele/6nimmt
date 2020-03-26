package com.valuedriven.nimmt

import com.valuedriven.nimmt.Util.randomString
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
    private val games = mutableListOf<Game>();

    @MessageMapping("/createNewGame")
    @SendTo("/topic/games")
    fun startNewGame(user: Principal, headerAccessor: SimpMessageHeaderAccessor): Game {
        println("user ++++++++++++   ${user.name}");
        val gameId = UUID.randomUUID()
        val newGame = Game(gameId, listOf(Player(name = randomString(10), sessionId = headerAccessor.sessionId.orEmpty())))
        games.add(newGame);
        return newGame
    }

    @MessageMapping("/listGames")
    @SendToUser("/queue/listGames")
    fun listGames(): List<Game> {
        return games;
    }

    @MessageMapping("/startGame")
    @SendTo("/topic/games")
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
}