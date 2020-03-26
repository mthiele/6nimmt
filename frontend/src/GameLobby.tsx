import React, { useEffect, useRef, MutableRefObject, useState } from "react"
import SockJS from "sockjs-client"
import Stomp, { Client } from "stompjs"
import { Game } from "./model/Game";

export const GameLobby = (props: any) => {

    var stompClient: MutableRefObject<Client | undefined> = useRef();

    const [buttonDisabled, setButtonDisabled] = useState(true)
    const [games, setGames] = useState([] as Game[])

    useEffect(() => {
        const socket = new WebSocket("ws://localhost:8080/gs-guide-websocket")
        stompClient.current = Stomp.over(socket)
        stompClient.current?.connect("user", "passwd", (frame: any) => {
            setButtonDisabled(false)
            stompClient.current?.subscribe("/topic/games", (message: any) => {
                console.log("message: ", message)
            });
            stompClient.current?.subscribe(`/user/queue/listGames`, (message: any) => {
                console.log("listGames: ", message)
                setGames(JSON.parse(message.body))
            })
        });
    }, []);

    const newGame = () => {
        if (stompClient.current?.connected) {
            stompClient.current?.send("/app/createNewGame", undefined, JSON.stringify({}));
        }
    };

    const listGames = () => {
        if (stompClient.current?.connected) {
            stompClient.current?.send("/app/listGames", undefined, JSON.stringify({}));
        }
    }

    return (
        <div>
            <button onClick={newGame} disabled={buttonDisabled}>
                New Game
        </button>
            <button onClick={listGames} disabled={buttonDisabled}>
                List Games
        </button>
        <ul>
            {games.map(game => <li key={game.id}>{game.id}</li>)}
        </ul>
        </div>
    )
}
