import { RouteComponentProps, navigate } from "@reach/router"
import React, { useEffect, useState } from "react"
import { DndProvider } from "react-dnd"
import Backend from "react-dnd-html5-backend"
import { Client, Message } from "webstomp-client"
import { Card, Player, PlayerId } from "../model/Game"
import { EndRound, MessageTypes, playCard, PLAYED_CARD, REVEAL_ALL_CARDS, RoundState, ROUND_FINISHED, selectRowMessage, SELECT_ROW, START_STEP, UPDATED_ROWS } from "../model/Messages"
import { useRefState } from "../util"
import { SingleCard } from "./Card"
import { EndResult } from "./EndResult"
import { Heap } from "./Heap"
import { PlayedCards } from "./PlayedCards"
import { Rows } from "./Rows"

export interface SechsNimmtProps {
    readonly stompClient: Client | undefined
    readonly gameId: string
    readonly player: Player | undefined
    readonly logout: Boolean
}

type PlayedCards = [PlayerId, Card | undefined][]

export const SechsNimmt = (props: SechsNimmtProps & RouteComponentProps) => {
    const { stompClient, gameId, player, logout } = props

    const [players, setPlayers] = useState([] as Player[])
    const [roundState, roundStateRef, setRoundState] = useRefState(undefined as RoundState | undefined)
    const [selectedCard, setSelectedCard] = useState(undefined as Card | undefined)
    const [playedCards, setPlayedCards] = useState([] as PlayedCards)
    const [selectRow, setSelectRow] = useState(undefined as number | undefined)
    const [selectRowActive, setSelectRowActive] = useState(false)
    const [endRound, setEndRound] = useState(undefined as EndRound | undefined)

    useEffect(() => {
        if (stompClient?.connected) {
            if (roundState === undefined) {
                const subscription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}/roundState`, (message: Message) => {
                    const newRoundState = JSON.parse(message.body) as RoundState
                    setRoundState(newRoundState)

                    const newPlayedCards: PlayedCards = Object.keys(newRoundState.playedCards)
                        .map((v, i) => [v, Object.values(newRoundState.playedCards)[i]])
                    setPlayedCards(newPlayedCards)

                    const thisPlayersCard = newPlayedCards.find(cards => cards[0] === player?.id)
                    if (thisPlayersCard) {
                        setSelectedCard(thisPlayersCard[1])
                    }

                    subscription?.unsubscribe()
                })
                stompClient?.send(`/app/roundState/${gameId}`, "")
            }
            const subsription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}`, (message: Message) => {
                const gameMessage = JSON.parse(message.body) as MessageTypes;
                switch (gameMessage.messageType) {
                    case START_STEP:
                        setEndRound(undefined)
                        setRoundState(gameMessage.payload)
                        setPlayedCards([])
                        setSelectRow(undefined)
                        setSelectRowActive(false)
                        break
                    case PLAYED_CARD:
                        setPlayedCards(playedCards?.concat([[gameMessage.payload.player, undefined]]))
                        break
                    case REVEAL_ALL_CARDS:
                        setPlayedCards(gameMessage.payload.map(playedCard => [playedCard.player, playedCard.card]))
                        break
                    case SELECT_ROW:
                        setSelectRow(gameMessage.payload)
                        setSelectRowActive(true)
                        break
                    case UPDATED_ROWS:
                        setRoundState({
                            ...roundStateRef.current!!,
                            rows: gameMessage.payload,
                        })
                        setSelectRow(undefined)
                        setSelectRowActive(false)
                        break
                    case ROUND_FINISHED:
                        setRoundState({
                            ...gameMessage.payload.roundState,
                            playerState: gameMessage.payload.roundState.playerStates[player?.id!!],
                            playedCards: {},
                        })
                        setEndRound({
                            ...gameMessage.payload,
                        })
                        setSelectRow(undefined)
                        setSelectRowActive(false)
                        break
                    default:
                }
            })
            return () => subsription?.unsubscribe()
        }
    }, [stompClient?.connected])

    useEffect(() => {
        const subscription = stompClient?.subscribe("/user/queue/players", (message: Message) => {
            const players = JSON.parse(message.body) as Player[]
            setPlayers(players.filter(player => player.inGame === gameId))
        })
        stompClient?.send("/app/listPlayers")

        return () => subscription?.unsubscribe()
    }, [stompClient?.connected])

    useEffect(() => {
        if (selectedCard) {
            stompClient?.send(`/app/games/${gameId}/playCard`, JSON.stringify(playCard(selectedCard)))
        }
    }, [selectedCard])

    useEffect(() => {
        if (logout) {
            stompClient?.send(`/app/games/${gameId}/leave`)
            navigate("/gameLobby")
        }
    }, [logout])

    return (
        <DndProvider backend={Backend}>
            <div className="level">
                <div className="level-left">
                    <Rows roundState={roundState} selectRowActive={selectRowActive} selectRow={selectRow} selectedRow={(index) => {
                        stompClient?.send(`/app/games/${gameId}/selectedRow`, JSON.stringify(selectRowMessage(index)))
                    }} />
                </div>
                <div className="level-right">
                    <PlayedCards playedCards={playedCards} players={players} />
                </div>
            </div>
            <hr />
            <div className="card-hand">
                {roundState?.playerState.deck.map((card, index) =>
                    <SingleCard key={index}
                        card={card}
                        canBeSelected={playedCards.length < players.length}
                        selected={JSON.stringify(selectedCard) === JSON.stringify(card)}
                        setSelectedCard={setSelectedCard}
                        canDrag={selectRowActive && JSON.stringify(selectedCard) === JSON.stringify(card)} />
                )}
            </div>
            <hr />
            <Heap cards={roundState?.playerState.heap || []} showCards={!!endRound || false} />
            {endRound &&
                <div>
                    <hr />
                    <EndResult endRound={endRound} players={players} stompClient={stompClient} gameId={gameId} />
                </div>
            }
        </DndProvider>
    );
}