import React from "react"
import { GameState } from "../model/Messages"
import { SingleCard } from "./Card";
import { CardPlaceholder } from "./CardPlaceholder";

export interface RowProps {
    readonly gameState: GameState | undefined
    readonly selectRowActive: boolean
    readonly selectRow: number | undefined
    readonly selectedRow: (row: number) => void
}

export const Rows = (props: RowProps) => {
    const { gameState, selectRowActive, selectRow, selectedRow } = props;

    return (
        <div className="columns">
            <div className="column">
                {gameState?.rows.map((row, rowIndex) =>
                    <div key={rowIndex} className="card-row">
                        {row.cards.map((card, cardIndex) =>
                            <SingleCard key={cardIndex} card={card} />)}
                        {selectRowActive && <CardPlaceholder key={rowIndex} canDropCardHere={() => selectRow === rowIndex}
                            setSelectedCard={() => {
                                if (selectRow === rowIndex) {
                                    selectedRow(rowIndex)
                                }
                            }} />}
                    </div>)}
            </div>
        </div>
    )
}