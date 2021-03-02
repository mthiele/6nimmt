import React, {useEffect, useState, useCallback} from "react";
import {Client, Message} from "webstomp-client";
import {Game, Player} from "../model/Game";
import {MessageTypes, START_GAME} from "../model/Messages";
import {RouteComponentProps} from "@reach/router";
import classnames from "classnames"
import "./GameLobby.scss"

interface GameLobbyProps {
    readonly stompClient: Client | undefined;
    readonly thisPlayer: Player | undefined;

    readonly startedGame: (gameId: string) => void;
}

export const GameLobby = (props: GameLobbyProps & RouteComponentProps) => {
    const {stompClient, thisPlayer, startedGame, navigate} = props;

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
                const games = JSON.parse(message.body) as Game[]
                setGames(games)
                const activeGame = games.find(game => game.activePlayers.some(player => player === thisPlayer?.id) || game.creator === thisPlayer?.id)
                if (activeGame?.started) {
                    navigate && navigate(`/game/${activeGame.id}`)
                    startedGame(activeGame.id)
                }
            })
            stompClient.send("/app/listGames", "")

            const playersSubsription = stompClient.subscribe("/topic/players", (message: Message) => {
                setPlayers(JSON.parse(message.body))
            })
            const myPlayersSubscription = stompClient.subscribe("/user/queue/players", (message: Message) => {
                setPlayers(JSON.parse(message.body))
            })
            stompClient.send("/app/listPlayers", "")

            return () => {
                gamesSubscription.unsubscribe()
                myGamesSubscription.unsubscribe()
                playersSubsription.unsubscribe()
                myPlayersSubscription.unsubscribe()
            }
        }
    }, [stompClient?.connected]);

    const startGameSubscription = useCallback((gameId: string) => {
        const subsription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}`, (message: Message) => {
            const gameMessage = JSON.parse(message.body) as MessageTypes;
            switch (gameMessage.messageType) {
                case START_GAME:
                    subsription?.unsubscribe()
                    navigate && navigate(`/game/${gameId}`)
                    startedGame(gameId)
            }
        })
    }, [gameId])

    useEffect(() => {
        if (gameId !== "") {
            startGameSubscription(gameId)
        }
    }, [gameId])

    const playerIsPartOfGame = (game: Game) => {
        return game.creator === thisPlayer?.id || game.activePlayers.find(player => thisPlayer?.id === player);
    }

    const playerIsPartOfAnyGame = () => {
        return games.some(game => playerIsPartOfGame(game))
    }

    const canCreateNewGame = !playerIsPartOfAnyGame()

    const createNewGame = () => {
        stompClient?.subscribe("/user/queue/game", (message: Message) => {
            setGameId(JSON.parse(message.body).id)
        })
        stompClient?.send("/app/createNewGame", JSON.stringify({}));
    };

    const canJoinGame = (game: Game) => {
        return !game.started && !playerIsPartOfAnyGame()
    }

    const joinGame = (game: Game) => {
        setGameId(game.id)
        stompClient?.send("/app/joinGame", JSON.stringify(game))
    }

    const canStartGame = (game: Game) => {
        return !game.started && game.creator === thisPlayer?.id
    }

    const startGame = (game: Game) => {
        startGameSubscription(game.id)
        stompClient?.send("/app/startGame", JSON.stringify(game))
    }

    return (
        <div>
            <div className="level">
                <div className="level-left">
                    <div>Hallo&nbsp;</div>
                    <strong>{thisPlayer?.name}</strong>
                </div>
            </div>
            <div className="columns">
                <div className="column">
                    <h5 className="title is-5">Spieler</h5>
                    <div className="content">
                        <ul>
                            {players.map(player =>
                                <li key={player.id} className="list-item word-wrap">
                                    {player.name} {player.inGame && " (im Spiel)"}
                                </li>)
                            }
                        </ul>
                    </div>
                </div>
                <div className="column">
                    <h5 className="title is-5">Spiele</h5>
                    <div className="content">
                        <ul>
                            {games.map(game =>
                                <li key={game.id}>
                                    <div
                                        className={classnames("is-centered-vertically word-wrap", game.started ? "game-started" : "game-available")}>
                                        {game.id} ({players.find(p => p.id === game.creator)?.name}
                                        {game.activePlayers.filter(player => player !== game.creator).length > 0
                                            ? ", " + game.activePlayers
                                            .filter(player => player !== game.creator)
                                            .map(player => players.find(p => p.id === player)?.name).join(", ") + ")"
                                            : ")"}
                                        &nbsp;
                                        {canJoinGame(game) &&
                                        <button className="button" onClick={event => joinGame(game)}>Beitreten</button>}
                                        {canStartGame(game) &&
                                        <button className="button" onClick={event => startGame(game)}>Starten</button>}
                                    </div>
                                </li>)
                            }
                        </ul>
                    </div>
                    {canCreateNewGame &&
                    <button className="button is-primary" onClick={createNewGame} disabled={buttonDisabled}>
                        Neues Spiel
                    </button>
                    }
                </div>
            </div>
        </div>
    )
}
