import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.multiple.js";
import {
  create_event_category_validation,
  create_discipline_validation,
  update_discipline_validation,
} from "../event/event.validation.js";
import {
  addDisciplinesToCategory,
  createEventCategory,
  deleteDisciplineFromCategory,
  getDisciplineById,
  getEventCategoryById,
  updateDisciplineInCategory,
} from "../event/event.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate(["Club", "District", "State", "Admin"]),
  validate(create_event_category_validation),
  createEventCategory
);

router.get(
  "/:id",
  authenticate(["Club", "District", "State", "Admin"]),
  getEventCategoryById
);

router.post(
  "/:categoryId/disciplines",
  authenticate(["Club", "District", "State", "Admin"]),
  validate(create_discipline_validation),
  addDisciplinesToCategory
);

router.get(
  "/:categoryId/disciplines/:disciplineId",
  authenticate(["Club", "District", "State", "Admin"]),
  getDisciplineById
);

router.put(
  "/:categoryId/disciplines/:disciplineId",
  authenticate(["Club", "District", "State", "Admin"]),
  validate(update_discipline_validation),
  updateDisciplineInCategory
);

router.delete(
  "/:categoryId/disciplines/:disciplineId",
  authenticate(["Club", "District", "State", "Admin"]),
  deleteDisciplineFromCategory
);

export default router;
