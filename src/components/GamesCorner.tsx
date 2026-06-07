import React, { useState, useRef } from 'react';
import { Globe, Maximize, ExternalLink } from 'lucide-react';

export default function GamesCorner() {
  const games = [
    { title: "CloudMoon", url: "https://web.cloudmoonapp.com/" }
  ];
  const [selectedGame, setSelectedGame] = useState(games[0]);
  const [zoom, setZoom] = useState(1);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (iframeContainerRef.current) {
      if (!document.fullscreenElement) {
        iframeContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121214] p-2 gap-2">
      <div className="flex items-center gap-2 px-2 justify-between">
        <div className="flex items-center gap-2">
          <Globe className="text-white" />
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
          <button 
            onClick={toggleFullScreen}
            className="p-1.5 ml-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button 
            onClick={() => window.open(selectedGame.url, '_blank', 'noopener,noreferrer')}
            className="p-1.5 ml-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
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
      <div ref={iframeContainerRef} className="overflow-auto flex-grow rounded-2xl border border-white/10 bg-black">
        <iframe
          src={selectedGame.url}
          title={selectedGame.title}
          allow="autoplay; fullscreen"
          style={{ width: '100%', height: '100%', minWidth: '1200px', minHeight: '800px', transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  );
}
