import { google } from "googleapis";
import { env } from "../config/env.js";

function getAuth() {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Configuration Google Drive incomplète.");
  }

  return new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.file"]
  });
}

export async function uploadFileToDrive(fileName: string, fileContent: Buffer, mimeType: string) {
  if (!env.GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID manquant.");
  }

  const drive = google.drive({ version: "v3", auth: getAuth() });
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [env.GOOGLE_DRIVE_FOLDER_ID]
    },
    media: {
      mimeType,
      body: Buffer.from(fileContent)
    },
    fields: "id,name"
  });

  return response.data;
}
