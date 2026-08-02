import * as aiService from "../services/aiService.js";

export async function parseOrder(req, res) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Text is required",
      });
    }

    const order = await aiService.parseOrder(text);

    return res.status(200).json({
        success: true,
        data: order,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
        success: false,
        message: error.message,
    });
  }
}