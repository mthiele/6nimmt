import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import Stomp, { Client } from "stompjs";
import { ClientRef } from "./App";
import { Game } from "./model/Game";

interface GameLobbyProps {
    readonly stompClient?: Client;
}

export const GameLobby = (props: GameLobbyProps) => {
    const { stompClient } = props;

    const [buttonDisabled, setButtonDisabled] = useState(true)
    const [games, setGames] = useState([] as Game[])

    useEffect(() => {
        if (stompClient?.connected) {
            setButtonDisabled(false)
            stompClient.subscribe(`/topic/games`, (message: any) => {
                setGames(JSON.parse(message.body))
            })
            stompClient.subscribe(`/user/queue/games`, (message: any) => {
                setGames(JSON.parse(message.body))
            })
            stompClient.send("/app/listGames", {}, "")
        }
    }, [stompClient?.connected]);

    const newGame = () => {
        stompClient?.send("/app/createNewGame", {}, JSON.stringify({}));
    };

    const joinGame = (game: Game) => {
        stompClient?.send("/app/joinGame", {}, JSON.stringify(game))
    }

    return (
        <div>
            <button onClick={newGame} disabled={buttonDisabled}>
                New Game
            </button>
            <ul>
                {games.map(game =>
                    <li key={game.id} onClick={event => joinGame(game)}>{game.id} {game.activePlayers.map(player => player.name).join(", ")}
                    </li>)
                }
            </ul>
        </div>
    )
}
