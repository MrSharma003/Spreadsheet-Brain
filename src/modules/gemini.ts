import { GoogleGenAI } from "@google/genai";

let genai: GoogleGenAI;

export function initGemini() {
  genai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY!});
}

export function getGemini(prompt: string) {
  if (!genai) throw new Error("Gemini not initialized");
  return genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt
  });
}
