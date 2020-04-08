import React from "react"
import {GameState} from "../model/Messages"
import { SingleCard } from "./Card";

export interface RowProps {
    readonly gameState: GameState | undefined
}

export const Row = (props: RowProps) => {
const {gameState} = props;

    return (
        <div className="columns">
            <div className="column">
                {gameState?.rows.map((row, index) =>
                    <div key={index} className="card-row">
                        {row.cards.map((card, index) =>
                            <SingleCard key={index} card={card} />)}
                    </div>)}
            </div>
        </div>
    )
}