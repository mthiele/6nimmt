import { navigate, RouteComponentProps } from "@reach/router"
import React, { useEffect, useState, useCallback } from "react"
import { DndProvider } from "react-dnd"
import HTML5Backend from "react-dnd-html5-backend"
import TouchBackend from "react-dnd-touch-backend"
import { animated, useSpring, config } from "react-spring"
import { Client, Message } from "webstomp-client"
import { Card, Player, PlayerId, Row } from "../model/Game"
import { EndRound, MessageTypes, playCard, PLAYED_CARD, REVEAL_ALL_CARDS, RoundState, ROUND_FINISHED, selectRowMessage, SELECT_ROW, START_STEP, UPDATED_ROWS } from "../model/Messages"
import { useRefState } from "../util"
import { SingleCard } from "./Card"
import { EndResult } from "./EndResult"
import { Heap } from "./Heap"
import { PlayedCards } from "./PlayedCards"
import { Rows } from "./Rows"
import _ from "lodash"

export interface SechsNimmtProps {
    readonly stompClient: Client | undefined
    readonly gameId: string
    readonly player: Player | undefined
}

const ANIMATION_DURATION = 750

export const SechsNimmt = (props: SechsNimmtProps & RouteComponentProps) => {
    const { stompClient, gameId, player } = props

    const [players, setPlayers] = useState([] as Player[])
    const [roundState, roundStateRef, setRoundState] = useRefState(undefined as RoundState | undefined)
    const [selectedCard, setSelectedCard] = useState(undefined as Card | undefined)
    const [canChangeCardSelection, setCanChangeCardSelection] = useState(true)
    const [playedCards, playedCardsRef, setPlayedCards] = useRefState(new Map<PlayerId, Card | undefined>())
    const [selectRow, setSelectRow] = useState(undefined as number | undefined)
    const [selectRowActive, setSelectRowActive] = useState(false)
    const [endRound, setEndRound] = useState(undefined as EndRound | undefined)

    const [placeholderPositions, setPlaceholderPositions] = useState([] as { row: Row, x: number | undefined, y: number | undefined }[])
    const [playedCardPositions, setPlayedCardPositions] = useState([] as { card: Card | undefined, x: number | undefined, y: number | undefined }[])
    const [animateCard, setAnimateCard] = useState({ card: undefined, row: undefined, onFinished: undefined } as { card: Card | undefined, row: Row | undefined, onFinished: (() => void) | undefined })
    const [showAnimatedCard, setShowAnimatedCard] = useState(false)

    const setSelectedCardMemo = useCallback(setSelectedCard, [])

    const updates = (newRows: Row[]): [Card | undefined, Row | undefined] => {
        const currentRows = roundStateRef.current?.rows
        const updatedRowIndex = newRows.findIndex((row, rowIndex) => !_.isEqual(row.cards, currentRows?.[rowIndex]?.cards))
        const updatedRow = newRows[updatedRowIndex]
        const newCard = _.last(updatedRow?.cards)
        return [newCard, updatedRow]
    }

    useEffect(() => {
        if (stompClient?.connected) {
            if (roundState === undefined) {
                const subscription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}/roundState`, (message: Message) => {
                    const newRoundState = JSON.parse(message.body) as RoundState
                    setRoundState(newRoundState)

                    const newPlayedCards: [PlayerId, Card | undefined][] = Object.keys(newRoundState.playedCards)
                        .map((v, i) => [v, Object.values(newRoundState.playedCards)[i]])
                    setPlayedCards(new Map(newPlayedCards))

                    const thisPlayersCard = newPlayedCards.find(cards => cards[0] === player?.id)
                    if (thisPlayersCard) {
                        setSelectedCard(thisPlayersCard[1])
                        if (newPlayedCards.every((playerId, playedCard) => playedCard !== undefined)
                            && newPlayedCards.length === newRoundState.numberOfPlayers) {
                            setCanChangeCardSelection(false)
                        }
                    }

                    subscription?.unsubscribe()
                })
                stompClient?.send(`/app/roundState/${gameId}`, "")
            }
            const subsription = stompClient?.subscribe(`/user/queue/activeGames/${gameId}`, (message: Message) => {
                const gameMessage = JSON.parse(message.body) as MessageTypes;
                switch (gameMessage.messageType) {
                    case START_STEP: {
                        const [newCard, updatedRow] = updates(gameMessage.payload.rows)
                        setAnimateCard({
                            card: newCard,
                            row: updatedRow,
                            onFinished: () => {
                                setEndRound(undefined)
                                setRoundState(gameMessage.payload)
                                setPlayedCards(new Map())
                                setSelectRow(undefined)
                                setSelectRowActive(false)
                                setSelectedCard(undefined)
                                setCanChangeCardSelection(true)
                            }
                        })
                    }
                        break
                    case PLAYED_CARD:
                        setPlayedCards(new Map(playedCardsRef.current.set(gameMessage.payload.player, undefined)))
                        break
                    case REVEAL_ALL_CARDS:
                        setPlayedCards(new Map(gameMessage.payload.map(playedCard => [playedCard.player, playedCard.card])))
                        setCanChangeCardSelection(false)
                        break
                    case SELECT_ROW:
                        setSelectRow(gameMessage.payload)
                        setSelectRowActive(true)
                        break
                    case UPDATED_ROWS: {
                        const [newCard, updatedRow] = updates(gameMessage.payload)
                        if (_.isEqual(newCard, playedCardsRef.current.get(player?.id || ""))) {
                            setSelectRow(undefined)
                            setSelectRowActive(false)
                        }
                        setAnimateCard({
                            card: newCard,
                            row: updatedRow,
                            onFinished: () => {
                                setRoundState({
                                    ...roundStateRef.current!!,
                                    rows: gameMessage.payload,
                                })
                            }
                        })
                    }
                        break
                    case ROUND_FINISHED:
                        const [newCard, updatedRow] = updates(gameMessage.payload.roundState.rows)
                        setAnimateCard({
                            card: newCard,
                            row: updatedRow,
                            onFinished: () => {
                                setRoundState({
                                    ...gameMessage.payload.roundState,
                                    playerState: gameMessage.payload.roundState.playerStates[player?.id!!],
                                    playedCards: {},
                                })
                                setEndRound({
                                    ...gameMessage.payload,
                                })
                                setSelectRow(undefined)
                                setSelectRowActive(false)
                            }
                        })
                        break
                    default:
                }
            })
            return () => subsription?.unsubscribe()
        }
    }, [stompClient?.connected])

    useEffect(() => {
        const subscription = stompClient?.subscribe("/user/queue/players", (message: Message) => {
            const players = JSON.parse(message.body) as Player[]
            setPlayers(players.filter(player => player.inGame === gameId))
        })
        stompClient?.send("/app/listPlayers")

        return () => subscription?.unsubscribe()
    }, [stompClient?.connected])

    useEffect(() => {
        if (selectedCard) {
            stompClient?.send(`/app/games/${gameId}/playCard`, JSON.stringify(playCard(selectedCard)))
        }
    }, [selectedCard])

    const [cardMovement, setCardMovement] = useSpring(() => ({
        left: "0px",
        top: "0px",
        config: config.slow,
    }))

    useEffect(() => {
        const fromLeft = playedCardPositions.find(pos => _.isEqual(pos.card, animateCard.card))?.x
        const fromTop = playedCardPositions.find(pos => _.isEqual(pos.card, animateCard.card))?.y
        const toLeft = placeholderPositions.find(pos => _.isEqual(pos.row.number, animateCard.row?.number))?.x
        const toTop = placeholderPositions.find(pos => _.isEqual(pos.row.number, animateCard.row?.number))?.y

        if (animateCard.card && fromLeft && fromTop && toLeft && toTop) {
            setCardMovement({
                left: `${fromLeft}px`,
                top: `${fromTop}px`,
                immediate: true,
            })
            setCardMovement({
                left: `${toLeft}px`,
                top: `${toTop}px`,
                immediate: false,
            })
            setShowAnimatedCard(true)
            setTimeout(() => {
                setShowAnimatedCard(false)
                animateCard.onFinished?.()
                setAnimateCard({ card: undefined, row: undefined, onFinished: undefined })
            }, ANIMATION_DURATION)
        } else if (animateCard.onFinished) { // if somehow the animation does not work, at least save the game state
            animateCard.onFinished()
        }
    }, [animateCard])

    // FIXME logging
    // useEffect(() => {
    //     console.log("~~~~~~~~~~~~~~~~~~~~")
    //     console.log(placeholderPositions)
    //     console.log(playedCardPositions)
    // }, [placeholderPositions, playedCardPositions])

    const isTouchDevice = () => {
        if ("ontouchstart" in window) {
            return true;
        }
        return false;
    };
    const backendForDND = isTouchDevice() ? TouchBackend : HTML5Backend;

    return (
        <DndProvider backend={backendForDND}>
            <div className="columns is-vcentered is-multi">
                <div className="column is-two-thirds">
                    <Rows
                        roundState={roundState}
                        selectRowActive={selectRowActive}
                        selectRow={selectRow}
                        selectedRow={(index) => {
                            stompClient?.send(`/app/games/${gameId}/selectedRow`, JSON.stringify(selectRowMessage(index)))
                        }}
                        setPlaceholderPositions={setPlaceholderPositions}
                    />
                </div>
                <div className="column is-one-third">
                    <PlayedCards
                        playedCards={playedCards}
                        players={players}
                        setPlayedCardPositions={setPlayedCardPositions} />
                </div>
            </div>
            <hr />
            <div className="card-hand">
                {roundState?.playerState.deck
                    .sort((c1, c2) => c1.value - c2.value)
                    .map((card, index) =>
                        <SingleCard key={index}
                            card={card}
                            canBeSelected={canChangeCardSelection}
                            selected={_.isEqual(selectedCard, card)}
                            setSelectedCard={setSelectedCardMemo}
                            canDrag={selectRowActive && _.isEqual(selectedCard, card)} />
                    )}
            </div>
            <hr />
            <Heap cards={roundState?.playerState.heap || []} showCards={!!endRound || false} />
            {endRound &&
                <div>
                    <hr />
                    <EndResult endRound={endRound} players={players} stompClient={stompClient} gameId={gameId} />
                </div>
            }
            {showAnimatedCard &&
                <animated.div style={{ ...cardMovement, position: "absolute" }}>
                    <SingleCard card={animateCard.card} />
                </animated.div>
            }
        </DndProvider>
    );
}