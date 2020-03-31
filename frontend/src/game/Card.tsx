import React from "react"
import { Card } from "../model/Game"

import "./Card.css"

export interface CardProps {
    readonly card: Card
}

export const SingleCard = (props: CardProps) => {
    const { card } = props

    return (
        <div className="card">
            <div className="points">
                {card.points}
            </div>
            <div className="value-container">
                <div className="value">
                    {card.value}
                </div>
            </div>
        </div>
    )
}