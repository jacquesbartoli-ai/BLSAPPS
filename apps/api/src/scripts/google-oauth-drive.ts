import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config({ path: "../../.env" });
dotenv.config();

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} est requis dans .env`);
  }
  return value;
}

const clientId = required("GOOGLE_OAUTH_CLIENT_ID");
const clientSecret = required("GOOGLE_OAUTH_CLIENT_SECRET");
const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "http://localhost";

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

async function main() {
  const mode = process.argv[2];

  if (mode === "url") {
    const url = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive.file"]
    });
    console.log(url);
    return;
  }

  if (mode === "exchange") {
    const code = process.argv[3];
    if (!code) {
      throw new Error("Usage: tsx src/scripts/google-oauth-drive.ts exchange \"<authorization_code>\"");
    }
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Aucun refresh_token reçu. Relancer avec prompt=consent et vérifier que l'accès n'a pas déjà été accordé."
      );
    }

    console.log("GOOGLE_OAUTH_REFRESH_TOKEN=");
    console.log(tokens.refresh_token);
    return;
  }

  console.log("Usage:");
  console.log("  npm run google:oauth:url --workspace @bartoli/api");
  console.log(
    "  npm run google:oauth:exchange --workspace @bartoli/api -- \"<authorization_code>\""
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
