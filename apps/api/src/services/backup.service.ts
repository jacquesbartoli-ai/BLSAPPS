import { promisify } from "node:util";
import { exec } from "node:child_process";
import dayjs from "dayjs";
import { prisma } from "../lib/prisma.js";
import { uploadFileToDrive } from "./google-drive.service.js";

const execAsync = promisify(exec);

export async function performBackupNow() {
  const backup = await prisma.backupLog.create({
    data: {
      status: "failed",
      message: "Backup démarré."
    }
  });

  try {
    const fileName = `backup-${dayjs().format("YYYYMMDD-HHmmss")}.sql`;
    const { stdout } = await execAsync("pg_dump \"$DATABASE_URL\"", {
      env: process.env,
      maxBuffer: 20 * 1024 * 1024
    });

    const upload = await uploadFileToDrive(fileName, Buffer.from(stdout, "utf8"), "application/sql");
    return prisma.backupLog.update({
      where: { id: backup.id },
      data: {
        finishedAt: new Date(),
        status: "success",
        fileName,
        driveFileId: upload.id ?? undefined,
        message: "Backup envoyé vers Google Drive."
      }
    });
  } catch (error) {
    return prisma.backupLog.update({
      where: { id: backup.id },
      data: {
        finishedAt: new Date(),
        status: "failed",
        message: error instanceof Error ? error.message : "Erreur inconnue backup."
      }
    });
  }
}
