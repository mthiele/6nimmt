import React, { useRef, useCallback } from "react"
import { SingleCard } from "./Card"
import { PlayerId, Card, Player } from "../model/Game"

export interface PlayedCardsProps {
    readonly playedCards: Map<PlayerId, Card | undefined>
    readonly players: Player[]
    readonly setPlayedCardPositions: (positions: { card: Card | undefined, x: number | undefined, y: number | undefined }[]) => void
}

export const PlayedCards = React.memo((props: PlayedCardsProps) => {
    const { playedCards, players, setPlayedCardPositions } = props

    const refs = useRef<(Array<[Card | undefined, HTMLDivElement | null]>)>([])

    const playedCardsArray = Array.from(playedCards.entries())
    const sortForReveal = playedCardsArray.every((_, card) => card !== undefined)
    const playedCardsSorted = sortForReveal
        ? playedCardsArray.sort((p1, p2) => (p1[1]?.value || 0) - (p2[1]?.value || 0))
        : playedCardsArray


    const measureRef = useCallback((el, playedCard, index) => {
        if (el !== undefined) {
            refs.current[index] = [playedCard[1], el]
            setPlayedCardPositions(refs.current.map(ref => ({card: ref[0], x: ref[1]?.offsetLeft, y: ref[1]?.offsetTop})))
        }
    }, [])

    return (
        <div className="columns is-vcentered is-centered is-multiline is-mobile">
            {playedCardsSorted
                .map((playedCard, index) => <div key={index} className="column is-narrow has-text-centered">
                    <div>
                        <SingleCard card={playedCard[1]} ref={el => measureRef(el, playedCard, index)} />
                        <span>{players.find(player => player.id === playedCard[0])?.name}</span>
                    </div>
                </div>)}
        </div>
    )
})
