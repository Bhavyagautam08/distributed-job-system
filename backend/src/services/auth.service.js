import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";

const scrypt = promisify(scryptCallback);
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const dummyPasswordHash = hashPassword(randomBytes(32).toString("hex"));

export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

export async function hashPassword(password) {
    const salt = randomBytes(16);
    const derivedKey = await scrypt(password, salt, 64, {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: 64 * 1024 * 1024
    });

    return [
        "scrypt",
        SCRYPT_COST,
        SCRYPT_BLOCK_SIZE,
        SCRYPT_PARALLELIZATION,
        salt.toString("base64url"),
        derivedKey.toString("base64url")
    ].join("$");
}

export async function verifyPassword(password, encodedHash) {
    const [algorithm, cost, blockSize, parallelization, saltValue, hashValue] =
        encodedHash.split("$");
    if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !saltValue || !hashValue) {
        return false;
    }

    const salt = Buffer.from(saltValue, "base64url");
    const expectedHash = Buffer.from(hashValue, "base64url");
    if (salt.length !== 16 || expectedHash.length !== 64) {
        return false;
    }

    const derivedKey = await scrypt(password, salt, expectedHash.length, {
        N: Number(cost),
        r: Number(blockSize),
        p: Number(parallelization),
        maxmem: 64 * 1024 * 1024
    });
    return timingSafeEqual(derivedKey, expectedHash);
}

export async function createUser({ email, displayName, password }) {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
        `INSERT INTO users (email, display_name, password_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING id, email, display_name, created_at`,
        [normalizeEmail(email), displayName.trim(), passwordHash]
    );
    return result.rows[0] || null;
}

export async function authenticateUser({ email, password }) {
    const result = await pool.query(
        `SELECT id, email, display_name, password_hash, created_at
         FROM users WHERE email = $1`,
        [normalizeEmail(email)]
    );
    const user = result.rows[0];
    const encodedHash = user?.password_hash || await dummyPasswordHash;
    const validPassword = await verifyPassword(password, encodedHash);
    if (!user || !validPassword) {
        return null;
    }
    const { password_hash: _passwordHash, ...safeUser } = user;
    return safeUser;
}

export async function createSession(userId) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);
    await pool.query(`DELETE FROM auth_sessions WHERE expires_at <= NOW()`);
    await pool.query(
        `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, $3)`,
        [tokenHash, userId, expiresAt]
    );
    return { token, expiresAt };
}

export async function getSessionUser(token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const result = await pool.query(
        `SELECT u.id, u.email, u.display_name, u.created_at
         FROM auth_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
        [tokenHash]
    );
    return result.rows[0] || null;
}

export async function revokeSession(token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await pool.query(
        `DELETE FROM auth_sessions WHERE token_hash = $1`,
        [tokenHash]
    );
}
