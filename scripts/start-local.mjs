import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const localRoot = path.join(workspaceRoot, ".local");
const databaseDir = path.join(localRoot, "runtime", "postgres-data");
const envPath = path.join(workspaceRoot, ".env");
const envExamplePath = path.join(workspaceRoot, ".env.example");
const obsoleteArchive = path.join(
  localRoot,
  "postgresql-17.11-windows-x64.zip",
);
const setupOnly = process.argv.includes("--setup-only");
const databaseName = "invoice_management";
const databaseUser = "invoice_app";
const databasePort = 55432;

function randomBase64Url(size) {
  return randomBytes(size).toString("base64url");
}

function randomBase64(size) {
  return randomBytes(size).toString("base64");
}

function parseEnv(contents) {
  const result = new Map();
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) result.set(match[1], match[2]);
  }
  return result;
}

function isPlaceholder(value) {
  return !value || /replace|change-me|at-least|base64-encoded/i.test(value);
}

function updateEnv(contents, values) {
  const pending = new Map(Object.entries(values));
  const lines = contents.split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
    if (!match || !pending.has(match[1])) return line;
    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return `${match[1]}=${value}`;
  });
  for (const [key, value] of pending) lines.push(`${key}=${value}`);
  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env: process.env,
      shell: false,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${command} ${args.join(" ")} failed (${signal ?? code}).`),
        );
    });
  });
}

async function prepareEnvironment() {
  await mkdir(localRoot, { recursive: true });
  await mkdir(path.dirname(databaseDir), { recursive: true });
  if (existsSync(obsoleteArchive)) await rm(obsoleteArchive, { force: true });

  const source = existsSync(envPath)
    ? await readFile(envPath, "utf8")
    : await readFile(envExamplePath, "utf8");
  const current = parseEnv(source);
  const databasePassword = isPlaceholder(current.get("POSTGRES_PASSWORD"))
    ? randomBase64Url(24)
    : current.get("POSTGRES_PASSWORD");
  const sessionSecret = isPlaceholder(current.get("SESSION_SECRET"))
    ? randomBase64Url(48)
    : current.get("SESSION_SECRET");
  const bankKey = isPlaceholder(current.get("BANK_ENCRYPTION_KEY"))
    ? randomBase64(32)
    : current.get("BANK_ENCRYPTION_KEY");
  const seedPassword = isPlaceholder(current.get("SEED_DEFAULT_PASSWORD"))
    ? `Iv!${randomBase64Url(15)}`
    : current.get("SEED_DEFAULT_PASSWORD");
  const values = {
    NODE_ENV: "development",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: `postgresql://${databaseUser}:${encodeURIComponent(databasePassword)}@127.0.0.1:${databasePort}/${databaseName}?schema=public`,
    POSTGRES_DB: databaseName,
    POSTGRES_USER: databaseUser,
    POSTGRES_PASSWORD: databasePassword,
    POSTGRES_PORT: String(databasePort),
    SESSION_SECRET: sessionSecret,
    SESSION_COOKIE_NAME: "invoice_session",
    BANK_ENCRYPTION_KEY: bankKey,
    BANK_ENCRYPTION_KEY_ID: "local-dev-v1",
    STORAGE_DRIVER: "local",
    STORAGE_ROOT: "./storage",
    SEED_DEFAULT_PASSWORD: seedPassword,
  };
  await writeFile(envPath, updateEnv(source, values), "utf8");
  Object.assign(process.env, values);
  return values;
}

async function ensureDatabase(postgres) {
  const initialized = existsSync(path.join(databaseDir, "PG_VERSION"));
  if (!initialized) {
    console.log(
      "\n[Invoice] در حال آماده‌سازی PostgreSQL محلی (فقط بار اول)...",
    );
    await postgres.initialise();
  }
  console.log(`[Invoice] راه‌اندازی PostgreSQL روی پورت ${databasePort}...`);
  await postgres.start();

  const client = postgres.getPgClient();
  await client.connect();
  try {
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );
    if (result.rowCount === 0) await postgres.createDatabase(databaseName);
  } finally {
    await client.end();
  }
}

async function recoverFailedBootstrap(postgres) {
  const client = postgres.getPgClient(databaseName);
  await client.connect();
  let shouldRecreate = false;
  try {
    const table = await client.query(
      "SELECT to_regclass('public._prisma_migrations') AS name",
    );
    if (table.rows[0]?.name) {
      const migrations = await client.query(
        'SELECT COUNT(*) FILTER (WHERE finished_at IS NOT NULL) AS successful, COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS failed FROM "_prisma_migrations"',
      );
      shouldRecreate =
        Number(migrations.rows[0]?.successful) === 0 &&
        Number(migrations.rows[0]?.failed) > 0;
    }
  } finally {
    await client.end();
  }
  if (shouldRecreate) {
    console.log(
      "[Invoice] بازسازی دیتابیس محلی پس از bootstrap ناموفق قبلی...",
    );
    await postgres.dropDatabase(databaseName);
    await postgres.createDatabase(databaseName);
  }
}

let postgres;
let nextProcess;
let shuttingDown = false;

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (nextProcess && !nextProcess.killed) nextProcess.kill("SIGTERM");
  if (postgres) await postgres.stop().catch(() => undefined);
  process.exitCode = exitCode;
}

process.once("SIGINT", () => void shutdown(0));
process.once("SIGTERM", () => void shutdown(0));

try {
  const localEnv = await prepareEnvironment();
  postgres = new EmbeddedPostgres({
    databaseDir,
    port: databasePort,
    user: databaseUser,
    password: localEnv.POSTGRES_PASSWORD,
    authMethod: "scram-sha-256",
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => undefined,
    onError: (error) => console.error("[PostgreSQL]", error),
  });
  await ensureDatabase(postgres);
  await recoverFailedBootstrap(postgres);

  const npmCli = process.env.npm_execpath;
  if (!npmCli)
    throw new Error(
      "مسیر اجرایی npm پیدا نشد. فرمان را با npm run dev:local اجرا کنید.",
    );
  console.log("[Invoice] اعمال schema و ساخت داده‌های اولیه...");
  await run(process.execPath, [npmCli, "run", "db:generate"]);
  await run(process.execPath, [npmCli, "run", "db:deploy"]);
  await run(process.execPath, [npmCli, "run", "db:seed"]);

  console.log("\n✓ سامانه مدیریت فاکتور آماده است.");
  console.log("  آدرس: http://localhost:3000");
  console.log(`  رمز ورود محلی: ${localEnv.SEED_DEFAULT_PASSWORD}`);
  console.log(
    "  کاربران: superadmin, financeadmin, davood, mozhgan, behdad, sara\n",
  );

  if (setupOnly) {
    await shutdown(0);
  } else {
    console.log("برای توقف برنامه Ctrl+C را بزنید.\n");
    nextProcess = spawn(process.execPath, [npmCli, "run", "dev"], {
      cwd: workspaceRoot,
      env: process.env,
      shell: false,
      stdio: "inherit",
    });
    const exitCode = await new Promise((resolve, reject) => {
      nextProcess.once("error", reject);
      nextProcess.once("exit", (code) => resolve(code ?? 1));
    });
    await shutdown(exitCode);
  }
} catch (error) {
  console.error(
    "\nخطا در راه‌اندازی محلی:",
    error instanceof Error ? error.message : error,
  );
  await shutdown(1);
  process.exit(1);
}
