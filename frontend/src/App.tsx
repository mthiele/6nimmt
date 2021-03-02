import React, {useEffect, useState} from 'react';
import Stomp, {Client, Message} from "webstomp-client";
import './App.css';
import {SechsNimmt} from './game/SechsNimmt';
import {CreatePlayer} from './lobby/CreatePlayer';
import {GameLobby} from './lobby/GameLobby';
import {Player} from './model/Game';
import {navigate, Router} from '@reach/router';
import {STORAGE_USER} from './constants';
import {Navbar} from './Navbar';

export const App = () => {

  const [stompClient, setStompClient] = useState(undefined as Client | undefined)
  const StompContext = React.createContext(stompClient);

  const [player, setPlayer] = useState(undefined as Player | undefined);
  const [gameId, setGameId] = useState("")

  function refreshPlayerStatus(stompClient: Client) {
    const subscription = stompClient?.subscribe("/user/queue/players", (message: Message) => {
      const players = JSON.parse(message.body) as Player[]
      const player = players.find(p => p.id === localStorage.getItem(STORAGE_USER));
      setPlayer(player)
      subscription.unsubscribe()
    })
    stompClient?.send("/app/listPlayers", "")
  }

  useEffect(() => {
    reconnect((stompClient) => {
      refreshPlayerStatus(stompClient);
    })
  }, [])

  useEffect(() => {
    if (gameId != undefined) {
      stompClient?.send(`/app/games/${gameId}/startNewRound`)
    }
  }, [gameId])

  const reconnect = (onConnect: (stomp: Client) => void = () => { }) => {
    if (stompClient) {
      onConnect(stompClient)
      return
    }
    const isDev = process.env.NODE_ENV === "development";
    const hostname = window.location.hostname
    const port = window.location.port
    const socket = isDev
      ? new WebSocket("ws://192.168.2.100:8080/websocket")
      : new WebSocket(`ws://${hostname}:${port}/websocket`)
    const stomp = Stomp.over(socket, {heartbeat: {incoming: 5000, outgoing: 5000}})
    if (!isDev) {
      stomp.debug = () => { }
    }
    stomp.connect({ token: localStorage.getItem(STORAGE_USER) || "" }, (frame: any) => {
      setStompClient(stomp)
      onConnect(stomp)
    }, () => setTimeout(() => reconnect(onConnect), 3000))
  }

  const onClickLogout = () => {
    stompClient?.send("/app/logout")
    localStorage.removeItem(STORAGE_USER)
    setPlayer(undefined)
    navigate && navigate("/")
  }

  return (
    <div className="Site">
      <div className="Site-content">
        <Navbar onClickLogout={onClickLogout} />
        <div className="container">
          <StompContext.Provider value={stompClient}>
            <Router>
              <CreatePlayer path="/" stompClient={stompClient} setPlayer={setPlayer} existingPlayer={player} reconnect={reconnect} />
              <GameLobby path="/gameLobby" stompClient={stompClient} thisPlayer={player} startedGame={setGameId} />
              <SechsNimmt path="/game/:gameId" stompClient={stompClient} gameId={gameId} player={player} />
            </Router>
          </StompContext.Provider>
        </div>
      </div>
      <footer className="footer">
        <div className="content has-text-centered">
          v0.9.1 created by mthiele
        </div>
      </footer>
    </div>
  );
}
