import { env } from "../../config/env.js";

type VisionAnnotateResponse = {
  responses?: Array<{
    fullTextAnnotation?: {
      text?: string;
    };
    error?: {
      message?: string;
    };
  }>;
};

export async function extractTextWithGoogleVision(base64Content: string) {
  if (!env.GOOGLE_VISION_API_KEY) {
    throw new Error("GOOGLE_VISION_API_KEY manquante.");
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Content },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Google Vision HTTP ${response.status}`);
  }

  const payload = (await response.json()) as VisionAnnotateResponse;
  const first = payload.responses?.[0];
  if (first?.error?.message) {
    throw new Error(`Google Vision error: ${first.error.message}`);
  }

  return first?.fullTextAnnotation?.text ?? "";
}
