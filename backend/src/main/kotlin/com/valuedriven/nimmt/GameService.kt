package com.valuedriven.nimmt

import com.valuedriven.nimmt.Util.replace
import com.valuedriven.nimmt.messages.*
import com.valuedriven.nimmt.model.*
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service
import java.security.Principal
import java.util.*

@Service
class GameService(
        private val simpMessagingTemplate: SimpMessagingTemplate) {

    private val games = mutableMapOf<GameId, Game>()
    private val roundStates = mutableMapOf<GameId, RoundState>()

    fun leaveGame(user: Principal) {
        val gameId = findGameOfPlayer(user)
        if (gameId != null) leaveGame(user, gameId)
    }

    fun startNewGame(user: Principal): GameId? {
        if (checkIfPlayerAlreadyHasGame(user.name)) return null

        val gameId = Util.randomString(6)
        val newGame = Game(
                id = gameId,
                creator = user.name,
                activePlayers = listOf(user.name),
                points = mapOf(user.name to emptyList()),
                started = false)
        games[gameId] = newGame
        simpMessagingTemplate.convertAndSendToUser(user.name, "/queue/game", newGame)
        simpMessagingTemplate.convertAndSend("/topic/games", games.values)

        return gameId
    }

    fun listGames(activePlayers: List<Player>): List<Game> =
            games.values.filter { game ->
                game.activePlayers.any { playerId ->
                    activePlayers.any { playerId == it.id }
                }
            }

    fun getRoundState(user: Principal, gameId: GameId) {
        val roundState = getRoundState(gameId)
        val playerState = getPlayerState(roundState, user.name)
        val everybodyPlayedTheirCard = roundState.playerStates.all { (_, playerState) -> playerState.playedCard != null }
        val somePlayersHaveStartedToPlaceTheirCards = roundState.playerStates.any { (_, playerState) -> playerState.placedCard }
        val cardsHaveToBePlaced = everybodyPlayedTheirCard || somePlayersHaveStartedToPlaceTheirCards
        val privateGameState = PrivateRoundState(
                stepNumber = roundState.stepNumber,
                playerState = playerState,
                playedCards = roundState.playerStates.filter { (_, playerState) -> playerState.playedCard != null }
                        .map { (playerId, playerState) ->
                            Pair(playerId,
                                    if (cardsHaveToBePlaced || playerId == user.name)
                                        playerState.playedCard
                                    else
                                        null)
                        }
                        .toMap(),
                rows = roundState.rows,
                numberOfPlayers = roundState.playerStates.size)

        simpMessagingTemplate.convertAndSendToUser(user.name, "${activeGame(gameId)}/roundState", privateGameState)

        if (cardsHaveToBePlaced) {
            roundState.playerStates
                    .filter { !it.value.placedCard }
                    .minBy {
                        it.value.playedCard?.value ?: Int.MAX_VALUE
                    }?.let { (playerId, _) -> if (playerId == user.name) nextPlayerShouldSelectRow(roundState, gameId) }
        }

        if (playerState.deck.isEmpty()) {
            val game = getGame(gameId)
            simpMessagingTemplate.convertAndSendToUser(user.name, activeGame(gameId), RoundFinishedMessage(
                    RoundFinished(roundState, game.points, game.points.any { it.value.sum() >= 66 })))
        }
    }

    fun joinGame(user: Principal, game: Game): Boolean {
        if (checkIfPlayerAlreadyHasGame(user.name)) return false

        games[game.id] = game.copy(
                activePlayers = game.activePlayers.plus(user.name),
                points = game.points.plus(user.name to emptyList()),
                started = false)
        simpMessagingTemplate.convertAndSend("/topic/games", games.values)

        return true
    }

    fun startGame(game: Game, user: Principal) {
        if (game.creator != user.name) {
            throw RuntimeException("Cannot start a game if not creator")
        }

        initNewRound(game)
    }

    fun playCard(user: Principal, gameId: GameId, message: PlayCardMessage) {

        val playedCard = message.payload ?: throw IllegalArgumentException("Played card cannot be null")
        val roundState = getRoundState(gameId)
        if (checkWhetherPlayerHasPlayedLastMissingCardThisStep(roundState)) {
            return
        }

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

    fun rowSelection(user: Principal, gameId: GameId, message: SelectedRowMessage) {
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
                            if (roundState.playerStates.minus(user.name).all { entry -> entry.value.placedCard })
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

    fun startNewRound(user: Principal, gameId: GameId) {
        val game = getGame(gameId)

        synchronized(this) {
            if (getRoundState(gameId).stepNumber == 11) {
                initNewRound(game)
            }
        }

        val roundState = getRoundState(gameId)
        simpMessagingTemplate.convertAndSendToUser(user.name, activeGame(game.id),
                StartStepMessage(payload = PrivateRoundState(
                        stepNumber = roundState.stepNumber,
                        playerState = getPlayerState(roundState, user.name).copy(playedCard = null, placedCard = false),
                        playedCards = mapOf(),
                        rows = roundState.rows,
                        numberOfPlayers = roundState.playerStates.size)))
    }

    fun leaveGame(user: Principal, gameId: GameId): List<PlayerId> {
        val game = getGame(gameId)
        val roundState = roundStates[gameId]

        if (roundState != null) {
            val newRoundState = roundState.copy(playerStates = roundState.playerStates.minus(user.name))
            roundStates[gameId] = newRoundState

            when {
                newRoundState.playerStates.all { (_, playerState) -> playerState.deck.size + newRoundState.stepNumber == 10 } -> {
                    startNewStep(newRoundState, gameId)
                }

                checkWhetherPlayerHasPlayedLastMissingCardThisStep(newRoundState) -> {
                    sendRevealAllPlayedCards(game, newRoundState)
                    nextPlayerShouldSelectRow(newRoundState, gameId)
                }
            }
        }

        val playersThatLeaveGame =
                if (!game.started) {
                    games.remove(gameId)
                    roundStates.remove(gameId)
                    game.activePlayers
                } else {
                    games[gameId] = game.copy(activePlayers = game.activePlayers.minus(user.name), points = game.points.minus(user.name))
                    listOf()
                }
        simpMessagingTemplate.convertAndSend("/topic/games", games.values)

        return playersThatLeaveGame.plus(user.name)
    }

    private fun initNewRound(game: Game) {
        val random = Random()

        val cards = (1..104)
                .map { value -> Card(value) }
                .toMutableList()

        val playerStates = game.points
                .map { PlayerState(heap = emptyList(), deck = deal10Cards(cards, random), playedCard = null, placedCard = false) }

        val rows = (0..3)
                .map { Row(number = it, cards = assign1Card(cards, random)) }

        roundStates[game.id] = RoundState(stepNumber = 1, playerStates = game.activePlayers.zip(playerStates).toMap(), rows = rows)

        games[game.id] = game.copy(started = true)

        if (!game.started) {
            simpMessagingTemplate.convertAndSend("/topic/games", games.values)

            game.activePlayers.forEach { player ->
                simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id), StartGameMessage())
            }
        }
    }


    private fun takeRow(selectedRow: Row, playedCard: Card, playerState: PlayerState): Pair<Row, PlayerState> {
        return Pair(Row(number = selectedRow.number, cards = listOf(playedCard)),
                playerState.copy(heap = playerState.heap.plus(selectedRow.cards),
                        deck = playerState.deck.minus(playedCard),
                        placedCard = true))
    }

    private fun addCardToRow(selectedRow: Row, playedCard: Card, playerState: PlayerState): Pair<Row, PlayerState> {
        return Pair(Row(number = selectedRow.number, cards = selectedRow.cards.plus(playedCard)),
                playerState.copy(deck = playerState.deck.minus(playedCard),
                        placedCard = true))
    }

    private fun startNewStep(roundState: RoundState, gameId: GameId) {
        val newRoundState = resetPlayedCards(roundState, gameId)

        if (newRoundState.stepNumber == 11) {
            endRound(gameId, newRoundState)
        } else {
            newRoundState.playerStates.keys.forEach { player ->
                simpMessagingTemplate.convertAndSendToUser(player, activeGame(gameId),
                        StartStepMessage(PrivateRoundState(stepNumber = newRoundState.stepNumber,
                                playerState = getPlayerState(newRoundState, player),
                                playedCards = mapOf(),
                                rows = newRoundState.rows,
                                numberOfPlayers = newRoundState.playerStates.size)))
            }
        }
    }

    private fun resetPlayedCards(roundState: RoundState, gameId: GameId): RoundState {
        val newRoundState = roundState.copy(playerStates = roundState.playerStates.map { (playerId, playerState) ->
            Pair(playerId, playerState.copy(playedCard = null, placedCard = false))
        }.toMap())

        roundStates[gameId] = newRoundState
        return newRoundState
    }

    private fun endRound(gameId: GameId, roundState: RoundState) {
        val game = getGame(gameId)
        val newPoints = game.points.map { (player, points) ->
            val playerState = getPlayerState(roundState, player)
            Pair(player, points.plus(playerState.heap.sumBy { it.getPoints() }))
        }.toMap()

        val isGameFinished = newPoints.any { (_, points) -> points.sum() >= 66 }

        if (isGameFinished) {
            games.remove(gameId)
        } else {
            games[gameId] = game.copy(points = newPoints)
        }

        game.activePlayers.forEach { player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(gameId), RoundFinishedMessage(
                    RoundFinished(roundState, newPoints, isGameFinished)))
        }
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
            val allPlayedCards = roundState.playerStates.map { (playerId, playerState) -> PlayedCard(playerId, playerState.playedCard!!) }
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(game.id),
                    RevealAllPlayedCardsMessage(payload = allPlayedCards))
        }
    }

    private fun updateRowsForAllPlayers(roundState: RoundState, gameId: GameId) {
        roundState.playerStates.keys.forEach { player ->
            simpMessagingTemplate.convertAndSendToUser(player, activeGame(gameId), UpdatedRowsMessage(roundState.rows))
        }
    }

    private fun activeGame(gameId: GameId) = "/queue/activeGames/$gameId"

    private fun findGameOfPlayer(user: Principal) =
            games.values.find { game -> game.activePlayers.contains(user.name) }?.id

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

    private fun nextPlayerShouldSelectRow(roundState: RoundState, gameId: GameId) {
        roundState.playerStates
                .filter { !it.value.placedCard }
                .minBy {
                    it.value.playedCard?.value ?: Int.MAX_VALUE
                }?.let { (playerId, nextPlayer) ->
                    val selectRow = rowToPlaceCard(roundState, nextPlayer)
                    simpMessagingTemplate.convertAndSendToUser(playerId, activeGame(gameId), SelectRowMessage(selectRow?.number))
                }
    }

    private fun rowToPlaceCard(roundState: RoundState, playerState: PlayerState) =
            roundState.rows.filter { row -> (playerState.playedCard?.value ?: 0) - row.cards.last().value > 0 }
                    .minBy { row -> (playerState.playedCard?.value ?: 0) - row.cards.last().value }

    private fun getGame(gameId: GameId) =
            games[gameId] ?: throw IllegalArgumentException("Cannot find game with id $gameId")

    private fun getRoundState(gameId: GameId) = (roundStates[gameId]
            ?: throw IllegalArgumentException("Cannot find round state for game with id $gameId"))

    private fun getPlayerState(roundState: RoundState, playerId: PlayerId) =
            (roundState.playerStates[playerId]
                    ?: throw IllegalArgumentException("Cannot find player state for player $playerId"))

}
