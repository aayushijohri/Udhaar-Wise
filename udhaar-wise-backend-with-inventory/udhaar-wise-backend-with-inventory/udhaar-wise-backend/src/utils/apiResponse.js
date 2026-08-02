/**
 * Thin helpers matching the {success, message, data} shape already used
 * throughout authController / aiController / voiceController / whatsappController.
 * Not a new response convention — just avoids repeating the same object shape.
 */

export function ok(res, data, message = "OK", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function fail(res, message = "Something went wrong", status = 400, extra = {}) {
  return res.status(status).json({ success: false, message, ...extra });
}
