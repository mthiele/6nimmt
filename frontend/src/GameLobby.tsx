import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import Stomp, { Client, Message } from "stompjs";
import { Game, Player } from "./model/Game";
import classNames from "classnames";

interface GameLobbyProps {
    readonly stompClient?: Client;
    readonly thisPlayer: Player;
}

export const GameLobby = (props: GameLobbyProps) => {
    const { stompClient, thisPlayer } = props;

    const [buttonDisabled, setButtonDisabled] = useState(true)
    const [games, setGames] = useState([] as Game[])
    const [players, setPlayers] = useState([] as Player[])

    useEffect(() => {
        if (stompClient?.connected) {
            setButtonDisabled(false)
            stompClient.subscribe(`/topic/games`, (message: Message) => {
                setGames(JSON.parse(message.body))
            })
            stompClient.subscribe(`/user/queue/games`, (message: Message) => {
                setGames(JSON.parse(message.body))
            })
            stompClient.send("/app/listGames", {}, "")

            stompClient.subscribe("/topic/players", (message: Message) => {
                setPlayers(JSON.parse(message.body))
            })
            stompClient.subscribe("/user/queue/players", (message: Message) => {
                setPlayers(JSON.parse(message.body))
            })
            stompClient.send("/app/listPlayers", {}, "")
        }
    }, [stompClient?.connected]);

    const subscribeToGame = (gameId: string) => {
        stompClient?.subscribe(`/topic/activeGames/${gameId}`, (message: Message) => {
            console.log(message.body)
        })
    }

    const playerIsPartOfGame = (game: Game) => {
        return game.creator === thisPlayer.id || game.activePlayers.find(player => thisPlayer.id === player);
    }

    const playerIsPartOfAnyGame = () => {
        return games.some(game => playerIsPartOfGame(game))
    }

    const canCreateNewGame = !playerIsPartOfAnyGame()

    const createNewGame = () => {
        stompClient?.send("/app/createNewGame", {}, JSON.stringify({}));
        stompClient?.subscribe("/user/queue/game", (message: Message) => {
            const gameId = JSON.parse(message.body).id
            subscribeToGame(gameId)
        })
    };

    const canJoinGame = (game: Game) => {
        return !game.started && !playerIsPartOfAnyGame()
    }

    const joinGame = (game: Game) => {
        subscribeToGame(game.id)
        stompClient?.send("/app/joinGame", {}, JSON.stringify(game))
    }

    const canStartGame = (game: Game) => {
        return !game.started && game.creator === thisPlayer.id
    }

    const startGame = (game: Game) => {
        stompClient?.send("/app/startGame", {}, JSON.stringify(game))
    }

    return (
        <div>
            <h3>Lobby</h3>
            <div>Hallo {thisPlayer.name}</div>
            <hr />
            {players.map(player => <li key={player.id}>
                <ul>{player.name} {player.inGame && " (im Spiel)"}</ul>
            </li>)}
            <hr />
            {canCreateNewGame &&
                <button onClick={createNewGame} disabled={buttonDisabled}>
                    New Game
                </button>
            }
            <ul>
                {games.map(game =>
                    <li key={game.id} style={{ color: game.started ? "grey" : "black" }}>
                        {game.id} (Ersteller: {players.find(p => p.id === game.creator)?.name}),
                        {game.activePlayers.filter(player => player !== game.creator).length > 0 && "(Mitspieler: " + game.activePlayers
                            .filter(player => player !== game.creator)
                            .map(player => players.find(p => p.id === player)?.name).join(", ") + ") "}
                        {canJoinGame(game) && <button onClick={event => joinGame(game)}>Beitreten</button>}
                        {canStartGame(game) && <button onClick={event => startGame(game)}>Starten</button>}
                    </li>)
                }
            </ul>
        </div>
    )
}
