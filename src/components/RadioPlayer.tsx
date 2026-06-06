/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Radio, Play, Pause, Volume2, Music, Sparkles, HelpCircle, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RadioStation } from "../types";

export default function RadioPlayer() {
  const [stations, setStations] = useState<RadioStation[]>([
    {
      id: "rad1",
      name: "Cozy Lofi Sleep Beats 😴",
      genre: "Chill Lofi Instrumental",
      streamUrl: "https://streaming.radio.co/s810a9f8f4/listen", // high availability working streams
      logo: "🍿"
    },
    {
      id: "rad2",
      name: "Synthwave Retro Future 🌌",
      genre: "Electro Retrowave",
      streamUrl: "https://icecast.retro-synth.com/retrosynth",
      logo: "🚀"
    },
    {
      id: "rad3",
      name: "Golden Oldies Pop Classical 📻",
      genre: "Classic Orchestral Pop",
      streamUrl: "https://stream.radioparadise.com/mellow-128",
      logo: "🎷"
    }
  ]);

  const [activeStation, setActiveStation] = useState<RadioStation>(stations[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync state with HTML Audio node
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      
      if (isPlaying) {
        audioRef.current.load();
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log("Audio play blocked/failed. Re-loading with fallback state model.");
            setIsPlaying(false);
          });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeStation]);

  // Frequency wave analyzer emulator
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;

    const drawVisualizer = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // dark clean visual backdrop
      ctx.fillStyle = "#0c0a0f";
      ctx.fillRect(0, 0, width, height);

      // draw moving grid lines
      ctx.strokeStyle = "#25123d";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, height / 2);
      
      // Draw fluctuating wave
      ctx.strokeStyle = isPlaying ? "#e879f9" : "#6b21a8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      
      const sliceWidth = width / 80;
      let x = 0;

      for (let i = 0; i < 80; i++) {
        // frequency height oscillates dynamically if playing
        const waveScale = isPlaying ? Math.sin((i * 0.15) + (Date.now() * 0.01)) * Math.cos(Date.now() * 0.002) * 26 : 0;
        const offset = isPlaying ? Math.random() * 4 : 0;
        
        ctx.lineTo(x, waveScale + offset);
        x += sliceWidth;
      }
      ctx.stroke();

      // Draw secondary glowing shadow wave
      ctx.restore();
      
      // Draw simple center tuner details
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 9px monospace";
      ctx.fillText(`API DECODER ACTIVE | VOL: ${Math.round(volume * 100)}% | TUNER: online`, 12, 18);

      frameId = requestAnimationFrame(drawVisualizer);
    };

    drawVisualizer();
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, volume]);

  const handleStationSwitch = (st: RadioStation) => {
    setActiveStation(st);
    setIsPlaying(true);
  };

  const toggleRadioPlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  return (
    <div className="bg-[#121214] border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Left: Interactive Canvas Tuner visualizer */}
        <div className="md:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5 animate-pulse">
                <Radio className="w-5 h-5 text-purple-400" />
                <span>ONLINE RADIO TUNER</span>
              </h2>
              <p className="text-[10px] text-purple-300">Listen to high-fidelity instrumental radios while browsing content.</p>
            </div>
            
            {isPlaying && (
              <span className="bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                <Music className="w-3 h-3 text-purple-400" /> STRAW LIVE LINK
              </span>
            )}
          </div>

          {/* Canvas Waveform Node */}
          <canvas
            ref={canvasRef}
            width={512}
            height={160}
            className="w-full h-36 bg-[#0A0A0B] rounded-xl border border-white/10 shadow"
          />

          <audio
            ref={audioRef}
            src={activeStation.streamUrl}
            className="hidden"
            crossOrigin="anonymous"
          />

          {/* Console Action Bar */}
          <div className="flex items-center justify-between gap-3 bg-[#1C1C1F] p-3 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleRadioPlay}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-lg"
                id="radio-play-toggle"
              >
                <span>{isPlaying ? "Pause Radio" : "Tune In / Play"}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-purple-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-purple-500 h-1 bg-gray-700 rounded-lg cursor-pointer transition-all"
                  id="radio-vol-slider"
                />
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Currently Tuned:</span>
              <span className="text-xs text-purple-300 font-bold leading-none mt-1 truncate max-w-[200px]">{activeStation.name}</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Preset Working Stations Loop */}
        <div className="bg-[#1C1C1F] border border-white/10 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-white uppercase tracking-wider mb-2 pb-1.5 border-b border-white/5">Streaming Stations</h3>
            <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin">
              {stations.map((st) => (
                <button
                  key={st.id}
                  onClick={() => handleStationSwitch(st)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition duration-200 cursor-pointer text-xs ${st.id === activeStation.id ? "bg-purple-900/40 border-purple-500 text-white font-bold" : "bg-black/30 border-transparent hover:bg-[#121214] text-slate-300"}`}
                  id={`radio-tune-${st.id}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">{st.logo}</span>
                    <div className="truncate">
                      <span className="block truncate font-semibold">{st.name}</span>
                      <span className="text-[9px] text-purple-400 font-normal">{st.genre}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-4 pt-2.5 border-t border-purple-950/30 text-center select-none">
            <span className="text-[9px] text-[#ccaaff] font-mono leading-none flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" /> May God Bless This platform!
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
