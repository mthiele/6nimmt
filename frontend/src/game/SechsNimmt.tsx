import { RouteComponentProps } from "@reach/router"
import React, { useEffect, useState } from "react"
import { DndProvider } from "react-dnd"
import Backend from "react-dnd-html5-backend"
import { Client, Message } from "stompjs"
import { Card, Player, PlayerId } from "../model/Game"
import { GameState, MessageTypes, playCard, selectRowMessage, PLAYED_CARD, REVEAL_ALL_CARDS, SELECTED_ROW, SELECT_ROW, START_ROUND, UPDATED_ROWS } from "../model/Messages"
import { SingleCard } from "./Card"
import { PlayedCards } from "./PlayedCards"
import { Rows } from "./Rows"
import { useRefState } from "../util"

export interface SechsNimmtProps {
    readonly stompClient: Client | undefined
    readonly gameId: string
    readonly player: Player | undefined
}

export const SechsNimmt = (props: SechsNimmtProps & RouteComponentProps) => {
    const { stompClient, gameId, player } = props

    const [players, setPlayers] = useState([] as Player[])
    const [gameState, gameStateRef, setGameState] = useRefState(undefined as GameState | undefined)
    const [selectedCard, setSelectedCard] = useState(undefined as Card | undefined)
    const [playedCards, setPlayedCards] = useState([] as [PlayerId, Card | undefined][])
    const [selectRow, setSelectRow] = useState(undefined as number | undefined)
    const [selectRowActive, setSelectRowActive] = useState(false)

    useEffect(() => {
        if (stompClient?.connected) {
            if (gameState === undefined) {
                const subscription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}/gameState`, (message: Message) => {
                    setGameState(JSON.parse(message.body))
                    subscription?.unsubscribe()
                })
                stompClient?.send(`/app/gameState/${gameId}`, {}, "")
            }
            const subsription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}`, (message: Message) => {
                const gameMessage = JSON.parse(message.body) as MessageTypes;
                switch (gameMessage.messageType) {
                    case START_ROUND:
                        setGameState(gameMessage.payload)
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
                        setGameState({
                            ...gameStateRef.current!!,
                            rows: gameMessage.payload,
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
            stompClient?.send(`/app/games/${gameId}/playCard`, {}, JSON.stringify(playCard(selectedCard)))
        }
    }, [selectedCard])

    return (
        <DndProvider backend={Backend}>
            <div className="level">
                <div className="level-left">
                    <Rows gameState={gameState} selectRowActive={selectRowActive} selectRow={selectRow} selectedRow={(index) => {
                        stompClient?.send(`/app/games/${gameId}/selectedRow`, {}, JSON.stringify(selectRowMessage(index)))
                    }} />
                </div>
                <div className="level-right">
                    <PlayedCards playedCards={playedCards} players={players} />
                </div>
            </div>
            <hr />
            <div className="card-hand">
                {gameState?.playerState.deck.map((card, index) =>
                    // FIXME can be selected?
                    <SingleCard key={index}
                        card={card}
                        canBeSelected={playedCards.length < players.length}
                        selected={selectedCard === card}
                        setSelectedCard={setSelectedCard}
                        canDrag={selectRowActive && selectedCard === card} />)}
            </div>
        </DndProvider>
    );
}