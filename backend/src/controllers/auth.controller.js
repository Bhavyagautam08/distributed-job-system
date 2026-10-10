import { env } from "../config/env.js";
import {
    authenticateUser,
    createSession,
    createUser,
    revokeSession
} from "../services/auth.service.js";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../utils/session-cookie.js";
import { loginSchema, registerSchema } from "../validators/auth.validator.js";

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at
    };
}

function invalidBody(res, req, issues) {
    return res.status(400).json({
        success: false,
        error: {
            message: "Invalid authentication details",
            details: issues
        },
        requestId: req.requestId
    });
}

export async function registerController(req, res, next) {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return invalidBody(res, req, parsed.error.issues);
        }

        const user = await createUser(parsed.data);
        if (!user) {
            return res.status(409).json({
                success: false,
                error: { message: "An account with this email already exists" },
                requestId: req.requestId
            });
        }

        const session = await createSession(user.id);
        setSessionCookie(res, session.token, env.SESSION_TTL_SECONDS);
        return res.status(201).json({
            success: true,
            user: publicUser(user),
            requestId: req.requestId
        });
    } catch (error) {
        return next(error);
    }
}

export async function loginController(req, res, next) {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return invalidBody(res, req, parsed.error.issues);
        }

        const user = await authenticateUser(parsed.data);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { message: "Invalid email or password" },
                requestId: req.requestId
            });
        }

        const session = await createSession(user.id);
        setSessionCookie(res, session.token, env.SESSION_TTL_SECONDS);
        return res.status(200).json({
            success: true,
            user: publicUser(user),
            requestId: req.requestId
        });
    } catch (error) {
        return next(error);
    }
}

export function meController(req, res) {
    return res.json({
        success: true,
        user: publicUser(req.user),
        requestId: req.requestId
    });
}

export async function logoutController(req, res, next) {
    try {
        const token = readSessionCookie(req);
        if (token) {
            await revokeSession(token);
        }
        clearSessionCookie(res);
        return res.json({ success: true, requestId: req.requestId });
    } catch (error) {
        return next(error);
    }
}
