package com.valuedriven.nimmt

import com.valuedriven.nimmt.messages.*
import com.valuedriven.nimmt.model.*
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatcher
import org.mockito.Mockito.*
import org.springframework.messaging.simp.SimpMessagingTemplate


class GameServiceTest {

    private val simpMessagingTemplate = mock(SimpMessagingTemplate::class.java)

    private var cut: GameService = GameService(simpMessagingTemplate)

    @BeforeEach
    internal fun setUp() {
        cut = GameService(simpMessagingTemplate)
    }

    @Test
    fun `only owner can start a game`() {
        val game = Game(
            id = "123456",
            creator = "owner",
            activePlayers = listOf("owner"),
            points = mapOf("owner" to emptyList()),
            started = false
        )
        val user = StompPrincipal("a dude")
        assertThatThrownBy { cut.startGame(game, user) }.isInstanceOf(Exception::class.java)
    }

    @Test
    fun `sets up game correctly for two players`() {
        val game = Game(
            id = "123456",
            creator = "user",
            activePlayers = listOf("user", "a dude"),
            points = mapOf("user" to emptyList(), "a dude" to emptyList()),
            started = false
        )
        val user = StompPrincipal("user")
        cut.startGame(game, user)

        verify(simpMessagingTemplate).convertAndSend(
            eq("/topic/games"),
            argThat(ListMatcher(mutableListOf(game.copy(started = true))))
        )
        verify(simpMessagingTemplate).convertAndSendToUser("user", "/queue/activeGames/123456", StartGameMessage())
        verify(simpMessagingTemplate).convertAndSendToUser("a dude", "/queue/activeGames/123456", StartGameMessage())
        verifyNoMoreInteractions(simpMessagingTemplate)

        val expected = PrivateRoundState(
            stepNumber = 1,
            numberOfPlayers = 2,
            playedCards = mapOf(),
            rows = listOf(),
            playerState = PlayerState(
                heap = listOf(),
                playedCard = null,
                placedCard = false,
                deck = (1..10).map { Card(it) } // fake cards
            )
        )

        cut.getRoundState(user, "123456")
        verify(simpMessagingTemplate).convertAndSendToUser(
            eq("user"), eq("/queue/activeGames/123456/roundState"),
            argThat(PrivateRoundStateMatcher(expected))
        )

        cut.getRoundState(StompPrincipal("a dude"), "123456")
        verify(simpMessagingTemplate).convertAndSendToUser(
            eq("user"), eq("/queue/activeGames/123456/roundState"),
            argThat(PrivateRoundStateMatcher(expected))
        )
    }

    @Test
    fun `play a game with 2 players`() {
        val game = Game(
            id = "123456",
            creator = "user",
            activePlayers = listOf("user", "a dude"),
            points = mapOf("user" to emptyList(), "a dude" to emptyList()),
            started = false
        )
        val gamesField = GameService::class.java.getDeclaredField("games")
        gamesField.isAccessible = true
        gamesField.set(cut, mutableMapOf("123456" to game))

        val roundState = RoundState(
            stepNumber = 1,
            playerStates = mapOf(
                "user" to PlayerState(
                    heap = listOf(),
                    deck = listOf(
                        Card(4),
                        Card(5),
                        Card(6),
                        Card(7),
                        Card(8), // 5
                        Card(9),
                        Card(103),
                        Card(102),
                        Card(101),
                        Card(100)
                    ),
                    playedCard = null,
                    placedCard = false
                ),
                "a dude" to PlayerState(
                    heap = listOf(),
                    deck = listOf(
                        Card(10),
                        Card(11),
                        Card(12),
                        Card(13),
                        Card(14), // 5
                        Card(15),
                        Card(99),
                        Card(98),
                        Card(97),
                        Card(96)
                    ),
                    playedCard = null,
                    placedCard = false
                )
            ),
            rows = listOf(
                Row(0, listOf(Card(30))),
                Row(1, listOf(Card(40))),
                Row(2, listOf(Card(50))),
                Row(3, listOf(Card(104)))
            )
        )
        val roundStatesField = GameService::class.java.getDeclaredField("roundStates")
        roundStatesField.isAccessible = true
        roundStatesField.set(cut, mutableMapOf("123456" to roundState))

        val user = StompPrincipal("user")
        val dude = StompPrincipal("a dude")

        // user plays a card
        val userPlayedCard = Card(4)
        cut.playCard(user, "123456", PlayCardMessage(userPlayedCard))

        verify(simpMessagingTemplate).convertAndSendToUser(
            "user",
            "/queue/activeGames/123456",
            PlayedCardMessage(PlayedCardHidden("user"))
        )
        verify(simpMessagingTemplate).convertAndSendToUser(
            "a dude",
            "/queue/activeGames/123456",
            PlayedCardMessage(PlayedCardHidden("user"))
        )
        cut.getRoundState(user, "123456")
        verify(simpMessagingTemplate).convertAndSendToUser(
            eq("user"),
            eq("/queue/activeGames/123456/roundState"),
            argThat(
                PrivateRoundStateMatcher(
                    PrivateRoundState(
                        stepNumber = 1,
                        numberOfPlayers = 2,
                        rows = listOf(),
                        playedCards = mapOf("user" to Card(4)),
                        playerState = PlayerState(
                            heap = listOf(),
                            deck = listOf(
                                Card(4),
                                Card(5),
                                Card(6),
                                Card(7),
                                Card(8),
                                Card(9),
                                Card(103),
                                Card(102),
                                Card(101),
                                Card(100)
                            ),
                            playedCard = userPlayedCard,
                            placedCard = false
                        )
                    )
                )
            )
        )

        // a dude plays a card
        val dudePlayedCard = Card(96)
        cut.playCard(dude, "123456", PlayCardMessage(dudePlayedCard))
        val expectedRevealOfCards = RevealAllPlayedCardsMessage(
            listOf(PlayedCard("user", userPlayedCard), PlayedCard("a dude", dudePlayedCard))
        )
        verify(simpMessagingTemplate).convertAndSendToUser(
            "user", "/queue/activeGames/123456", expectedRevealOfCards
        )
        verify(simpMessagingTemplate).convertAndSendToUser(
            "a dude", "/queue/activeGames/123456", expectedRevealOfCards
        )

        // user can decide where to put card
        verify(simpMessagingTemplate).convertAndSendToUser(
            "user", "/queue/activeGames/123456",
            SelectRowMessage(null)
        )

        // dude decides to select row -> denied
        assertThatThrownBy {
            cut.rowSelection(dude, "123456", SelectedRowMessage(2))
        }

        cut.rowSelection(user, "123456", SelectedRowMessage(2))
        val expectedRows = UpdatedRowsMessage(
            listOf(
                Row(0, listOf(Card(30))),
                Row(1, listOf(Card(40))),
                Row(2, listOf(Card(4))),
                Row(3, listOf(Card(104)))
            )
        )
        verify(simpMessagingTemplate).convertAndSendToUser("user", "/queue/activeGames/123456", expectedRows)
        verify(simpMessagingTemplate).convertAndSendToUser("a dude", "/queue/activeGames/123456", expectedRows)
        // a dude has to take specific row
        verify(simpMessagingTemplate).convertAndSendToUser(
            "a dude", "/queue/activeGames/123456",
            SelectRowMessage(1)
        )

        assertThatThrownBy {
            cut.rowSelection(dude, "123456", SelectedRowMessage(2))
        }

        cut.rowSelection(dude, "123456", SelectedRowMessage(1))
        val expectedRows2 = UpdatedRowsMessage(
            listOf(
                Row(0, listOf(Card(30))),
                Row(1, listOf(Card(40), Card(96))),
                Row(2, listOf(Card(4))),
                Row(3, listOf(Card(104)))
            )
        )
        val startStepMessageUser = StartStepMessage(
            PrivateRoundState(
                stepNumber = 2,
                numberOfPlayers = 2,
                rows = expectedRows2.payload!!,
                playedCards = mapOf(),
                playerState = PlayerState(
                    heap = listOf(Card(50)), // already taken
                    deck = listOf(
                        Card(5),
                        Card(6),
                        Card(7),
                        Card(8),
                        Card(9),
                        Card(103),
                        Card(102),
                        Card(101),
                        Card(100)
                    ),
                    playedCard = null,
                    placedCard = false
                )
            )
        )
        val startStepMessageDude = StartStepMessage(
            PrivateRoundState(
                stepNumber = 2,
                numberOfPlayers = 2,
                rows = expectedRows2.payload!!,
                playedCards = mapOf(),
                playerState = PlayerState(
                    heap = listOf(),
                    deck = listOf(
                        Card(10),
                        Card(11),
                        Card(12),
                        Card(13),
                        Card(14),
                        Card(15),
                        Card(99),
                        Card(98),
                        Card(97)
                    ),
                    playedCard = null,
                    placedCard = false
                )
            )
        )
        verify(simpMessagingTemplate).convertAndSendToUser("user", "/queue/activeGames/123456", startStepMessageUser)
        verify(simpMessagingTemplate).convertAndSendToUser("a dude", "/queue/activeGames/123456", startStepMessageDude)
    }

}

private class PrivateRoundStateMatcher(private val left: PrivateRoundState) : ArgumentMatcher<PrivateRoundState> {
    override fun matches(right: PrivateRoundState?): Boolean {
        return left.stepNumber == right?.stepNumber
                && left.numberOfPlayers == right.numberOfPlayers
                && left.playedCards == right.playedCards
                // leave out rows
                && left.playerState.heap == right.playerState.heap
                && left.playerState.playedCard == right.playerState.playedCard
                && left.playerState.placedCard == right.playerState.placedCard
                && left.playerState.deck.size == right.playerState.deck.size
                && right.playerState.deck.size == right.playerState.deck.toSet().size // no duplicates
    }

}

private class ListMatcher<T>(private val left: MutableCollection<T>) : ArgumentMatcher<MutableCollection<T>> {
    override fun matches(right: MutableCollection<T>): Boolean {
        return if (left.size == right.size)
            left.zip(right).all { (l, r) -> l == r }
        else
            false
    }

}