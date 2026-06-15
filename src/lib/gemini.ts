import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment. Please configure it in the Secrets panel.");
}

// Initializing the modern Google GenAI SDK with headers
export const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Configure standard model selection
export const GEMINI_MODEL = "gemini-3.5-flash";
