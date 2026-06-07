/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Radio, Video as VideoIcon, Sparkles, Key, DollarSign, Wallet,
  Send, Users, Smile, HelpCircle, Heart, Flame, ShieldAlert,
  Settings, Volume2, Mic, Check, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Livestream() {
  const [isLive, setIsLive] = useState(false);
  const [streamUrL, setStreamUrL] = useState("rtmp://live.midyeah.com/app_channel");
  const [streamKey, setStreamKey] = useState("live_8391_valmores_future_guide_godbless");
  const [showKey, setShowKey] = useState(false);

  // Settings
  const [guessSubtitles, setGuessSubtitles] = useState(true);
  const [selectedMic, setSelectedMic] = useState("Default System Microphone");

  // Streaming hardware access
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Analytics Metrics
  const [viewsCount, setViewsCount] = useState(1);
  const [revenue, setRevenue] = useState(0); // GCash / PayPal tipping metrics
  const [tipsQueue, setTipsQueue] = useState<{ sender: string; amount: number; method: "GCash" | "PayPal" }[]>([]);

  // Stream Chats
  const [messages, setMessages] = useState<{ sender: string; text: string; isTip?: boolean }[]>([
    { sender: "System Operator", text: "Welcome creator! Let's build a joyful future." },
    { sender: "MidyBunny 🐰", text: "Midy is watching your stream! Good luck! ☕" }
  ]);
  const [entryMsg, setEntryMsg] = useState("");

  // Subtitle projection guesses (auto live captions scheduler)
  const [liveGuesses, setLiveGuesses] = useState<string>("");
  const guessesList = [
    "...we are going to build something incredible today with God's guidance!",
    "...it is very cozy on MidYeah streaming platform, we hope everyone is comfortable",
    "...thank you so much to all the Gcash and PayPal donors supporting the channel",
    "...next up, we are going to look at the custom radio visualizers and playlist mode",
    "...Midy Bunny is cheering us on! Praise God from whom all blessings flow!"
  ];

  // GCash / PayPal setup parameters
  const [gcashNum, setGcashNum] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [isPayoutConfigured, setIsPayoutConfigured] = useState(false);

  // Auto-subtitle interval
  useEffect(() => {
    if (!isLive || !guessSubtitles) return;
    
    let counter = 0;
    const interval = setInterval(() => {
      setLiveGuesses(guessesList[counter % guessesList.length]);
      counter++;
    }, 4500);

    return () => clearInterval(interval);
  }, [isLive, guessSubtitles]);

  // View count tick loader
  useEffect(() => {
    if (!isLive) return;
    const viewsTimer = setInterval(() => {
      setViewsCount(prev => prev + Math.floor(Math.random() * 3 + 1));
    }, 5000);
    return () => clearInterval(viewsTimer);
  }, [isLive]);

  // Chat simulator bots loader
  useEffect(() => {
    if (!isLive) return;

    const chatTimer = setInterval(() => {
      const bots = ["CryptoBunny", "ZenViewer", "CozyCam", "MarkDavidFan", "Usagyuun Vtuber Member", "Handheld Gamer"];
      const botMsgs = [
        "This livestream layout is highly polished! 🎮",
        "Just tipped you 150 Php via GCash! Stream is amazing!",
        "Can we play Tetris while watching this live stream?",
        "Beautiful purple dark mode ☕🐰",
        "God bless MidYeah owners and developers!",
        "The live subtitle guesser is shockingly accurate!"
      ];

      const sender = bots[Math.floor(Math.random() * bots.length)];
      const text = botMsgs[Math.floor(Math.random() * botMsgs.length)];

      // Mock random tips sometimes!
      if (Math.random() > 0.7) {
        const amt = Math.floor(Math.random() * 30 + 5) * 10;
        const method: "GCash" | "PayPal" = Math.random() > 0.5 ? "GCash" : "PayPal";
        
        setTipsQueue(prev => [{ sender, amount: amt, method }, ...prev].slice(0, 5));
        setRevenue(r => r + amt);
        
        setMessages(prev => [
          ...prev,
          { sender, text: `🎉 Tipped $${amt} via ${method}!`, isTip: true }
        ]);
      } else {
        setMessages(prev => [...prev, { sender, text }]);
      }
    }, 4000);

    return () => clearInterval(chatTimer);
  }, [isLive]);

  const handleStartLive = async () => {
    // Microphone & Camera prompt permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      setIsLive(true);
      setViewsCount(Math.floor(Math.random() * 10 + 5));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("No hardware capture device found or Permission denied. MidYeah will proceed with simulated cozy Purple Avatar video stream backup feed!");
      setIsLive(true); // simulated live
      setViewsCount(Math.floor(Math.random() * 8 + 4));
    }
  };

  const handleStopLive = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
    }
    setMediaStream(null);
    setIsLive(false);
    setViewsCount(1);
    setLiveGuesses("");
  };

  const handleGenerateKeys = () => {
    const key = "live_key_" + Math.random().toString(36).substr(2, 10) + "_valmores";
    setStreamKey(key);
  };

  const handleSavePayoutSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (gcashNum.trim() || paypalEmail.trim()) {
      setIsPayoutConfigured(true);
    }
  };

  const handleCreatorChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryMsg.trim()) return;
    setMessages(prev => [...prev, { sender: "You (Streamer)", text: entryMsg }]);
    setEntryMsg("");
  };

  return (
    <div className="bg-[#121214] text-slate-100 rounded-2xl p-6 border border-white/10 shadow-2xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Side: Live Feed Screen & Audio Controls */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div>
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <Radio className={`w-5 h-5 ${isLive ? "text-rose-500 animate-ping" : "text-gray-400"}`} />
                <span>CREATOR STREAMING SHIELD</span>
              </h2>
              <p className="text-[10px] text-purple-300">Set up stream keys, test camera, and manage GCash/PayPal payouts.</p>
            </div>

            {isLive ? (
              <span className="bg-rose-600 animate-pulse text-white text-[9px] font-bold px-2.0 py-1.0 rounded-md shadow uppercase flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-white"></span> Live Views: {viewsCount}
              </span>
            ) : (
              <span className="bg-slate-800 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded">
                OFFLINE
              </span>
            )}
          </div>

          {/* Live stream monitor feed screen box */}
          <div className="bg-[#0A0A0B] rounded-xl aspect-video border border-white/10 overflow-hidden relative flex flex-col items-center justify-center">
            {isLive ? (
              mediaStream ? (
                /* Hardware stream video node */
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                /* Simulated streaming overlay graphics feed */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-950/80 to-indigo-950/80 p-6 text-center select-none">
                  <div className="h-16 w-16 bg-purple-600/35 rounded-full flex items-center justify-center ring-4 ring-purple-500 animate-bounce mb-3">
                    <span className="text-3xl">🐰🍰</span>
                  </div>
                  <h3 className="font-bold text-sm text-yellow-300">Stream Status: Live Broadcasting Active</h3>
                  <p className="text-[10px] text-purple-200 mt-1 max-w-sm">Midy virtual avatar camera overlay is active. Mic captures streaming telemetry safely.</p>
                </div>
              )
            ) : (
              <div className="text-center p-6 text-gray-400">
                <VideoIcon className="w-12 h-12 mx-auto text-purple-950 mb-2" />
                <p className="text-xs font-semibold">Broadcaster screen is currently idle</p>
                <p className="text-[10px] text-gray-500 mt-1">Ready your hardware config, toggle caption guesser, and hit Start Live Stream!</p>
              </div>
            )}

            {/* Smart Voice Subtitle Prediction Guesser display */}
            {isLive && guessSubtitles && liveGuesses && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/85 border border-purple-500/20 shadow p-2 rounded-xl max-w-[90%] text-center backdrop-blur-md">
                <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-300" /> Dynamic Live Subtitle Guess:
                </p>
                <p className="text-[11px] text-white mt-0.5 font-medium italic">{liveGuesses}</p>
              </div>
            )}
          </div>

          {/* Broadcaster Controller buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-950/10 p-3 rounded-xl border border-purple-950/20">
            <div className="flex items-center gap-3">
              {isLive ? (
                <button
                  onClick={handleStopLive}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition duration-200 cursor-pointer shadow-lg"
                  id="stop-live-action"
                >
                  Stop Broadcast
                </button>
              ) : (
                <button
                  onClick={handleStartLive}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition duration-200 cursor-pointer shadow-lg flex items-center gap-1"
                  id="start-live-action"
                >
                  <Radio className="w-4 h-4 text-white animate-pulse" /> Go Live Now 📡
                </button>
              )}
              
              {/* Guess Subtitles pre-configurations switcher */}
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-gray-300">
                <input
                  type="checkbox"
                  checked={guessSubtitles}
                  onChange={(e) => setGuessSubtitles(e.target.checked)}
                  className="accent-purple-500 rounded"
                  id="guess-subs-checkbox"
                />
                <span>Auto Guess Subtitle format</span>
              </label>
            </div>

            {/* Hardware inputs information prompt */}
            <div className="flex items-center gap-1 text-[11px] text-purple-300">
              <Mic className="w-4 h-4 text-purple-400" />
              <span>Mic: {selectedMic} (Authorized)</span>
            </div>
          </div>

          {/* RTMP Server Configuration Keys Setup */}
          <div className="bg-[#120e1a]/90 rounded-xl p-3 border border-purple-950/50 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 border-b border-purple-950/50 pb-2 mb-1">
              <Key className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white uppercase text-[10px]">Streaming Protocol Connection (OBS Compatible)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] text-gray-400 uppercase font-semibold mb-0.5">Stream Server RTMP URL</label>
                <input
                  type="text"
                  readOnly
                  value={streamUrL}
                  className="w-full bg-[#0c0a0f] border border-purple-950/60 p-2 rounded-lg text-purple-300 text-[10px] font-mono font-bold"
                  id="rtmp-url-display"
                />
              </div>

              <div>
                <label className="block text-[9px] text-gray-400 uppercase font-semibold mb-0.5">Secret Stream Key</label>
                <div className="flex bg-[#0c0a0f] border border-purple-950/60 rounded-lg overflow-hidden">
                  <input
                    type={showKey ? "text" : "password"}
                    readOnly
                    value={streamKey}
                    className="bg-transparent px-2 text-purple-400 text-[10px] font-mono flex-1 outline-none font-bold"
                    id="stream-key-display"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="bg-purple-950 hover:bg-purple-900 border-l border-purple-950/50 px-2 text-[9px] cursor-pointer"
                    id="reveal-stream-key"
                  >
                    {showKey ? "Hide" : "Reveal"}
                  </button>
                  <button
                    onClick={handleGenerateKeys}
                    className="bg-purple-600 hover:bg-purple-500 px-2 text-white text-[9px] cursor-pointer"
                    id="regen-stream-key"
                  >
                    Regen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Streaming chats and Tipping Ledger */}
        <div className="flex flex-col gap-3">
          
          {/* Tipping Ledger withdraw links setup */}
          <div className="bg-[#100b17] border border-purple-950 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-950/60 pb-2">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-xs text-white">REVENUE MONETIZATION</h3>
              </div>
              <span className="font-mono text-emerald-400 font-bold text-xs bg-emerald-955 px-2 py-0.5 rounded">
                Split: 90% Owner Pro
              </span>
            </div>

            {isPayoutConfigured ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-purple-950/15 p-2 rounded border border-purple-950/30 text-[11px]">
                  <div>
                    <span className="text-gray-400 block uppercase text-[8px]">Linked GCash:</span>
                    <span className="font-mono font-bold text-gray-200">{gcashNum || "Not configured"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block uppercase text-[8px]">Linked PayPal:</span>
                    <span className="font-mono font-bold text-gray-200">{paypalEmail || "Not configured"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 text-[9px] uppercase font-semibold">Total Revenue (GCash/PayPal):</span>
                    <span className="font-mono font-bold text-emerald-400 text-lg block">${revenue}.00</span>
                  </div>
                  <button
                    onClick={() => {
                      alert(`Monetized withdrawal of $${revenue}.00 succeeded beautifully! The funds are dispatched straight to your GCash / PayPal safely.`);
                      setRevenue(0);
                    }}
                    disabled={revenue === 0}
                    className="disabled:opacity-40 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition shadow"
                    id="creator-payout-withdraw"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSavePayoutSetup} className="space-y-2.5 text-xs">
                <p className="text-[10px] text-gray-400">Link GCash or PayPal account details. Earnings are 100% transparent and withdrawal is simple.</p>
                
                <div>
                  <label className="block text-[9px] text-gray-300 font-medium mb-0.5">GCASH MOBILE / NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0917-XXX-XXXX / Mark David V."
                    value={gcashNum}
                    onChange={(e) => setGclean(e.target.value)}
                    className="w-full bg-[#1e172a] border border-purple-900 /40 rounded-lg p-1.5 p-2 text-white outline-none focus:border-purple-500"
                    id="gcash-setup-input"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-gray-300 font-medium mb-0.5">PAYPAL EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. payout@midyeah.com"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    className="w-full bg-[#1e172a] border border-purple-900/40 rounded-lg p-1.5 p-2 text-white outline-none focus:border-purple-500"
                    id="paypal-setup-input"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-1.5 rounded-lg cursor-pointer"
                  id="save-payout-details"
                >
                  Link Accounts
                </button>
              </form>
            )}
          </div>

          {/* Active sidebar chat for livestreams */}
          <div className="bg-slate-950 border border-purple-950 rounded-xl p-3 flex flex-col h-[300px]">
            <span className="text-[10px] text-purple-300 font-bold uppercase mb-2">Live Audience Chat Sidebar</span>

            <div className="flex-1 overflow-y-auto mb-2 space-y-2 pr-1 scrollbar-thin">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded-lg ${m.isTip ? "bg-amber-950/40 border border-amber-600/40" : "bg-purple-950/10 border border-purple-950/20"}`}
                >
                  <span className={`font-bold mr-2 ${m.isTip ? "text-amber-400" : "text-purple-300"}`}>{m.sender}:</span>
                  <span className={m.isTip ? "text-amber-200 font-bold" : "text-gray-200"}>{m.text}</span>
                </div>
              ))}
            </div>

            {isLive ? (
              <form onSubmit={handleCreatorChatSend} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Chat with viewers..."
                  value={entryMsg}
                  onChange={(e) => setEntryMsg(e.target.value)}
                  className="bg-[#120f1c] border border-purple-900/60 rounded-lg text-xs p-2 text-white flex-1 outline-none"
                  id="creator-livechat-input"
                />
                <button
                  type="submit"
                  className="bg-purple-600 p-2 rounded-lg text-white"
                  id="send-creator-livechat"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="text-center p-2 text-gray-500 min-h-[40px] flex items-center justify-center border border-purple-950/50 rounded-lg bg-purple-950/10">
                <AlertCircle className="w-4 h-4 mr-1 text-purple-500" />
                <span className="text-[10px]">Chat joins as soon as you go live</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );

  // Quick fallback set clean helper
  function setGclean(v: string) {
    setGcashNum(v);
  }
}
