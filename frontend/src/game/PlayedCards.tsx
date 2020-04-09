import React from "react"
import { SingleCard } from "./Card"
import { PlayerId, Card, Player } from "../model/Game"
import { playCard } from "../model/Messages"

export interface PlayedCardsProps {
    readonly playedCards: [PlayerId, Card | undefined][]
    readonly players: Player[]
}

export const PlayedCards = (props: PlayedCardsProps) => {
    const { playedCards, players } = props

    return (
        <div className="level">
            {playedCards.map((playedCard, index) => <div key={index} className="level-item has-text-centered">
                <div>
                    <SingleCard card={playedCard[1]} />
                    <span>{players.find(player => player.id === playedCard[0])?.name}</span>
                </div>
            </div>)}
        </div>
    )
}