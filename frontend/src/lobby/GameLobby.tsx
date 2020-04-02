import React, { useEffect, useState } from "react";
import { Client, Message } from "stompjs";
import { Game, Player } from "../model/Game";
import { MessageTypes, START_GAME } from "../model/Messages";

interface GameLobbyProps {
    readonly stompClient?: Client;
    readonly thisPlayer: Player;

    readonly startedGame: (gameId: string) => void;
}

export const GameLobby = (props: GameLobbyProps) => {
    const { stompClient, thisPlayer, startedGame } = props;

    const [buttonDisabled, setButtonDisabled] = useState(true)
    const [games, setGames] = useState([] as Game[])
    const [players, setPlayers] = useState([] as Player[])
    const [gameId, setGameId] = useState("")

    useEffect(() => {
        if (stompClient?.connected) {
            setButtonDisabled(false)
            const gamesSubscription = stompClient.subscribe(`/topic/games`, (message: Message) => {
                setGames(JSON.parse(message.body))
            })
            const myGamesSubscription = stompClient.subscribe(`/user/queue/games`, (message: Message) => {
                setGames(JSON.parse(message.body))
            })
            stompClient.send("/app/listGames", {}, "")

            const playersSubsription = stompClient.subscribe("/topic/players", (message: Message) => {
                setPlayers(JSON.parse(message.body))
            })
            const myPlayersSubscription = stompClient.subscribe("/user/queue/players", (message: Message) => {
                setPlayers(JSON.parse(message.body))
            })
            stompClient.send("/app/listPlayers", {}, "")

            return () => {
                gamesSubscription.unsubscribe()
                myGamesSubscription.unsubscribe()
                playersSubsription.unsubscribe()
                myPlayersSubscription.unsubscribe()
            }
        }
    }, [stompClient?.connected]);

    useEffect(() => {
        if (gameId !== "") {
            const subsription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}`, (message: Message) => {
                const gameMessage = JSON.parse(message.body) as MessageTypes;
                switch (gameMessage.messageType) {
                    case START_GAME:
                        startedGame(gameId)
                        subsription?.unsubscribe()
                }
            })
        }
    }, [gameId])

    const playerIsPartOfGame = (game: Game) => {
        return game.creator === thisPlayer.id || game.activePlayers.find(player => thisPlayer.id === player);
    }

    const playerIsPartOfAnyGame = () => {
        return games.some(game => playerIsPartOfGame(game))
    }

    const canCreateNewGame = !playerIsPartOfAnyGame()

    const createNewGame = () => {
        stompClient?.subscribe("/user/queue/game", (message: Message) => {
            setGameId(JSON.parse(message.body).id)
        })
        stompClient?.send("/app/createNewGame", {}, JSON.stringify({}));
    };

    const canJoinGame = (game: Game) => {
        return !game.started && !playerIsPartOfAnyGame()
    }

    const joinGame = (game: Game) => {
        setGameId(game.id)
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
            <h1 className="title is-1">Lobby</h1>
            <div className="level">
                <div className="level-left">
                    <div>Hallo&nbsp;</div>
                    <strong>{thisPlayer.name}</strong>
                </div>
            </div>
            <div className="columns">
                <div className="column">
                    <h5 className="title is-5">Spieler</h5>
                    <ul className="list">
                        {players.map(player => <li key={player.id} className="list-item">{player.name} {player.inGame && " (im Spiel)"}</li>)}
                    </ul>
                </div>
                <div className="column">
                    <h5 className="title is-5">Spiele</h5>
                    <ul className="list">
                        {games.map(game =>
                            <li key={game.id} className="list-item is-centered-vertically" style={{ color: game.started ? "grey" : "black" }}>
                                {game.id} (Ersteller: {players.find(p => p.id === game.creator)?.name}),
                        {game.activePlayers.filter(player => player !== game.creator).length > 0 && "(Mitspieler: " + game.activePlayers
                                    .filter(player => player !== game.creator)
                                    .map(player => players.find(p => p.id === player)?.name).join(", ") + ") "}
                                    &nbsp;
                                {canJoinGame(game) && <button className="button" onClick={event => joinGame(game)}>Beitreten</button>}
                                {canStartGame(game) && <button className="button" onClick={event => startGame(game)}>Starten</button>}
                            </li>)
                        }
                    </ul>
                    {canCreateNewGame &&
                        <button className="button is-primary" onClick={createNewGame} disabled={buttonDisabled}>
                            Neues Spiel
                    </button>
                    }
                </div>
            </div >
        </div >
    )
}
