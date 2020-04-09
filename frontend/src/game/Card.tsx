import React, { useState } from "react"
import { useDrag } from "react-dnd"
import { Card } from "../model/Game"
import "./Card.css"
import Constants from "./Constants"
import classnames from "classnames"


export interface CardProps {
    readonly card: Card | undefined
    readonly revealed?: boolean
    readonly canBeSelected?: boolean
    readonly selected?: boolean
    readonly canDrag?: boolean
    readonly setSelectedCard?: (card: Card) => void
}

export const SingleCard = (props: CardProps = { card: undefined, revealed: true, canBeSelected: false, selected: false, canDrag: false }) => {
    const { card, canBeSelected, selected, canDrag, setSelectedCard } = props

    const [, drag] = useDrag({
        item: { type: Constants.CARD, card: card },
    })

    const selectCard = () => {
        if (canBeSelected && setSelectedCard && card) {
            setSelectedCard(card)
        }
    }

    if (card) {
        return (
            <div ref={canDrag ? drag : undefined} className={classnames("card", { selected, "can-be-selected": !!setSelectedCard })} onClick={selectCard} >
                <div className="points">
                    {Array.from({ length: card.points }).map((ignore, index) =>
                        <span key={index} className="point" />)}
                </div>
                <div className="value">
                    {card.value}
                </div>
            </div >
        )
    } else {
        return (
            <div className="card"></div>
        )
    }
}
