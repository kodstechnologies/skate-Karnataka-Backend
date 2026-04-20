import express from "express";
import {createNewState, deleteState, displayAllState, displaySingleStateAllDistricts, updateState} from "./state.controller.js";
const router = express.Router();

// 🔹 Get all states
router.get("/v1/all",
  displayAllState
);

// 🔹 Create new state
router.post("/v1/",
//   validate(createStateValidation),
  createNewState
);

// 🔹 Get single state + all districts inside it
router.get("/v1/:id",
  displaySingleStateAllDistricts
);

// 🔹 Update state
router.patch("/v1/:id",
//   validate(editStateValidation),
  updateState
);

// 🔹 Delete state
router.delete("/v1/:id",
  deleteState
);

export default router;