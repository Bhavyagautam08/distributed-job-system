import { Router } from "express";
import { validateJobCreation } from "../middleware/validate-job.middleware.js";
import {
    cancelJobController,
    createJobController,
    getJobController,
    getJobsController,
    retryJobController
} from "../controllers/job.controller.js";

const router = Router();

router.get("/", getJobsController);
router.post(
    "/",
    validateJobCreation,
    createJobController
);
router.get("/:id", getJobController);
router.post("/:id/retry", retryJobController);
router.post("/:id/cancel", cancelJobController);

export default router;