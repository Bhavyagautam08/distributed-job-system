import { Router } from "express";
import { validateJobCreation } from "../middleware/validate-job.middleware.js";
import { createJobController } from "../controllers/job.controller.js";

const router = Router();

router.post(
    "/",
    validateJobCreation,
    createJobController
);

export default router;