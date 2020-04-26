import React, { useCallback, useRef } from "react"
import { RoundState } from "../model/Messages"
import { SingleCard } from "./Card";
import { CardPlaceholder } from "./CardPlaceholder";
import { Row } from "../model/Game"
import _ from "lodash"

export interface RowProps {
    readonly roundState: RoundState | undefined
    readonly selectRowActive: boolean
    readonly selectRow: number | undefined
    readonly selectedRow: (row: number) => void
    readonly setPlaceholderPositions: (positions: { row: Row, x: number | undefined, y: number | undefined }[]) => void
}

export const Rows = React.memo((props: RowProps) => {
    const { roundState, selectRowActive, selectRow, selectedRow, setPlaceholderPositions } = props;

    const refs = useRef<(Array<[Row, HTMLDivElement | null]>)>([])

    const canDropHere = (rowIndex: number) => selectRow == undefined || selectRow === rowIndex

    const measureRef = useCallback((el, row, index) => {
        console.log(el)
        if (el !== undefined) {
            refs.current[index] = [row, el]
            setPlaceholderPositions(refs.current.map(ref => ({ row: ref[0], x: ref[1]?.offsetLeft, y: ref[1]?.offsetTop })))
        }
    }, [])

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
                            ref={el => measureRef(el, row, rowIndex)}
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
}, (prevProps, nextProps) => _.isEqual(
    _.omit(prevProps, ["selectedRow", "setPlaceholderPositions"]),
    _.omit(nextProps, ["selectedRow", "setPlaceholderPositions"])
))
