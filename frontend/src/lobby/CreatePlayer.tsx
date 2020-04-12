import { RouteComponentProps } from "@reach/router";
import React, { useState } from "react";
import { Client, Message } from "stompjs";
import { STORAGE_USER } from "../constants";
import { Player } from "../model/Game";

interface CreatePlayerProps {
    stompClient: Client | undefined;
    setPlayer: (player: Player) => void;
    reconnect: (onConnect: (stomp: Client) => void) => void;
}

export const CreatePlayer = (props: CreatePlayerProps & RouteComponentProps) => {
    const { stompClient, setPlayer, reconnect, navigate } = props;
    const [name, setName] = useState("")

    const joinLobby = () => {
        const subscription = stompClient?.subscribe("/user/queue/player", (message: Message) => {
            const player = JSON.parse(message.body) as Player
            sessionStorage.setItem(STORAGE_USER, player.id)
            setPlayer(player)

            subscription?.unsubscribe()
            reconnect(() => {
                navigate && navigate("/gameLobby")
            })
        })
        stompClient?.send("/app/createPlayer", {}, name)
    }

    return (
        <div className="section">
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
                    <button type="submit" className="button is-primary" onClick={joinLobby}>Beitreten</button>
                </div>
            </div>
        </div>
    )
}