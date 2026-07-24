import { State } from "../modules/state/state.model.js";
import { BaseAuth } from "../modules/auth/baseAuth.model.js";

const DEFAULT_STATE = {
  fullName: "KRSA Karnataka",
  name: "Karnataka",
  email: "state@krsa.com",
  phone: "9000000099",
  gender: "other",
  address: "Karnataka State Skating Association",
  officialAddress: "Bengaluru, Karnataka",
  designation: "State Association",
  role: "State",
  verify: true,
  status: true,
};

/**
 * Ensures at least one State (Karnataka) account exists so Admin can create
 * state events without a 404 when stateId is omitted.
 */
async function seedDefaultState() {
  try {
    const existingState = await State.findOne().select("_id email phone").lean();
    if (existingState) {
      console.log(`ℹ️ State already exists: ${existingState.email || existingState._id}`);
      return existingState;
    }

    const conflict = await BaseAuth.findOne({
      $or: [{ email: DEFAULT_STATE.email }, { phone: DEFAULT_STATE.phone }],
    })
      .select("_id role email phone")
      .lean();

    if (conflict) {
      if (String(conflict.role).toLowerCase() === "state") {
        console.log(`ℹ️ State already exists via BaseAuth: ${conflict.email || conflict._id}`);
        return conflict;
      }
      console.warn(
        `⚠️ Default state email/phone taken by role="${conflict.role}" — skip state seed`
      );
      return null;
    }

    const state = await State.create(DEFAULT_STATE);
    console.log(`✅ Default State seeded: ${state.email} (${state.krsaId})`);
    return state;
  } catch (error) {
    console.error("❌ Default state seed failed:", error.message);
    return null;
  }
}

export { seedDefaultState, DEFAULT_STATE };
