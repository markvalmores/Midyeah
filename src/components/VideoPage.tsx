import React from "react";
import { Video, Comment } from "../types";
import VideoPlayer from "./VideoPlayer";

interface VideoPageProps {
  video: Video;
  onDownload: (v: Video, res: string) => void;
  onSaveToLibrary: (v: Video) => void;
  isDownloaded: boolean;
  comments: Comment[];
  onAddComment: (e: React.FormEvent) => void;
  setCommentInput: (val: string) => void;
  commentInput: string;
  currUser: any;
}

export default function VideoPage({ 
  video, onDownload, onSaveToLibrary, isDownloaded, comments, onAddComment, setCommentInput, commentInput, currUser 
}: VideoPageProps) {
  const bgColor = video.category === 'movie' ? 'bg-red-950' : video.category === 'rental' ? 'bg-purple-950' : 'bg-emerald-950';
  const label = video.category === 'movie' ? 'MOVIE' : video.category === 'rental' ? 'RENTAL' : 'STANDARD';

  return (
    <div className={`${bgColor} min-h-screen p-8 text-white transition-colors duration-500`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">{video.title}</h1>
            <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest bg-black/30 border border-white/20`}>{label}</span>
        </div>
        
        <VideoPlayer
            video={video}
            onDownload={onDownload}
            onSaveToLibrary={onSaveToLibrary}
            isDownloaded={isDownloaded}
        />

        <div className="bg-black/30 p-6 rounded-3xl backdrop-blur-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider mb-4 border-b border-white/10 pb-2">💬 Public Comments ({comments.length} Sync'd Worldwide)</h3>
            
            <form onSubmit={onAddComment} className="flex gap-3 items-start mt-2">
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-purple-500/30">
                    <img 
                      src={currUser?.avatarUrl} 
                      className="w-full h-full object-cover" 
                      onError={(e)=>(e.target as any).src="https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40"} 
                      referrerPolicy="no-referrer"
                    />
                </div>
                <div className="flex-1 space-y-2">
                    <input
                        type="text"
                        placeholder="Add a public comment..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl p-2.5 px-3 text-xs text-white w-full outline-none focus:border-purple-500"
                    />
                    <div className="flex justify-end pr-1">
                        <button
                            type="submit"
                            disabled={!commentInput.trim()}
                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold p-1.5 px-4 rounded-xl text-[10px] uppercase tracking-wide transition cursor-pointer"
                        >
                            Comment
                        </button>
                    </div>
                </div>
            </form>

            <div className="space-y-4 mt-4">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                        <img src={comment.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                            <p className="text-xs font-bold text-purple-200">{comment.username}</p>
                            <p className="text-xs text-slate-300">{comment.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
