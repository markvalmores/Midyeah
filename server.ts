import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Gemini Initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing screenshot image" });
      }

      const prompt = `Analyze this GCash screenshot for a successful payment.
  Verify the following details:
  1. Amount sent must be at least 150.00 pesos.
  2. The recipient number must be exactly 09763329358.
  3. The recipient name must be "Mark David Valmores" (or "MARK DAVID V." as shown in common GCash receipts).
  4. A valid Reference No. must be visible.

  Respond with a JSON object:
  {
    "verified": boolean,
    "reason": "Brief explanation if not verified",
    "amount": number,
    "refNo": "string",
    "date": "string",
    "isMonthly": boolean
  }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: image.split(",")[1] || image,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              verified: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              refNo: { type: Type.STRING },
              date: { type: Type.STRING },
              isMonthly: { type: Type.BOOLEAN },
            },
            required: ["verified", "reason"],
          },
        },
      });

      const result = JSON.parse(response.text);
      res.json(result);
    } catch (error: any) {
      console.error("Verification error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
