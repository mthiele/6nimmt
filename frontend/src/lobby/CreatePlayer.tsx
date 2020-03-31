import React, { useState } from "react";
import { Client, Message } from "stompjs";
import { Player } from "../model/Game";

interface CreatePlayerProps {
    stompClient: Client | undefined;
    setPlayer: (player: Player) => void;
}

export const CreatePlayer = (props: CreatePlayerProps) => {
    const { stompClient, setPlayer } = props;
    const [name, setName] = useState("")

    const joinLobby = () => {
        stompClient?.subscribe("/user/queue/player", (message: Message) => {
            setPlayer(JSON.parse(message.body))
        })
        stompClient?.send("/app/createPlayer", {}, name)
    }

    return (
        <div>
            <input value={name}
                onInput={event => setName((event.target as any).value)}>
            </input>
            <button onClick={joinLobby}>Join Looby</button>
        </div>
    )
}