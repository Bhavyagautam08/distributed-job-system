import {
    Router
} from "express";

import {
    validateJobCreation
} from "../middleware/validate-job.middleware.js";

import {
    rateLimit
} from "../middleware/rate-limit.middleware.js";

import {
    createJobController,
    getJobController,
    getJobsController,
    retryJobController,
    cancelJobController
} from "../controllers/job.controller.js";

const router =
    Router();

router.post(
    "/",

    rateLimit,

    validateJobCreation,

    createJobController
);

router.get(
    "/",
    getJobsController
);

router.post(
    "/:jobId/retry",
    retryJobController
);

router.post(
    "/:jobId/cancel",
    cancelJobController
);

router.get(
    "/:jobId",

    getJobController
);

export default router;