import { useState, useEffect, useCallback, useRef } from 'react'
import './index.css'

// ─── ENCODING ───────────────────────────────────────────────────────────────
function encodeGame(word, hint, length) {
  const payload = JSON.stringify({ w: word.toUpperCase(), h: hint || '', l: length })
  return btoa(unescape(encodeURIComponent(payload)))
}

function decodeGame(hash) {
  try {
    const raw = hash.startsWith('#') ? hash.slice(1) : hash
    const json = decodeURIComponent(escape(atob(raw)))
    return JSON.parse(json)
  } catch {
    return null
  }
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
]

const MAX_ATTEMPTS = 6

// ─── TOAST HOOK ──────────────────────────────────────────────────────────────
function useToasts() {
  const [toasts, setToasts] = useState([])
  const show = useCallback((msg) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 1600)
  }, [])
  return { toasts, show }
}

// ─── SETUP SCREEN ────────────────────────────────────────────────────────────
function SetupScreen({ onGenerate }) {
  const [length, setLength] = useState(5)
  const [word, setWord] = useState('')
  const [hint, setHint] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [wordError, setWordError] = useState('')

  const wordValid = word.trim().length === length && /^[a-zA-Z]+$/.test(word.trim())

  function handleWordChange(e) {
    const val = e.target.value.replace(/[^a-zA-Z]/g, '')
    setWord(val)
    setWordError('')
    setShareUrl('')
  }

  function handleLengthChange(l) {
    setLength(l)
    setWord('')
    setWordError('')
    setShareUrl('')
  }

  function handleGenerate() {
    const trimmed = word.trim().toUpperCase()
    if (trimmed.length !== length) {
      setWordError(`Word must be exactly ${length} letters`)
      return
    }
    const encoded = encodeGame(trimmed, hint.trim(), length)
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`
    setShareUrl(url)
    if (onGenerate) onGenerate(url)
  }

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="setup-screen">
      <p className="setup-title">Challenge your friends</p>

      <div className="setup-section">
        <span className="setup-label">Word length</span>
        <div className="length-selector">
          {[4, 5, 6].map(l => (
            <button
              key={l}
              className={`length-btn${length === l ? ' active' : ''}`}
              onClick={() => handleLengthChange(l)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="setup-section">
        <span className="setup-label">Your secret word ({length} letters)</span>
        <input
          className="setup-input"
          maxLength={length}
          value={word}
          onChange={handleWordChange}
          placeholder={`e.g. ${'WORLD'.slice(0, length)}`}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        {wordError
          ? <p className="input-hint error">{wordError}</p>
          : <p className="input-hint">Letters only · exactly {length} characters</p>
        }
      </div>

      <div className="setup-section">
        <span className="setup-label">Hint <span style={{ opacity: 0.5 }}>(optional)</span></span>
        <input
          className="setup-input"
          value={hint}
          onChange={e => { setHint(e.target.value); setShareUrl('') }}
          placeholder="Give your friends a clue…"
          style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14 }}
          maxLength={80}
        />
      </div>

      <button
        className="generate-btn"
        onClick={handleGenerate}
        disabled={!wordValid}
      >
        Generate challenge link
      </button>

      {shareUrl && (
        <div className="share-box">
          <p className="share-box-title">Challenge ready — share this link!</p>
          <div className="share-url">
            <div className="share-url-text">{shareUrl}</div>
            <button
              className={`copy-btn${copied ? ' copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="input-hint" style={{ marginTop: 10 }}>
            Send to 1–2 friends. Whoever guesses in fewer tries wins!
          </p>
        </div>
      )}
    </div>
  )
}

// ─── TILE ────────────────────────────────────────────────────────────────────
function Tile({ letter, state, animate, colIdx }) {
  const flipClass = animate === 'flip' ? ` flip-${colIdx}` : ''
  const bounceClass = animate === 'bounce' ? ` win-bounce-${colIdx}` : ''
  const popClass = animate === 'pop' ? ' pop' : ''
  const shakeClass = animate === 'shake' ? ' shake' : ''
  const filledClass = letter && !state ? ' filled' : ''

  return (
    <div
      className={`tile${filledClass}${popClass}${shakeClass}${flipClass}${bounceClass}`}
      data-state={state || undefined}
    >
      {letter}
    </div>
  )
}

// ─── GRID ────────────────────────────────────────────────────────────────────
function Grid({ wordLength, guesses, currentGuess, currentRow, revealRow, shakeRow, winRow }) {
  const rows = Array.from({ length: MAX_ATTEMPTS }, (_, r) => {
    const isCurrentRow = r === currentRow
    const guess = guesses[r]
    const letters = isCurrentRow
      ? currentGuess.padEnd(wordLength, ' ').slice(0, wordLength).split('')
      : guess
        ? guess.letters
        : Array(wordLength).fill('')

    return (
      <div className="grid-row" key={r}>
        {letters.map((letter, c) => {
          let state = null
          let animate = null
          if (guess) {
            state = guess.result[c]
            animate = revealRow === r ? 'flip' : winRow === r ? 'bounce' : null
          } else if (isCurrentRow) {
            animate = shakeRow === r ? 'shake' : letter.trim() ? 'pop' : null
          }
          return (
            <Tile
              key={c}
              letter={letter.trim()}
              state={state}
              animate={animate}
              colIdx={c}
            />
          )
        })}
      </div>
    )
  })

  return <div className="grid">{rows}</div>
}

// ─── KEYBOARD ────────────────────────────────────────────────────────────────
function Keyboard({ onKey, letterStates }) {
  return (
    <div className="keyboard">
      {KEYBOARD_ROWS.map((row, r) => (
        <div className="keyboard-row" key={r}>
          {row.map(k => (
            <button
              key={k}
              className={`key${k.length > 1 ? ' wide' : ''}`}
              data-state={letterStates[k] || undefined}
              onClick={() => onKey(k)}
            >
              {k}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── EVALUATE GUESS ───────────────────────────────────────────────────────────
function evaluateGuess(guess, target) {
  const result = Array(target.length).fill('absent')
  const targetArr = target.split('')
  const guessArr = guess.split('')
  const used = Array(target.length).fill(false)

  // First pass: correct
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct'
      used[i] = true
    }
  }
  // Second pass: present
  for (let i = 0; i < guessArr.length; i++) {
    if (result[i] === 'correct') continue
    for (let j = 0; j < targetArr.length; j++) {
      if (!used[j] && guessArr[i] === targetArr[j]) {
        result[i] = 'present'
        used[j] = true
        break
      }
    }
  }
  return result
}

// ─── EMOJI GRID ──────────────────────────────────────────────────────────────
function buildEmojiGrid(guesses, wordLength, won) {
  const stateToEmoji = { correct: '🟩', present: '🟨', absent: '⬛' }
  const rows = guesses.map(g => g.result.map(s => stateToEmoji[s]).join(''))
  const score = won ? `${guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`
  return { score, rows }
}

// ─── WATERMELON RAIN ─────────────────────────────────────────────────────────
function WatermelonRain({ startY }) {
  const [melons] = useState(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      burstX: ((Math.random() - 0.5) * 80).toFixed(1),   // vw, -40 to +40
      burstY: (-(Math.random() * 18 + 4)).toFixed(1),     // vh, upward pop
      delay: (Math.random() * 0.35).toFixed(2),
      duration: (2.6 + Math.random() * 1.6).toFixed(2),
      size: (1.4 + Math.random() * 1.1).toFixed(2),
      cw: Math.random() > 0.5,
      rot: (250 + Math.floor(Math.random() * 220)),
    }))
  )

  return (
    <div className="wm-rain" aria-hidden="true">
      {melons.map(w => (
        <span
          key={w.id}
          className={`wm ${w.cw ? 'wm-cw' : 'wm-ccw'}`}
          style={{
            top: `${startY}px`,
            animationDelay: `${w.delay}s`,
            animationDuration: `${w.duration}s`,
            fontSize: `${w.size}rem`,
            '--bx': `${w.burstX}vw`,
            '--by': `${w.burstY}vh`,
            '--rot': `${w.rot}deg`,
            '--fall': `calc(100dvh - ${startY}px + 60px)`,
          }}
        >
          🍉
        </span>
      ))}
    </div>
  )
}

// ─── RESULT SCREEN ───────────────────────────────────────────────────────────
function ResultScreen({ won, word, guesses, wordLength, onPlayAgain }) {
  const [copied, setCopied] = useState(false)
  const [rainTop, setRainTop] = useState(0)
  const congratsRef = useRef(null)
  const { score, rows } = buildEmojiGrid(guesses, wordLength, won)

  useEffect(() => {
    if (!won || !congratsRef.current) return
    const measure = () => {
      const rect = congratsRef.current.getBoundingClientRect()
      const header = document.querySelector('.header')
      setRainTop(header ? header.getBoundingClientRect().bottom + 8 : 70)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [won])

  function handleCopy() {
    const text = `Zizi Wordle — ${word.length}-letter word\n${score}\n\n${rows.join('\n')}\n\nPlay at swoplabs.com`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="result-screen">
      {won && rainTop > 0 && <WatermelonRain startY={rainTop} />}

      {won ? (
        <div className="congrats-block">
          <div className="congrats-text" ref={congratsRef}>Congratulations!</div>
          <div className="congrats-word">{word}</div>
        </div>
      ) : (
        <>
          <div className="result-badge lose">Better luck next time</div>
          <div className="result-word">{word}</div>
        </>
      )}

      <p className="result-score">
        {won
          ? `Solved in ${guesses.length} of ${MAX_ATTEMPTS} attempts`
          : `The word was ${word}`
        }
      </p>

      <div className="emoji-grid">
        <p className="emoji-grid-title">Your result — {score}</p>
        {rows.map((row, i) => (
          <div className="emoji-row" key={i}>{row}</div>
        ))}
      </div>

      <div className="result-actions">
        <button
          className={`result-btn primary${copied ? ' copied-state' : ''}`}
          onClick={handleCopy}
        >
          {copied ? 'Copied!' : 'Copy results'}
        </button>
        <button className="result-btn secondary" onClick={onPlayAgain}>
          New challenge
        </button>
      </div>
    </div>
  )
}

// ─── GAME SCREEN ─────────────────────────────────────────────────────────────
function GameScreen({ gameData, onBack }) {
  const { w: target, h: hint, l: wordLength } = gameData
  const [guesses, setGuesses] = useState([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [gameOver, setGameOver] = useState(false)
  const [won, setWon] = useState(false)
  const [revealRow, setRevealRow] = useState(-1)
  const [shakeRow, setShakeRow] = useState(-1)
  const [winRow, setWinRow] = useState(-1)
  const { toasts, show } = useToasts()
  const shakeTimeout = useRef(null)

  const currentRow = guesses.length

  // Letter states for keyboard
  const letterStates = {}
  guesses.forEach(({ letters, result }) => {
    letters.forEach((l, i) => {
      const prev = letterStates[l]
      if (result[i] === 'correct') {
        letterStates[l] = 'correct'
      } else if (result[i] === 'present' && prev !== 'correct') {
        letterStates[l] = 'present'
      } else if (!prev) {
        letterStates[l] = 'absent'
      }
    })
  })

  const handleKey = useCallback((key) => {
    if (gameOver) return

    if (key === '⌫' || key === 'BACKSPACE') {
      setCurrentGuess(g => g.slice(0, -1))
      return
    }

    if (key === 'ENTER') {
      if (currentGuess.length < wordLength) {
        show('Not enough letters')
        setShakeRow(currentRow)
        clearTimeout(shakeTimeout.current)
        shakeTimeout.current = setTimeout(() => setShakeRow(-1), 500)
        return
      }

      const guess = currentGuess.toUpperCase()
      const result = evaluateGuess(guess, target)
      const newGuess = { letters: guess.split(''), result }
      const newGuesses = [...guesses, newGuess]
      const isWin = result.every(r => r === 'correct')

      // Reveal animation
      setRevealRow(currentRow)
      setTimeout(() => {
        setRevealRow(-1)
        setGuesses(newGuesses)
        setCurrentGuess('')

        if (isWin) {
          setWon(true)
          setWinRow(currentRow)
          setTimeout(() => {
            setGameOver(true)
            setWinRow(-1)
          }, 800)
          const msgs = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!']
          show(msgs[Math.min(currentRow, msgs.length - 1)])
        } else if (newGuesses.length === MAX_ATTEMPTS) {
          show(target)
          setTimeout(() => setGameOver(true), 1800)
        }
      }, wordLength * 60 + 350)

      // Optimistically add for reveal animation
      setGuesses(g => [...g, newGuess])
      setCurrentGuess('')
      return
    }

    if (/^[A-Z]$/i.test(key) && currentGuess.length < wordLength) {
      setCurrentGuess(g => g + key.toUpperCase())
    }
  }, [gameOver, currentGuess, wordLength, currentRow, guesses, target, show])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key === 'Backspace' ? 'BACKSPACE' : e.key.toUpperCase()
      handleKey(k)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleKey])

  if (gameOver) {
    return (
      <>
        <div className="toast-container">
          {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
        </div>
        <ResultScreen
          won={won}
          word={target}
          guesses={guesses}
          wordLength={wordLength}
          onPlayAgain={onBack}
        />
      </>
    )
  }

  return (
    <>
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
      </div>
      <div className="game-screen">
        <p className="game-subtitle">
          Guess the {wordLength}-letter word in {MAX_ATTEMPTS} tries
        </p>

        {hint && (
          <div className="hint-bar">
            <strong>Hint</strong> {hint}
          </div>
        )}

        <Grid
          wordLength={wordLength}
          guesses={guesses}
          currentGuess={currentGuess}
          currentRow={currentRow}
          revealRow={revealRow}
          shakeRow={shakeRow}
          winRow={winRow}
        />

        <Keyboard onKey={handleKey} letterStates={{}} />
      </div>
    </>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [gameData, setGameData] = useState(() => {
    const hash = window.location.hash
    if (hash && hash.length > 1) {
      return decodeGame(hash.slice(1))
    }
    return null
  })

  function goBack() {
    window.location.hash = ''
    setGameData(null)
  }

  // Listen for hash changes (when someone navigates to a shared link)
  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash
      if (hash && hash.length > 1) {
        const data = decodeGame(hash.slice(1))
        setGameData(data)
      } else {
        setGameData(null)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <>
      <header className="header">
        {gameData && (
          <button
            onClick={goBack}
            style={{
              position: 'absolute', left: 20,
              background: 'none', border: 'none',
              color: 'var(--text-dim)', cursor: 'pointer',
              fontSize: 12, letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: 'DM Mono, monospace'
            }}
          >
            ← Back
          </button>
        )}
        <div className="logo">Zizi Wordle</div>
        <div className="header-badge">{gameData ? `${gameData.l} letters` : 'Beta'}</div>
      </header>

      <main className="app">
        {gameData
          ? <GameScreen gameData={gameData} onBack={goBack} />
          : <SetupScreen />
        }
      </main>

      <footer className="footer">
        Powered by <span>SWOP Labs</span> &bull; Riccardo Dana
      </footer>
    </>
  )
}
