import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import Stomp, { Client } from "stompjs";
import './App.css';
import { GameLobby } from './GameLobby';
import { CreatePlayer } from './CreatePlayer';

export type ClientRef = MutableRefObject<Client | undefined>

export const App = () => {

  const [stompClient, setStompClient] = useState(undefined as Client | undefined)
  const stompRef: ClientRef = useRef();
  const StompContext = React.createContext(stompClient);

  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080/gs-guide-websocket")
    stompRef.current = Stomp.over(socket)
    stompRef.current?.connect("", "", (frame: any) => {
      setStompClient(stompRef.current)

      stompClient?.subscribe("")
    })
  }, [])

  const showPlayerCreation = playerName === ""
  const showGameLobby = playerName !== ""

  return (
    <StompContext.Provider value={stompClient}>
      {showPlayerCreation && <CreatePlayer stompClient={stompClient} setPlayerName={setPlayerName}/>}
      {showGameLobby && <GameLobby stompClient={stompClient} />}
    </StompContext.Provider>
  );
}
