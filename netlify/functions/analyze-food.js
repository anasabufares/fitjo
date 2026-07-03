/* =============================================================
   FitJo — real AI food-photo analyzer (Netlify serverless function)
   -------------------------------------------------------------
   This is the "real AI" brain for the calorie tracker. It is DORMANT
   until you deploy it and point the app at it — the app works fully
   in demo mode without it. See AI-SETUP.md for the 3-step turn-on.

   It receives a food photo, asks Claude to identify the food and
   estimate its nutrients, and returns JSON the app understands:
     { items: [{ name, kcal, protein, carbs, fat }], confidence }

   The Anthropic API key lives ONLY here (a server), never in the app,
   so it is never exposed to visitors.
   ============================================================= */

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

// Only these image types are accepted by the vision API.
const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Use POST" }) };
  }

  let image_base64, mime;
  try {
    ({ image_base64, mime } = JSON.parse(event.body || "{}"));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }
  if (!image_base64) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing image_base64" }) };
  }
  const media_type = ALLOWED.includes(mime) ? mime : "image/jpeg";

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8", // swap to "claude-haiku-4-5" for lower cost per photo
      max_tokens: 1024,
      // Guarantee valid JSON in the shape the app expects.
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    kcal: { type: "number" },
                    protein: { type: "number" },
                    carbs: { type: "number" },
                    fat: { type: "number" },
                  },
                  required: ["name", "kcal", "protein", "carbs", "fat"],
                  additionalProperties: false,
                },
              },
              confidence: { type: "number" },
            },
            required: ["items", "confidence"],
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
                "Identify the food in this photo and estimate its nutrition for the portion shown. " +
                "Return each distinct food as an item with name (short, e.g. \"Chicken shawarma\"), " +
                "kcal, protein (g), carbs (g), and fat (g). confidence is 0-100. " +
                "If you cannot tell it is food, return an empty items array and confidence 0.",
            },
          ],
        },
      ],
    });

    // output_config.format guarantees the first text block is valid JSON.
    const text = response.content.find((b) => b.type === "text")?.text || "{}";
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: text, // already { items: [...], confidence } — matches the app's normalizeAI()
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "AI analysis failed", detail: String(err && err.message || err) }),
    };
  }
};
