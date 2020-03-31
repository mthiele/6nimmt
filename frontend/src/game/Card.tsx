import React from "react"
import { Card } from "../model/Game"

import "./Card.css"
import { useDrag, DragSourceMonitor } from "react-dnd"
import Constants from "./Constants"

export interface CardProps {
    readonly card: Card
}

export const SingleCard = (props: CardProps) => {
    const { card } = props

    const [, drag] = useDrag({
        item: { type: Constants.CARD, card: card },
    })

    return (
        <div ref={drag} className="card">
            <div className="points">
                {Array.from({ length: card.points }).map((ignore, index) =>
                    <span key={index} className="point" />)}
            </div>
            <div className="value-container">
                <div className="value">
                    {card.value}
                </div>
            </div>
        </div>
    )
}
