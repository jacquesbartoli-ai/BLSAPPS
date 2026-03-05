import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { registerBackupJobs } from "./jobs/backup.cron.js";

const app = createApp();

registerBackupJobs();

app.listen(env.API_PORT, () => {
  console.log(`API démarrée sur le port ${env.API_PORT}`);
  console.log(`Chemin secret actif: /${env.APP_SECRET_PATH}`);
});
