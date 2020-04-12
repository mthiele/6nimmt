import React, { useState, useEffect } from "react"
import { Player } from "../model/Game"
import { EndRound } from "../model/Messages"
import { Client } from "stompjs"
import { navigate } from "@reach/router"

export interface EndResultProps {
    readonly endRound: EndRound
    readonly players: Player[]
    readonly stompClient: Client | undefined
    readonly gameId: string
}

export const EndResult = (props: EndResultProps) => {
    const { endRound, players, stompClient, gameId } = props

    const startNextRound = () => {
        stompClient?.send(`/app/games/${gameId}/startNewRound`)
    }

    return endRound && (
        <div>
            <table className="table">
                <thead>
                    <tr>
                        <th></th>
                        {Object.keys(endRound.roundState.playerStates).map((player, index) =>
                            <th key={index}>{players.find(p => p.id === player)?.name || "unknown"}</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {Array(endRound.points[Object.keys(endRound.points)[0]].length).fill(undefined).map((_, roundIndex) =>
                        <tr key={roundIndex}>
                            <th>{roundIndex + 1}</th>
                            {Object.keys(endRound.points).map((player, playerIndex) =>
                                <td key={playerIndex} className="has-text-right">{endRound.points[player][roundIndex]}</td>
                            )}
                        </tr>
                    )}
                    <tr>
                        <th>&sum;</th>
                        {Object.keys(endRound.points).map((player, playerIndex) =>
                            <td key={playerIndex} className="has-text-right">
                                <strong>{endRound.points[player].reduce((aggregate, value) => aggregate + value, 0)}</strong>
                            </td>
                        )}
                    </tr>
                </tbody>
            </table>
            {endRound.isGameFinished
                ? <button className="button is-primary is-pulled-right" onClick={() => navigate("/gameLobby")}>Lobby</button>
                : <button className="button is-primary is-pulled-right" onClick={startNextRound}>Nächste Runde</button>
            }
        </div>
    )
}