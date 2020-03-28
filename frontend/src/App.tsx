import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import Stomp, { Client } from "stompjs";
import './App.css';
import { GameLobby } from './GameLobby';
import { CreatePlayer } from './CreatePlayer';
import { Player } from './model/Game';

export type ClientRef = MutableRefObject<Client | undefined>

export const App = () => {

  const [stompClient, setStompClient] = useState(undefined as Client | undefined)
  const stompRef: ClientRef = useRef();
  const StompContext = React.createContext(stompClient);

  const [player, setPlayer] = useState(undefined as Player | undefined);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/gs-guide-websocket")
    stompRef.current = Stomp.over(socket)
    stompRef.current?.connect("", "", (frame: any) => {
      setStompClient(stompRef.current)

      stompClient?.subscribe("")
    })
  }, [])

  const showPlayerCreation = player === undefined

  return (
    <StompContext.Provider value={stompClient}>
      {showPlayerCreation && <CreatePlayer stompClient={stompClient} setPlayer={setPlayer}/>}
      {player !== undefined && <GameLobby stompClient={stompClient} thisPlayer={player}/>}
    </StompContext.Provider>
  );
}
