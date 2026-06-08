import React, { useState } from 'react';
import { Smile } from 'lucide-react';

export default function YoutubeEmbed() {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="flex flex-col h-full bg-[#121214] p-2 gap-2">
      <div className="flex items-center gap-2 px-2 justify-between">
        <div className="flex items-center gap-2">
          <Smile className="text-yellow-500" />
          <h2 className="text-xl text-white font-bold">Isekai Worlds</h2>
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
      <div className="overflow-auto flex-grow rounded-2xl border border-white/10">
        <iframe
          src="https://markitext.wixsite.com/isekaiworlds"
          title="Isekai Worlds Embed"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  );
}
