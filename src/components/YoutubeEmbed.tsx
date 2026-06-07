import React from 'react';
import { Film } from 'lucide-react';

export default function YoutubeEmbed() {
  return (
    <div className="flex flex-col h-full bg-[#121214] p-2 gap-2">
      <div className="flex items-center gap-2 px-2">
        <Film className="text-red-500" />
        <h2 className="text-xl text-white font-bold">Netflix</h2>
      </div>
      <iframe
        src="https://www.netflix.com/"
        className="w-full flex-grow rounded-2xl border border-white/10"
        title="Netflix Embed"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ height: 'calc(100vh - 100px)' }}
      />
    </div>
  );
}
