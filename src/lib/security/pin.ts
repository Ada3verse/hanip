import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const PIN_PATTERN = /^\d{4}$/;
const SCRYPT_KEY_LENGTH = 32;

export function normalizeNickname(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, 20);
}

export function isValidNickname(value: string) {
  const normalized = normalizeNickname(value);
  return /^[가-힣A-Za-z0-9][가-힣A-Za-z0-9 _-]{1,19}$/.test(normalized);
}

export function nicknameLookupHash(nickname: string, pepper: string) {
  return createHash("sha256").update(`${normalizeNickname(nickname).toLocaleLowerCase("ko-KR")}:${pepper}`).digest("hex");
}

export async function hashPin(pin: string, pepper: string) {
  if (!PIN_PATTERN.test(pin) || !pepper) throw new Error("invalid_pin_configuration");
  const salt = randomBytes(16);
  const derived = await scrypt(`${pin}:${pepper}`, salt, SCRYPT_KEY_LENGTH) as Buffer;
  return `scrypt-v1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function verifyPin(pin: string, storedHash: string, pepper: string) {
  if (!PIN_PATTERN.test(pin) || !pepper) return false;
  const [version, saltValue, hashValue] = storedHash.split("$");
  if (version !== "scrypt-v1" || !saltValue || !hashValue) return false;
  try {
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await scrypt(`${pin}:${pepper}`, Buffer.from(saltValue, "base64url"), expected.length) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}
