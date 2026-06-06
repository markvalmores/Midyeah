/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { 
  getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, 
  query, orderBy, getDocFromServer, collectionGroup
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { Video, UserProfile, Comment, DiscordMessage } from "./types";

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Standard Operational Error Handling Interface
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL CONSTRAINT: Test Firebase connection during first boot
async function validateConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Please check your Firebase configuration or network status.");
    }
  }
}
validateConnection();

// IndexedDB fallbacks for high-fidelity offline downloads
const DB_NAME = "MidyeahDB";
const DB_VERSION = 1;

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store user profile
      if (!db.objectStoreNames.contains("profiles")) {
        db.createObjectStore("profiles", { keyPath: "email" });
      }

      // Store uploaded videos blobs & metadata
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos", { keyPath: "id" });
      }

      // Store comments
      if (!db.objectStoreNames.contains("comments")) {
        db.createObjectStore("comments", { keyPath: "id" });
      }

      // Store discord messages (joined community chats)
      if (!db.objectStoreNames.contains("messages")) {
        db.createObjectStore("messages", { keyPath: "id" });
      }

      // Store play history offsets (to resume watching later)
      if (!db.objectStoreNames.contains("history")) {
        db.createObjectStore("history", { keyPath: "videoId" });
      }
    };
  });
}

// Global caching for Object URLs to revoke them correctly
const objectUrlCache = new Map<string, string>();

// P2P Chunk Slicing helpers for global Firestore storage
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.substring(base64String.indexOf(",") + 1);
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64Data: string, contentType: string = "video/mp4"): Blob {
  const sliceSize = 1024;
  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
}

async function uploadVideoInChunks(videoId: string, blob: Blob): Promise<void> {
  try {
    const base64Data = await blobToBase64(blob);
    const CHUNK_SIZE = 800000; // ~800KB size chunks for reliable firestore transport
    const numChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
    
    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const chunkData = base64Data.substring(start, start + CHUNK_SIZE);
      const chunkDocRef = doc(db, "global_videos", videoId, "chunks", `chunk_${i}`);
      await setDoc(chunkDocRef, {
        index: i,
        data: chunkData
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `global_videos/${videoId}/chunks`);
  }
}

export async function downloadGlobalVideoChunks(videoId: string): Promise<Blob> {
  const chunksCollectionRef = collection(db, "global_videos", videoId, "chunks");
  const q = query(chunksCollectionRef, orderBy("index", "asc"));
  try {
    const snap = await getDocs(q);
    let fullBase64 = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      fullBase64 += d.data || "";
    });
    
    if (!fullBase64) {
      throw new Error("This stream has not completed global chunk synchronization.");
    }
    
    return base64ToBlob(fullBase64, "video/mp4");
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `global_videos/${videoId}/chunks`);
    throw err;
  }
}

// Profile Sync functions
export async function saveProfile(profile: UserProfile): Promise<void> {
  // Save locally
  const localDb = await openDB();
  const tx = localDb.transaction("profiles", "readwrite");
  tx.objectStore("profiles").put(profile);

  // Save globally in Firestore profiles collection
  try {
    const docRef = doc(db, "profiles", profile.email);
    await setDoc(docRef, { ...profile });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `profiles/${profile.email}`);
  }
}

export async function getProfile(email: string): Promise<UserProfile | null> {
  try {
    const docSnap = await getDoc(doc(db, "profiles", email));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
  } catch (err) {
    console.warn("Firestore profile fetch unavailable, falling back to IndexedDB:", err);
  }

  // Fallback to IndexedDB
  const localDb = await openDB();
  return new Promise((resolve, reject) => {
    const tx = localDb.transaction("profiles", "readonly");
    const store = tx.objectStore("profiles");
    const req = store.get(email);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// Video Sync functions
export async function saveVideo(video: Video, videoBlob?: Blob): Promise<void> {
  // Save locally in IndexedDB
  const localDb = await openDB();
  const tx = localDb.transaction("videos", "readwrite");
  const store = tx.objectStore("videos");
  const dataToSave = {
    ...video,
    blob: videoBlob || video.blob
  };
  store.put(dataToSave);

  // Sync to Firestore
  const creatorObj = {
    username: video.creator.username || "",
    email: video.creator.email || "",
    channelName: video.creator.channelName || "",
    channelUrl: video.creator.channelUrl || "",
    bio: video.creator.bio || "",
    avatarUrl: video.creator.avatarUrl || "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
    coverUrl: video.creator.coverUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    subscribersCount: video.creator.subscribersCount || 0
  };

  const videoToSave = {
    id: video.id,
    title: video.title || "Untitled Presentation",
    description: video.description || "",
    videoUrl: video.videoUrl || "",
    category: video.category || "normal",
    rentalPrice: video.rentalPrice || 3,
    rentalPeriod: video.rentalPeriod || "month",
    is360: !!video.is360,
    uploadDate: video.uploadDate || new Date().toLocaleDateString(),
    creatorEmail: video.creator.email,
    creatorName: video.creator.channelName,
    creatorAvatar: video.creator.avatarUrl,
    creator: creatorObj,
    views: video.views || 0,
    likes: video.likes || 0,
    dislikes: video.dislikes || 0,
    reactions: video.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
    duration: video.duration || 120,
    hasVideoData: !!videoBlob || !!video.blob
  };

  try {
    const docRef = doc(db, "global_videos", video.id);
    await setDoc(docRef, videoToSave);
    
    // Upload chunks on base64 stream thread
    const blobToUpload = videoBlob || video.blob;
    if (blobToUpload) {
      await uploadVideoInChunks(video.id, blobToUpload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `global_videos/${video.id}`);
  }
}

export async function getAllVideos(): Promise<Video[]> {
  const remoteVideos: Video[] = [];
  try {
    const collRef = collection(db, "global_videos");
    const snap = await getDocs(collRef);
    snap.forEach(docSnap => {
      const dv = docSnap.data();
      remoteVideos.push({
        id: dv.id,
        title: dv.title,
        description: dv.description,
        videoUrl: dv.videoUrl,
        category: dv.category,
        rentalPrice: dv.rentalPrice,
        rentalPeriod: dv.rentalPeriod,
        is360: dv.is360,
        uploadDate: dv.uploadDate,
        creator: dv.creator,
        views: dv.views || 0,
        likes: dv.likes || 0,
        dislikes: dv.dislikes || 0,
        reactions: dv.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        duration: dv.duration || 120
      });
    });
  } catch (err) {
    console.warn("Failed fetching remote videos, using local only:", err);
  }

  // Load IndexedDB to find local cached videos
  const localDb = await openDB();
  const cachedDbVideos: Video[] = await new Promise((resolve, reject) => {
    const tx = localDb.transaction("videos", "readonly");
    const req = tx.objectStore("videos").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  // Map cached offline videos with active Blob URLs
  const cachedMap = new Map<string, Video>();
  cachedDbVideos.forEach(v => {
    if (v.blob) {
      const existingUrl = objectUrlCache.get(v.id);
      if (existingUrl) {
        v.videoUrl = existingUrl;
      } else {
        const url = URL.createObjectURL(v.blob);
        objectUrlCache.set(v.id, url);
        v.videoUrl = url;
      }
      v.isOffline = true;
    }
    cachedMap.set(v.id, v);
  });

  // Merge datasets (remote wins metadata updates, local provides offline blob)
  const mergedVideosMap = new Map<string, Video>();
  
  // First, populate all remote videos
  remoteVideos.forEach(v => {
    const local = cachedMap.get(v.id);
    if (local) {
      v.isOffline = true;
      v.videoUrl = local.videoUrl;
      v.blob = local.blob;
    }
    mergedVideosMap.set(v.id, v);
  });

  // Then add any local-only videos (that didn't sync yet or are offline creations)
  cachedDbVideos.forEach(v => {
    if (!mergedVideosMap.has(v.id)) {
      mergedVideosMap.set(v.id, v);
    }
  });

  return Array.from(mergedVideosMap.values());
}

export async function deleteVideo(id: string): Promise<void> {
  const existingUrl = objectUrlCache.get(id);
  if (existingUrl) {
    URL.revokeObjectURL(existingUrl);
    objectUrlCache.delete(id);
  }

  // Local delete
  const localDb = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = localDb.transaction("videos", "readwrite");
    tx.objectStore("videos").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Remote delete
  try {
    await deleteDoc(doc(db, "global_videos", id));
  } catch (err) {
    console.error("Could not delete from global network:", err);
  }
}

export async function clearAllVideos(): Promise<void> {
  for (const [id, url] of objectUrlCache.entries()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();

  // Local clear
  const localDb = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = localDb.transaction("videos", "readwrite");
    tx.objectStore("videos").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Global Video Comments
export async function saveComment(comment: Comment): Promise<void> {
  const cleanedComment = {
    id: comment.id,
    videoId: comment.videoId,
    username: comment.username,
    avatarUrl: comment.avatarUrl || "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
    text: comment.text,
    timestamp: comment.timestamp || new Date().toISOString(),
    likes: comment.likes || 0
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("comments", "readwrite");
  tx.objectStore("comments").put(comment);

  // Global write
  try {
    const docRef = doc(db, "global_videos", comment.videoId, "comments", comment.id);
    await setDoc(docRef, cleanedComment);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `global_videos/${comment.videoId}/comments/${comment.id}`);
  }
}

export async function getVideoComments(videoId: string): Promise<Comment[]> {
  try {
    const collRef = collection(db, "global_videos", videoId, "comments");
    const snap = await getDocs(collRef);
    const result: Comment[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      result.push({
        id: data.id,
        videoId: data.videoId,
        username: data.username,
        avatarUrl: data.avatarUrl,
        text: data.text,
        timestamp: data.timestamp,
        likes: data.likes || 0,
        replies: []
      });
    });
    // Newest comments first
    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return result;
  } catch (err) {
    console.warn("Could not fetch remote comments, using local IndexedDB:", err);
  }

  // Local comments fallback
  const localDb = await openDB();
  return new Promise((resolve, reject) => {
    const tx = localDb.transaction("comments", "readonly");
    const req = tx.objectStore("comments").getAll();
    req.onsuccess = () => {
      const all: Comment[] = req.result || [];
      const filtered = all.filter(c => c.videoId === videoId);
      filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      resolve(filtered);
    };
    req.onerror = () => reject(req.error);
  });
}

// Discord Messages Sync functions (global community chats)
export async function saveDiscordMessage(msg: DiscordMessage): Promise<void> {
  const cleanMsg = {
    id: msg.id,
    username: msg.username,
    avatarUrl: msg.avatarUrl || "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=40&q=40",
    text: msg.text,
    timestamp: msg.timestamp || new Date().toISOString()
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("messages", "readwrite");
  tx.objectStore("messages").put(msg);

  // Global write
  try {
    const docRef = doc(db, "discord_messages", msg.id);
    await setDoc(docRef, cleanMsg);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `discord_messages/${msg.id}`);
  }
}

export async function getDiscordMessages(): Promise<DiscordMessage[]> {
  try {
    const collRef = collection(db, "discord_messages");
    const snap = await getDocs(collRef);
    const result: DiscordMessage[] = [];
    snap.forEach(docSnap => {
      const data = docSnap.data();
      result.push({
        id: data.id,
        username: data.username,
        avatarUrl: data.avatarUrl,
        text: data.text,
        timestamp: data.timestamp
      });
    });
    // Oldest first
    result.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return result;
  } catch (err) {
    console.warn("Could not fetch global discord messages, fallback to local:", err);
  }

  // Local fallback
  const localDb = await openDB();
  return new Promise((resolve, reject) => {
    const tx = localDb.transaction("messages", "readonly");
    const req = tx.objectStore("messages").getAll();
    req.onsuccess = () => {
      const all: DiscordMessage[] = req.result || [];
      all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

// History Resume Offset functions (accidentally closed tab resume logic)
export interface PlayHistory {
  videoId: string;
  time: number;
}

export async function savePlayOffset(videoId: string, time: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("history", "readwrite");
    const store = tx.objectStore("history");
    store.put({ videoId, time });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPlayOffset(videoId: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("history", "readonly");
    const store = tx.objectStore("history");
    const req = store.get(videoId);
    req.onsuccess = () => {
      resolve(req.result ? req.result.time : 0);
    };
    req.onerror = () => reject(req.error);
  });
}
