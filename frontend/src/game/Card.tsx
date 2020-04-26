import React, { useState } from "react"
import { useDrag } from "react-dnd"
import { Card } from "../model/Game"
import "./Card.scss"
import Constants from "./Constants"
import classnames from "classnames"


export interface CardProps {
    readonly card: Card | undefined
    readonly revealed?: boolean
    readonly canBeSelected?: boolean
    readonly selected?: boolean
    readonly canDrag?: boolean
    readonly setSelectedCard?: (card: Card) => void
    readonly isPile?: boolean
}

export const SingleCard = React.forwardRef((props: CardProps = {
    card: undefined,
    revealed: true,
    canBeSelected: false,
    selected: false,
    canDrag: false,
    isPile: false
}, ref: React.Ref<HTMLDivElement>) => {
    const { card, canBeSelected, selected, canDrag, setSelectedCard, isPile } = props

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
            <div ref={ref}>
                <div ref={canDrag ? drag : undefined} className={classnames("card", {
                    selected,
                    "can-be-selected": !!setSelectedCard,
                    "is-pile": isPile
                })} onClick={selectCard} >
                    <div className="points">
                        {Array.from({ length: card.points }).map((ignore, index) =>
                            <span key={index} className={classnames("point", {
                                "one-point": card.points === 1,
                                "two-points": card.points === 2,
                                "three-points": card.points === 3,
                                "five-points": card.points === 5,
                                "seven-points": card.points === 7
                            })} />)}
                    </div>
                    <div className={classnames("value", {
                        "one-point": card.points === 1,
                        "two-points": card.points === 2,
                        "three-points": card.points === 3,
                        "five-points": card.points === 5,
                        "seven-points": card.points === 7
                    })}>
                        {card.value}
                    </div>
                </div >
            </div>
        )
    } else {
        return (
            <div ref={ref} className="card"></div>
        )
    }
})
