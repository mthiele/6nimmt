import React, { useEffect, useState } from "react"
import { Client, Message } from "stompjs"
import { MessageTypes, StartRound } from "../model/Messages"
import { SingleCard } from "./Card"

export interface SechsNimmtProps {
    readonly stompClient: Client | undefined
    readonly gameId: string
}

export const SechsNimmt = (props: SechsNimmtProps) => {
    const { stompClient, gameId } = props

    const [gameState, setGameState] = useState(undefined as StartRound | undefined)

    useEffect(() => {
        const subsription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}`, (message: Message) => {
            const gameMessage = JSON.parse(message.body) as MessageTypes;
            switch (gameMessage.messageType) {
                case "startRound":
                    setGameState(gameMessage.payload)
                    subsription?.unsubscribe()
            }
        })
    })

    return (
        <div>
            {gameState?.rows.map((row, index) =>
                <div key={index}>
                    {row.cards.map((card, index) =>
                        <span key={index}>
                            {card.value}({card.points})
                        </span>)}
                </div>)}
            <hr />
            <div className="card-container">
                {gameState?.playerState.deck.cards.map((card, index) =>
                    <SingleCard key={index} card={card} />)}
            </div>
        </div>
    );
}