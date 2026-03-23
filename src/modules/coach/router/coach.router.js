import express from "express";
import { authenticate } from "../../../middleware/authMiddleware.js";
import { displayAllCoach, displayAllCoachById, displayBookSession, displayBookSessionById } from "../controller/coach.model.js";

const router = express.Router();

/**
    * @description Display all coaches
    * @route GET /coach/display
    * @access Private (user)
 */
router.get("/display",
    authenticate(["user"]),
    displayAllCoach);

/**
    * @description Display all coaches with full details
    * @route GET /coach/full-details/:id
    * @access Private (user)
 */
router.get("/full-details/:id",
    authenticate(["user"]),
    displayAllCoachById);

/**
    * @description Book a session with a coach
    * @route POST /coach/book-a-session/:id
    * @access Private (user)
 */
router.get("/book-a-session/:id",
    authenticate(["user"]),
    displayBookSession);

/**
* @description Book a session with a coach
* @route POST /coach/book-a-session/:id
* @access Private (user)
*/
router.post("/book-a-session/:id",
    authenticate(["user", "admin"]),
    displayBookSessionById);

export default router;
