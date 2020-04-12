import React from "react"
import { Player } from "../model/Game"
import { EndRound } from "../model/Messages"

export interface EndResultProps {
    readonly endRound: EndRound
    readonly players: Player[]
}

export const EndResult = (props: EndResultProps) => {
    const { endRound, players } = props

    return (
        <div>
            <h3 className="is-size-3">Ergebnis</h3>
            <div className="level">
                {Object.keys(endRound.roundState.playerStates).map(player =>
                    <div key={player} className="level-item has-text-centered">
                        <div>
                            <div className="has-text-weight-bold">{players.find(p => p.id === player)?.name || "unknown"}</div>
                            {endRound.points[player]}
                        </div>
                    </div>
                )}
                <div className="level-item has-text-centered">
                </div>
            </div>
        </div>
    )
}