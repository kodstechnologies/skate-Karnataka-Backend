import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
    createSidebar,
    deleteSidebar,
    getActiveSidebar,
    reorderSidebar,
    updateSidebar,
} from "./sidebar.controller.js";

const router = express.Router();

router.get("/", getActiveSidebar);
router.put("/reorder", authenticate(["admin", "State"]), reorderSidebar);
router.post("/", authenticate(["admin", "State"]), createSidebar);
router.put("/:id", authenticate(["admin", "State"]), updateSidebar);
router.delete("/:id", authenticate(["admin", "State"]), deleteSidebar);

export default router;
