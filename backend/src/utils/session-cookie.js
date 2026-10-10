import { env } from "../config/env.js";

export const SESSION_COOKIE_NAME = "djs_session";

export function readSessionCookie(req) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    for (const part of cookieHeader.split(";")) {
        const separator = part.indexOf("=");
        if (separator < 0) continue;
        if (part.slice(0, separator).trim() === SESSION_COOKIE_NAME) {
            return part.slice(separator + 1).trim() || null;
        }
    }
    return null;
}

export function setSessionCookie(res, token, maxAgeSeconds) {
    const production = process.env.NODE_ENV === "production";
    const secure = production ? "; Secure" : "";
    const sameSite = production && env.FRONTEND_ORIGIN ? "None" : "Lax";
    res.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/api; SameSite=${sameSite}; Max-Age=${maxAgeSeconds}${secure}`
    );
}

export function clearSessionCookie(res) {
    const production = process.env.NODE_ENV === "production";
    const secure = production ? "; Secure" : "";
    const sameSite = production && env.FRONTEND_ORIGIN ? "None" : "Lax";
    res.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/api; SameSite=${sameSite}; Max-Age=0${secure}`
    );
}
