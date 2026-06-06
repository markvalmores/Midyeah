/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Hash, MessageSquare, Send, Bell, Settings, HelpCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getDiscordMessages, saveDiscordMessage, db } from "../db";
import { DiscordMessage, UserProfile } from "../types";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

interface DiscordChatProps {
  currUser: UserProfile | null;
}

export default function DiscordChat({ currUser }: DiscordChatProps) {
  const [activeChannel, setActiveChannel] = useState("general");
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const channels = [
    { id: "general", name: "general-chat", desc: "Cozy thoughts and community safety discussions ☕" },
    { id: "movies", name: "movies-and-rentals", desc: "Suggest movies and rentals ($3 to $100 range) 🎬" },
    { id: "lofi", name: "lofi-radio", desc: "Share radio tips and chill tracks 🎷" },
    { id: "games-room", name: "games-room", desc: "Share your Tetris and 2048 high scores 🕹️" }
  ];

  // Subscribe to real-time worldwide messages in Firestore
  useEffect(() => {
    const q = query(collection(db, "discord_messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs: DiscordMessage[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: data.id,
          username: data.username,
          avatarUrl: data.avatarUrl || "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
          text: data.text || "",
          timestamp: data.timestamp || new Date().toISOString()
        });
      });
      if (msgs.length > 0) {
        setMessages(msgs);
      }
    }, (error) => {
      console.warn("Real-time snapshot failed in some modes, reading offline tables:", error);
      getDiscordMessages().then((dbMsgs) => {
        if (dbMsgs.length > 0) {
          setMessages(dbMsgs);
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // auto scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeChannel]);

  const handleSendPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: DiscordMessage = {
      id: "msg-" + Date.now(),
      username: currUser?.username || "Guest Watcher",
      avatarUrl: currUser?.avatarUrl || "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
      text: inputText,
      timestamp: new Date().toISOString()
    };

    await saveDiscordMessage(newMsg);
    setMessages(prev => [...prev, newMsg]);
    setInputText("");

    // Simulate custom auto response based on channel
    setTimeout(() => {
      const responses = [
        "Absolutely agreed! Let's build a secure streaming experience.",
        "Remember to subscribe to @UsagyuunVtuber on Youtube as well! 💜🌻",
        "Make sure to link GCash/PayPal to withdraw those awesome livestream tips safely.",
        "That's exceptionally cozy. Midy is happy! ☕🐰",
        "Praise God from whom all blessings flow!"
      ];
      const botMsg: DiscordMessage = {
        id: "msgBot-" + Date.now(),
        username: "MidyBunny 🐰",
        avatarUrl: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      };
      saveDiscordMessage(botMsg);
      setMessages(p => [...p, botMsg]);
    }, 1800);
  };

  const getChannelFilterText = () => {
    const active = channels.find(c => c.id === activeChannel);
    return active ? active.desc : "Midyeah group discussions";
  };

  return (
    <div className="bg-[#121214] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row h-[420px] shadow-2xl overflow-hidden select-none">
      
      {/* Discord Left Channels Sidebar list */}
      <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-white/10 pb-3 md:pb-0 md:pr-3 flex flex-col">
        <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-white/10">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Midyeah Channels</h3>
        </div>

        <div className="flex-1 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto scrollbar-thin py-1 pr-1">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full flex items-center gap-1.5 p-2 rounded-lg text-xs font-semibold cursor-pointer transition text-left shrink-0 md:shrink ${ch.id === activeChannel ? "bg-purple-900/40 text-purple-200 font-bold border border-purple-950" : "text-gray-400 hover:bg-purple-950/15"}`}
              id={`discord-ch-btn-${ch.id}`}
            >
              <Hash className="w-4 h-4 text-purple-500/80" />
              <span>{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Discord Right Messages Log box */}
      <div className="flex-1 flex flex-col h-full md:pl-3.5 mt-3 md:mt-0">
        
        {/* Topic Header banner */}
        <div className="bg-[#1C1C1F] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-1.5 truncate">
            <Hash className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-gray-200">{channels.find(c => c.id === activeChannel)?.name}</span>
            <span className="text-[10px] text-gray-400 ml-2 border-l border-white/11 pl-2 truncate">{getChannelFilterText()}</span>
          </div>
          <Bell className="w-4 h-4 text-purple-300 pointer-events-none" />
        </div>

        {/* Channels messages grid scroll log */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2 scrollbar-thin">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3 text-xs bg-[#1C1C1F]/45 hover:bg-[#1C1C1F]/70 p-2.5 rounded-xl transition duration-155 border border-transparent hover:border-white/5">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-purple-800/60 border border-purple-950 shrink-0">
                <img src={msg.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" onError={(e)=>{(e.target as any).src="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40"}} referrerPolicy="no-referrer" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-300">{msg.username}</span>
                  <span className="text-[9px] text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Post Message input bar */}
        <form onSubmit={handleSendPost} className="flex gap-2.5 mt-2">
          <input
            type="text"
            placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="bg-[#1C1C1F] border border-white/10 rounded-xl text-xs p-2.5 px-3 text-white flex-1 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            id="discord-post-input"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 p-2.5 text-white rounded-xl transition shadow cursor-pointer flex items-center justify-center font-bold text-xs"
            id="send-discord-post-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
