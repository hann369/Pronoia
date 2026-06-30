// components/games/ChessLab.js
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useProtocol } from '@/hooks/useProtocol';
import { useChat } from '@/hooks/useChat';
import styles from './ChessLab.module.css';

// Initial board setup
const INITIAL_BOARD = [
  ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
  ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
  ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
];

// Piece unicode mapping
const UNICODE_PIECES = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
};

const cloneBoard = (board) => board.map(row => [...row]);

// ─── Game State Object ─────────────────────────────────────────────────────
// gameState: { enPassantTarget: {r,c}|null, castling: { wK, wQ, bK, bQ } }
// castling flags = true means that side still has the right (king/rook not moved)

const DEFAULT_GAME_STATE = {
  enPassantTarget: null,
  castling: { wK: true, wQ: true, bK: true, bQ: true }
};

// Generate pseudo-legal moves (no check validation)
// gameState is optional; without it, en passant & castling are skipped
const getRawMoves = (board, r, c, gameState = DEFAULT_GAME_STATE) => {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  const moves = [];
  const { enPassantTarget, castling } = gameState;

  const isOpponentOrEmpty = (targetR, targetC) => {
    if (targetR < 0 || targetR > 7 || targetC < 0 || targetC > 7) return false;
    const target = board[targetR][targetC];
    return !target || target[0] !== color;
  };

  const isEmpty = (targetR, targetC) => {
    if (targetR < 0 || targetR > 7 || targetC < 0 || targetC > 7) return false;
    return !board[targetR][targetC];
  };

  const isOpponent = (targetR, targetC) => {
    if (targetR < 0 || targetR > 7 || targetC < 0 || targetC > 7) return false;
    const target = board[targetR][targetC];
    return target && target[0] !== color;
  };

  if (type === 'p') {
    const dir = color === 'w' ? -1 : 1;
    if (isEmpty(r + dir, c)) {
      moves.push({ r: r + dir, c });
      const startRank = color === 'w' ? 6 : 1;
      if (r === startRank && isEmpty(r + 2 * dir, c)) {
        moves.push({ r: r + 2 * dir, c, enPassantPush: true });
      }
    }
    if (isOpponent(r + dir, c - 1)) moves.push({ r: r + dir, c: c - 1 });
    if (isOpponent(r + dir, c + 1)) moves.push({ r: r + dir, c: c + 1 });

    // En Passant
    if (enPassantTarget) {
      if (r + dir === enPassantTarget.r) {
        if (c - 1 === enPassantTarget.c) moves.push({ r: r + dir, c: c - 1, enPassant: true });
        if (c + 1 === enPassantTarget.c) moves.push({ r: r + dir, c: c + 1, enPassant: true });
      }
    }
  }

  if (type === 'n') {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    offsets.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (isOpponentOrEmpty(nr, nc)) {
        moves.push({ r: nr, c: nc });
      }
    });
  }

  const addSlidingMoves = (dirs) => {
    dirs.forEach(([dr, dc]) => {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
        const target = board[nr][nc];
        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (target[0] !== color) {
            moves.push({ r: nr, c: nc });
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    });
  };

  if (type === 'b') {
    addSlidingMoves([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  }
  if (type === 'r') {
    addSlidingMoves([[1, 0], [-1, 0], [0, 1], [0, -1]]);
  }
  if (type === 'q') {
    addSlidingMoves([[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);
  }

  if (type === 'k') {
    const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
    dirs.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (isOpponentOrEmpty(nr, nc)) {
        moves.push({ r: nr, c: nc });
      }
    });

    // Castling (pseudo-legal; legality checked in getLegalMoves)
    if (castling) {
      const kingRow = color === 'w' ? 7 : 0;
      if (r === kingRow && c === 4) {
        // Kingside
        const ksFlag = color === 'w' ? castling.wK : castling.bK;
        if (ksFlag && isEmpty(kingRow, 5) && isEmpty(kingRow, 6) &&
            board[kingRow][7] === color + 'r') {
          moves.push({ r: kingRow, c: 6, castling: 'K' });
        }
        // Queenside
        const qsFlag = color === 'w' ? castling.wQ : castling.bQ;
        if (qsFlag && isEmpty(kingRow, 3) && isEmpty(kingRow, 2) && isEmpty(kingRow, 1) &&
            board[kingRow][0] === color + 'r') {
          moves.push({ r: kingRow, c: 2, castling: 'Q' });
        }
      }
    }
  }

  return moves;
};

// Check if king of specific color is in check
const isKingInCheck = (tempBoard, color, gameState = DEFAULT_GAME_STATE) => {
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = tempBoard[r][c];
      if (piece === color + 'k') {
        kr = r;
        kc = c;
        break;
      }
    }
    if (kr !== -1) break;
  }
  if (kr === -1) return false;

  const oppColor = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = tempBoard[r][c];
      if (piece && piece[0] === oppColor) {
        // Pass a neutral game state to avoid recursive castling checks in check detection
        const moves = getRawMoves(tempBoard, r, c, { enPassantTarget: null, castling: { wK: false, wQ: false, bK: false, bQ: false } });
        if (moves.some(m => m.r === kr && m.c === kc)) {
          return true;
        }
      }
    }
  }
  return false;
};

// Apply a move to a board, returning the new board + updated gameState
const applyMove = (board, from, to, piece, moveFlags, gameState) => {
  const nextBoard = cloneBoard(board);
  const nextCastling = { ...gameState.castling };
  let nextEnPassantTarget = null;

  nextBoard[to.r][to.c] = piece;
  nextBoard[from.r][from.c] = null;

  // En Passant capture: remove the captured pawn
  if (moveFlags?.enPassant && gameState.enPassantTarget) {
    const capDir = piece[0] === 'w' ? 1 : -1;
    nextBoard[to.r + capDir][to.c] = null;
  }

  // Set en passant target square after double pawn push
  if (moveFlags?.enPassantPush) {
    const dir = piece[0] === 'w' ? -1 : 1;
    nextEnPassantTarget = { r: from.r + dir, c: from.c };
  }

  // Castling: move the rook too
  if (moveFlags?.castling) {
    const row = piece[0] === 'w' ? 7 : 0;
    if (moveFlags.castling === 'K') {
      nextBoard[row][5] = piece[0] + 'r';
      nextBoard[row][7] = null;
    } else {
      nextBoard[row][3] = piece[0] + 'r';
      nextBoard[row][0] = null;
    }
  }

  // Update castling rights on king/rook moves
  if (piece === 'wk') { nextCastling.wK = false; nextCastling.wQ = false; }
  if (piece === 'bk') { nextCastling.bK = false; nextCastling.bQ = false; }
  if (piece === 'wr') {
    if (from.r === 7 && from.c === 7) nextCastling.wK = false;
    if (from.r === 7 && from.c === 0) nextCastling.wQ = false;
  }
  if (piece === 'br') {
    if (from.r === 0 && from.c === 7) nextCastling.bK = false;
    if (from.r === 0 && from.c === 0) nextCastling.bQ = false;
  }

  // Pawn promotion: auto-queen
  if (piece === 'wp' && to.r === 0) nextBoard[to.r][to.c] = 'wq';
  if (piece === 'bp' && to.r === 7) nextBoard[to.r][to.c] = 'bq';

  return {
    board: nextBoard,
    gameState: { enPassantTarget: nextEnPassantTarget, castling: nextCastling }
  };
};

// Filter raw moves to check for self-check + castling legality
const getLegalMoves = (board, r, c, gameState = DEFAULT_GAME_STATE) => {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece[0];
  const raw = getRawMoves(board, r, c, gameState);

  return raw.filter(m => {
    // For castling: verify king doesn't pass through or land in check
    if (m.castling) {
      const row = color === 'w' ? 7 : 0;
      // King must not be in check currently
      if (isKingInCheck(board, color, gameState)) return false;
      // King must not pass through attacked square
      const passThroughC = m.castling === 'K' ? 5 : 3;
      const passThroughBoard = cloneBoard(board);
      passThroughBoard[row][passThroughC] = piece;
      passThroughBoard[row][4] = null;
      if (isKingInCheck(passThroughBoard, color, gameState)) return false;
    }

    const { board: nextBoard, gameState: nextGs } = applyMove(
      board, { r, c }, m, piece, m, gameState
    );
    return !isKingInCheck(nextBoard, color, nextGs);
  });
};


// Heuristic Board Evaluation
const evaluateBoard = (board) => {
  const values = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const color = piece[0];
        const type = piece[1];
        const val = values[type] || 0;
        
        let posBonus = 0;
        if (r >= 3 && r <= 4 && c >= 3 && c <= 4) {
          posBonus = 2; // Central dominance
        } else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
          posBonus = 1;
        }

        const sign = color === 'w' ? 1 : -1;
        score += sign * (val + posBonus);
      }
    }
  }
  return score;
};

// Minimax AI Search for Black (depth 2) — gameState-aware
const getBestMoveForBlack = (board, gameState = DEFAULT_GAME_STATE) => {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece[0] === 'b') {
        const legal = getLegalMoves(board, r, c, gameState);
        legal.forEach(m => {
          moves.push({ from: { r, c }, to: m });
        });
      }
    }
  }

  if (moves.length === 0) return null;

  let bestScore = Infinity;
  let bestMoves = [];

  moves.forEach(move => {
    const piece = board[move.from.r][move.from.c];
    const { board: boardAfterBlack, gameState: gsAfterBlack } = applyMove(
      board, move.from, move.to, piece, move.to, gameState
    );

    if (isKingInCheck(boardAfterBlack, 'w', gsAfterBlack)) {
      let whiteHasMoves = false;
      for (let wr = 0; wr < 8 && !whiteHasMoves; wr++) {
        for (let wc = 0; wc < 8 && !whiteHasMoves; wc++) {
          const wp = boardAfterBlack[wr][wc];
          if (wp && wp[0] === 'w' && getLegalMoves(boardAfterBlack, wr, wc, gsAfterBlack).length > 0) {
            whiteHasMoves = true;
          }
        }
      }
      if (!whiteHasMoves) {
        bestMoves = [move];
        bestScore = -Infinity;
        return;
      }
    }

    let maxWhiteScore = -Infinity;
    let whiteMovesCount = 0;

    for (let wr = 0; wr < 8; wr++) {
      for (let wc = 0; wc < 8; wc++) {
        const wp = boardAfterBlack[wr][wc];
        if (wp && wp[0] === 'w') {
          const wLegal = getLegalMoves(boardAfterBlack, wr, wc, gsAfterBlack);
          wLegal.forEach(wm => {
            whiteMovesCount++;
            const wPiece = boardAfterBlack[wr][wc];
            const { board: boardAfterWhite } = applyMove(
              boardAfterBlack, { r: wr, c: wc }, wm, wPiece, wm, gsAfterBlack
            );
            const evalScore = evaluateBoard(boardAfterWhite);
            if (evalScore > maxWhiteScore) maxWhiteScore = evalScore;
          });
        }
      }
    }

    if (whiteMovesCount === 0) {
      maxWhiteScore = isKingInCheck(boardAfterBlack, 'w', gsAfterBlack) ? -9999 : 0;
    }

    const scoreWithNoise = maxWhiteScore + (Math.random() - 0.5) * 1.5;

    if (scoreWithNoise < bestScore) {
      bestScore = scoreWithNoise;
      bestMoves = [move];
    } else if (Math.abs(scoreWithNoise - bestScore) < 0.1) {
      bestMoves.push(move);
    }
  });

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};

export default function ChessLab({ setActiveTab }) {
  const { profile } = useProtocol();
  const { conversations, sendMessage } = useChat();
  const [showInviteDropdown, setShowInviteDropdown] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [inviteToast, setInviteToast] = useState(null); // { msg, ok }

  // Keep refs to current board & gameState to avoid stale closures in AI timeout
  const boardRef = useRef(INITIAL_BOARD);
  const gameStateRef = useRef(DEFAULT_GAME_STATE);

  // Intro states
  const [showIntro, setShowIntro] = useState(true);
  const [introFadeOut, setIntroFadeOut] = useState(false);

  // Chess states
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [gameState, setGameState] = useState(DEFAULT_GAME_STATE); // en passant + castling rights
  // Keep refs in sync
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  const [selectedSquare, setSelectedSquare] = useState(null); // { r, c }
  const [highlightedSquares, setHighlightedSquares] = useState([]); // [{ r, c }]
  const [lastMove, setLastMove] = useState(null); // { from: {r,c}, to: {r,c} }
  const [turn, setTurn] = useState('w'); // 'w' | 'b'
  const [gameStatus, setGameStatus] = useState('active'); // 'active' | 'checkmate' | 'stalemate' | 'draw'
  const [winner, setWinner] = useState(null); // 'w' | 'b' | null

  // Telemetry states
  const [hrvHistory, setHrvHistory] = useState([72, 70, 71, 74, 73, 72]);
  const [gameHistory, setGameHistory] = useState([]); // [{ moveText: string, accuracy: string, type: string }]
  const [moveTimes, setMoveTimes] = useState([]); // list of think times in ms
  const [currentTurnStart, setCurrentTurnStart] = useState(Date.now());
  const [lastMoveAnalysis, setLastMoveAnalysis] = useState(null); // details of the last move
  
  // Game stats counter
  const [stats, setStats] = useState({
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    totalAccuracy: 0,
    moveCount: 0
  });

  // Derived user biometrics
  const userHrvBaseline = profile?.metrics?.hrv || 72;
  const userSleepScore = profile?.metrics?.sleepScore || 80;
  const userGlucose = profile?.metrics?.glucose || 100;
  const userStack = profile?.stack || [];

  // Active stack cognitive boost calculation
  const stackModifiers = useMemo(() => {
    let focusBoost = 0;
    let speedBoost = 0;
    let stressReduction = 0;

    userStack.forEach(item => {
      const name = item.name.toLowerCase();
      if (name.includes('caffe') || name.includes('kaff')) {
        focusBoost += 10;
        speedBoost += 15;
      }
      if (name.includes('thean') || name.includes('tean')) {
        stressReduction += 20;
        focusBoost += 5;
      }
      if (name.includes('bacop')) {
        focusBoost += 15;
        speedBoost -= 5; // bacopa can cause mild fatigue/slowing
      }
      if (name.includes('lion') || name.includes('löwe')) {
        focusBoost += 12;
      }
    });

    if (userStack.length === 0) {
      focusBoost = 5;
      speedBoost = 0;
      stressReduction = 5;
    }

    return { focusBoost, speedBoost, stressReduction };
  }, [userStack]);

  const currentHrv = useMemo(() => {
    if (hrvHistory.length === 0) return userHrvBaseline;
    return hrvHistory[hrvHistory.length - 1];
  }, [hrvHistory, userHrvBaseline]);

  const currentEval = useMemo(() => {
    return evaluateBoard(board) / 10.0;
  }, [board]);

  // Intro fade sequence
  useEffect(() => {
    const fadeTimer = setTimeout(() => setIntroFadeOut(true), 1200);
    const hideTimer = setTimeout(() => setShowIntro(false), 2200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // AI Opponent trigger
  useEffect(() => {
    if (turn === 'b' && gameStatus === 'active' && gameActive) {
      const timer = setTimeout(() => {
        makeAIMove(boardRef.current, gameStateRef.current);
      }, 600 + Math.random() * 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, gameStatus, gameActive]);

  const makeAIMove = useCallback((currentBoard, currentGameState) => {
    const aiMove = getBestMoveForBlack(currentBoard, currentGameState);
    if (!aiMove) {
      const check = isKingInCheck(currentBoard, 'b', currentGameState);
      if (check) {
        setGameStatus('checkmate');
        setWinner('w');
      } else {
        setGameStatus('stalemate');
      }
      return;
    }

    const piece = currentBoard[aiMove.from.r][aiMove.from.c];
    const { board: nextBoard, gameState: nextGs } = applyMove(
      currentBoard, aiMove.from, aiMove.to, piece, aiMove.to, currentGameState
    );

    // Log AI move to game history
    const fileLetters = ['a','b','c','d','e','f','g','h'];
    const isCapture = currentBoard[aiMove.to.r][aiMove.to.c] !== null || aiMove.to.enPassant;
    const aiNotation = `${piece[1].toUpperCase()}${isCapture ? 'x' : ''}${fileLetters[aiMove.to.c]}${8 - aiMove.to.r}`;
    setGameHistory(prev => [...prev, { moveText: aiNotation, accuracy: null, type: 'engine' }]);

    setBoard(nextBoard);
    setGameState(nextGs);
    setLastMove({ from: aiMove.from, to: aiMove.to });
    setTurn('w');
    setCurrentTurnStart(Date.now());

    // Check if White is now in checkmate or stalemate
    let whiteHasMoves = false;
    for (let r = 0; r < 8 && !whiteHasMoves; r++) {
      for (let c = 0; c < 8 && !whiteHasMoves; c++) {
        const wp = nextBoard[r][c];
        if (wp && wp[0] === 'w' && getLegalMoves(nextBoard, r, c, nextGs).length > 0) {
          whiteHasMoves = true;
        }
      }
    }
    if (!whiteHasMoves) {
      if (isKingInCheck(nextBoard, 'w', nextGs)) {
        setGameStatus('checkmate');
        setWinner('b');
      } else {
        setGameStatus('stalemate');
      }
    }
  }, []);

  const handleSquareClick = (r, c) => {
    if (!gameActive || turn !== 'w' || gameStatus !== 'active') return;

    // Find matching move object from highlighted squares (may carry castling/enPassant flags)
    const matchingMove = highlightedSquares.find(m => m.r === r && m.c === c);
    if (matchingMove && selectedSquare) {
      executePlayerMove(selectedSquare, matchingMove);
      return;
    }

    const piece = board[r][c];
    if (piece && piece[0] === 'w') {
      setSelectedSquare({ r, c });
      setHighlightedSquares(getLegalMoves(board, r, c, gameState));
    } else {
      setSelectedSquare(null);
      setHighlightedSquares([]);
    }
  };

  const executePlayerMove = (from, to) => {
    const piece = board[from.r][from.c];
    const isCapture = board[to.r][to.c] !== null || to.enPassant;

    // Apply move via the unified applyMove (handles castling, en passant, promotion)
    const { board: nextBoard, gameState: nextGs } = applyMove(
      board, from, to, piece, to, gameState
    );

    const thinkTime = Date.now() - currentTurnStart;
    setMoveTimes(prev => [...prev, thinkTime]);

    // Accuracy: compare actual eval vs best possible eval from this position
    let maxBestEval = -Infinity;
    for (let pr = 0; pr < 8; pr++) {
      for (let pc = 0; pc < 8; pc++) {
        const wp = board[pr][pc];
        if (wp && wp[0] === 'w') {
          const legalDest = getLegalMoves(board, pr, pc, gameState);
          legalDest.forEach(dest => {
            const wPiece = board[pr][pc];
            const { board: simBoard } = applyMove(board, { r: pr, c: pc }, dest, wPiece, dest, gameState);
            const ev = evaluateBoard(simBoard);
            if (ev > maxBestEval) maxBestEval = ev;
          });
        }
      }
    }

    const actualEvalVal = evaluateBoard(nextBoard);
    const diff = (maxBestEval - actualEvalVal) / 10.0;

    let classification = 'good';
    let accuracyRating = 85;

    if (diff <= 0.05) { classification = 'best'; accuracyRating = 100; }
    else if (diff <= 0.25) { classification = 'excellent'; accuracyRating = 95; }
    else if (diff <= 0.6)  { classification = 'good'; accuracyRating = 85; }
    else if (diff <= 1.2)  { classification = 'inaccuracy'; accuracyRating = 65; }
    else if (diff <= 2.2)  { classification = 'mistake'; accuracyRating = 45; }
    else                   { classification = 'blunder'; accuracyRating = 10; }

    let hrvDelta = (Math.random() - 0.5) * 3;
    if (classification === 'blunder') hrvDelta -= 7;
    else if (classification === 'best' || classification === 'excellent') hrvDelta += 4;

    if (isKingInCheck(nextBoard, 'w', nextGs)) hrvDelta -= 5;
    if (actualEvalVal < -20) hrvDelta -= 3;

    const nextHrv = Math.max(40, Math.min(120, Math.round(currentHrv + hrvDelta + (stackModifiers.stressReduction / 10))));
    setHrvHistory(prev => [...prev.slice(-9), nextHrv]);

    setStats(prev => {
      const nextStats = { ...prev };
      nextStats[classification]++;
      nextStats.moveCount++;
      nextStats.totalAccuracy += accuracyRating;
      return nextStats;
    });

    const fileLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromStr = `${fileLetters[from.c]}${8 - from.r}`;
    const toStr   = `${fileLetters[to.c]}${8 - to.r}`;
    // Special notation for castling
    let moveNotation;
    if (to.castling === 'K') moveNotation = 'O-O';
    else if (to.castling === 'Q') moveNotation = 'O-O-O';
    else moveNotation = `${piece[1].toUpperCase()}${isCapture ? 'x' : ''}${toStr}`;

    setLastMoveAnalysis({
      move: moveNotation, from: fromStr, to: toStr,
      type: classification, accuracy: accuracyRating,
      thinkTime: (thinkTime / 1000).toFixed(1), hrv: nextHrv,
      evalAfter: actualEvalVal / 10.0
    });
    setGameHistory(prev => [...prev, { moveText: moveNotation, accuracy: accuracyRating, type: classification }]);

    // Update board + game state
    setBoard(nextBoard);
    setGameState(nextGs);
    setLastMove({ from, to });
    setSelectedSquare(null);
    setHighlightedSquares([]);

    // Immediately check if Black is in checkmate or stalemate
    let blackHasMoves = false;
    for (let pr = 0; pr < 8 && !blackHasMoves; pr++) {
      for (let pc = 0; pc < 8 && !blackHasMoves; pc++) {
        const bp = nextBoard[pr][pc];
        if (bp && bp[0] === 'b' && getLegalMoves(nextBoard, pr, pc, nextGs).length > 0) {
          blackHasMoves = true;
        }
      }
    }

    if (!blackHasMoves) {
      if (isKingInCheck(nextBoard, 'b', nextGs)) {
        setGameStatus('checkmate');
        setWinner('w');
      } else {
        setGameStatus('stalemate');
      }
    } else {
      setTurn('b');
    }
  };

  const startGame = () => {
    setBoard(INITIAL_BOARD);
    setGameState(DEFAULT_GAME_STATE);
    setSelectedSquare(null);
    setHighlightedSquares([]);
    setLastMove(null);
    setTurn('w');
    setGameStatus('active');
    setWinner(null);
    setHrvHistory([userHrvBaseline]);
    setGameHistory([]);
    setMoveTimes([]);
    setCurrentTurnStart(Date.now());
    setLastMoveAnalysis(null);
    setStats({
      best: 0,
      excellent: 0,
      good: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      totalAccuracy: 0,
      moveCount: 0
    });
    setGameActive(true);
  };

  const cancelGame = () => {
    setGameActive(false);
    setGameStatus('active');
    setWinner(null);
    setBoard(INITIAL_BOARD);
    setGameState(DEFAULT_GAME_STATE);
    setSelectedSquare(null);
    setHighlightedSquares([]);
    setLastMove(null);
    setTurn('w');
    setLastMoveAnalysis(null);
  };

  const handleShareInviteToChat = async (chatId) => {
    const payload = {
      title: "Schach-Herausforderung",
      desc: `${profile?.displayName || 'Ein Mitglied'} fordert dich zu einer Partie Schach heraus!`,
      gameId: Math.random().toString(36).substr(2, 9)
    };
    const success = await sendMessage(chatId, JSON.stringify(payload), 'chess-invite');
    setShowInviteDropdown(false);
    setInviteToast({
      msg: success ? 'Schach-Einladung gesendet! ♟' : 'Fehler beim Senden der Einladung.',
      ok: success
    });
    setTimeout(() => setInviteToast(null), 3000);
  };

  const avgAccuracy = useMemo(() => {
    if (stats.moveCount === 0) return 0;
    return Math.round(stats.totalAccuracy / stats.moveCount);
  }, [stats]);

  const avgThinkTime = useMemo(() => {
    if (moveTimes.length === 0) return 0;
    const sum = moveTimes.reduce((acc, t) => acc + t, 0);
    return (sum / moveTimes.length / 1000).toFixed(1);
  }, [moveTimes]);

  const biometricsHeuristicNote = useMemo(() => {
    if (userSleepScore < 65) {
      return {
        title: 'Minderleister-Modus (Kritischer Schlafmangel)',
        desc: 'Dein Schlaf liegt unter 65%. Dein Reaktions- und Rechenvermögen ist nachweislich verlangsamt (+18% Bedenkzeit), und deine Blunder-Gefahr steigt statistisch um 22%. Stack PX-V1 kompensiert nur teilweise.',
        severity: 'critical'
      };
    } else if (stackModifiers.focusBoost > 20) {
      return {
        title: 'Nootropischer Flow-Zustand',
        desc: 'Aktiver Bio-Stack (Koffein + L-Theanin Synergie) moduliert dein PNS. Stressresistenz nominal (+20% Dämpfung), die Berechnungsgeschwindigkeit profitiert von erhöhter Synapsen-Reizleitung.',
        severity: 'active'
      };
    } else if (currentHrv < 55) {
      return {
        title: 'Kognitiver Stress-Peak',
        desc: 'Akuter HRV-Abfall detektiert. Die Herzfrequenzvariabilität sinkt durch Stellungsdruck auf dem Brett. Tief durchatmen (PNS-Triggerung empfohlen), um Fehlentscheidungen zu vermeiden.',
        severity: 'stress'
      };
    } else {
      return {
        title: 'Biometrische Baseline Nominal',
        desc: 'Regeneration bei 80%+. Dein zirkadianer Fokus-Peak stützt taktische Tiefe. Deine Fehlzugquote korreliert positiv mit der stabilen Glukoseversorgung von 100 mg/dL.',
        severity: 'nominal'
      };
    }
  }, [userSleepScore, stackModifiers, currentHrv]);

  return (
    <div className={styles.labShell}>
      {/* Intro startup splash animation */}
      {showIntro && (
        <div className={`${styles.introOverlay} ${introFadeOut ? styles.introOpen : ''}`}>
          <div className={styles.introTop} />
          <div className={styles.introBottom} />
          <div className={styles.introWordmark}>
            <div className={styles.introPip} />PRONOIA COGNITIVE LAB
          </div>
        </div>
      )}

      {/* Floating exit */}
      <button className={styles.labExit} onClick={() => setActiveTab('apps')}>
        <span>←</span> EXIT LAB
      </button>

      {/* In-app toast for invite feedback */}
      {inviteToast && (
        <div className={`${styles.inviteToast} ${inviteToast.ok ? styles.toastOk : styles.toastErr}`}>
          {inviteToast.msg}
        </div>
      )}

      {/* Main gameplay panel */}
      <main className={styles.labCanvas}>
        <div className={styles.glowBg} aria-hidden="true" />

        {/* Hero header */}
        <section className={styles.labHero}>
          <div className={styles.monoEyebrow}>Pronoia Games · Tactical Biometrics</div>
          <h1 className={styles.labHeroTitle}>Kognitives Schach-Labor.</h1>
          <p className={styles.labHeroSub}>Kombiniere tiefenstrategische Manöver mit live bio-sensorischer Telemetrie.</p>
        </section>

        {/* Outer Split Layout */}
        <div className={styles.gameSplitLayout}>
          
          {/* Left panel: Chessboard Column */}
          <div className={styles.boardColumn}>
            
            {/* Status bar */}
            {/* Status bar */}
            <div className={styles.boardHeader}>
              <div className={styles.turnIndicator}>
                <span className={`${styles.pulseDot} ${turn === 'w' ? styles.pulseWhite : styles.pulseBlack}`} />
                <span className={styles.turnLabel}>
                  {turn === 'w' ? 'Deine Runde (Weiß)' : 'Engine berechnet... (Schwarz)'}
                </span>
              </div>
              {gameActive ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className={styles.resetBtn} onClick={startGame}>Neustarten</button>
                  <button className={`${styles.resetBtn} ${styles.cancelBtn}`} onClick={cancelGame}>Spiel abbrechen</button>
                </div>
              ) : (
                <button className={`${styles.resetBtn} ${styles.startBtn}`} onClick={startGame}>Spiel starten</button>
              )}
            </div>

            {/* Chessboard frame */}
            <div className={styles.boardWrapper}>
              <div className={`${styles.boardGrid} ${!gameActive ? styles.boardBlurred : ''}`}>
                {board.map((row, r) => 
                  row.map((piece, c) => {
                    const isDark = (r + c) % 2 === 1;
                    const isSelected = selectedSquare && selectedSquare.r === r && selectedSquare.c === c;
                    const isHighlighted = highlightedSquares.some(m => m.r === r && m.c === c);
                    const isLast = lastMove && (
                      (lastMove.from.r === r && lastMove.from.c === c) || 
                      (lastMove.to.r === r && lastMove.to.c === c)
                    );
                    
                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleSquareClick(r, c)}
                        className={`
                          ${styles.square} 
                          ${isDark ? styles.squareDark : styles.squareLight}
                          ${isSelected ? styles.squareSelected : ''}
                          ${isLast ? styles.squareLastMove : ''}
                        `}
                      >
                        {/* Legal move indicator dot */}
                        {isHighlighted && <div className={styles.highlightDot} />}
                        
                        {/* Chess piece */}
                        {piece && (
                          <span className={`${styles.piece} ${piece[0] === 'w' ? styles.pieceWhite : styles.pieceBlack}`}>
                            {UNICODE_PIECES[piece]}
                          </span>
                        )}

                        {/* Coordinates labels */}
                        {c === 0 && <span className={styles.coordRank}>{8 - r}</span>}
                        {r === 7 && <span className={styles.coordFile}>{['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][c]}</span>}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Start Game Overlay */}
              {!gameActive && (
                <div className={styles.gameOverOverlay}>
                  <div className={styles.gameOverCard}>
                    <h3 className={styles.gameOverTitle}>Kognitives Match</h3>
                    <p className={styles.gameOverSub}>
                      Starte eine Partie Schach gegen die Engine, um deine Biometrie und Leistungswerte live zu korrelieren.
                    </p>
                    <button className={styles.gameOverBtn} onClick={startGame}>Spiel Starten</button>
                  </div>
                </div>
              )}

              {/* Game Over modal overlay */}
              {gameStatus !== 'active' && gameActive && (
                <div className={styles.gameOverOverlay}>
                  <div className={styles.gameOverCard}>
                    <h3 className={styles.gameOverTitle}>Partie beendet</h3>
                    <p className={styles.gameOverSub}>
                      {gameStatus === 'checkmate' 
                        ? (winner === 'w' ? 'Schachmatt! Sieg für dich.' : 'Schachmatt! Engine gewinnt.')
                        : 'Patt! Unentschieden.'}
                    </p>
                    <div className={styles.gameOverStats}>
                      <div>Genauigkeit: <span>{avgAccuracy}%</span></div>
                      <div>Bedenkzeit: <span>{avgThinkTime}s</span></div>
                    </div>
                    <button className={styles.gameOverBtn} onClick={startGame}>Nochmal spielen</button>
                  </div>
                </div>
              )}
            </div>

            {/* Evaluation bar under board */}
            <div className={styles.evalBarWrapper}>
              <div className={styles.evalBarLabel}>
                <span>Engine Evaluation:</span>
                <span className={styles.evalVal}>
                  {currentEval > 0 ? `+${currentEval.toFixed(1)}` : currentEval.toFixed(1)}
                </span>
              </div>
              <div className={styles.evalBarTrack}>
                <div 
                  className={styles.evalBarFill} 
                  style={{ width: `${Math.min(100, Math.max(0, 50 + (currentEval * 5)))}%` }}
                />
              </div>
            </div>

          </div>

          {/* Right panel: Biometrics & Analytics Dashboard */}
          <aside className={styles.analyticsSidebar}>
            
            {/* Matchmaking & Invite Card */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <h4 className={styles.sideCardTitle}>Matchmaking &amp; Duell</h4>
                <span className={styles.sideCardSubtitle}>Community</span>
              </div>
              <div className={styles.matchmakingBody}>
                <p className={styles.matchmakingDesc} style={{ fontSize: '0.72rem', color: 'var(--lab-text2)', marginBottom: '0.85rem', lineHeight: '1.4' }}>
                  Fordere Freunde aus dem Social Hub direkt zu einer bio-kognitiven Schachpartie heraus.
                </p>
                <div style={{ position: 'relative' }}>
                  <button 
                    className={styles.inviteBtn} 
                    onClick={() => setShowInviteDropdown(!showInviteDropdown)}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid rgba(139, 92, 246, 0.3)', background: 'rgba(139, 92, 246, 0.08)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 'bold' }}
                  >
                    ✉ Spieleinladung senden
                  </button>
                  {showInviteDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0e0c15', border: '1px solid var(--lab-line)', borderRadius: '6px', marginTop: '0.4rem', zIndex: 100, padding: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxHeight: '180px', overflowY: 'auto' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--lab-text3)', padding: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Freund auswählen:</div>
                      {conversations.map(chat => (
                        <button 
                          key={chat.id} 
                          onClick={() => handleShareInviteToChat(chat.id)}
                          style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '0.4rem 0.5rem', fontSize: '0.72rem', color: 'var(--lab-text2)', cursor: 'pointer', borderRadius: '4px', display: 'block', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          {chat.title}
                        </button>
                      ))}
                      {conversations.length === 0 && (
                        <div style={{ padding: '0.5rem', fontSize: '0.72rem', color: 'var(--lab-text3)', textAlign: 'center' }}>Keine aktiven Chats im Social Hub</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Live HRV Telemetry Card */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <h4 className={styles.sideCardTitle}>Kognitive Belastung (Live HRV)</h4>
                <span className={`${styles.badge} ${currentHrv < 55 ? styles.badgeAlert : styles.badgeInfo}`}>
                  {currentHrv} ms
                </span>
              </div>
              
              {/* HRV Sparkline Chart */}
              <div className={styles.hrvChartFrame}>
                <svg className={styles.hrvSvg} viewBox="0 0 100 30" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="hrvGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  
                  {/* Fill area */}
                  <path
                    d={`M 0 30 ${hrvHistory.map((h, i) => {
                      const x = hrvHistory.length > 1 ? (i / (hrvHistory.length - 1)) * 100 : 50;
                      const y = 30 - ((h - 40) / 80) * 30;
                      return `L ${x} ${y}`;
                    }).join(' ')} L 100 30 Z`}
                    fill="url(#hrvGlow)"
                  />
                  
                  {/* Main line */}
                  <path
                    d={hrvHistory.map((h, i) => {
                      const x = hrvHistory.length > 1 ? (i / (hrvHistory.length - 1)) * 100 : 50;
                      const y = 30 - ((h - 40) / 80) * 30;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Highlight latest dot */}
                  {hrvHistory.length > 0 && (
                    <circle
                      cx="100"
                      cy={30 - ((hrvHistory[hrvHistory.length - 1] - 40) / 80) * 30}
                      r="1.5"
                      fill="#8B5CF6"
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                  )}
                </svg>
              </div>

              <div className={styles.hrvMetaRow}>
                <div>Baseline: <span>{userHrvBaseline} ms</span></div>
                <div>Status: <span>{currentHrv < 55 ? 'Erhöhter Stress' : 'Fokus Nominal'}</span></div>
              </div>
            </div>

            {/* Bio-Cognitive Correlation Insight Card */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <h4 className={styles.sideCardTitle}>Kognitive Korrelationen</h4>
                <span className={styles.sideCardSubtitle}>Lifestyle &amp; Play Correlation</span>
              </div>
              
              <div className={`${styles.insightNotice} ${styles[`notice_${biometricsHeuristicNote.severity}`]}`}>
                <h5 className={styles.insightNoticeTitle}>{biometricsHeuristicNote ? biometricsHeuristicNote.title : ''}</h5>
                <p className={styles.insightNoticeDesc}>{biometricsHeuristicNote ? biometricsHeuristicNote.desc : ''}</p>
              </div>

              <div className={styles.statsOverviewRow}>
                <div className={styles.statMetricCard}>
                  <div className={styles.statMetricLabel}>Mittel-Schlaf</div>
                  <div className={styles.statMetricValue}>{userSleepScore}%</div>
                </div>
                <div className={styles.statMetricCard}>
                  <div className={styles.statMetricLabel}>Glukose-Spiegel</div>
                  <div className={styles.statMetricValue}>{userGlucose} <small>mg/dL</small></div>
                </div>
                <div className={styles.statMetricCard}>
                  <div className={styles.statMetricLabel}>Nootropika-Boost</div>
                  <div className={styles.statMetricValue}>+{stackModifiers.focusBoost}%</div>
                </div>
              </div>
            </div>

            {/* Real-time move feedback */}
            {lastMoveAnalysis && (
              <div className={styles.sideCard}>
                <div className={styles.sideCardHeader}>
                  <h4 className={styles.sideCardTitle}>Letzter Zug</h4>
                  <span className={`${styles.accuracyBadge} ${styles[`acc_${lastMoveAnalysis.type}`]}`}>
                    {lastMoveAnalysis.type.toUpperCase()}
                  </span>
                </div>
                <div className={styles.moveAnalysisPanel}>
                  <div className={styles.analysisItem}>
                    <div>Geschnittener Zug:</div>
                    <div className={styles.monoVal}>{lastMoveAnalysis.move} ({lastMoveAnalysis.from} → {lastMoveAnalysis.to})</div>
                  </div>
                  <div className={styles.analysisItem}>
                    <div>Zug-Genauigkeit:</div>
                    <div className={styles.monoVal}>{lastMoveAnalysis.accuracy}%</div>
                  </div>
                  <div className={styles.analysisItem}>
                    <div>Bedenkzeit:</div>
                    <div className={styles.monoVal}>{lastMoveAnalysis.thinkTime}s</div>
                  </div>
                  <div className={styles.analysisItem}>
                    <div>Fokus-Index (HRV):</div>
                    <div className={styles.monoVal}>{lastMoveAnalysis.hrv} ms</div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance breakdown counter */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHeader}>
                <h4 className={styles.sideCardTitle}>Leistungs-Historie</h4>
                <div className={styles.avgAccuracyBlock}>
                  <span>Ø Genauigkeit</span>
                  <div className={styles.avgAccuracyVal}>{avgAccuracy}%</div>
                </div>
              </div>
              
              <div className={styles.classificationGrid}>
                <div className={`${styles.classBadge} ${styles.badgeBest}`}>
                  Best: <span>{stats.best}</span>
                </div>
                <div className={`${styles.classBadge} ${styles.badgeExcellent}`}>
                  Excellent: <span>{stats.excellent}</span>
                </div>
                <div className={`${styles.classBadge} ${styles.badgeGood}`}>
                  Good: <span>{stats.good}</span>
                </div>
                <div className={`${styles.classBadge} ${styles.badgeInaccuracy}`}>
                  Inaccuracy: <span>{stats.inaccuracy}</span>
                </div>
                <div className={`${styles.classBadge} ${styles.badgeMistake}`}>
                  Mistake: <span>{stats.mistake}</span>
                </div>
                <div className={`${styles.classBadge} ${styles.badgeBlunder}`}>
                  Blunder: <span>{stats.blunder}</span>
                </div>
              </div>

              {/* Move history list */}
              {gameHistory.length > 0 && (
                <div className={styles.historyListWrapper}>
                  <h5 className={styles.historyTitle}>Zugliste</h5>
                  <div className={styles.historyScroll}>
                    {gameHistory.map((m, idx) => (
                      <div key={idx} className={styles.historyItem}>
                        <span className={styles.historyIndex}>{idx + 1}.</span>
                        <span className={styles.historyNotation}>{m.moveText}</span>
                        <span className={`${styles.historyAcc} ${styles[`txt_${m.type}`]}`}>{m.accuracy}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </aside>

        </div>
      </main>
    </div>
  );
}
