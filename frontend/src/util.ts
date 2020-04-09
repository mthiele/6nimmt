import React, { useState, useRef, useEffect, SetStateAction } from "react"

export function useRefState<T>(initialValue: T): [T, React.MutableRefObject<T>, React.Dispatch<SetStateAction<T>>] {
    const [state, setState] = useState(initialValue)
    const stateRef = useRef(state)
    useEffect(
      () => { stateRef.current = state },
      [state]
    )
    return [state, stateRef, setState]
  }