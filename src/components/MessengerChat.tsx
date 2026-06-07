import React, { useState, useEffect, useRef } from "react";
import { 
  MessageCircle, Send, Plus, Users, Search, Phone, Video, 
  Sparkles, Image as ImageIcon, Smile, Mic, Volume2, ShieldAlert,
  X, Check, Film, ArrowLeft, Trash2, MicOff, PhoneOff, Trash
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, DiscordMessage } from "../types";
import { 
  collection, onSnapshot, query, orderBy, setDoc, doc, getDocs, where, deleteDoc 
} from "firebase/firestore";
import { db, isGuestAccount, openDB } from "../db";

interface MessengerChatProps {
  currUser: UserProfile | null;
}

interface MessengerMessage {
  id: string;
  chatId: string;
  senderEmail: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: "text" | "sticker" | "voice";
  stickerUrl?: string;
  voiceUrl?: string; // base64 data URL
  timestamp: string;
  isGC?: boolean;
}

interface ChatSettings {
  id: string; // chatId
  themeType: "gradient" | "image";
  themeValue: string; // Gradient color CSS or Custom URL
  bubbleGradient: string;
  bubbleText: string;
  accentColor: string;
  themeName: string;
}

interface Friendship {
  id: string;
  userA: string;
  userB: string;
  status: "friends";
  timestamp: string;
}

interface GroupChat {
  id: string;
  name: string;
  creatorEmail: string;
  memberEmails: string[];
  createdAt: string;
}

// 7 available free stickers of LINE characters including Usagyuuun
const FREE_STICKERS = [
  { id: "usa_joy", name: "Usagyuuun Joy", url: "https://i.gifer.com/76XP.gif" },
  { id: "usa_dance", name: "Usagyuuun Dance", url: "https://i.gifer.com/UzYg.gif" },
  { id: "usa_shock", name: "Usagyuuun Run", url: "https://i.gifer.com/O6L6.gif" },
  { id: "usa_headbang", name: "Usagyuuun Headbang", url: "https://i.gifer.com/2iiu.gif" },
  { id: "line_brown", name: "LINE Brown Bear", url: "https://i.gifer.com/1G8h.gif" },
  { id: "line_cony", name: "LINE Cony Rabbit", url: "https://i.gifer.com/33Yg.gif" },
  { id: "line_sally", name: "LINE Sally Wave", url: "https://i.gifer.com/Y8X.gif" }
];

export default function MessengerChat({ currUser }: MessengerChatProps) {
  // Navigation & Conversation State
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [inputText, setInputText] = useState("");
  
  // Custom theme settings for current active chat
  const [chatTheme, setChatTheme] = useState<ChatSettings>({
    id: "",
    themeType: "gradient",
    themeValue: "linear-gradient(135deg, #1e1e24 0%, #0f0c1b 100%)",
    bubbleGradient: "linear-gradient(90deg, #a855f7 0%, #6366f1 100%)",
    bubbleText: "#ffffff",
    accentColor: "#a855f7",
    themeName: "Twilight Purp"
  });

  // DB Collections Lists
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [groupsList, setGroupChats] = useState<GroupChat[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  
  // Modals & Panels Toggles
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGC, setShowCreateGC] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newGCName, setNewGCName] = useState("");
  const [selectedGCMembers, setSelectedGCMembers] = useState<string[]>([]);
  
  // Sticker drawer / Sticker upload State
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [customStickers, setCustomStickers] = useState<{id: string, url: string}[]>([]);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordChunks, setRecordChunks] = useState<Blob[]>([]);
  const recordInterval = useRef<any>(null);

  // Calling States
  const [activeCall, setActiveCall] = useState<{
    type: "voice" | "video";
    status: "ringing" | "connected" | "ended";
    duration: number;
  } | null>(null);
  const callInterval = useRef<any>(null);

  // AI Theme Generation Prompts
  const [aiThemePrompt, setAiThemePrompt] = useState("");
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);

  // References
  const logBottomRef = useRef<HTMLDivElement>(null);

  // 1. Load Custom Uploaded Stickers from IndexedDB
  useEffect(() => {
    const fetchCustomStickers = async () => {
      try {
        const localDb = await openDB();
        const tx = localDb.transaction("group_wallpapers", "readonly"); // safe reused store
        const store = tx.objectStore("group_wallpapers");
        const listRequest = new Promise<any[]>((resolve) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
        });
        const items = await listRequest;
        const mapped = items
          .filter(item => item.id.startsWith("sticker_"))
          .map(item => ({ id: item.id, url: item.dataUrl }));
        setCustomStickers(mapped);
      } catch(e) {
        console.warn("Could not read customized stickers", e);
      }
    };
    fetchCustomStickers();
  }, []);

  // 2. Fetch Friends and Groups in Real-time from Firestore
  useEffect(() => {
    if (!currUser) return;

    // Load active registered profiles to search
    const loadProfiles = async () => {
      try {
        const qSnapshot = await getDocs(collection(db, "profiles"));
        const profiles: UserProfile[] = [];
        qSnapshot.forEach(docSnap => {
          profiles.push(docSnap.data() as UserProfile);
        });
        setAllProfiles(profiles);
      } catch (e) {
        console.warn("Could not load global profiles:", e);
      }
    };
    loadProfiles();

    // Subscribe to Friendships
    const qFriends = query(collection(db, "friendships"));
    const unsubFriends = onSnapshot(qFriends, (snap) => {
      const pms: string[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.userA === currUser.email) pms.push(data.userB);
        if (data.userB === currUser.email) pms.push(data.userA);
      });
      
      // Keep unique and map to corresponding User Profile data
      const uniqEmails = Array.from(new Set(pms));
      getDocs(collection(db, "profiles")).then((profs) => {
        const mapped: UserProfile[] = [];
        profs.forEach(pSnap => {
          const profile = pSnap.data() as UserProfile;
          if (uniqEmails.includes(profile.email)) {
            mapped.push(profile);
          }
        });
        setFriendsList(mapped);
      });
    });

    // Subscribe to GCs
    const qGC = query(collection(db, "group_chats"));
    const unsubGC = onSnapshot(qGC, (snap) => {
      const gcs: GroupChat[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.memberEmails && data.memberEmails.includes(currUser.email)) {
          gcs.push(data as GroupChat);
        }
      });
      setGroupChats(gcs);
    });

    return () => {
      unsubFriends();
      unsubGC();
    };
  }, [currUser]);

  // 3. Listen to messages inside current active conversation
  useEffect(() => {
    if (!activeChatId) return;

    const qMsgs = query(
      collection(db, "messenger_messages"), 
      where("chatId", "==", activeChatId)
    );
    
    const unsubMsgs = onSnapshot(qMsgs, (snap) => {
      const lst: MessengerMessage[] = [];
      snap.forEach(d => {
        lst.push(d.data() as MessengerMessage);
      });
      lst.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(lst);
      setTimeout(() => {
        logBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    });

    // Load Chat Custom Theme settings
    const unsubTheme = onSnapshot(doc(db, "messenger_settings", activeChatId), (docSnap) => {
      if (docSnap.exists()) {
        setChatTheme(docSnap.data() as ChatSettings);
      } else {
        // Fallback default theme
        setChatTheme({
          id: activeChatId,
          themeType: "gradient",
          themeValue: "linear-gradient(135deg, #121214 0%, #0d091e 100%)",
          bubbleGradient: "linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)",
          bubbleText: "#ffffff",
          accentColor: "#8b5cf6",
          themeName: "Twilight Gradient"
        });
      }
    });

    return () => {
      unsubMsgs();
      unsubTheme();
    };
  }, [activeChatId]);

  // 4. Utility: Generate chatId consistently between two emails
  const getSoloChatId = (email1: string, email2: string) => {
    const list = [email1, email2].sort();
    return `solo_${list[0].replace(/[^a-zA-Z0-9]/g, "_")}_and_${list[1].replace(/[^a-zA-Z0-9]/g, "_")}`;
  };

  // 5. Add Friend by email
  const handleAddFriendAction = async (targetEmail: string) => {
    if (!currUser) return;
    if (isGuestAccount(currUser.email)) {
      alert("Error: Guests cannot add friends.");
      return;
    }
    if (targetEmail === currUser.email) return;

    try {
      const friendshipId = [currUser.email, targetEmail].sort().join("_connection_");
      const ref = doc(db, "friendships", friendshipId);
      await setDoc(ref, {
        id: friendshipId,
        userA: currUser.email,
        userB: targetEmail,
        status: "friends",
        timestamp: new Date().toISOString()
      });
      
      alert("🤝 Successfully added to your Messenger list!");
      setShowAddFriend(false);
      
      // Auto open newly created chat
      setActiveChatId(getSoloChatId(currUser.email, targetEmail));
    } catch(err: any) {
      alert("Failed to add: " + err.message);
    }
  };

  // 6. Create Group Chat
  const handleCreateGCAction = async () => {
    if (!currUser || !newGCName.trim()) return;
    if (isGuestAccount(currUser.email)) {
      alert("Error: Guests cannot build communities.");
      return;
    }

    try {
      const id = "group_" + Date.now() + Math.random().toString(36).substr(2, 9);
      const members = Array.from(new Set([currUser.email, ...selectedGCMembers]));
      
      await setDoc(doc(db, "group_chats", id), {
        id,
        name: newGCName.trim(),
        creatorEmail: currUser.email,
        memberEmails: members,
        createdAt: new Date().toISOString()
      });

      // Seeding greetings message
      const introMsg: MessengerMessage = {
        id: "intro_" + Date.now(),
        chatId: id,
        senderEmail: "midyeah@bot.com",
        senderName: "MidYeah Circle 🐰",
        senderAvatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
        text: `Welcome everyone to the newly created group: "${newGCName}"! Enjoy chatting offline & online, customizable themes, and rich custom stickers. 🌻`,
        type: "text",
        timestamp: new Date().toISOString(),
        isGC: true
      };
      await setDoc(doc(db, "messenger_messages", introMsg.id), introMsg);

      alert("👥 Group chat successfully created!");
      setNewGCName("");
      setSelectedGCMembers([]);
      setShowCreateGC(false);
      setActiveChatId(id);
    } catch(err: any) {
      alert("Failed creating group: " + err.message);
    }
  };

  // 7. General: Send standard text message
  const handleSendTextMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currUser || !activeChatId) return;

    if (isGuestAccount(currUser.email)) {
      alert("Restricted: Guest accounts are read-only.");
      return;
    }

    try {
      const msgId = "mmsg_" + Date.now() + Math.random().toString(36).substr(2, 9);
      const msg: MessengerMessage = {
        id: msgId,
        chatId: activeChatId,
        senderEmail: currUser.email,
        senderName: currUser.username || "Anonymous Watcher",
        senderAvatar: currUser.avatarUrl || "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
        text: inputText.trim(),
        type: "text",
        timestamp: new Date().toISOString(),
        isGC: activeChatId.startsWith("group_")
      };

      await setDoc(doc(db, "messenger_messages", msgId), msg);
      setInputText("");
    } catch(err: any) {
      console.error(err);
    }
  };

  // 8. Send Sticker (Either preloaded LINE characters or custom)
  const handleSendSticker = async (url: string) => {
    if (!currUser || !activeChatId) return;
    if (isGuestAccount(currUser.email)) return;

    try {
      const msgId = "sticker_" + Date.now();
      const msg: MessengerMessage = {
        id: msgId,
        chatId: activeChatId,
        senderEmail: currUser.email,
        senderName: currUser.username || "User",
        senderAvatar: currUser.avatarUrl,
        text: "[Sticker Send]",
        type: "sticker",
        stickerUrl: url,
        timestamp: new Date().toISOString(),
        isGC: activeChatId.startsWith("group_")
      };
      await setDoc(doc(db, "messenger_messages", msgId), msg);
      setShowStickerDrawer(false);
    } catch(err) {
      console.warn(err);
    }
  };

  // 9. Sticker Upload: Upload custom LINE / local stickers
  const handleStickerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const stickerId = "sticker_" + Date.now();
      
      // Save permanently to IDB store
      try {
         const localDb = await openDB();
         const tx = localDb.transaction("group_wallpapers", "readwrite");
         const store = tx.objectStore("group_wallpapers");
         store.put({
           id: stickerId,
           type: "sticker",
           dataUrl
         });
         setCustomStickers(prev => [...prev, { id: stickerId, url: dataUrl }]);
         alert("✨ Chat sticker added successfully!");
      } catch(err) {
        console.warn(err);
      }
    };
    reader.readAsDataURL(file);
  };

  // 10. Voice Message Recorder Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          // Send as voice message
          try {
            const msgId = "voice_" + Date.now();
            const msg: MessengerMessage = {
              id: msgId,
              chatId: activeChatId,
              senderEmail: currUser!.email,
              senderName: currUser!.username || "User",
              senderAvatar: currUser!.avatarUrl,
              text: "[Voice Message Note]",
              type: "voice",
              voiceUrl: base64Audio,
              timestamp: new Date().toISOString(),
              isGC: activeChatId.startsWith("group_")
            };
            await setDoc(doc(db, "messenger_messages", msgId), msg);
          } catch(err) {
            console.warn(err);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordChunks([]);
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);

      recordInterval.current = setInterval(() => {
        setRecordingDuration(v => v + 1);
      }, 1000);

    } catch(err) {
      alert("Could not access microphone for live recording.");
    }
  };

  const stopRecordingAndSend = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      clearInterval(recordInterval.current);
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder) {
      clearInterval(recordInterval.current);
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // 11. Custom wallpaper image & GIF handling
  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeChatId) return;
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const updatedTheme: ChatSettings = {
        ...chatTheme,
        themeType: "image",
        themeValue: dataUrl
      };
      setChatTheme(updatedTheme);
      await setDoc(doc(db, "messenger_settings", activeChatId), updatedTheme);
    };
    reader.readAsDataURL(file);
  };

  // 12. Predefined high-quality gradient color presets
  const applyPresetTheme = async (presetName: string) => {
    if (!activeChatId) return;

    let theme: ChatSettings = {
      id: activeChatId,
      themeType: "gradient",
      themeValue: "linear-gradient(135deg, #121214 0%, #0d091e 100%)",
      bubbleGradient: "linear-gradient(90deg, #8b5cf6 0%, #3b82f6 100%)",
      bubbleText: "#ffffff",
      accentColor: "#8b5cf6",
      themeName: "Twilight Gradient"
    };

    if (presetName === "neon") {
      theme = {
        id: activeChatId,
        themeType: "gradient",
        themeValue: "linear-gradient(135deg, #020010 0%, #17002b 100%)",
        bubbleGradient: "linear-gradient(90deg, #f43f5e 0%, #d946ef 100%)",
        bubbleText: "#ffffff",
        accentColor: "#f43f5e",
        themeName: "Cyberpunk Neon"
      };
    } else if (presetName === "forest") {
      theme = {
        id: activeChatId,
        themeType: "gradient",
        themeValue: "linear-gradient(135deg, #05160e 0%, #020905 100%)",
        bubbleGradient: "linear-gradient(90deg, #10b981 0%, #059669 100%)",
        bubbleText: "#ffffff",
        accentColor: "#10b981",
        themeName: "Emerald Forest"
      };
    } else if (presetName === "cotton") {
      theme = {
        id: activeChatId,
        themeType: "gradient",
        themeValue: "linear-gradient(135deg, #1e1b29 0%, #0c0a1a 100%)",
        bubbleGradient: "linear-gradient(90deg, #ec4899 0%, #3b82f6 100%)",
        bubbleText: "#ffffff",
        accentColor: "#ec4899",
        themeName: "Cotton Candy Bubble"
      };
    } else if (presetName === "sunset") {
      theme = {
        id: activeChatId,
        themeType: "gradient",
        themeValue: "linear-gradient(135deg, #1c0a00 0%, #0a0400 100%)",
        bubbleGradient: "linear-gradient(90deg, #f97316 0%, #ef4444 100%)",
        bubbleText: "#ffffff",
        accentColor: "#f97316",
        themeName: "Sunset Fire"
      };
    }

    setChatTheme(theme);
    await setDoc(doc(db, "messenger_settings", activeChatId), theme);
  };

  // 13. AI Theme Prompt Generation Proxying to Express endpoints
  const handleGenerateAITheme = async () => {
    if (!aiThemePrompt.trim() || !activeChatId) return;
    setIsGeneratingTheme(true);

    try {
      const res = await fetch("/api/generate-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiThemePrompt.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        const updated: ChatSettings = {
          id: activeChatId,
          themeType: "gradient",
          themeValue: data.backgroundGradient,
          bubbleGradient: data.bubbleGradient,
          bubbleText: data.bubbleText,
          accentColor: data.accentColor,
          themeName: data.themeName
        };
        setChatTheme(updated);
        await setDoc(doc(db, "messenger_settings", activeChatId), updated);
        setAiThemePrompt("");
        alert(`🤖 Chat theme updated matching: "${data.themeName}"!`);
      } else {
        throw new Error("Unable to parse generated palette");
      }
    } catch(err) {
      alert("AI theme palette rendering delayed, using automatic vibrant fallbacks.");
      // Fallback custom preset gradient instantly
      applyPresetTheme("neon");
    } finally {
      setIsGeneratingTheme(false);
    }
  };

  // 14. Simulated Call controls (Voice and Video)
  const triggerStartCall = (type: "voice" | "video") => {
    setActiveCall({
      type,
      status: "ringing",
      duration: 0
    });

    // Make synthetic call sounds or dynamic connection tickings
    let ringCount = 0;
    callInterval.current = setInterval(() => {
      ringCount++;
      if (ringCount >= 4) {
        setActiveCall(p => p ? { ...p, status: "connected" } : null);
      }
      
      setActiveCall(p => {
        if (!p) return null;
        if (p.status === "connected") {
          return { ...p, duration: p.duration + 1 };
        }
        return p;
      });
    }, 1000);
  };

  const endActiveCall = () => {
    clearInterval(callInterval.current);
    setActiveCall(p => p ? { ...p, status: "ended" } : null);
    setTimeout(() => {
      setActiveCall(null);
    }, 1200);
  };

  const deleteChatHistory = async () => {
    if (!activeChatId || !currUser) return;
    if (isGuestAccount(currUser.email)) return;
    if (!window.confirm("Delete entire chat history? This action is permanent.")) return;

    try {
       const q = query(collection(db, "messenger_messages"), where("chatId", "==", activeChatId));
       const s = await getDocs(q);
       s.forEach(async (docSnap) => {
         await deleteDoc(doc(db, "messenger_messages", docSnap.id));
       });
       setMessages([]);
       alert("🧹 Chat history purged successfully!");
    } catch(e) {}
  };

  // Retrieve current partner avatar and username metadata
  const getActiveChatMeta = () => {
    if (!activeChatId) return { name: "", avatar: "", subText: "" };
    if (activeChatId.startsWith("group_")) {
      const gObj = groupsList.find(g => g.id === activeChatId);
      return { 
        name: gObj ? gObj.name : "Midy Group", 
        avatar: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=80&q=80",
        subText: `${gObj?.memberEmails?.length || 1} members connected`
      };
    } else {
      const oppositeUser = friendsList.find(f => getSoloChatId(currUser!.email, f.email) === activeChatId);
      return {
        name: oppositeUser ? oppositeUser.channelName : "Midy Partner",
        avatar: oppositeUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80",
        subText: "Active Now"
      };
    }
  };

  const activeMeta = getActiveChatMeta();

  return (
    <div className="bg-[#0b0c0ed9] border border-white/10 rounded-2xl flex flex-col md:flex-row h-[550px] shadow-2xl overflow-hidden select-none relative">
      
      {/* 1. Chats left channel drawer */}
      <div className={`w-full md:w-64 border-r border-white/10 flex flex-col h-full bg-[#111215] ${activeChatId ? "hidden md:flex" : "flex"}`}>
        {/* Title and Buttons header */}
        <div className="p-4 border-b border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-gray-100 flex items-center gap-1.5 uppercase tracking-wide">
              <MessageCircle className="w-4 h-4 text-purple-400" />
              Messenger
            </h3>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setShowAddFriend(true)}
                title="Add Friend"
                className="p-1.5 bg-white/5 hover:bg-purple-900/40 hover:text-purple-300 rounded-lg text-gray-400 transition cursor-pointer"
                id="add-friend-btn"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setShowCreateGC(true)}
                title="Create Group Chat"
                className="p-1.5 bg-white/5 hover:bg-purple-900/40 hover:text-purple-300 rounded-lg text-gray-400 transition cursor-pointer"
                id="create-gc-btn"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18191d] text-xs text-white rounded-lg pl-8 pr-3 py-1.5 border border-white/5 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Channels / Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          <p className="text-[9px] text-purple-400 uppercase tracking-widest px-2.5 py-1.5 font-bold">Groups & Circles</p>
          {groupsList
            .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(gc => (
              <button
                key={gc.id}
                onClick={() => setActiveChatId(gc.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition shrink-0 cursor-pointer ${activeChatId === gc.id ? "bg-purple-950/40 border border-purple-900/40" : "hover:bg-white/5"}`}
              >
                <div className="w-9 h-9 rounded-xl bg-purple-900/50 flex items-center justify-center border border-purple-500/20 shadow-md">
                  <Users className="w-4 h-4 text-purple-300 animate-pulse" />
                </div>
                <div className="flex-1 truncate">
                  <h4 className="text-xs font-bold text-gray-200 truncate">{gc.name}</h4>
                  <p className="text-[9px] text-purple-400 font-mono">#{gc.memberEmails.length} member GC</p>
                </div>
              </button>
            ))}

          <p className="text-[9px] text-purple-400 uppercase tracking-widest px-2.5 py-1.5 mt-3 font-bold">Direct Connections</p>
          {friendsList.length === 0 && (
             <p className="text-[10px] text-gray-500 italic px-3 mt-1">No friends added yet. Press '+' above to explore!</p>
          )}
          {friendsList
            .filter(f => f.channelName.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(friend => {
              const cid = getSoloChatId(currUser!.email, friend.email);
              return (
                <button
                  key={friend.email}
                  onClick={() => setActiveChatId(cid)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition shrink-0 cursor-pointer ${activeChatId === cid ? "bg-purple-950/40 border border-purple-900/40" : "hover:bg-white/5"}`}
                >
                  <div className="relative w-9 h-9">
                    <img src={friend.avatarUrl} alt="" className="w-full h-full object-cover rounded-full border border-purple-500/30" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full animate-bounce" />
                  </div>
                  <div className="flex-1 truncate">
                    <h4 className="text-xs font-bold text-gray-200 truncate">{friend.channelName}</h4>
                    <p className="text-[9px] text-gray-400">@{friend.username}</p>
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* 2. Main chatting panel log */}
      {activeChatId ? (
        <div className="flex-1 flex flex-col h-full bg-[#121214] relative overflow-hidden" style={{
          backgroundImage: chatTheme.themeType === "image" ? `url(${chatTheme.themeValue})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}>
          {chatTheme.themeType === "gradient" && (
            <div className="absolute inset-0 opacity-80" style={{ background: chatTheme.themeValue }} />
          )}

          <div className="relative z-10 flex flex-col h-full">
            {/* Header top settings */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveChatId("")}
                  className="p-1 px-1.5 md:hidden bg-white/10 rounded-lg hover:bg-white/20 text-white cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="relative">
                  <img src={activeMeta.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-purple-500" />
                  {!activeChatId.startsWith("group_") && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-950 rounded-full" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{activeMeta.name}</h4>
                  <p className="text-[9px] text-gray-400">{activeMeta.subText}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => triggerStartCall("voice")}
                  className="p-2 hover:bg-white/10 rounded-xl transition text-purple-300 cursor-pointer"
                  title="Voice Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => triggerStartCall("video")}
                  className="p-2 hover:bg-white/10 rounded-xl transition text-purple-300 cursor-pointer"
                  title="Video Call"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>

                {/* Themes and Settings */}
                <div className="relative group">
                  <button className="p-2 hover:bg-white/10 rounded-xl transition text-purple-300 cursor-pointer" title="Custom Theme Generator">
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute right-0 top-9 w-64 bg-slate-900 border border-white/10 rounded-xl p-3 shadow-2xl hidden group-hover:block z-40">
                    <p className="text-xs font-bold text-white mb-2">🎨 Chat Customizer</p>
                    
                    {/* Presets */}
                    <div className="grid grid-cols-4 gap-1.5 mb-3">
                      <button onClick={() => applyPresetTheme("sunset")} className="h-6 rounded bg-gradient-to-tr from-orange-500 to-red-500 cursor-pointer text-[8px] font-bold text-white">Fire</button>
                      <button onClick={() => applyPresetTheme("neon")} className="h-6 rounded bg-gradient-to-tr from-rose-500 to-fuchsia-500 cursor-pointer text-[8px] font-bold text-white">Neon</button>
                      <button onClick={() => applyPresetTheme("cotton")} className="h-6 rounded bg-gradient-to-tr from-pink-500 to-blue-500 cursor-pointer text-[8px] font-bold text-white">Candy</button>
                      <button onClick={() => applyPresetTheme("forest")} className="h-6 rounded bg-gradient-to-tr from-emerald-500 to-teal-500 cursor-pointer text-[8px] font-bold text-white">Forest</button>
                    </div>

                    {/* AI Generator */}
                    <div className="space-y-2 border-t border-white/5 pt-2 mb-2">
                      <p className="text-[9px] text-gray-400">Generate Palette with AI:</p>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          placeholder="e.g. Barbie pink core" 
                          value={aiThemePrompt}
                          onChange={(e) => setAiThemePrompt(e.target.value)}
                          className="flex-1 bg-[#18191d] border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none"
                        />
                        <button 
                          onClick={handleGenerateAITheme}
                          disabled={isGeneratingTheme}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-[10px] rounded text-white font-bold cursor-pointer transition disabled:opacity-50"
                        >
                          {isGeneratingTheme ? "..." : "AI"}
                        </button>
                      </div>
                    </div>

                    {/* Custom Wallpapers uploads */}
                    <div className="border-t border-white/5 pt-2">
                      <label className="flex items-center justify-center gap-1.5 bg-purple-950/40 hover:bg-purple-900 px-3 py-1.5 rounded-lg text-[10px] text-purple-300 cursor-pointer transition border border-purple-800/20">
                        <ImageIcon className="w-3 h-3" />
                        Upload custom theme BG
                        <input type="file" accept="image/*" className="hidden" onChange={handleWallpaperUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={deleteChatHistory}
                  className="p-2 hover:bg-red-950/30 rounded-xl transition text-red-400 cursor-pointer"
                  title="Purge chat history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bubble log section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {messages.length === 0 && (
                <div className="text-center py-12 text-gray-500 space-y-1">
                  <p className="text-xs">No previous messages. Wave to {activeMeta.name}! 👋</p>
                  <p className="text-[10px]">Your connection is secure and synchronized globally.</p>
                </div>
              )}
              {messages.map((m) => {
                const isMe = m.senderEmail === currUser?.email;
                return (
                  <div key={m.id} className={`flex gap-2.5 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                    {!isMe && (
                      <img src={m.senderAvatar} alt="" className="w-8 h-8 rounded-full border border-white/5 self-end" />
                    )}
                    <div className="flex flex-col">
                      {!isMe && activeChatId.startsWith("group_") && (
                        <span className="text-[9px] text-purple-300 font-bold ml-1 mb-0.5">{m.senderName}</span>
                      )}
                      
                      {m.type === "sticker" ? (
                        <div className="max-w-[150px] animate-fade-in">
                          <img src={m.stickerUrl} alt="Sticker" className="w-full object-contain rounded-xl shadow-lg border border-white/10" />
                        </div>
                      ) : m.type === "voice" ? (
                        <div className="bg-[#1C1C1F] border border-white/10 p-2 px-3 rounded-2xl flex items-center gap-3 shadow-md">
                          <button 
                            onClick={() => {
                              const aud = new Audio(m.voiceUrl);
                              aud.play();
                            }}
                            className="w-7 h-7 bg-purple-600 hover:bg-purple-500 text-white rounded-full flex items-center justify-center cursor-pointer shadow-md transition"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex flex-col">
                            <span className="text-[9px] text-gray-400 font-mono">Recorded Voice</span>
                            <div className="flex gap-0.5 items-center mt-0.5">
                              {/* Purely functional waveform lines viz */}
                              <div className="w-1 h-3 bg-purple-500 animate-pulse rounded-full" />
                              <div className="w-1 h-5 bg-indigo-500 animate-pulse rounded-full" />
                              <div className="w-1 h-2 bg-purple-500 animate-pulse rounded-full" />
                              <div className="w-1 h-4 bg-indigo-500 animate-pulse rounded-full" />
                              <div className="w-1 h-1 bg-purple-500 rounded-full" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="p-3 text-xs rounded-2xl leading-relaxed break-words shadow-lg"
                          style={{
                            background: isMe ? chatTheme.bubbleGradient : "#1c1c1fdf",
                            color: isMe ? chatTheme.bubbleText : "#e2e8f0",
                            borderRadius: isMe ? "20px 20px 2px 20px" : "20px 20px 20px 2px"
                          }}
                        >
                          <p>{m.text}</p>
                        </div>
                      )}
                      <span className="text-[8px] text-gray-500 mt-1 self-end">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={logBottomRef} />
            </div>

            {/* Bubble composer section input */}
            <div className="p-3 border-t border-white/10 bg-black/40 backdrop-blur-md">
              <form onSubmit={handleSendTextMessage} className="flex gap-2.5 items-center relative">
                
                {/* Voice Record Toggle Button */}
                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between px-4 py-2 bg-purple-950/80 border border-purple-500/30 rounded-xl text-xs text-white">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                      <span>Recording voice notes... ({recordingDuration}s)</span>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={cancelRecording} className="p-1 px-2.5 bg-white/10 hover:bg-white/20 rounded cursor-pointer transition">Cancel</button>
                      <button type="button" onClick={stopRecordingAndSend} className="p-1 px-2.5 bg-purple-600 hover:bg-purple-500 rounded cursor-pointer transition flex items-center gap-1 font-bold">
                        <Check className="w-3.5 h-3.5" /> Send
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button 
                      type="button" 
                      onClick={startRecording}
                      title="Hold to Record Voice Message"
                      className="p-2.5 text-gray-400 hover:text-purple-300 rounded-xl bg-white/5 cursor-pointer transition flex justify-center items-center"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>

                    {/* Stickers selector button */}
                    <button 
                      type="button" 
                      onClick={() => setShowStickerDrawer(!showStickerDrawer)}
                      className="p-2.5 text-gray-400 hover:text-purple-300 rounded-xl bg-white/5 cursor-pointer transition flex justify-center items-center"
                      title="LINE Sticker Drawer"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    <input 
                      type="text" 
                      placeholder={`Message ${activeMeta.name}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="bg-[#18191d] border border-white/10 rounded-xl text-xs p-2.5 px-3 text-white flex-1 outline-none focus:border-purple-500"
                    />

                    <button 
                      type="submit" 
                      className="bg-purple-600 hover:bg-purple-500 p-2.5 text-white rounded-xl transition duration-150 cursor-pointer shadow flex justify-center items-center"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {/* Sticker and emoji popups drawer */}
                {showStickerDrawer && (
                  <div className="absolute bottom-12 left-0 right-0 p-3 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl z-50 animate-fade-in flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Free LINE & Usagyuuun Stickers</p>
                      
                      {/* Upload new custom file stickers */}
                      <label className="flex items-center gap-1.5 text-[9px] bg-purple-950 px-2 py-1 rounded text-purple-300 cursor-pointer transition border border-purple-800">
                        <Plus className="w-2.5 h-2.5" />
                        Add Custom
                        <input type="file" accept="image/*" className="hidden" onChange={handleStickerUpload} />
                      </label>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                      {FREE_STICKERS.map(stick => (
                        <button 
                          key={stick.id}
                          type="button"
                          onClick={() => handleSendSticker(stick.url)}
                          className="p-1 bg-[#101114] hover:bg-slate-800 rounded-lg border border-white/5 hover:border-purple-500/20 transition cursor-pointer"
                        >
                          <img src={stick.url} alt={stick.name} className="w-full h-12 object-contain" />
                        </button>
                      ))}

                      {/* Custom uploaded stickers */}
                      {customStickers.map(stick => (
                        <button 
                          key={stick.id}
                          type="button"
                          onClick={() => handleSendSticker(stick.url)}
                          className="p-1 bg-[#101114] hover:bg-slate-800 rounded-lg border border-white/5 hover:border-purple-500/20 transition cursor-pointer"
                        >
                          <img src={stick.url} alt="Custom sticker" className="w-full h-12 object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#111215] p-6 text-center text-gray-500">
          <MessageCircle className="w-12 h-12 text-purple-500/30 mb-3 animate-bounce" />
          <h4 className="text-sm font-extrabold text-gray-300">Start a Connection</h4>
          <p className="text-xs text-gray-500 max-w-sm mt-1 leading-relaxed">
            Choose a global group chat circle or select dynamic direct friends from the sidebar to start instant Messenger discussions.
          </p>
        </div>
      )}

      {/* 4. Interactive Call session simulator overlay */}
      {activeCall && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 bg-[#06060c] flex flex-col justify-between p-6 text-white"
        >
          {activeCall.status === "ringing" ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <img src={activeMeta.avatar} alt="" className="w-24 h-24 rounded-full border-4 border-purple-500 shadow-2xl" />
                <span className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping opacity-60" />
              </div>
              <h3 className="text-lg font-bold">{activeMeta.name}</h3>
              <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider animate-pulse">Ringing midy signal...</p>
              
              {/* Dynamic waveform visualization */}
              <div className="flex gap-1 pt-6">
                <div className="w-1 h-3 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-1 h-6 bg-indigo-500 rounded-full animate-bounce" />
                <div className="w-1 h-4 bg-fuchsia-500 rounded-full animate-bounce" />
                <div className="w-1 h-8 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-1 h-5 bg-indigo-500 rounded-full animate-bounce" />
              </div>
            </div>
          ) : activeCall.status === "connected" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {activeCall.type === "video" ? (
                <div className="relative w-full aspect-video max-w-sm md:max-w-md bg-slate-950 rounded-2xl border-2 border-purple-500 overflow-hidden shadow-2xl flex items-center justify-center">
                  <img src={activeMeta.avatar} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-blue-950/20 mix-blend-color-dodge animate-pulse" />
                  
                  {/* PiP Local Video View */}
                  <div className="absolute bottom-3 right-3 w-20 h-28 bg-slate-900 border border-white/20 rounded-lg overflow-hidden shadow-md">
                    <img src={currUser?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=40&q=40"} alt="" className="w-full h-full object-cover" />
                  </div>

                  <span className="absolute top-3 left-3 bg-red-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest animate-pulse">Live Feed</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <img src={activeMeta.avatar} alt="" className="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-2xl" />
                  <h3 className="text-lg font-bold">{activeMeta.name}</h3>
                  <p className="text-xs text-emerald-400 font-semibold animate-pulse">Voice Connected</p>
                </div>
              )}

              <p className="text-xs font-mono text-gray-400 mt-4">
                Call Duration: {Math.floor(activeCall.duration / 60)}:{(activeCall.duration % 60).toString().padStart(2, "0")}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <PhoneOff className="w-12 h-12 text-rose-500 mb-3 animate-spin" />
              <h3 className="text-sm font-bold text-gray-300">Call Ended</h3>
            </div>
          )}

          {/* Bottom Call UI controls */}
          <div className="flex justify-center gap-6 pb-6">
            <button className="p-3.5 bg-white/10 hover:bg-white/20 rounded-full transition text-white cursor-pointer" title="Mute Microphone">
              <MicOff className="w-5 h-5" />
            </button>
            <button 
              onClick={endActiveCall}
              className="p-3.5 bg-rose-600 hover:bg-rose-500 rounded-full transition text-white cursor-pointer shadow-lg hover:shadow-rose-500/20"
              title="Hang up"
            >
              <PhoneOff className="w-5 h-5 pointer-events-none" />
            </button>
          </div>
        </motion.div>
      )}

      {/* 5. Add Friend Popup Dialog Modal */}
      {showAddFriend && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18191d] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden text-white shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h3 className="font-bold text-sm">Add Friends</h3>
              <button onClick={() => setShowAddFriend(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* List searchable profiles */}
            <div className="p-3 max-h-64 overflow-y-auto space-y-2 scrollbar-thin">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest px-1">Co-viewers online Midyeah:</p>
              {allProfiles
                .filter(p => p.email !== currUser?.email)
                .map(profile => (
                  <div key={profile.email} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition border border-transparent hover:border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={profile.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{profile.channelName}</h4>
                        <p className="text-[9px] text-gray-400">@{profile.username}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAddFriendAction(profile.email)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-[10px] font-bold rounded-lg transition text-white cursor-pointer shadow-md"
                    >
                      Connect
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Create Group Chat Dialog Modal */}
      {showCreateGC && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#18191d] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden text-white shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <h3 className="font-bold text-sm flex items-center gap-1.5 text-purple-300">
                <Users className="w-4 h-4" />
                Create Group Chat
              </h3>
              <button onClick={() => setShowCreateGC(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">GC Name:</label>
                <input 
                  type="text" 
                  placeholder="e.g. Anime Watch Party circle"
                  value={newGCName}
                  onChange={(e) => setNewGCName(e.target.value)}
                  className="w-full bg-[#111215] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Select Friends to Add:</label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin border border-white/5 bg-[#111215] rounded-xl p-2">
                  {friendsList.map(friend => {
                    const isSelected = selectedGCMembers.includes(friend.email);
                    return (
                      <button
                        key={friend.email}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGCMembers(prev => prev.filter(e => e !== friend.email));
                          } else {
                            setSelectedGCMembers(prev => [...prev, friend.email]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg transition text-left cursor-pointer ${isSelected ? "bg-purple-950/30 border border-purple-800/30" : "hover:bg-white/5"}`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={friend.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                          <h4 className="text-xs font-bold text-gray-300">{friend.channelName}</h4>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "border-purple-500 bg-purple-600" : "border-white/20"}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={handleCreateGCAction}
                disabled={!newGCName.trim() || selectedGCMembers.length === 0}
                className="w-full py-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition cursor-pointer shadow-lg"
              >
                Assemble Group Circle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
