import { groq } from "../config/groq.js";
import fs from "fs";

export async function transcribeAudio(filePath) {
  const transcription = await groq.audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: "whisper-large-v3",
    
    response_format: "text",
  });

  return transcription;
}