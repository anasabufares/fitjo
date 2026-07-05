/* =============================================================
   FitJo — AI "are you at the gym?" photo check (Netlify function)
   -------------------------------------------------------------
   For photo check-in points: receives a photo and asks Claude
   whether it looks like it was taken inside a fitness gym.
   Returns { inGym: boolean, confidence: number }.

   DORMANT until ANTHROPIC_API_KEY is set in Netlify — the app falls
   back to demo (accept) if this isn't configured. See AI-SETUP.md.
   The API key lives only here (server), never in the app.
   ============================================================= */

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST" }) };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 501, body: JSON.stringify({ error: "AI not configured" }) };
  }

  let image_base64, mime;
  try {
    ({ image_base64, mime } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }
  if (!image_base64) return { statusCode: 400, body: JSON.stringify({ error: "Missing image_base64" }) };
  const media_type = ALLOWED.includes(mime) ? mime : "image/jpeg";

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // fast & cheap for a yes/no vision check
      max_tokens: 256,
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              inGym: { type: "boolean" },
              confidence: { type: "number" },
              reason: { type: "string" },
            },
            required: ["inGym", "confidence"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data: image_base64 } },
            {
              type: "text",
              text:
                "Does this photo appear to be taken inside a fitness gym — weights, resistance machines, " +
                "cardio equipment, or a clear gym interior? Set inGym=true only if you are reasonably sure it " +
                "is a gym. confidence is 0-100. reason: under 8 words.",
            },
          ],
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text")?.text || "{}";
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: text };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: "AI verification failed", detail: String((err && err.message) || err) }) };
  }
};
