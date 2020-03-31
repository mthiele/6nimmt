import React, { useEffect, useState } from "react"
import { Client, Message } from "stompjs"
import { MessageTypes, StartRound, playCard } from "../model/Messages"
import { SingleCard } from "./Card"
import { DndProvider } from "react-dnd"
import Backend from "react-dnd-html5-backend"
import { CardPlaceholder } from "./CardPlaceholder"
import { Card } from "../model/Game"

export interface SechsNimmtProps {
    readonly stompClient: Client | undefined
    readonly gameId: string
}

export const SechsNimmt = (props: SechsNimmtProps) => {
    const { stompClient, gameId } = props

    const [gameState, setGameState] = useState(undefined as StartRound | undefined)
    const [selectedCard, setSelectedCard] = useState(undefined as Card | undefined)

    useEffect(() => {
        const subsription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}`, (message: Message) => {
            const gameMessage = JSON.parse(message.body) as MessageTypes;
            switch (gameMessage.messageType) {
                case "startRound":
                    setGameState(gameMessage.payload)
                    subsription?.unsubscribe()
            }
        })
    }, [])

    useEffect(() => {
        if (selectedCard) {
            stompClient?.send("/app/playCard", {}, JSON.stringify(playCard(selectedCard)))
        }
    }, [selectedCard])

    return (
        <DndProvider backend={Backend}>
            {gameState?.rows.map((row, index) =>
                <div key={index} className="card-row">
                    {row.cards.map((card, index) =>
                        <SingleCard key={index} card={card} />)}
                </div>)}
            <hr />
            <CardPlaceholder setSelectedCard={setSelectedCard} />
            <hr />
            <div className="card-hand">
                {gameState?.playerState.deck.cards.map((card, index) =>
                    <SingleCard key={index} card={card} />)}
            </div>
        </DndProvider>
    );
}