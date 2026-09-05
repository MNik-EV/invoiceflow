import { PrismaClient, Role } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const users: ReadonlyArray<{
  name: string;
  usernameEnv?: string;
  fallback: string;
  role: Role;
  email: string;
}> = [
  {
    name: "مدیر کل سامانه",
    usernameEnv: "SEED_SUPER_ADMIN_USERNAME",
    fallback: "superadmin",
    role: Role.SUPER_ADMIN,
    email: "superadmin@example.local",
  },
  {
    name: "مدیر مالی",
    usernameEnv: "SEED_FINANCE_ADMIN_USERNAME",
    fallback: "financeadmin",
    role: Role.FINANCE_ADMIN,
    email: "financeadmin@example.local",
  },
  {
    name: "داوود",
    fallback: "davood",
    role: Role.USER,
    email: "davood@example.local",
  },
  {
    name: "مژگان",
    fallback: "mozhgan",
    role: Role.USER,
    email: "mozhgan@example.local",
  },
  {
    name: "بهداد",
    fallback: "behdad",
    role: Role.USER,
    email: "behdad@example.local",
  },
  {
    name: "سارا",
    fallback: "sara",
    role: Role.USER,
    email: "sara@example.local",
  },
];

async function main() {
  const password = process.env.SEED_DEFAULT_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      "SEED_DEFAULT_PASSWORD must be set and contain at least 12 characters",
    );
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const createdUsers = [];
  for (const definition of users) {
    const username =
      (definition.usernameEnv
        ? process.env[definition.usernameEnv]
        : undefined) ?? definition.fallback;
    const normalizedUsername = username.trim().toLocaleLowerCase("en-US");
    const normalizedEmail = definition.email.toLocaleLowerCase("en-US");
    const user = await prisma.user.upsert({
      where: { normalizedUsername },
      create: {
        name: definition.name,
        username,
        normalizedUsername,
        email: definition.email,
        normalizedEmail,
        passwordHash,
        role: definition.role,
      },
      update: {
        name: definition.name,
        email: definition.email,
        normalizedEmail,
        role: definition.role,
        isActive: true,
      },
    });
    createdUsers.push(user);
  }

  const superAdmin = createdUsers.find(
    (user) => user.role === Role.SUPER_ADMIN,
  );
  if (!superAdmin) throw new Error("Super admin seed failed");

  const allowance = await prisma.systemSetting.upsert({
    where: { key: "lunch.allowance_toman" },
    create: {
      key: "lunch.allowance_toman",
      value: "350000",
      valueType: "positive_integer_string",
      updatedById: superAdmin.id,
    },
    update: {},
  });

  await prisma.systemSetting.upsert({
    where: { key: "invoice.max_amount_toman" },
    create: {
      key: "invoice.max_amount_toman",
      value: "10000000000",
      valueType: "positive_integer_string",
      updatedById: superAdmin.id,
    },
    update: {},
  });

  const revisionCount = await prisma.settingRevision.count({
    where: { settingId: allowance.id },
  });
  if (revisionCount === 0) {
    await prisma.settingRevision.create({
      data: {
        settingId: allowance.id,
        newValue: "350000",
        changedById: superAdmin.id,
      },
    });
  }

  console.info(
    `Seeded ${createdUsers.length} users and default invoice settings.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
