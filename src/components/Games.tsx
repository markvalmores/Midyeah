/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Gamepad2, Award, Trophy, Play, RotateCcw, ArrowLeft, ArrowRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type GameType = "menu" | "tetris" | "2048" | "rps" | "cups" | "catch";

interface LeadUser {
  name: string;
  score: number;
  game: string;
}

export default function Games() {
  const [activeGame, setActiveGame] = useState<GameType>("menu");
  const [leaderboard, setLeaderboard] = useState<LeadUser[]>([
    { name: "MidyBunny 🐰", score: 12000, game: "Tetris" },
    { name: "Mark David", score: 2048, game: "2048" },
    { name: "Usagyuun Vtuber", score: 180, game: "Catch Fruit" },
    { name: "Coffee King ☕", score: 15, game: "3 Cups" },
    { name: "Guest Creator", score: 8, game: "Rock-Paper-Scissors" }
  ]);

  // Handle score submits
  const postScore = (score: number, gameName: string) => {
    setLeaderboard(prev => {
      const fresh = [...prev, { name: "You (Watching Midyeah)", score, game: gameName }];
      return fresh.sort((a,b) => b.score - a.score).slice(0, 10);
    });
  };

  return (
    <div className="bg-[#121214] border border-white/10 rounded-2xl p-5 shadow-xl text-slate-200 w-full select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-sm text-white">PLAY WHILE WATCHING MODE</h2>
        </div>
        {activeGame !== "menu" && (
          <button
            onClick={() => setActiveGame("menu")}
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 bg-purple-950 px-2.5 py-1 rounded-lg border border-purple-900/60 cursor-pointer transition"
            id="back-to-games-menu"
          >
            ← Games Menu
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeGame === "menu" ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            {/* Tetris Card */}
            <button
              onClick={() => setActiveGame("tetris")}
              className="flex flex-col items-center justify-center p-3.5 bg-gradient-to-br from-purple-900/40 to-indigo-900/40 hover:from-purple-900/60 hover:to-indigo-900/60 border border-purple-900/40 rounded-xl cursor-pointer hover:border-purple-500/50 transition-all text-center group"
              id="game-select-tetris"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform mb-2">🧱</span>
              <h3 className="font-bold text-white text-xs">Midyeah Blocks</h3>
              <p className="text-[10px] text-gray-400 mt-1">Retro Tetris mode</p>
            </button>

            {/* 2048 Card */}
            <button
              onClick={() => setActiveGame("2048")}
              className="flex flex-col items-center justify-center p-3.5 bg-gradient-to-br from-amber-900/40 to-yellow-900/40 hover:from-amber-900/60 hover:to-yellow-900/60 border border-amber-900/40 rounded-xl cursor-pointer hover:border-amber-500/50 transition-all text-center group"
              id="game-select-2048"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform mb-2">🔟</span>
              <h3 className="font-bold text-white text-xs">2048 Slide</h3>
              <p className="text-[10px] text-gray-400 mt-1">Combine the numbers</p>
            </button>

            {/* Rock Paper Scissors Card */}
            <button
              onClick={() => setActiveGame("rps")}
              className="flex flex-col items-center justify-center p-3.5 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 hover:from-emerald-900/60 hover:to-teal-900/60 border border-emerald-900/40 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-all text-center group"
              id="game-select-rps"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform mb-2">✊🪨</span>
              <h3 className="font-bold text-white text-xs">RPS Showdown</h3>
              <p className="text-[10px] text-gray-400 mt-1">Rock, Paper, Scissors</p>
            </button>

            {/* Cups Card */}
            <button
              onClick={() => setActiveGame("cups")}
              className="flex flex-col items-center justify-center p-3.5 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 hover:from-blue-900/60 hover:to-cyan-900/60 border border-blue-900/40 rounded-xl cursor-pointer hover:border-blue-500/50 transition-all text-center group"
              id="game-select-cups"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform mb-2">🏆☕</span>
              <h3 className="font-bold text-white text-xs">Find the Ball</h3>
              <p className="text-[10px] text-gray-400 mt-1">3 Cups, 1 Hidden ball</p>
            </button>

            {/* Catch Fruit Card */}
            <button
              onClick={() => setActiveGame("catch")}
              className="flex flex-col items-center justify-center p-3.5 bg-gradient-to-br from-rose-900/40 to-red-900/40 hover:from-rose-900/60 hover:to-red-900/60 border border-rose-900/40 rounded-xl cursor-pointer hover:border-rose-500/50 transition-all text-center group"
              id="game-select-catch"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform mb-2">🧺🍎</span>
              <h3 className="font-bold text-white text-xs">Catch the Fruits</h3>
              <p className="text-[10px] text-gray-400 mt-1">Move basket score up!</p>
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Game Screen Canvas / UI Holder */}
            <div className="md:col-span-2 bg-[#1C1C1F] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
              {activeGame === "tetris" && <TetrisGame onGameEnd={(s) => postScore(s, "Tetris")} />}
              {activeGame === "2048" && <Game2048 onGameEnd={(s) => postScore(s, "2048")} />}
              {activeGame === "rps" && <RockPaperScissors onGameEnd={(s) => postScore(s, "RPS")} />}
              {activeGame === "cups" && <CupsGame onGameEnd={(s) => postScore(s, "3 Cups")} />}
              {activeGame === "catch" && <CatchFruitGame onGameEnd={(s) => postScore(s, "Catch Fruit")} />}
            </div>

            {/* Live Leaderboard Sidebar */}
            <div className="bg-purple-950/15 border border-purple-950/50 rounded-xl p-3 flex flex-col">
              <h3 className="font-bold text-xs text-white flex items-center gap-1 mb-2">
                <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                <span>LIVE LEADERBOARDS</span>
              </h3>
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[250px] scrollbar-thin">
                {leaderboard.map((user, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[11px] p-2 bg-purple-950/30 rounded border border-purple-950/50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-purple-400">#{idx+1}</span>
                      <span className="font-semibold text-gray-300">{user.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-white text-xs font-bold leading-none block">{user.score}</span>
                      <span className="text-[9px] text-purple-300">{user.game}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 1. MINI TETRIS GAME COMPONENT
function TetrisGame({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [board, setBoard] = useState<number[][]>(() => Array(12).fill(null).map(() => Array(8).fill(0)));
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [currentPiece, setCurrentPiece] = useState({ x: 3, y: 0, shape: [[1,1], [1,1]] });

  const moveLeft = () => {
    setCurrentPiece(prev => {
      const nextX = Math.max(0, prev.x - 1);
      return { ...prev, x: nextX };
    });
  };

  const moveRight = () => {
    setCurrentPiece(prev => {
      const nextX = Math.min(6, prev.x + 1);
      return { ...prev, x: nextX };
    });
  };

  const softDrop = () => {
    setCurrentPiece(prev => {
      const nextY = prev.y + 1;
      if (nextY > 10) {
        // commit piece to board
        setBoard(b => {
          const updated = b.map(row => [...row]);
          // simple projection
          prev.shape.forEach((r, dy) => {
            r.forEach((cell, dx) => {
              if (prev.y + dy < 12 && prev.x + dx < 8) {
                updated[prev.y + dy][prev.x + dx] = 1;
              }
            });
          });
          // check lines clearing
          const cleared = updated.filter(row => !row.every(c => c === 1));
          const linesCleared = 12 - cleared.length;
          if (linesCleared > 0) {
            setScore(s => s + linesCleared * 100);
          }
          while (cleared.length < 12) {
            cleared.unshift(Array(8).fill(0));
          }
          return cleared;
        });
        
        // respawn piece
        if (prev.y <= 1) {
          setIsGameOver(true);
          onGameEnd(score);
        }
        return { x: 3, y: 0, shape: [[1,1], [1,1]] };
      }
      return { ...prev, y: nextY };
    });
  };

  useEffect(() => {
    if (isGameOver) return;
    const interval = setInterval(softDrop, 1000);
    return () => clearInterval(interval);
  }, [score, isGameOver, currentPiece]);

  const resetGame = () => {
    setBoard(Array(12).fill(null).map(() => Array(8).fill(0)));
    setScore(0);
    setIsGameOver(false);
    setCurrentPiece({ x: 3, y: 0, shape: [[1,1], [1,1]] });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full px-2 mb-2">
        <span className="text-xs text-purple-400 font-bold">Midyeah Blocks Game</span>
        <span className="text-xs text-white font-mono font-bold bg-purple-950 px-2 py-0.5 rounded">Score: {score}</span>
      </div>

      {isGameOver ? (
        <div className="text-center p-4">
          <p className="text-sm font-bold text-rose-500">GAME OVER!</p>
          <button onClick={resetGame} className="mt-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-1 px-3 rounded-full flex items-center gap-1 cursor-pointer mx-auto">
            <RotateCcw className="w-3" /> Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col border border-purple-500/30 rounded-lg p-1 bg-black/60">
          {board.map((row, rIdx) => (
            <div key={rIdx} className="flex">
              {row.map((cell, cIdx) => {
                // Determine if part of active block
                const isActive = rIdx >= currentPiece.y && rIdx < currentPiece.y + currentPiece.shape.length &&
                                 cIdx >= currentPiece.x && cIdx < currentPiece.x + currentPiece.shape[0].length;
                return (
                  <div
                    key={cIdx}
                    className={`w-4 h-4 m-[1px] rounded-[2px] transition-colors ${cell === 1 || isActive ? "bg-purple-500 border border-purple-400" : "bg-purple-950/20"}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-4 mt-3">
        <button onClick={moveLeft} className="p-2 bg-purple-900/50 rounded-lg text-white" id="tetris-left">L</button>
        <button onClick={softDrop} className="p-2 bg-purple-900/50 rounded-lg text-white" id="tetris-down">Drop</button>
        <button onClick={moveRight} className="p-2 bg-purple-900/50 rounded-lg text-white" id="tetris-right">R</button>
      </div>
    </div>
  );
}

// 2. MINI 2048 GAME COMPONENT
function Game2048({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [grid, setGrid] = useState<number[][]>([
    [2, 0, 0, 2],
    [0, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]);
  const [score, setScore] = useState(8);

  const keyMove = (direction: "up" | "down" | "left" | "right") => {
    // Basic multiplication slide
    setGrid(prev => {
      const copy = prev.map(row => [...row]);
      let combinedScore = score;
      let shifted = false;

      if (direction === "left") {
        for (let r = 0; r < 4; r++) {
          const row = copy[r].filter(c => c !== 0);
          for (let c = 0; c < row.length - 1; c++) {
            if (row[c] === row[c+1]) {
              row[c] *= 2;
              combinedScore += row[c];
              row[c+1] = 0;
              shifted = true;
            }
          }
          const final = row.filter(c => c !== 0);
          while (final.length < 4) final.push(0);
          copy[r] = final;
        }
      } else if (direction === "right") {
        for (let r = 0; r < 4; r++) {
          const row = copy[r].filter(c => c !== 0);
          for (let c = row.length - 1; c > 0; c--) {
            if (row[c] === row[c-1]) {
              row[c] *= 2;
              combinedScore += row[c];
              row[c-1] = 0;
              shifted = true;
            }
          }
          const final = row.filter(c => c !== 0);
          while (final.length < 4) final.unshift(0);
          copy[r] = final;
        }
      }

      // Add fresh tile
      let added = false;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          if (copy[i][j] === 0 && !added) {
            copy[i][j] = Math.random() > 0.5 ? 2 : 4;
            added = true;
          }
        }
      }

      setScore(combinedScore);
      onGameEnd(combinedScore);
      return copy;
    });
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full px-2 mb-2">
        <span className="text-xs text-amber-400 font-bold">2048 Puzzle Slide</span>
        <span className="text-xs text-white font-mono font-bold bg-amber-950 px-2 py-0.5 rounded">Score: {score}</span>
      </div>

      <div className="bg-amber-950/20 border-2 border-amber-600/30 p-2 rounded-xl grid grid-cols-4 gap-2 w-48 h-48">
        {grid.map((row, rIdx) => (
          row.map((cell, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`flex items-center justify-center rounded-lg border text-xs font-bold font-mono transition-all ${cell > 0 ? "bg-amber-600 text-white border-amber-400" : "bg-[#0f0c14]/40 border-purple-950/20 text-transparent"}`}
            >
              {cell || ""}
            </div>
          ))
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 w-32">
        <div></div>
        <button onClick={() => keyMove("up")} className="p-1 px-3 bg-amber-900/60 rounded text-[10px]">▲</button>
        <div></div>
        <button onClick={() => keyMove("left")} className="p-1 px-3 bg-amber-900/60 rounded text-[10px]">◀</button>
        <button onClick={() => keyMove("down")} className="p-1 px-3 bg-amber-900/60 rounded text-[10px]">▼</button>
        <button onClick={() => keyMove("right")} className="p-1 px-3 bg-amber-900/60 rounded text-[10px]">▶</button>
      </div>
    </div>
  );
}

// 3. ROCK PAPER SCISSORS GAME COMPONENT
function RockPaperScissors({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [streak, setStreak] = useState(0);
  const [playerMove, setPlayerMove] = useState<string | null>(null);
  const [aiMove, setAiMove] = useState<string | null>(null);
  const [result, setResult] = useState<string>("Make your move!");

  const moves = ["✊", "✋", "✌️"];
  const names = ["Rock", "Paper", "Scissors"];

  const handleRpc = (idx: number) => {
    const aiIdx = Math.floor(Math.random() * 3);
    setPlayerMove(moves[idx]);
    setAiMove(moves[aiIdx]);

    if (idx === aiIdx) {
      setResult("Draw game! ⚖️");
    } else if ((idx === 0 && aiIdx === 2) || (idx === 1 && aiIdx === 0) || (idx === 2 && aiIdx === 1)) {
      setResult("You win! 🎉");
      setStreak(s => {
        const next = s + 1;
        onGameEnd(next);
        return next;
      });
    } else {
      setResult("Midy AI wins! 🐰☕");
      setStreak(0);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full px-2 mb-2">
        <span className="text-xs text-emerald-400 font-bold">RPS Showdown</span>
        <span className="text-xs text-white font-mono font-bold bg-emerald-950 px-2 py-0.5 rounded">Streak: {streak}</span>
      </div>

      <div className="bg-[#12111d] p-4 rounded-xl border border-emerald-900/50 w-full mb-3 text-center">
        <div className="flex gap-4 items-center justify-center py-2">
          <div>
            <span className="text-gray-400 text-[10px] block mb-1">YOU</span>
            <span className="text-3xl bg-emerald-900/40 p-2 rounded-full inline-block">{playerMove || "❔"}</span>
          </div>
          <span className="font-bold text-gray-500">VS</span>
          <div>
            <span className="text-gray-400 text-[10px] block mb-1">MIDY AI</span>
            <span className="text-3xl bg-pink-900/40 p-2 rounded-full inline-block">{aiMove || "❔"}</span>
          </div>
        </div>
        <p className="font-bold text-xs text-white mt-1">{result}</p>
      </div>

      <div className="flex gap-2.5">
        {moves.map((m, idx) => (
          <button
            key={idx}
            onClick={() => handleRpc(idx)}
            className="flex flex-col items-center gap-1 bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-500/30 p-2 px-3 rounded-lg cursor-pointer transition text-xs font-bold text-white"
            id={`rps-${names[idx].toLowerCase()}`}
          >
            <span>{m}</span>
            <span>{names[idx]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 4. THREE CUPS GAME COMPONENT (Find the Hidden Ball)
function CupsGame({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [score, setScore] = useState(0);
  const [targetCup, setTargetCup] = useState<number>(0);
  const [selectedCup, setSelectedCup] = useState<number | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [info, setInfo] = useState("Click Shuffle to start finding the golden ball!");

  const cups = [0, 1, 2];

  const handleShuffle = () => {
    setIsShuffling(true);
    setSelectedCup(null);
    setInfo("Cups dancing around... Keep your eyes peeled!");
    setTimeout(() => {
      setTargetCup(Math.floor(Math.random() * 3));
      setIsShuffling(false);
      setInfo("Pick the right cup containing the ball 🕵️");
    }, 1200);
  };

  const handleCupPick = (idx: number) => {
    if (isShuffling || selectedCup !== null) return;
    setSelectedCup(idx);
    if (idx === targetCup) {
      setInfo("BINGO! You found the hidden ball! 🏆⚾");
      setScore(s => {
        const next = s + 10;
        onGameEnd(next);
        return next;
      });
    } else {
      setInfo("Empty! The ball was under Cup #" + (targetCup + 1));
      setScore(0);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-full px-2 mb-2">
        <span className="text-xs text-blue-400 font-bold">3 Cups find the 1 ball</span>
        <span className="text-xs text-white font-mono font-bold bg-blue-950 px-2 py-0.5 rounded">Score: {score}</span>
      </div>

      <div className="flex justify-center gap-4 py-4 w-full">
        {cups.map((idx) => {
          const isChosen = selectedCup === idx;
          const isCorrect = idx === targetCup;
          return (
            <motion.button
              key={idx}
              animate={isShuffling ? { x: [0, -15, 15, 0], y: [0, 10, -10, 0] } : {}}
              transition={{ repeat: isShuffling ? 3 : 0, duration: 0.3 }}
              onClick={() => handleCupPick(idx)}
              className={`p-3 w-14 h-16 rounded-t-xl flex flex-col items-center justify-between border cursor-pointer select-none transition-all ${isChosen ? (isCorrect ? "bg-emerald-800 border-emerald-500" : "bg-rose-950 border-rose-700") : "bg-blue-900/60 border-blue-500/40"}`}
              id={`cup-item-${idx+1}`}
            >
              <span className="text-[10px] text-blue-300 font-bold">Cup {idx+1}</span>
              <span className="text-xl">☕</span>
              {selectedCup !== null && isCorrect && <span className="absolute text-[8px] mt-12 animate-bounce">🟡 Ball</span>}
            </motion.button>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-300 font-semibold text-center h-4">{info}</p>

      <button
        onClick={handleShuffle}
        disabled={isShuffling}
        className="mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white font-bold text-xs py-1.5 px-3 rounded-full flex items-center gap-1 cursor-pointer"
        id="cups-shuffle-action"
      >
        <span>{isShuffling ? "Shuffling..." : "Shuffle Cups"}</span>
      </button>
    </div>
  );
}

// 5. CATCH FRUIT GAME COMPONENT (Falling fruits)
function CatchFruitGame({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [basketX, setBasketX] = useState(40); // 0 to 80 (percentage-like grid relative width)
  const [fruitX, setFruitX] = useState(Math.random() * 80 + 5);
  const [fruitY, setFruitY] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [info, setInfo] = useState("Move your basket to catch the falling golden cherries!");

  useEffect(() => {
    const loop = setInterval(() => {
      setFruitY(prevY => {
        const nextY = prevY + 5;
        if (nextY >= 90) {
          // Check collision
          const catchZone = Math.abs((fruitX) - (basketX + 10)); // adjust size scale
          if (catchZone < 15) {
            setScore(s => {
              const fresh = s + 10;
              setHighScore(h => Math.max(h, fresh));
              onGameEnd(fresh);
              return fresh;
            });
            setInfo("Caught! +10 score 🍒");
          } else {
            setScore(0);
            setInfo("Ouch, dropped it! Cherry fell 🍒");
          }
          // Reset fruit position
          setFruitX(Math.random() * 75 + 10);
          return 0;
        }
        return nextY;
      });
    }, 120);

    return () => clearInterval(loop);
  }, [basketX, fruitX, score]);

  return (
    <div className="flex flex-col items-center w-full px-2">
      <div className="flex justify-between w-full mb-1">
        <span className="text-xs text-rose-400 font-bold">Cherry Fall Catcher</span>
        <div className="flex gap-2">
          <span className="text-[10px] text-white font-mono bg-rose-950/60 px-2 py-0.5 rounded">High: {highScore}</span>
          <span className="text-[10px] text-white font-mono bg-rose-950 px-2 py-0.5 rounded">Current: {score}</span>
        </div>
      </div>

      <div className="relative w-full h-36 bg-slate-950/70 rounded-lg overflow-hidden border border-rose-950/30">
        {/* Falling Fruit cherry */}
        <div
          className="absolute text-xl"
          style={{ left: `${fruitX}%`, top: `${fruitY}%` }}
        >
          🍒
        </div>

        {/* Catcher Basket / Person with Coffee Bunny colors */}
        <div
          className="absolute bottom-2 h-4 w-16 bg-purple-600 border border-purple-400 rounded-full flex items-center justify-center text-[8px] text-white font-semibold shadow"
          style={{ left: `${basketX}%` }}
        >
          🧺 Basket
        </div>
      </div>

      <p className="text-[10px] text-gray-400 mt-2 h-4 text-center">{info}</p>

      {/* Touch controller buttons for phones and consoles */}
      <div className="flex gap-4 mt-2">
        <button
          onClick={() => setBasketX(prev => Math.max(5, prev - 10))}
          className="p-2 bg-rose-900/40 hover:bg-rose-900/60 text-white rounded-xl text-xs flex items-center gap-1 select-none active:scale-95 cursor-pointer"
          id="catch-left-action"
        >
          <ArrowLeft className="w-3" /> Move Left
        </button>
        <button
          onClick={() => setBasketX(prev => Math.min(80, prev + 10))}
          className="p-2 bg-rose-900/40 hover:bg-rose-900/60 text-white rounded-xl text-xs flex items-center gap-1 select-none active:scale-95 cursor-pointer"
          id="catch-right-action"
        >
          Move Right <ArrowRight className="w-3" />
        </button>
      </div>
    </div>
  );
}
