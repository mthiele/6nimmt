import React from "react"
import { SingleCard } from "./Card"
import { PlayerId, Card, Player } from "../model/Game"
import { playCard } from "../model/Messages"

export interface PlayedCardsProps {
    readonly playedCards: Map<PlayerId, Card | undefined>
    readonly players: Player[]
}

export const PlayedCards = (props: PlayedCardsProps) => {
    const { playedCards, players } = props

    const playedCardsArray = Array.from(playedCards.entries())
    const sortForReveal = playedCardsArray.every((_, card) => card !== undefined)
    const playedCardsSorted = sortForReveal
        ? playedCardsArray.sort((p1, p2) => (p1[1]?.value || 0) - (p2[1]?.value || 0))
        : playedCardsArray


    return (
        <div className="columns is-vcentered is-centered is-multiline is-mobile">
            {playedCardsSorted
                .map((playedCard, index) => <div key={index} className="column is-narrow has-text-centered">
                    <div>
                        <SingleCard card={playedCard[1]} />
                        <span>{players.find(player => player.id === playedCard[0])?.name}</span>
                    </div>
                </div>)}
        </div>
    )
}