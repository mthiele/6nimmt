import { RouteComponentProps } from "@reach/router"
import React, { useEffect, useState } from "react"
import { DndProvider } from "react-dnd"
import Backend from "react-dnd-html5-backend"
import { Client, Message } from "stompjs"
import { Card, Player, PlayerId } from "../model/Game"
import { MessageTypes, playCard, PLAYED_CARD, REVEAL_ALL_CARDS, GameState, START_ROUND } from "../model/Messages"
import { SingleCard } from "./Card"
import { CardPlaceholder } from "./CardPlaceholder"
import { Row as Rows } from "./Rows"
import { PlayedCards } from "./PlayedCards"

export interface SechsNimmtProps {
    readonly stompClient: Client | undefined
    readonly gameId: string
}

export const SechsNimmt = (props: SechsNimmtProps & RouteComponentProps) => {
    const { stompClient, gameId } = props

    const [players, setPlayers] = useState([] as Player[])
    const [gameState, setGameState] = useState(undefined as GameState | undefined)
    const [selectedCard, setSelectedCard] = useState(undefined as Card | undefined)
    const [playedCards, setPlayedCards] = useState([] as [PlayerId, Card | undefined][])

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
                        break
                    case PLAYED_CARD:
                        setPlayedCards(playedCards?.concat([[gameMessage.payload.player, undefined]]))
                        break
                    case REVEAL_ALL_CARDS:
                        setPlayedCards(gameMessage.payload.map(playedCard => [playedCard.player, playedCard.card]))
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
                    <Rows gameState={gameState} />
                </div>
                <div className="level-right">
                    <PlayedCards playedCards={playedCards} players={players} />
                </div>
            </div>
            <hr />
            <CardPlaceholder setSelectedCard={setSelectedCard} />
            <hr />
            <div className="card-hand">
                {gameState?.playerState.deck.map((card, index) =>
                    <SingleCard key={index} card={card} />)}
            </div>
        </DndProvider>
    );
}