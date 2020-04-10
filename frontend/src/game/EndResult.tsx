import React from "react"
import { EndGameState } from "../model/Messages"
import { Player } from "../model/Game"

export interface EndResultProps {
    readonly endGameState: EndGameState
    readonly players: Player[]
}

export const EndResult = (props: EndResultProps) => {
    const { endGameState, players } = props

    return (
        <div>
            <h3 className="is-size-3">Ergebnis</h3>
            <div className="level">
                {Object.keys(endGameState.playerStates).map(player =>
                    <div key={player} className="level-item has-text-centered">
                        <div>
                            <div className="has-text-weight-bold">{players.find(p => p.id === player)?.name || "unknown"}</div>
                            {endGameState.playerStates[player].heap.reduce((sum, currentCard) => sum + currentCard.points, 0)}
                        </div>
                    </div>
                )}
                <div className="level-item has-text-centered">
                </div>
            </div>
        </div>
    )
}