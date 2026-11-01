
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Gemini API key is not configured."
    });
  }

  const { question, context, grade } = req.body || {};

  if (typeof question !== "string" ||
      !question.trim() ||
      question.length > 4000) {
    return res.status(400).json({
      error: "Please enter a valid question."
    });
  }

  const prompt = `
You are STUDENT OS, a friendly school study assistant.
Explain concepts clearly and simply for a ${grade || "school"} student.
Use the provided textbook context when available.
Do not invent textbook quotations or claim a fact comes from a book
unless it is supported by the supplied context.

Textbook context:
${String(context || "No textbook context supplied").slice(0, 12000)}

Student question:
${question.trim()}
`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return res.status(502).json({
        error: "Gemini could not answer. Please try again."
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n");

    if (!answer) {
      return res.status(502).json({
        error: "No answer was returned."
      });
    }

    return res.status(200).json({ answer });

  } catch (error) {
    console.error("AI request failed:", error.message);
    return res.status(500).json({
      error: "Unable to connect to Gemini."
    });
  }
}
