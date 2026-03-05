import { google } from "googleapis";
import { env } from "../config/env.js";

function getAuth() {
  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.JWT({
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive.file"]
    });
  }

  if (
    env.GOOGLE_OAUTH_CLIENT_ID &&
    env.GOOGLE_OAUTH_CLIENT_SECRET &&
    env.GOOGLE_OAUTH_REFRESH_TOKEN
  ) {
    const oauth2 = new google.auth.OAuth2(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URI
    );
    oauth2.setCredentials({
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN
    });
    return oauth2;
  }

  throw new Error(
    "Configuration Google Drive incomplète. Fournir soit un service account, soit OAuth client + refresh token."
  );
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
