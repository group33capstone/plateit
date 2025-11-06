// Implementation for the Gemini LLM endpoint
export async function generate(req, ENV = {}) {
  const GOOGLE_API_KEY = ENV.GOOGLE_API_KEY || ENV.GOOGLE_KEY;

  if (!GOOGLE_API_KEY)
    return {
      status: 500,
      body: { error: "Missing GOOGLE_API_KEY in server env" },
    };

  const model = req.body?.model || req.query?.model || "gemini-2.5-flash";
  const payload =
    req.body && req.body.contents
      ? req.body
      : {
          contents: [
            {
              parts: [
                {
                  text: String(
                    req.body?.prompt ||
                      req.body?.text ||
                      req.body?.question ||
                      ""
                  ),
                },
              ],
            },
          ],
        };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;
  const headers = {
    "Content-Type": "application/json",
    "X-goog-api-key": GOOGLE_API_KEY,
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const text = await resp.text().catch(() => "");
    const ct = resp.headers.get("content-type") || "";

    if (!resp.ok)
      return {
        status: resp.status,
        body: { error: `Upstream error ${resp.status}: ${text}` },
      };

    if (ct.includes("application/json"))
      return { status: 200, body: text ? JSON.parse(text) : null };

    return { status: 200, body: { text } };
  } catch (err) {
    console.error("genai error", String(err));
    return { status: 500, body: { error: String(err) } };
  }
}

export default { generate };
