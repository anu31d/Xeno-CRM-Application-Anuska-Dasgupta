import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function runTest() {
  try {
    console.log("Fetching chat_messages collection (no query)...");
    const snap = await getDocs(collection(db, "chat_messages"));
    console.log("Success! size:", snap.size);
    snap.forEach(doc => {
      console.log(doc.id, doc.data());
    });
  } catch (err: any) {
    console.error("Plain getDocs failed:", err);
    console.error("Stack:", err.stack);
  }
}

runTest();
