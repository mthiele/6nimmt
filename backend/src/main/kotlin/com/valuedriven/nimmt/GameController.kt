package com.valuedriven.nimmt

import com.valuedriven.nimmt.messages.*
import com.valuedriven.nimmt.model.*
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
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
    private val games = mutableMapOf<UUID, Game>()
    private val players = mutableMapOf<PlayerId, Player>()
    private val gameStates = mutableMapOf<UUID, GameState>()

    @MessageMapping("/createPlayer")
    fun createPlayer(playerName: String, user: Principal) {
        // use a random ID as the given user could be a cached older user
        val newPlayer = Player(name = playerName, id = UUID.randomUUID().toString(), inGame = null)
        players.putIfAbsent(user.name, newPlayer)

        simpMessagingTemplate.convertAndSendToUser(user.name, "/queue/player", newPlayer)
        simpMessagingTemplate.convertAndSend("/topic/players", players.values)
    }

    @MessageMapping("/createNewGame")
    fun startNewGame(user: Principal, headerAccessor: SimpMessageHeaderAccessor) {
        if (checkIfPlayerAlreadyHasGame(user.name)) return

        val gameId = UUID.randomUUID()
        val newGame = Game(id = gameId, creator = user.name, activePlayers = listOf(user.name), started = false)
        games[gameId] = newGame
        simpMessagingTemplate.convertAndSendToUser(user.name, "/queue/game", newGame)
        simpMessagingTemplate.convertAndSend("/topic/games", games.values)

        playerJoinsGame(user, gameId)
    }

    @MessageMapping("/listGames")
    @SendToUser("/queue/games")
    fun listGames(): List<Game> {
        return games.values.toList()
    }

    @MessageMapping("/listPlayers")
    @SendToUser("/queue/players")
    fun listPlayers(): List<Player> {
        return players.values.toList()
    }

    @MessageMapping("/gameState/{gameId}")
    fun getGameState(user: Principal, @DestinationVariable gameId: UUID) {
        println("gameState: $gameId")
        println("user: ${user.name}")
        val gameState = getGameState(gameId)

        val playerState = gameState.playerStates[user.name]
                ?: throw IllegalArgumentException("Cannot find playerState for ${user.name}")
        val privateGameState = PrivateGameState(roundNumber = gameState.roundNumber,
                playerState = playerState,
                rows = gameState.rows)

        simpMessagingTemplate.convertAndSendToUser(user.name, "${activeGame(gameId)}/gameState", privateGameState)
    }

    @MessageMapping("/joinGame")
    fun joinGame(user: Principal, game: Game) {
        if (checkIfPlayerAlreadyHasGame(user.name)) return

        games[game.id] = game.copy(id = game.id, activePlayers = game.activePlayers.plus(user.name), started = false)
        simpMessagingTemplate.convertAndSend("/topic/games", games.values)

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
                .map { PlayerState(heap = emptyList(), deck = deal10Cards(cards, random), playedCard = null) }

        val rows = (1..4)
                .map { Row(number = it, cards = assign1Card(cards, random)) }

        gameStates[game.id] = GameState(roundNumber = 1, playerStates = game.activePlayers.zip(playerStates).toMap(), rows = rows)

        games[game.id] = game.copy(id = game.id, creator = game.creator, activePlayers = game.activePlayers, started = true)
        simpMessagingTemplate.convertAndSend("/topic/games", games.values)

        game.activePlayers.forEach { player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id), StartGameMessage())
        }

        Thread.sleep(500) // FIXME give the client time to create the game
        game.activePlayers.forEachIndexed { index, player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id),
                    StartRoundMessage(payload = PrivateGameState(roundNumber = 1, playerState = playerStates[index], rows = rows)))
        }
    }

    @MessageMapping("/games/{gameId}/playCard")
    fun playCard(user: Principal, @DestinationVariable gameId: UUID, message: PlayCardMessage) {

        val playedCard = message.payload ?: throw IllegalArgumentException("Played card cannot be null")
        val gameState = getGameState(gameId)
        val playerState = gameState.playerStates[user.name]
                ?: throw IllegalArgumentException("Cannot find player state for gameId $gameId and player ${user.name}")
        val game = getGame(gameId)

        val newGameState = userPlayedCard(playerState, playedCard, gameState, user)
        gameStates[gameId] = newGameState

        if (checkWhetherPlayerHasPlayedLastMissingCardThisRound(newGameState)) {
            sendRevealAllPlayedCards(game, newGameState)
        } else {
            sendUserPlayedCard(game, user)
        }
    }

    private fun userPlayedCard(playerState: PlayerState, playedCard: Card, gameState: GameState, user: Principal): GameState {
        val newPlayerState = playerState.copy(heap = playerState.heap,
                deck = playerState.deck.minus(playedCard),
                playedCard = playedCard)
        return gameState.copy(roundNumber = gameState.roundNumber,
                rows = gameState.rows,
                playerStates = gameState.playerStates.minus(user.name).plus(Pair(user.name, newPlayerState)))
    }

    private fun sendUserPlayedCard(game: Game, user: Principal) {
        game.activePlayers.forEach { player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id),
                    PlayedCardMessage(payload = PlayedCardHidden(player = user.name)))
        }
    }

    private fun sendRevealAllPlayedCards(game: Game, gameState: GameState) {
        game.activePlayers.forEach { player ->
            val allPlayedCards = gameState.playerStates.map { playerState -> PlayedCard(playerState.key, playerState.value.playedCard!!) }
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id),
                    RevealAllPlayedCardsMessage(payload = allPlayedCards))
        }
    }

    private fun activeGame(gameId: UUID) = "/queue/activeGames/$gameId"

    private fun playerJoinsGame(user: Principal, gameId: UUID?) {
        players[user.name]?.let { player ->
            players.replace(user.name, player.copy(name = player.name, id = player.id, inGame = gameId))
            simpMessagingTemplate.convertAndSend("/topic/players", players.values)
        }
    }

    private fun deal10Cards(cards: MutableList<Card>, random: Random) =
            IntArray(10).map { cards.removeAt(random.nextInt(cards.size)) }

    private fun assign1Card(cards: MutableList<Card>, random: Random) =
            listOf(cards.removeAt(random.nextInt(cards.size)))

    private fun checkIfPlayerAlreadyHasGame(player: PlayerId): Boolean {
        return games.values.any { it.activePlayers.contains(player) || it.creator == player }
    }

    private fun checkWhetherPlayerHasPlayedLastMissingCardThisRound(gameState: GameState): Boolean {
        return gameState.playerStates.values.none { playerState ->
            playerState.playedCard === null
        }
    }

    private fun getGame(gameId: UUID) =
            games[gameId] ?: throw IllegalArgumentException("Cannot find game with id $gameId")

    private fun getGameState(gameId: UUID) = (gameStates[gameId]
            ?: throw IllegalArgumentException("Cannot find gameState for game with id $gameId"))
}
