
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured." });
  }

  const { question, context, grade } = req.body || {};

  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "Enter a question." });
  }

  const prompt = `You are STUDENT OS, a friendly school study assistant.
Explain clearly for a ${grade || "school"} student.
Use simple language and examples.
Textbook context: ${String(context || "").slice(0, 12000)}
Question: ${question.trim().slice(0, 4000)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
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
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const answer = data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "").join("\n");

        return res.status(200).json({
          answer: answer || "No answer received."
        });
      }

      if (response.status !== 503 && response.status !== 429) {
        return res.status(502).json({
          error: "Gemini request failed. Please try again later."
        });
      }
    } catch (error) {
      if (attempt === 2) {
        return res.status(500).json({
          error: "Unable to connect to Gemini."
        });
      }
    }

    if (attempt < 2) {
      await new Promise(resolve =>
        setTimeout(resolve, 1000 * (2 ** attempt))
      );
    }
  }

  return res.status(503).json({
    error: "Gemini is busy. Please try again shortly."
  });
}
