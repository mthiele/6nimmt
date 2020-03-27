import React, { useState } from "react"
import { Client } from "stompjs"

interface CreatePlayerProps {
    stompClient: Client | undefined;
    setPlayerName: (playerName: string) => void;
}

export const CreatePlayer = (props: CreatePlayerProps) => {
    const { stompClient, setPlayerName } = props;
    const [name, setName] = useState("")

    const joinLobby = () => {
        stompClient?.send("/app/createPlayer", {}, name);
        setPlayerName(name);
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