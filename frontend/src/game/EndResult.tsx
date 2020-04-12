import React from "react"
import { EndRoundState } from "../model/Messages"
import { Player } from "../model/Game"

export interface EndResultProps {
    readonly endRoundState: EndRoundState
    readonly players: Player[]
}

export const EndResult = (props: EndResultProps) => {
    const { endRoundState, players } = props

    return (
        <div>
            <h3 className="is-size-3">Ergebnis</h3>
            <div className="level">
                {Object.keys(endRoundState.playerStates).map(player =>
                    <div key={player} className="level-item has-text-centered">
                        <div>
                            <div className="has-text-weight-bold">{players.find(p => p.id === player)?.name || "unknown"}</div>
                            {endRoundState.playerStates[player].heap.reduce((sum, currentCard) => sum + currentCard.points, 0)}
                        </div>
                    </div>
                )}
                <div className="level-item has-text-centered">
                </div>
            </div>
        </div>
    )
}