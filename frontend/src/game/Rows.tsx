import React from "react"
import { RoundState } from "../model/Messages"
import { SingleCard } from "./Card";
import { CardPlaceholder } from "./CardPlaceholder";

export interface RowProps {
    readonly roundState: RoundState | undefined
    readonly selectRowActive: boolean
    readonly selectRow: number | undefined
    readonly selectedRow: (row: number) => void
}

export const Rows = (props: RowProps) => {
    const { roundState, selectRowActive, selectRow, selectedRow } = props;

    const canDropHere = (rowIndex: number) => selectRow == undefined || selectRow === rowIndex

    return (
        <div className="columns">
            <div className="column">
                {roundState?.rows.map((row, rowIndex) =>
                    <div key={rowIndex} className="card-row">
                        {row.cards.map((card, cardIndex) =>
                            <SingleCard key={cardIndex} card={card} />)}
                        {selectRowActive && <CardPlaceholder key={rowIndex} canDropCardHere={() => canDropHere(rowIndex)}
                            setSelectedCard={() => {
                                if (canDropHere(rowIndex)) {
                                    selectedRow(rowIndex)
                                }
                            }} />}
                    </div>)}
            </div>
        </div>
    )
}