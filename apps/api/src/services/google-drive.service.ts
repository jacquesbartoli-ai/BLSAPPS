import { google } from "googleapis";
import { env } from "../config/env.js";

function getAuth() {
  if (env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY) {
    return new google.auth.JWT({
      email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.readonly"
      ]
    });
  }

  if (
    env.GOOGLE_OAUTH_CLIENT_ID &&
    env.GOOGLE_OAUTH_CLIENT_SECRET &&
    (env.GOOGLE_OAUTH_REFRESH_TOKEN || env.GOOGLE_OAUTH_ACCESS_TOKEN)
  ) {
    const oauth2 = new google.auth.OAuth2(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URI
    );
    oauth2.setCredentials({
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
      access_token: env.GOOGLE_OAUTH_ACCESS_TOKEN
    });
    return oauth2;
  }

  throw new Error(
    "Configuration Google Drive incomplète. Fournir soit un service account, soit OAuth client + refresh/access token."
  );
}

async function getAccessToken() {
  const auth = getAuth();
  const tokenResult = await auth.getAccessToken();
  const token = typeof tokenResult === "string" ? tokenResult : tokenResult?.token;
  if (!token) {
    throw new Error("Impossible d'obtenir un access token Google Drive.");
  }
  return token;
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

export async function listFilesInDriveFolder(folderId: string) {
  const token = await getAccessToken();
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,size,createdTime)`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Drive list error HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      createdTime?: string;
    }>;
  };

  return payload.files ?? [];
}

export async function downloadDriveFile(fileId: string) {
  const token = await getAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Drive download error HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
