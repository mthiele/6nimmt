import React, { MutableRefObject, useEffect, useState } from 'react';
import Stomp, { Client } from "stompjs";
import './App.css';
import { SechsNimmt } from './game/SechsNimmt';
import { CreatePlayer } from './lobby/CreatePlayer';
import { GameLobby } from './lobby/GameLobby';
import { Player } from './model/Game';
import { Router } from '@reach/router';

export type ClientRef = MutableRefObject<Client | undefined>

export const App = () => {

  const [stompClient, setStompClient] = useState(undefined as Client | undefined)
  const StompContext = React.createContext(stompClient);

  const [player, setPlayer] = useState(undefined as Player | undefined);
  const [gameId, setGameId] = useState("")

  useEffect(() => {
    reconnect()
  }, [])

  const reconnect = (onConnect: (stomp: Client) => void = () => {}) => {
    const socket = new WebSocket("ws://localhost:8080/gs-guide-websocket")
    const stomp = Stomp.over(socket)
    stomp.connect({ token: sessionStorage.getItem("6nimmtUser") || "" }, (frame: any) => {
      setStompClient(stomp)
      onConnect(stomp)
    })
  }

  return (
    <div className="Site">
      <div className="Site-content">
        <div className="container">
          <StompContext.Provider value={stompClient}>
            <Router>
              <CreatePlayer path="/" stompClient={stompClient} setPlayer={setPlayer} reconnect={reconnect}/>
              <GameLobby path="/gameLobby" stompClient={stompClient} thisPlayer={player} startedGame={setGameId} />
              <SechsNimmt path="/game/:gameId" stompClient={stompClient} gameId={gameId} />
            </Router>
          </StompContext.Provider>
        </div>
      </div>
      <footer className="footer">
        <div className="content has-text-centered">
          Created by Michael Thiele
        </div>
      </footer>
    </div>
  );
}
