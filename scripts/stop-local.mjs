import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const databaseDir = path.join(
  workspaceRoot,
  ".local",
  "runtime",
  "postgres-data",
);
const pgControl = path.join(
  workspaceRoot,
  "node_modules",
  "@embedded-postgres",
  "windows-x64",
  "native",
  "bin",
  "pg_ctl.exe",
);

if (
  process.platform !== "win32" ||
  !existsSync(pgControl) ||
  !existsSync(path.join(databaseDir, "PG_VERSION"))
) {
  console.log("PostgreSQL محلی در حال اجرا نیست یا هنوز آماده نشده است.");
  process.exit(0);
}

const result = spawnSync(
  pgControl,
  ["-D", databaseDir, "-m", "fast", "-w", "stop"],
  {
    cwd: workspaceRoot,
    encoding: "utf8",
  },
);
if (result.status === 0) console.log("PostgreSQL محلی متوقف شد.");
else if (/no server running/i.test(`${result.stdout}\n${result.stderr}`))
  console.log("PostgreSQL محلی از قبل متوقف بود.");
else {
  console.error(
    result.stderr || result.stdout || "توقف PostgreSQL ناموفق بود.",
  );
  process.exit(result.status ?? 1);
}
