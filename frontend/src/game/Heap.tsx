import React from "react"
import { Card } from "../model/Game"
import { SingleCard } from "./Card"

export interface HeapProps {
    readonly cards: Card[]
    readonly showCards: boolean
}

export const Heap = (props: HeapProps) => {
    const { cards, showCards } = props

    return (
        <div className="card-hand heap">
            {cards.map((card, index) =>
                <SingleCard key={index} card={card} isPile={!showCards} />)}
        </div>
    )
}