import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Award, Heart, MessageSquare, ThumbsUp, ThumbsDown, Trash2, Settings, 
  Upload, UserPlus, UserMinus, UserCheck, Image as ImageIcon, X
} from "lucide-react";
import { doc, getDoc, setDoc, query, collection, orderBy, onSnapshot, deleteDoc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";
import { db, auth } from "../db";
import { UserProfile } from "../types";

interface Post {
  id: string;
  authorEmail: string;
  authorUsername: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  privacy: "public" | "private" | "friends";
  likes: number;
  reactions: Record<string, number>;
}

export default function MembersPlusPage({ currUser, creatorProfile }: { currUser: UserProfile; creatorProfile: UserProfile }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private" | "friends">("public");
  const [wallpaper, setWallpaper] = useState<string | null>(null);
  
  // Real-time Feed Sync
  useEffect(() => {
    const q = query(
      collection(db, "members_plus_posts"),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ ...doc.data() as Post, id: doc.id }));
      setPosts(p);
    });
  }, []);

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    const postId = `post_${Date.now()}`;
    const newPost: Post = {
      id: postId,
      authorEmail: currUser.email,
      authorUsername: currUser.username || "Member",
      authorAvatar: currUser.avatarUrl,
      content: newPostContent,
      timestamp: new Date().toISOString(),
      privacy,
      likes: 0,
      reactions: {}
    };
    await setDoc(doc(db, "members_plus_posts", postId), newPost);
    setNewPostContent("");
  };

  const deletePost = async (postId: string) => {
    await deleteDoc(doc(db, "members_plus_posts", postId));
  };

  return (
    <div className="min-h-screen bg-[#111218] p-4 font-sans text-white" style={{ backgroundImage: wallpaper ? `url(${wallpaper})` : 'none', backgroundSize: 'cover' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#15161c] p-6 rounded-2xl border border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="text-yellow-400" /> Members+ Inner Circle
            </h1>
            <p className="text-xs text-gray-400">Exclusive community for premium supporters of {creatorProfile.channelName}</p>
          </div>
          <button className="p-2 bg-white/10 rounded-full hover:bg-white/20">
            <Upload className="w-5 h-5" />
          </button>
        </div>

        {/* Post Form */}
        <div className="bg-[#15161c] p-6 rounded-2xl border border-white/10">
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="What's on your mind, Member+?"
            className="w-full bg-[#1c1c24] rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
            rows={3}
          />
          <div className="mt-4 flex items-center justify-between">
            <select className="bg-white/5 border border-white/10 p-2 rounded-lg text-xs" value={privacy} onChange={(e) => setPrivacy(e.target.value as any)}>
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="friends">Friends Only</option>
            </select>
            <button onClick={handlePost} className="bg-yellow-600 px-6 py-2 rounded-lg font-bold text-xs hover:bg-yellow-500">Post</button>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-[#15161c] p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <img src={post.authorAvatar} alt="" className="w-8 h-8 rounded-full" />
                <div>
                  <p className="text-xs font-bold">{post.authorUsername}</p>
                  <p className="text-[9px] text-gray-400">{new Date(post.timestamp).toLocaleString()}</p>
                </div>
                {post.authorEmail === currUser.email && (
                  <button onClick={() => deletePost(post.id)} className="ml-auto text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="mt-3 text-sm">{post.content}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                <button className="flex items-center gap-1 hover:text-yellow-400"><ThumbsUp className="w-4 h-4" /> {post.likes}</button>
                <button className="flex items-center gap-1 hover:text-red-400"><ThumbsDown className="w-4 h-4" /></button>
                <button className="flex items-center gap-1 hover:text-purple-400"><MessageSquare className="w-4 h-4" /> Reply</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
