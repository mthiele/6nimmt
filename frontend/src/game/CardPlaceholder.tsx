import React, { useState, useEffect } from "react"
import { useDrop } from "react-dnd"
import Constants from "./Constants"
import classnames from "classnames"

import "./CardPlaceholder.scss"
import { SingleCard } from "./Card"
import { Card } from "../model/Game"

export interface CardPlaceholderProps {
    readonly setSelectedCard: (card: Card) => void
    readonly canDropCardHere: (card: Card) => boolean
}

export const CardPlaceholder = (props: CardPlaceholderProps) => {
    const { setSelectedCard, canDropCardHere } = props;

    const [card, setCard] = useState(undefined as Card | undefined)

    const [{ canDrop, isOver }, drop] = useDrop({
        accept: Constants.CARD,
        drop(item: any) {
            setCard(item.card)
            setSelectedCard(item.card)
        },
        canDrop: (item: any) => canDropCardHere(item.card),
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    })

    const isActive = canDrop && isOver

    return <div ref={drop} className="card-placeholder-container">
        {card
            ? <SingleCard card={card} />
            : <div className={classnames("card-placeholder", { inactive: !isActive, active: isActive, "can-drop": canDrop })}>
            </div>}
    </div>
} 