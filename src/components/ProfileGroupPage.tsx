import React, { useState, useEffect, useRef } from "react";
import { Send, UploadCloud, X, Film, Image as ImageIcon } from "lucide-react";
import { UserProfile, DiscordMessage } from "../types";
import { collection, onSnapshot, query, where, setDoc, doc, limit, orderBy } from "firebase/firestore";
import { db, isGuestAccount, openDB } from "../db";

interface ProfileGroupPageProps {
  currUser: UserProfile | null;
  groupProfile: UserProfile;
  onBack: () => void;
  onLogOut?: () => void;
}

export default function ProfileGroupPage({ currUser, groupProfile, onBack, onLogOut }: ProfileGroupPageProps) {
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Custom Background State
  const [bgType, setBgType] = useState<"none" | "image" | "video">("none");
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);

  // Group ID based on channelUrl
  const groupId = groupProfile.channelUrl || "midyeah_group";

  useEffect(() => {
    // Load background for this group from IndexedDB
    const loadBg = async () => {
      try {
        const localDb = await openDB();
        const tx = localDb.transaction("group_wallpapers", "readonly");
        const store = tx.objectStore("group_wallpapers");
        const val = await new Promise<any>((resolve, reject) => {
          const req = store.get(groupId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        if (val) {
          setBgType(val.type);
          setBgDataUrl(val.dataUrl);
        }
      } catch(e) {
        // Just fail silently if missing store
      }
    };
    loadBg();
  }, [groupId]);

  useEffect(() => {
    const q = query(
      collection(db, "group_messages"), 
      where("groupId", "==", groupId),
      orderBy("timestamp", "desc"),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs: DiscordMessage[] = [];
      snap.forEach(docSnap => {
        msgs.push(docSnap.data() as DiscordMessage);
      });
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }, (err) => {
      console.warn("Real-time group chat failed", err);
    });
    return () => unsubscribe();
  }, [groupId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currUser) return;
    if (isGuestAccount(currUser.email)) {
      alert("Watching-only mode: Guests cannot send messages in groups.");
      return;
    }

    const msg: any = {
      id: "gm_" + Date.now() + Math.random().toString(36).substr(2, 9),
      username: currUser.username || "User",
      avatarUrl: currUser.avatarUrl,
      text: inputText,
      timestamp: new Date().toISOString(),
      groupId: groupId
    };

    try {
      const docRef = doc(db, "group_messages", msg.id);
      await setDoc(docRef, msg);
      setInputText("");
    } catch(err) {
      console.error(err);
      alert("Failed to send message: " + (err as any).message);
    }
  };

  const setWallpaper = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setBgType(isVideo ? "video" : "image");
      setBgDataUrl(dataUrl);

      // Save to IDB
      try {
         const localDb = await openDB();
         const tx = localDb.transaction("group_wallpapers", "readwrite");
         const store = tx.objectStore("group_wallpapers");
         await new Promise<void>((resolve, reject) => {
           const req = store.put({
             id: groupId,
             type: isVideo ? "video" : "image",
             dataUrl
           });
           req.onsuccess = () => resolve();
           req.onerror = () => reject(req.error);
         });
      } catch(dbErr) {
        console.warn("Could not save wallpaper to DB", dbErr);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeWallpaper = async () => {
    setBgType("none");
    setBgDataUrl(null);
    try {
         const localDb = await openDB();
         const tx = localDb.transaction("group_wallpapers", "readwrite");
         const store = tx.objectStore("group_wallpapers");
         await new Promise<void>((resolve, reject) => {
           const req = store.delete(groupId);
           req.onsuccess = () => resolve();
           req.onerror = () => reject(req.error);
         });
    } catch(err) {}
  };

  return (
    <div className="relative w-full h-[550px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#121214]">
      {/* Background Layer */}
      {bgType === "image" && bgDataUrl && (
        <div className="absolute inset-0 z-0">
          <img src={bgDataUrl} className="w-full h-full object-cover opacity-60" alt="bg" />
          <div className="absolute inset-0 bg-black/60 mix-blend-multiply" />
        </div>
      )}
      {bgType === "video" && bgDataUrl && (
        <div className="absolute inset-0 z-0">
          <video src={bgDataUrl} className="w-full h-full object-cover opacity-60" autoPlay loop muted playsInline />
          <div className="absolute inset-0 bg-black/60 mix-blend-multiply" />
        </div>
      )}

      <div className="relative z-10 flex flex-col h-full text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition cursor-pointer">
              ← Back
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 shadow-md">
              <img src={groupProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-bold text-sm">{groupProfile.channelName}'s Group</h2>
              <p className="text-[10px] text-zinc-400 font-mono">#{groupId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {onLogOut && (
              <button 
                onClick={onLogOut}
                className="bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/60 font-black text-[10px] px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                Sign Out 🚪
              </button>
            )}
            <label className="flex items-center gap-1.5 text-[10px] bg-purple-950/60 hover:bg-purple-900/80 px-3 py-1.5 rounded-xl cursor-pointer transition border border-purple-800/50">
              <ImageIcon className="w-3 h-3" />
              <span>Set BG</span>
              <input type="file" accept="image/*,video/mp4,video/webm,image/gif" className="hidden" onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setWallpaper(e.target.files[0]);
                }
              }} />
            </label>
            {(bgType !== "none") && (
              <button 
                onClick={removeWallpaper}
                className="p-1.5 text-zinc-400 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Remove background"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="text-center mt-10 text-zinc-500 text-xs">
              <p>Welcome to the {groupProfile.channelName} official group chat!</p>
              <p className="mt-1">Be the first to say hi.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className="flex gap-3">
              <img src={msg.avatarUrl} alt="" className="w-8 h-8 rounded-full shadow-sm" />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-xs text-white">{msg.username}</span>
                  <span className="text-[9px] text-zinc-500">{new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-sm text-zinc-300 mt-0.5 max-w-2xl break-words">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 bg-black/40 backdrop-blur-md border-t border-white/10">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${groupProfile.channelName}'s group...`}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-5 pr-12 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-2 top-2 p-1.5 bg-purple-600 hover:bg-purple-500 rounded-full text-white cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
