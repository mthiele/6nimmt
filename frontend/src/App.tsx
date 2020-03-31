import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import Stomp, { Client, Message } from "stompjs";
import './App.css';
import { GameLobby } from './GameLobby';
import { CreatePlayer } from './CreatePlayer';
import { Player, Game } from './model/Game';

export type ClientRef = MutableRefObject<Client | undefined>

export const App = () => {

  const [stompClient, setStompClient] = useState(undefined as Client | undefined)
  const StompContext = React.createContext(stompClient);

  const [player, setPlayer] = useState(undefined as Player | undefined);
  const [gameId, setGameId] = useState("")
  const [game, setGame] = useState(undefined as Game | undefined)

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/gs-guide-websocket")
    const stomp = Stomp.over(socket)
    stomp.connect("", "", (frame: any) => {
      setStompClient(stomp)
    })
  }, [])

  useEffect(() => {
    if (gameId !== "") {
      const subscription = stompClient?.subscribe("/user/queue/games", (message: Message) => {
        const games = JSON.parse(message.body) as Game[]
        setGame(games.find(g => g.id === gameId)!)
        subscription?.unsubscribe()
      });
      stompClient?.send("/app/listGames", {}, JSON.stringify({}))
    }
  }, [gameId])

  const showPlayerCreation = player === undefined

  return (
    <StompContext.Provider value={stompClient}>
      {showPlayerCreation && <CreatePlayer stompClient={stompClient} setPlayer={setPlayer} />}
      {game === undefined && player !== undefined && <GameLobby stompClient={stompClient} thisPlayer={player} startedGame={setGameId} />}
      {game !== undefined && <div>In the GAME!!!!</div>}
    </StompContext.Provider>
  );
}
