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
            <div className="field">
                <label className="label">Nutzername</label>
                <div className="control">
                    <input className="input"
                        value={name}
                        onInput={event => setName((event.target as any).value)} />
                </div>
            </div>
            <div className="field">
                <div className="control">
                    <button type="submit" className="button is-primary" onClick={joinLobby}>Join Looby</button>
                </div>
            </div>
        </div>
    )
}