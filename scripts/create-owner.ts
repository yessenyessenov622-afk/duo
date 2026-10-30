import "server-only";
import { getPool, withTransaction } from "../src/server/db";
import { createOwnerRecord } from "../src/server/owner-creation";

// The interactive wrapper sends credentials through stdin, never arguments.
let input = "";
for await (const chunk of process.stdin) { input += String(chunk); if (input.length > 4096) { console.error("Слишком большой ввод."); process.exit(1); } }
let credentials: { email: string; password: string };
try { credentials = JSON.parse(input); } catch { console.error("Некорректный ввод."); process.exit(1); }
const { email, password } = credentials;
if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== "string" || password.length < 12 || password.length > 128) { console.error("Проверьте email и пароль: пароль должен содержать от 12 до 128 символов."); process.exit(1); }
try {
  await createOwnerRecord(withTransaction, email, password);
  console.log("Аккаунт владельца создан. Вход: админ.");
} catch (error) {
  console.error(error instanceof Error && /^(Аккаунт владельца|Логин владельца)/.test(error.message) ? error.message : "Не удалось создать аккаунт. Проверьте миграции и доступ к базе.");
  process.exitCode = 1;
} finally { await getPool().end(); }
