import React, { useState, useEffect } from "react"
import { useDrop } from "react-dnd"
import Constants from "./Constants"
import classnames from "classnames"

import "./CardPlaceholder.scss"
import { SingleCard } from "./Card"
import { Card } from "../model/Game"

export interface CardPlaceholderProps {
    readonly visible: Boolean
    readonly setSelectedCard: (card: Card) => void
    readonly canDropCardHere: (card: Card) => boolean
}

export const CardPlaceholder = React.forwardRef((props: CardPlaceholderProps, ref: React.Ref<HTMLDivElement>) => {
    const { visible, setSelectedCard, canDropCardHere } = props;

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

    useEffect(() => {
        if(!visible) {
            setCard(undefined)
        }
    }, [visible])

    const isActive = canDrop && isOver

    return <div ref={drop} className="card-placeholder-container" style={{opacity: visible? 1.0: 0}}>
        {card
            ? <SingleCard ref={ref} card={card} />
            : <div ref={ref} className={classnames("card-placeholder", { inactive: !isActive, active: isActive, "can-drop": canDrop })}>
            </div>}
    </div>
})
