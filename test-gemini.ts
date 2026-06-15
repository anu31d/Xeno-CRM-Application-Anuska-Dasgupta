import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
console.log("GEMINI_API_KEY prefix:", apiKey ? apiKey.substring(0, 8) + "..." : "undefined");

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Hello",
    });
    console.log("Response successful!", res.text);
  } catch (error: any) {
    console.error("Gemini call failed:", error);
  }
}

run();
