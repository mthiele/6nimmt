import React, { useEffect, useRef } from "react"
import { RoundState } from "../model/Messages"
import { SingleCard } from "./Card";
import { CardPlaceholder } from "./CardPlaceholder";
import {Row} from "../model/Game"

export interface RowProps {
    readonly roundState: RoundState | undefined
    readonly selectRowActive: boolean
    readonly selectRow: number | undefined
    readonly selectedRow: (row: number) => void
    readonly setPlaceholderPositions: (positions: {row: Row, x: number | undefined, y: number | undefined }[]) => void
}

export const Rows = (props: RowProps) => {
    const { roundState, selectRowActive, selectRow, selectedRow, setPlaceholderPositions } = props;

    const refs = useRef<(Array<[Row, HTMLDivElement | null]>)>([])

    const canDropHere = (rowIndex: number) => selectRow == undefined || selectRow === rowIndex

    useEffect(() => {
        setPlaceholderPositions(refs.current?.map(r => ({row: r[0], x: r[1]?.offsetLeft, y: r[1]?.offsetTop })))
    }, [refs, refs.current, selectRowActive, roundState?.rows])

    return (
        <div className="columns">
            <div className="column">
                {roundState?.rows.map((row, rowIndex) =>
                    <div key={rowIndex} className="card-row">
                        {row.cards.map((card, cardIndex) =>
                            <SingleCard key={cardIndex} card={card} />)}
                        <CardPlaceholder
                            visible={selectRowActive}
                            key={rowIndex}
                            canDropCardHere={() => canDropHere(rowIndex)}
                            ref={el => refs.current[rowIndex] = [row, el]}
                            setSelectedCard={() => {
                                if (canDropHere(rowIndex)) {
                                    selectedRow(rowIndex)
                                }
                            }}
                        />
                    </div>)}
            </div>
        </div>
    )
}