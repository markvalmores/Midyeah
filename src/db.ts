/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword 
} from "firebase/auth";
import { 
  getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, 
  query, orderBy, getDocFromServer, collectionGroup, onSnapshot,
  where, writeBatch, updateDoc, increment
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { Video, UserProfile, Comment, DiscordMessage, Playlist, DonationRecord, DonationStats } from "./types";
import { getRandomAnimeAvatar } from "./utils";

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function authenticateUser(email: string, pass: string): Promise<void> {
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    localStorage.setItem("midyeah_active_session_email", email);
  } catch (error: any) {
    if (error.code === "auth/email-already-in-use" || error.code === "auth/wrong-password") {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        localStorage.setItem("midyeah_active_session_email", email);
      } catch (innerError: any) {
        console.warn("Firebase Auth sign-in failed, checking IndexedDB as fallback...", innerError);
        const localProfile = await getProfile(email);
        if (localProfile) {
          localStorage.setItem("midyeah_active_session_email", email);
          return;
        }
        throw innerError;
      }
    } else {
      console.warn("Firebase Auth unavailable. Logging in with local database fallback:", error.message);
      const localProfile = await getProfile(email);
      // Permit local profile auth or generate local-first session instantly
      localStorage.setItem("midyeah_active_session_email", email);
    }
  }
}

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
  if (error instanceof Error && error.message.includes("resource-exhausted")) {
    hasFirestoreQuota = false;
    console.warn("Firestore quota exhausted, disabling remote sync for the rest of session.");
  }
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
const DB_NAME = "MidYeahDB";
const DB_VERSION = 3;

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

      // Store user playlists
      if (!db.objectStoreNames.contains("playlists")) {
        db.createObjectStore("playlists", { keyPath: "id" });
      }

      // Store transparent donation audit records
      if (!db.objectStoreNames.contains("donations")) {
        db.createObjectStore("donations", { keyPath: "id" });
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

async function uploadVideoInChunks(videoId: string, blob: Blob, onProgress?: (p: number) => void): Promise<void> {
  if (!hasFirestoreQuota) {
    console.log("Firestore quota exhausted, skipping chunk sync");
    return;
  }
  try {
    const RAW_CHUNK_SIZE = 500 * 1024; // 500KB raw binary size - highly resilient to network flutters & timeouts
    const numChunks = Math.ceil(blob.size / RAW_CHUNK_SIZE);
    
    // Process and dispatch lightweight slices sequentially, yielding execution to keep UI hyper-responsive.
    for (let i = 0; i < numChunks; i++) {
      const start = i * RAW_CHUNK_SIZE;
      const end = Math.min(start + RAW_CHUNK_SIZE, blob.size);
      const slice = blob.slice(start, end);
      
      const chunkData = await blobToBase64(slice);
      const chunkDocRef = doc(db, "global_videos", videoId, "chunks", `chunk_${i}`);
      
      await setDoc(chunkDocRef, {
        index: i,
        data: chunkData
      });
      
      if (onProgress) {
        // Calculate progress from 0 to 100
        const progress = Math.round(((i + 1) / numChunks) * 100);
        onProgress(Math.min(progress, 100));
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes("resource-exhausted")) {
        hasFirestoreQuota = false;
    }
    console.warn("Incremental global video sync paused or deferred:", err);
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

// PREMIUM HIGH-RESOLUTION ANIME ILLUSTRATION FALLBACKS
const PREMIUM_ANIME_FALLBACKS = [
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1560942485-b2a11cc13456?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1617791160505-6f006e121980?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1627672360099-0e3125c150fc?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=250&q=80",
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=250&q=80"
];

/**
 * Fetch a random beautiful anime avatar from several top anime image endpoints recursively,
 * and fall back to custom premium illustrations or SVG seed layouts in case of rate limit or CORS.
 */
export async function getAnyAnimeAvatarUrl(): Promise<string> {
  const apis = [
    async () => {
      const res = await fetch("https://nekos.best/api/v2/nekos?amount=1");
      const data = await res.json();
      if (data?.results?.[0]?.url) return data.results[0].url;
      throw new Error("No url in nekos.best");
    },
    async () => {
      const res = await fetch("https://api.waifu.pics/sfw/waifu");
      const data = await res.json();
      if (data?.url) return data.url;
      throw new Error("No url in waifu.pics");
    },
    async () => {
      const res = await fetch("https://api.catboys.com/img");
      const data = await res.json();
      if (data?.url) return data.url;
      throw new Error("No url in catboys");
    }
  ];

  // Randomize endpoint order to balance API loads
  const shuffledApis = [...apis].sort(() => Math.random() - 0.5);
  for (const apiCall of shuffledApis) {
    try {
      const url = await apiCall();
      if (url) return url;
    } catch (e) {
      console.warn("One anime api fetch failed, selecting other...", e);
    }
  }

  // Double backup in case of connectivity errors
  const seed = Math.floor(Math.random() * 10000);
  const fallbacks = [
    `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`,
    `https://robohash.org/${seed}?set=set5`,
    PREMIUM_ANIME_FALLBACKS[Math.floor(Math.random() * PREMIUM_ANIME_FALLBACKS.length)]
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Permanently delete a User's account details from both high-speed Local IndexedDB
 * and Firestore globally.
 */
export async function deleteProfileFromDb(email: string): Promise<void> {
  // Wipe from IndexedDB
  const localDb = await openDB();
  const tx = localDb.transaction("profiles", "readwrite");
  const store = tx.objectStore("profiles");
  store.delete(email);

  // Wipe from global Firestore profiles collection
  try {
    const docRef = doc(db, "profiles", email);
    await deleteDoc(docRef);
  } catch (err) {
    console.error("Firestore Profile Wipe failed:", err);
  }

  // Wipe account from Firebase Auth
  const currentUser = auth.currentUser;
  if (currentUser && currentUser.email === email) {
    try {
      await currentUser.delete();
    } catch (err) {
      console.warn("Auth user delete failed. Account is wiped from databases, signing out.", err);
      await signOut(auth);
    }
  }
}

// Global Firestore sync state
let hasFirestoreQuota = true;

// Add a simple in-memory cache to skip Firestore writes if the profile hasn't changed.
let lastSavedProfile = new Map<string, string>(); // email -> JSON.stringify(profile)

export async function getUserCount(): Promise<number> {
  try {
    const collRef = collection(db, "profiles");
    const snap = await getDocs(collRef);
    return snap.size;
  } catch (err) {
    console.warn("Could not fetch user count from remote, defaulting to 0:", err);
    return 0;
  }
}

// Profile Sync functions
export async function saveProfile(profile: UserProfile): Promise<void> {
  // Save locally
  try {
    const localDb = await openDB();
    await new Promise<void>((resolve, reject) => {
      let tx;
      try {
        tx = localDb.transaction("profiles", "readwrite");
        tx.objectStore("profiles").put(profile);
      } catch (err) {
        return reject(err);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (localErr) {
    console.error("IndexedDB save failed:", localErr);
  }

  // Deduplication check: compare with last saved state
  const profileKey = profile.email;
  const currentSerialized = JSON.stringify(profile);
  if (lastSavedProfile.get(profileKey) === currentSerialized) {
    return; // No changes, skip Firestore network requests
  }

  // Save globally in Firestore profiles collection
  try {
    const docRef = doc(db, "profiles", profile.email);
    await setDoc(docRef, { ...profile });

    // Update cache
    lastSavedProfile.set(profileKey, currentSerialized);

    // Cascade profile changes to user's videos in global_videos safely
    try {
      const collRef = collection(db, "global_videos");
      const q = query(collRef, where("creator.email", "==", profile.email));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach(docSnap => {
          batch.update(doc(db, "global_videos", docSnap.id), {
            creator: profile
          });
        });
        await batch.commit();
      }
    } catch (ve) {
      console.warn("Could not cascade profile update to videos:", ve);
    }
  } catch (err: any) {
    if (err.message && err.message.includes("resource-exhausted")) {
      console.warn("Firestore quota used, synced locally.", err);
    }
    console.warn("Firestore profile synchronization postponed, but details are safely saved inside client IndexedDB:", err);
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
export async function saveVideo(video: Video, videoBlob?: Blob, onProgress?: (p: number) => void): Promise<void> {
  // Save locally in IndexedDB first (completes instantly, <10ms, working and available 100% offline)
  const localDb = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = localDb.transaction("videos", "readwrite");
    const store = tx.objectStore("videos");
    const dataToSave = {
      ...video,
      blob: videoBlob || video.blob
    };
    store.put(dataToSave);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Sync index metadata to Firestore
  const creatorObj = {
    username: video.creator.username || "",
    email: video.creator.email || "",
    channelName: video.creator.channelName || "",
    channelUrl: video.creator.channelUrl || "",
    bio: video.creator.bio || "",
    avatarUrl: video.creator.avatarUrl || getRandomAnimeAvatar(video.creator.username),
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
    thumbnailUrl: video.thumbnailUrl || "",
    hasVideoData: !!videoBlob || !!video.blob
  };

  if (hasFirestoreQuota) {
    try {
      const docRef = doc(db, "global_videos", video.id);
      await setDoc(docRef, videoToSave);
      
      // Delegate the heavy chunk transmission without awaiting, to keep UI hyper-responsive
      const blobToUpload = videoBlob || video.blob;
      if (blobToUpload) {
        uploadVideoInChunks(video.id, blobToUpload, onProgress).catch(e => console.warn("Background chunk upload issue:", e));
      }
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        hasFirestoreQuota = false;
      }
      console.warn("Firestore video synchronization failed:", err);
      throw err; // Ensure the caller knows it failed
    }
  }
}

export function subscribeAllVideos(callback: (videos: Video[]) => void): () => void {
  const collRef = collection(db, "global_videos");
  return onSnapshot(collRef, async (snap) => {
    const remoteVideos: Video[] = [];
    snap.forEach(docSnap => {
      const dv = docSnap.data();
      remoteVideos.push({
        id: dv.id,
        title: dv.title,
        description: dv.description,
        videoUrl: dv.videoUrl || "",
        category: dv.category || "normal",
        rentalPrice: dv.rentalPrice,
        rentalPeriod: dv.rentalPeriod,
        is360: dv.is360,
        uploadDate: dv.uploadDate,
        creator: dv.creator,
        views: dv.views || 0,
        likes: dv.likes || 0,
        dislikes: dv.dislikes || 0,
        reactions: dv.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
        duration: dv.duration || 120,
        thumbnailUrl: dv.thumbnailUrl || "",
        country: dv.country || "philippines"
      });
    });

    try {
      const localDb = await openDB();
      const cachedDbVideos: Video[] = await new Promise((resolve, reject) => {
        const tx = localDb.transaction("videos", "readonly");
        const req = tx.objectStore("videos").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

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

      const mergedVideosMap = new Map<string, Video>();
      
      remoteVideos.forEach(v => {
        const local = cachedMap.get(v.id);
        if (local) {
          v.isOffline = true;
          v.videoUrl = local.videoUrl;
          v.blob = local.blob;
        }
        mergedVideosMap.set(v.id, v);
      });

      cachedDbVideos.forEach(v => {
        if (!mergedVideosMap.has(v.id)) {
          mergedVideosMap.set(v.id, v);
        }
      });

      // Sort with newest uploads first
      const items = Array.from(mergedVideosMap.values());
      items.sort((a, b) => b.id.localeCompare(a.id));
      
      callback(items);
    } catch (err) {
      console.warn("Merge local with remote failed in subscription:", err);
      remoteVideos.sort((a, b) => b.id.localeCompare(a.id));
      callback(remoteVideos);
    }
  }, (err) => {
    console.warn("Realtime videos subscription issue:", err);
  });
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
        duration: dv.duration || 120,
        thumbnailUrl: dv.thumbnailUrl || ""
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

  // Local delete in IndexedDB (prioritized for immediate responsiveness)
  try {
    const localDb = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = localDb.transaction("videos", "readwrite");
      tx.objectStore("videos").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (localErr) {
    console.warn("Local IndexedDB video deletion bypass or warning:", localErr);
  }

  // Remote Firestore delete (non-blocking so slow network / rule restrictions never hand/freeze the active UI)
  deleteDoc(doc(db, "global_videos", id)).catch(err => {
    console.error("Could not delete from global network:", err);
  });
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
    avatarUrl: comment.avatarUrl || getRandomAnimeAvatar(comment.username),
    text: comment.text,
    timestamp: comment.timestamp || new Date().toISOString(),
    likes: comment.likes || 0
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("comments", "readwrite");
  tx.objectStore("comments").put(comment);

  // Global write
  if (hasFirestoreQuota) {
    try {
      const docRef = doc(db, "global_videos", comment.videoId, "comments", comment.id);
      await setDoc(docRef, cleanedComment);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        hasFirestoreQuota = false;
      }
      console.warn("Firestore comment synchronization postponed, active on local browser:", err);
    }
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
}

export function subscribeVideoComments(videoId: string, callback: (comments: Comment[]) => void): () => void {
  const collRef = collection(db, "global_videos", videoId, "comments");
  const q = query(collRef, orderBy("timestamp", "desc"));
  
  return onSnapshot(q, (snap) => {
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
    callback(result);
  }, (err) => {
    console.warn("Real-time comment subscription issue:", err);
  });
}

// Subscription & Follower Logic
export async function toggleSubscription(followerEmail: string, followedEmail: string): Promise<boolean> {
  if (followerEmail === followedEmail) return false;
  
  const subId = `${followerEmail}_follows_${followedEmail}`;
  const subRef = doc(db, "subscriptions", subId);
  const profileRef = doc(db, "profiles", followedEmail);
  
  try {
    const subSnap = await getDoc(subRef);
    const batch = writeBatch(db);
    
    let isNowSubscribed = false;
    
    if (subSnap.exists()) {
      // Unsubscribe
      batch.delete(subRef);
      batch.update(profileRef, {
        subscribersCount: increment(-1)
      });
      isNowSubscribed = false;
    } else {
      // Subscribe
      batch.set(subRef, {
        followerEmail,
        followedEmail,
        timestamp: new Date().toISOString()
      });
      batch.update(profileRef, {
        subscribersCount: increment(1)
      });
      isNowSubscribed = true;
    }
    
    await batch.commit();
    return isNowSubscribed;
  } catch (err) {
    console.error("Failed to toggle subscription:", err);
    throw err;
  }
}

export async function checkSubscriptionStatus(followerEmail: string, followedEmail: string): Promise<boolean> {
  const subId = `${followerEmail}_follows_${followedEmail}`;
  const subRef = doc(db, "subscriptions", subId);
  try {
    const subSnap = await getDoc(subRef);
    return subSnap.exists();
  } catch (err) {
    console.warn("Could not check subscription status:", err);
    return false;
  }
}

// Group Membership Logic
export async function toggleGroupMembership(email: string, groupId: string): Promise<boolean> {
  const membershipId = `${email}_in_${groupId}`;
  const membershipRef = doc(db, "group_memberships", membershipId);
  
  try {
    const memSnap = await getDoc(membershipRef);
    if (memSnap.exists()) {
      await deleteDoc(membershipRef);
      return false;
    } else {
      await setDoc(membershipRef, {
        email,
        groupId,
        joinedAt: new Date().toISOString()
      });
      return true;
    }
  } catch (err) {
    console.error("Failed to toggle group membership:", err);
    throw err;
  }
}

export async function checkGroupStatus(email: string, groupId: string): Promise<boolean> {
  const membershipId = `${email}_in_${groupId}`;
  const membershipRef = doc(db, "group_memberships", membershipId);
  try {
    const memSnap = await getDoc(membershipRef);
    return memSnap.exists();
  } catch (err) {
    console.warn("Could not check group status:", err);
    return false;
  }
}

// Discord Messages Sync functions (global community chats)
export async function saveDiscordMessage(msg: DiscordMessage): Promise<void> {
  const cleanMsg = {
    id: msg.id,
    username: msg.username,
    avatarUrl: msg.avatarUrl || getRandomAnimeAvatar(msg.username),
    text: msg.text,
    timestamp: msg.timestamp || new Date().toISOString()
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("messages", "readwrite");
  tx.objectStore("messages").put(msg);

  // Global write
  if (hasFirestoreQuota) {
    try {
      const docRef = doc(db, "discord_messages", msg.id);
      await setDoc(docRef, cleanMsg);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        hasFirestoreQuota = false;
      }
      console.warn("Firestore Discord message synchronization postponed, available offline:", err);
    }
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

// Custom Playlist Firestore and offline handlers
export async function createPlaylist(name: string, ownerEmail: string): Promise<Playlist> {
  const newPlaylist: Playlist = {
    id: "pl_" + Math.random().toString(36).substring(2, 11),
    name,
    ownerEmail,
    videoIds: [],
    createdAt: new Date().toISOString()
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("playlists", "readwrite");
  tx.objectStore("playlists").put(newPlaylist);

  // Global write
  if (hasFirestoreQuota) {
    try {
      const docRef = doc(db, "playlists", newPlaylist.id);
      await setDoc(docRef, newPlaylist);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        hasFirestoreQuota = false;
      }
      console.warn("Firestore playlist creation postoned, saved locally:", err);
    }
  }

  return newPlaylist;
}

export async function getPlaylistsByOwner(ownerEmail: string): Promise<Playlist[]> {
  const remotePlaylists: Playlist[] = [];
  try {
    const collRef = collection(db, "playlists");
    const snap = await getDocs(collRef);
    snap.forEach(docSnap => {
      const data = docSnap.data() as Playlist;
      if (data.ownerEmail === ownerEmail) {
        remotePlaylists.push(data);
      }
    });
  } catch (err) {
    console.warn("Failed fetching remote playlists, using local:", err);
  }

  // Local fallback
  const localDb = await openDB();
  const localPlaylists: Playlist[] = await new Promise((resolve, reject) => {
    const tx = localDb.transaction("playlists", "readonly");
    const req = tx.objectStore("playlists").getAll();
    req.onsuccess = () => {
      const all: Playlist[] = req.result || [];
      resolve(all.filter(p => p.ownerEmail === ownerEmail));
    };
    req.onerror = () => reject(req.error);
  });

  // Sync / merge
  const merged = new Map<string, Playlist>();
  remotePlaylists.forEach(p => merged.set(p.id, p));
  localPlaylists.forEach(p => {
    if (!merged.has(p.id)) {
      merged.set(p.id, p);
    }
  });

  return Array.from(merged.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updatePlaylist(playlist: Playlist): Promise<void> {
  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("playlists", "readwrite");
  tx.objectStore("playlists").put(playlist);

  // Global write
  if (hasFirestoreQuota) {
    try {
      const docRef = doc(db, "playlists", playlist.id);
      await setDoc(docRef, playlist);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        hasFirestoreQuota = false;
      }
      console.warn("Firestore playlist update postponed, saved locally:", err);
    }
  }
}

export async function deletePlaylist(id: string): Promise<void> {
  // Local delete
  const localDb = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = localDb.transaction("playlists", "readwrite");
    tx.objectStore("playlists").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Remote delete
  try {
    await deleteDoc(doc(db, "playlists", id));
  } catch (err) {
    console.error("Could not delete playlist from remote network:", err);
  }
}

// Transparent Volunteer Donation Seed and live handlers
const SEED_DONATIONS: DonationRecord[] = [
  {
    id: "don_seed_1",
    donorName: "Mico-chan 🌸",
    amount: 150.00,
    message: "Thank you for the amazing streaming station! Sending part of this to the Hope Charity Drive! Support the community! 💖",
    target: "charity",
    timestamp: "2026-05-15T12:00:00.000Z"
  },
  {
    id: "don_seed_2",
    donorName: "Keisuke VT",
    amount: 250.00,
    message: "A tiny seed for St. Michael Parish Church rebuilding fund. Blessings to everyone sharing their talents!",
    target: "church",
    timestamp: "2026-05-20T04:20:00.000Z"
  },
  {
    id: "don_seed_3",
    donorName: "Anonymous Cozy Friend",
    amount: 80.00,
    message: "To keep the cozy theater servers running smoothly! Love what you do for local families in need.",
    target: "people",
    timestamp: "2026-05-28T18:15:00.000Z"
  },
  {
    id: "don_seed_4",
    donorName: "Nyan-Power!",
    amount: 120.00,
    message: "Awesome stream, please buy yourself some milktea and treat the team! 🍦Support Vtuber usagyuunvtuber!",
    target: "owner",
    timestamp: "2026-06-02T09:30:00.000Z"
  }
];

export async function createDonationRecord(
  donorName: string, 
  amount: number, 
  message: string, 
  target: "owner" | "charity" | "church" | "people"
): Promise<DonationRecord> {
  const newDonation: DonationRecord = {
    id: "don_" + Math.random().toString(36).substring(2, 11),
    donorName: donorName.trim() || "Anonymous Friend",
    amount: Number(amount) || 10,
    message: message.trim() || "Supporting our cozy community watchtower!",
    target,
    timestamp: new Date().toISOString()
  };

  // Local write
  const localDb = await openDB();
  const tx = localDb.transaction("donations", "readwrite");
  tx.objectStore("donations").put(newDonation);

  // Global write
  if (hasFirestoreQuota) {
    try {
      const docRef = doc(db, "donations", newDonation.id);
      await setDoc(docRef, newDonation);
    } catch (err: any) {
      if (err.message && err.message.includes("resource-exhausted")) {
        hasFirestoreQuota = false;
      }
      console.warn("Firestore donation record synchronization postponed, saved locally:", err);
    }
  }

  return newDonation;
}

export async function getAllDonations(): Promise<DonationRecord[]> {
  const remoteDonations: DonationRecord[] = [];
  try {
    const collRef = collection(db, "donations");
    const snap = await getDocs(collRef);
    snap.forEach(docSnap => {
      remoteDonations.push(docSnap.data() as DonationRecord);
    });
  } catch (err) {
    console.warn("Failed fetching remote donations:", err);
  }

  // Local fallback
  const localDb = await openDB();
  const localDonations: DonationRecord[] = await new Promise((resolve, reject) => {
    const tx = localDb.transaction("donations", "readonly");
    const req = tx.objectStore("donations").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  // Sync / merge
  const merged = new Map<string, DonationRecord>();
  
  // Set default initial seeds
  SEED_DONATIONS.forEach(d => merged.set(d.id, d));
  
  // Overlay remote and local writes
  remoteDonations.forEach(d => merged.set(d.id, d));
  localDonations.forEach(d => merged.set(d.id, d));

  return Array.from(merged.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function computeDonationStats(donations: DonationRecord[]): DonationStats {
  const stats: DonationStats = {
    totalAmountRaised: 0,
    totalDonationCount: donations.length,
    targetDistribution: {
      owner: 0,
      charity: 0,
      church: 0,
      people: 0
    }
  };

  donations.forEach(d => {
    stats.totalAmountRaised += d.amount;
    if (d.target in stats.targetDistribution) {
      stats.targetDistribution[d.target] += d.amount;
    }
  });

  return stats;
}


