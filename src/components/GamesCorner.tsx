import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

export default function GamesCorner() {
  const games = [
    { title: "HTML5 Games", url: "https://html5games.com/" }
  ];
  const [selectedGame, setSelectedGame] = useState(games[0]);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="flex flex-col h-full bg-[#121214] p-2 gap-2">
      <div className="flex items-center gap-2 px-2 justify-between">
        <div className="flex items-center gap-2">
          <Gamepad2 className="text-white" />
          <h2 className="text-xl text-white font-bold">Games Corner</h2>
        </div>
        <div className="flex items-center gap-2 text-white">
          <span>Zoom:</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-24"
          />
          <span>{zoom.toFixed(1)}x</span>
        </div>
      </div>
      <div className="flex gap-2 px-2">
        {games.map(game => (
          <button
            key={game.title}
            onClick={() => setSelectedGame(game)}
            className={`px-4 py-1.5 rounded-lg text-white text-sm ${selectedGame.title === game.title ? "bg-purple-600" : "bg-purple-900"}`}
          >
            {game.title}
          </button>
        ))}
      </div>
      <div className="overflow-auto flex-grow rounded-2xl border border-white/10">
        <iframe
          src={selectedGame.url}
          title={selectedGame.title}
          allow="autoplay; fullscreen"
          style={{ width: '2622px', height: '1206px', transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  );
}
