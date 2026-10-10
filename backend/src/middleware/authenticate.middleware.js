import { getSessionUser } from "../services/auth.service.js";
import { readSessionCookie } from "../utils/session-cookie.js";

export async function authenticate(req, res, next) {
    try {
        const token = readSessionCookie(req);
        if (!token) {
            return res.status(401).json({
                success: false,
                error: { message: "Authentication required" },
                requestId: req.requestId
            });
        }

        const user = await getSessionUser(token);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: { message: "Session expired or invalid" },
                requestId: req.requestId
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
}
