import React from "react"
import { Card } from "../model/Game"

import "./Card.css"
import { useDrag, DragSourceMonitor } from "react-dnd"
import Constants from "./Constants"

export interface CardProps {
    readonly card: Card | undefined
    readonly revealed?: boolean
}

export const SingleCard = (props: CardProps = { card: undefined, revealed: true }) => {
    const { card } = props

    const [, drag] = useDrag({
        item: { type: Constants.CARD, card: card },
    })

    if (card) {
        return (
            <div ref={drag} className="card">
                <div className="points">
                    {Array.from({ length: card.points }).map((ignore, index) =>
                        <span key={index} className="point" />)}
                </div>
                <div className="value">
                    {card.value}
                </div>
            </div>
        )
    } else {
        return (
            <div className="card"></div>
        )
    }
}
