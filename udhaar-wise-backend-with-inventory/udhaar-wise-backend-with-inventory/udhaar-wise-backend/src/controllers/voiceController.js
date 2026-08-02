import { transcribeAudio } from "../services/whisperService.js";
import { parseOrder } from "../services/aiService.js";


export async function parseVoice(req, res) {
  try {
    const transcript = await transcribeAudio(req.file.path);

    const order = await parseOrder(transcript);

    res.json({
      success: true,
      transcript,
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}