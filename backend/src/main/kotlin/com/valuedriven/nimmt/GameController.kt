package com.valuedriven.nimmt

import com.valuedriven.nimmt.Util.replace
import com.valuedriven.nimmt.messages.*
import com.valuedriven.nimmt.model.*
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.stereotype.Controller
import java.security.Principal
import java.util.*

@Controller
class GameController(private val simpMessagingTemplate: SimpMessagingTemplate) {

    // FIXME concurrency?
    private val games = mutableMapOf<UUID, Game>()
    private val players = mutableMapOf<PlayerId, Player>()
    private val roundStates = mutableMapOf<UUID, RoundState>()

    @MessageMapping("/createPlayer")
    fun createPlayer(playerName: String, user: Principal) {
        // use a random ID as the given user could be a cached older user
        val newPlayer = Player(name = playerName, id = UUID.randomUUID().toString(), inGame = null)
        players.putIfAbsent(newPlayer.id, newPlayer)

        simpMessagingTemplate.convertAndSendToUser(user.name, "/queue/player", newPlayer)
        simpMessagingTemplate.convertAndSend("/topic/players", players.values)
    }

    @MessageMapping("/createNewGame")
    fun startNewGame(user: Principal, headerAccessor: SimpMessageHeaderAccessor) {
        if (checkIfPlayerAlreadyHasGame(user.name)) return

        val gameId = UUID.randomUUID()
        val newGame = Game(id = gameId, creator = user.name, activePlayers = listOf(user.name), points = mapOf(user.name to emptyList()), started = false)
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

    @MessageMapping("/roundState/{gameId}")
    fun getRoundState(user: Principal, @DestinationVariable gameId: UUID) {
        val roundState = getRoundState(gameId)

        val playerState = roundState.playerStates[user.name]
                ?: throw IllegalArgumentException("Cannot find playerState for ${user.name}")
        val privateGameState = PrivateRoundState(
                stepNumber = roundState.stepNumber,
                playerState = playerState,
                rows = roundState.rows)

        simpMessagingTemplate.convertAndSendToUser(user.name, "${activeGame(gameId)}/gameState", privateGameState)
    }

    @MessageMapping("/joinGame")
    fun joinGame(user: Principal, game: Game) {
        if (checkIfPlayerAlreadyHasGame(user.name)) return

        games[game.id] = game.copy(
                activePlayers = game.activePlayers.plus(user.name),
                points = game.points.plus(user.name to emptyList()),
                started = false)
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

        val playerStates = game.points
                .map { PlayerState(heap = emptyList(), deck = deal10Cards(cards, random), playedCard = null) }

        val rows = (0..3)
                .map { Row(number = it, cards = assign1Card(cards, random)) }

        roundStates[game.id] = RoundState(stepNumber = 1, playerStates = game.activePlayers.zip(playerStates).toMap(), rows = rows)

        games[game.id] = game.copy(started = true)
        simpMessagingTemplate.convertAndSend("/topic/games", games.values)

        game.activePlayers.forEach { player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id), StartGameMessage())
        }

        Thread.sleep(500) // FIXME give the client time to create the game
        game.activePlayers.forEachIndexed { index, player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id),
                    StartStepMessage(payload = PrivateRoundState(stepNumber = 1, playerState = playerStates[index], rows = rows)))
        }
    }

    @MessageMapping("/games/{gameId}/playCard")
    fun playCard(user: Principal, @DestinationVariable gameId: UUID, message: PlayCardMessage) {

        val playedCard = message.payload ?: throw IllegalArgumentException("Played card cannot be null")
        val roundState = getRoundState(gameId)
        val playerState = getPlayerState(roundState, user.name)
        val game = getGame(gameId)

        val newRoundState = userPlayedCard(playerState, playedCard, roundState, user)
        roundStates[gameId] = newRoundState

        if (checkWhetherPlayerHasPlayedLastMissingCardThisStep(newRoundState)) {
            sendRevealAllPlayedCards(game, newRoundState)
            nextPlayerShouldSelectRow(newRoundState, gameId)
        } else {
            sendUserPlayedCard(game, user)
        }
    }

    @MessageMapping("/games/{gameId}/selectedRow")
    fun rowSelection(user: Principal, @DestinationVariable gameId: UUID, message: SelectedRowMessage) {
        val rowNumber = message.payload
                ?: throw IllegalArgumentException("Given row cannot be empty")
        val roundState = getRoundState(gameId)
        val playerState = getPlayerState(roundState, user.name)
        val playedCard = playerState.playedCard
                ?: throw IllegalStateException("Player ${user.name} already placed their card.")

        val selectedRow = roundState.rows[rowNumber]

        val rowToPlaceCard = rowToPlaceCard(roundState, playerState)
        val newRoundState =
                if (roundState.rows.all { row -> row.cards.last().value > playedCard.value }
                        || rowToPlaceCard == null
                        || rowToPlaceCard == selectedRow) {

                    val (newRow, newPlayerState) = when {
                        rowToPlaceCard == null -> takeRow(selectedRow, playedCard, playerState)
                        selectedRow.cards.size == 5 -> takeRow(selectedRow, playedCard, playerState)
                        else -> addCardToRow(selectedRow, playedCard, playerState)
                    }

                    val newStepNumber =
                            if (roundState.playerStates.minus(user.name).all { entry -> entry.value.playedCard == null })
                                roundState.stepNumber + 1
                            else
                                roundState.stepNumber
                    roundState.copy(stepNumber = newStepNumber,
                            rows = roundState.rows.replace(selectedRow, newRow),
                            playerStates = roundState.playerStates.minus(user.name).plus(Pair(user.name, newPlayerState)))
                } else {
                    throw IllegalStateException("Card ${playedCard.value} is placed in the wrong row ($rowNumber)")
                }

        roundStates[gameId] = newRoundState

        if (newRoundState.stepNumber == roundState.stepNumber) {
            updateRowsForAllPlayers(newRoundState, gameId)
            nextPlayerShouldSelectRow(newRoundState, gameId)
        } else {
            startNewStep(newRoundState, gameId)
        }

    }

    private fun takeRow(selectedRow: Row, playedCard: Card, playerState: PlayerState): Pair<Row, PlayerState> {
        return Pair(Row(number = selectedRow.number, cards = listOf(playedCard)),
                playerState.copy(heap = playerState.heap.plus(selectedRow.cards),
                        deck = playerState.deck.minus(playedCard),
                        playedCard = null))
    }

    private fun addCardToRow(selectedRow: Row, playedCard: Card, playerState: PlayerState): Pair<Row, PlayerState> {
        return Pair(Row(number = selectedRow.number, cards = selectedRow.cards.plus(playedCard)),
                playerState.copy(deck = playerState.deck.minus(playedCard),
                        playedCard = null))
    }

    private fun startNewStep(roundState: RoundState, gameId: UUID) {
        if (roundState.stepNumber == 11) {
            endRound(gameId, roundState)
        } else {
            roundState.playerStates.keys.forEach { player ->
                simpMessagingTemplate.convertAndSendToUser(player, activeGame(gameId),
                        StartStepMessage(PrivateRoundState(stepNumber = roundState.stepNumber,
                                playerState = getPlayerState(roundState, player),
                                rows = roundState.rows)))
            }
        }
    }

    private fun endRound(gameId: UUID, roundState: RoundState) {
        val game = getGame(gameId)
        val newPoints = game.points.map { (player, points) ->
            val playerState = getPlayerState(roundState, player)
            Pair(player, points.plus(playerState.heap.sumBy { it.getPoints() }))
        }
        game.activePlayers.forEach { player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(gameId), RoundFinishedMessage(
                    RoundFinished(roundState, newPoints.toMap()))
            )
        }

        if (newPoints.any { (_, points) -> points.sum() >= 66 }) {
            games.remove(gameId)
        }
        roundStates.remove(gameId)
    }

    private fun userPlayedCard(playerState: PlayerState, playedCard: Card, roundState: RoundState, user: Principal): RoundState {
        val newPlayerState = playerState.copy(playedCard = playedCard)
        return roundState.copy(playerStates = roundState.playerStates.minus(user.name).plus(Pair(user.name, newPlayerState)))
    }

    private fun sendUserPlayedCard(game: Game, user: Principal) {
        game.activePlayers.forEach { player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id),
                    PlayedCardMessage(payload = PlayedCardHidden(player = user.name)))
        }
    }

    private fun sendRevealAllPlayedCards(game: Game, roundState: RoundState) {
        game.activePlayers.forEach { player ->
            val allPlayedCards = roundState.playerStates.map { playerState -> PlayedCard(playerState.key, playerState.value.playedCard!!) }
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id),
                    RevealAllPlayedCardsMessage(payload = allPlayedCards))
        }
    }

    private fun updateRowsForAllPlayers(roundState: RoundState, gameId: UUID) {
        roundState.playerStates.keys.forEach { player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(gameId), UpdatedRowsMessage(roundState.rows))
        }
    }

    private fun activeGame(gameId: UUID) = "/queue/activeGames/$gameId"

    private fun playerJoinsGame(user: Principal, gameId: UUID?) {
        players[user.name]?.let { player ->
            players.replace(user.name, player.copy(inGame = gameId))
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

    private fun checkWhetherPlayerHasPlayedLastMissingCardThisStep(roundState: RoundState): Boolean {
        return roundState.playerStates.values.none { playerState ->
            playerState.playedCard === null
        }
    }

    private fun nextPlayerShouldSelectRow(roundState: RoundState, gameId: UUID) {
        roundState.playerStates.minBy {
            it.value.playedCard?.value ?: Int.MAX_VALUE
        }?.let { (playerId, nextPlayer) ->
            val selectRow = rowToPlaceCard(roundState, nextPlayer)
            simpMessagingTemplate.convertAndSendToUser(playerId, activeGame(gameId), SelectRowMessage(selectRow?.number))
        }
    }

    private fun rowToPlaceCard(roundState: RoundState, playerState: PlayerState) =
            roundState.rows.filter { row -> (playerState.playedCard?.value ?: 0) - row.cards.last().value > 0 }
                    .minBy { row -> (playerState.playedCard?.value ?: 0) - row.cards.last().value }

    private fun getGame(gameId: UUID) =
            games[gameId] ?: throw IllegalArgumentException("Cannot find game with id $gameId")

    private fun getRoundState(gameId: UUID) = (roundStates[gameId]
            ?: throw IllegalArgumentException("Cannot find round state for game with id $gameId"))

    private fun getPlayerState(roundState: RoundState, playerId: PlayerId) =
            (roundState.playerStates[playerId]
                    ?: throw IllegalArgumentException("Cannot find player state for player $playerId"))
}
