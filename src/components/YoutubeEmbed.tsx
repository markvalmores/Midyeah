import React from 'react';
import { Youtube } from 'lucide-react';

export default function YoutubeEmbed() {
  return (
    <div className="flex flex-col h-full bg-[#121214] p-2 gap-2">
      <div className="flex items-center gap-2 px-2">
        <Youtube className="text-red-500" />
        <h2 className="text-xl text-white font-bold">YouTube</h2>
      </div>
      <iframe
        src="https://www.youtube.com/"
        className="w-full flex-grow rounded-2xl border border-white/10"
        title="YouTube Embed"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ height: 'calc(100vh - 100px)' }}
      />
    </div>
  );
}
