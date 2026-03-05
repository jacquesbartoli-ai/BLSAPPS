import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../services/auth.service.js";

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@bartoli.local";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const fullName = process.env.ADMIN_FULL_NAME ?? "Admin Bartoli";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Utilisateur déjà existant: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role: "admin"
    }
  });

  console.log(`Admin créé: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
