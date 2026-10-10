import { Router } from "express";
import { authenticate } from "../middleware/authenticate.middleware.js";
import {
    loginController,
    logoutController,
    meController,
    registerController
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/me", authenticate, meController);
router.post("/logout", logoutController);

export default router;
