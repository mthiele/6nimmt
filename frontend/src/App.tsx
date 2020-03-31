import React, { MutableRefObject, useEffect, useState } from 'react';
import Stomp, { Client } from "stompjs";
import './App.css';
import { SechsNimmt } from './game/SechsNimmt';
import { CreatePlayer } from './lobby/CreatePlayer';
import { GameLobby } from './lobby/GameLobby';
import { Player } from './model/Game';

export type ClientRef = MutableRefObject<Client | undefined>

export const App = () => {

  const [stompClient, setStompClient] = useState(undefined as Client | undefined)
  const StompContext = React.createContext(stompClient);

  const [player, setPlayer] = useState(undefined as Player | undefined);
  const [gameId, setGameId] = useState("")

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/gs-guide-websocket")
    const stomp = Stomp.over(socket)
    stomp.connect("", "", (frame: any) => {
      setStompClient(stomp)
    })
  }, [])

  const showPlayerCreation = player === undefined

  return (
    <StompContext.Provider value={stompClient}>
      {showPlayerCreation && <CreatePlayer stompClient={stompClient} setPlayer={setPlayer} />}
      {gameId === "" && player !== undefined && <GameLobby stompClient={stompClient} thisPlayer={player} startedGame={setGameId} />}
      {gameId !== "" && <SechsNimmt stompClient={stompClient} gameId={gameId}/>}
    </StompContext.Provider>
  );
}
