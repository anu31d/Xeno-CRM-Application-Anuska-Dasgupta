import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.resolve(__dirname, "../firebase-applet-config.json");

if (!fs.existsSync(configPath)) {
  console.log("⚠️  firebase-applet-config.json not found! Creating a placeholder for the build...");
  const placeholderConfig = {
    projectId: "placeholder-id",
    appId: "placeholder-appid",
    apiKey: "placeholder-apikey",
    authDomain: "placeholder-authdomain",
    firestoreDatabaseId: "placeholder-databaseid",
    storageBucket: "placeholder-storagebucket",
    messagingSenderId: "placeholder-messaging-id",
    measurementId: ""
  };
  fs.writeFileSync(configPath, JSON.stringify(placeholderConfig, null, 2), "utf-8");
  console.log("✅ Created placeholder firebase-applet-config.json");
} else {
  console.log("✅ Existing firebase-applet-config.json found.");
}
