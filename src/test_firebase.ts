import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch, increment, getDoc } from "firebase/firestore";

// Get user email
const userEmail = "mdv4244@gmail.com";
// Firebase project from previous files:
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDummy",
  projectId: "ai-studio-c932a2d9-7a47-482f-ac97-08800147c8ad",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
     console.log("Database ID:", db.app.options.projectId);
  } catch(e) {
     console.error(e);
  }
}

run();
