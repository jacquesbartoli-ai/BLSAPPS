import cron from "node-cron";
import { performBackupNow } from "../services/backup.service.js";

const scheduleExpressions = ["0 10 * * *", "0 12 * * *", "0 17 * * *"];

export function registerBackupJobs() {
  for (const expression of scheduleExpressions) {
    cron.schedule(expression, async () => {
      await performBackupNow();
    });
  }
}
