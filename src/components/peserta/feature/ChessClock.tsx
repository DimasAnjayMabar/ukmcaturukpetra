import React, { useState, useEffect, useCallback } from 'react'

const ChessClock: React.FC = () => {
  // 1) Configurable initial time (in seconds)
  const [initialTime, setInitialTime] = useState(300)
  // inputs for minutes / seconds
  const [minutesInput, setMinutesInput] = useState(5)
  const [secondsInput, setSecondsInput] = useState(0)

  const [player1Time, setPlayer1Time] = useState(initialTime)
  const [player2Time, setPlayer2Time] = useState(initialTime)
  const [activePlayer, setActivePlayer] =
    useState<'player1' | 'player2' | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  // Whenever initialTime changes (via config) and we're truly at rest, reset both
  useEffect(() => {
    const atRest =
      !isRunning &&
      activePlayer === null

    if (atRest) {
      setPlayer1Time(initialTime)
      setPlayer2Time(initialTime)
    }
  }, [initialTime, isRunning, activePlayer])

  // 2) main ticking effect
  useEffect(() => {
    if (!isRunning || !activePlayer) return
    const id = setInterval(() => {
      if (activePlayer === 'player1') {
        setPlayer1Time((t) => Math.max(0, t - 1))
      } else {
        setPlayer2Time((t) => Math.max(0, t - 1))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, activePlayer])

  // 3) auto‐pause on zero
  useEffect(() => {
    if (player1Time === 0 || player2Time === 0) {
      setIsRunning(false)
      setActivePlayer(null)
    }
  }, [player1Time, player2Time])

  const handleStart = () => {
    if (!activePlayer && player1Time > 0 && player2Time > 0) {
      setActivePlayer('player1')
    }
    setIsRunning(true)
  }
  const handlePause = () => setIsRunning(false)

  const handleReset = useCallback(() => {
    setIsRunning(false)
    setActivePlayer(null)
    setPlayer1Time(initialTime)
    setPlayer2Time(initialTime)
  }, [initialTime])

  // clicking on a clock or on the "⏳" button passes the turn
  const passTurn = () => {
    if (!isRunning || !activePlayer) return
    setActivePlayer((p) =>
      p === 'player1' ? 'player2' : 'player1'
    )
  }

  // formatting + styling helpers
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }
  const getBg = (p: 'player1' | 'player2') => {
    if (!isRunning) return 'bg-gray-700'
    return activePlayer === p
      ? 'bg-green-600'
      : 'bg-gray-800'
  }

  // show config only when fully reset
  const atResetState =
    !isRunning &&
    activePlayer === null &&
    player1Time === initialTime &&
    player2Time === initialTime

  return (
    <div className="w-screen h-screen bg-gray-900 text-white flex flex-col font-mono select-none">
      {atResetState && (
        <div className="bg-gray-800 p-4 flex items-center justify-center gap-2">
          <input
            type="number"
            min={0}
            value={minutesInput}
            onChange={(e) =>
              setMinutesInput(Number(e.target.value))
            }
            className="w-16 text-black p-1"
            placeholder="MM"
          />
          <span>:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={secondsInput}
            onChange={(e) =>
              setSecondsInput(Number(e.target.value))
            }
            className="w-16 text-black p-1"
            placeholder="SS"
          />
          <button
            onClick={() =>
              setInitialTime(
                minutesInput * 60 + secondsInput
              )
            }
            className="ml-2 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            Set Time
          </button>
        </div>
      )}

      {/* Top clock (Player 2, inverted) */}
      <div
        className={
          `flex-1 flex items-center justify-center transform rotate-180 ` +
          `transition-colors duration-300 ${getBg('player2')}`
        }
        onClick={passTurn}
      >
        <h1 className="text-9xl font-bold tracking-wider">
          {formatTime(player2Time)}
        </h1>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 py-4 flex justify-center items-center gap-6">
        <button onClick={handleReset} className="text-4xl">
          🔄
        </button>

        {/* Pass turn */}
        <button onClick={passTurn} className="text-4xl">
          ⏳
        </button>

        {isRunning ? (
          <button onClick={handlePause} className="text-6xl">
            ⏸️
          </button>
        ) : (
          <button onClick={handleStart} className="text-6xl">
            ▶️
          </button>
        )}
      </div>

      {/* Bottom clock (Player 1) */}
      <div
        className={
          `flex-1 flex items-center justify-center transition-colors duration-300 ` +
          `${getBg('player1')}`
        }
        onClick={passTurn}
      >
        <h1 className="text-9xl font-bold tracking-wider">
          {formatTime(player1Time)}
        </h1>
      </div>
    </div>
  )
}

export default ChessClock