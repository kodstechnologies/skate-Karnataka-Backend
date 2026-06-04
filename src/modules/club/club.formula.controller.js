import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    assertClubOwnsFormula,
    createClubFormula,
    deleteClubFormula,
    getClubFormulaSource,
    getFormulaByIdOrThrow,
    listClubFormulaOptions,
    listClubFormulasPaginated,
    resolveClubIdForFormula,
    updateClubFormula,
    updateClubFormulaSource,
} from "../event/formula.service.js";

export const getClubFormulas = asyncHandler(async (req, res) => {
    const clubId = await resolveClubIdForFormula(req.user);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const result = await listClubFormulasPaginated(clubId, { page, limit });

    return res.status(200).json(
        new ApiResponse(200, result, "Club formulas fetched successfully")
    );
});

export const getClubFormulaById = asyncHandler(async (req, res) => {
    const clubId = await resolveClubIdForFormula(req.user);
    const formula = await getFormulaByIdOrThrow(req.params.id);
    assertClubOwnsFormula(formula, clubId);

    return res
        .status(200)
        .json(new ApiResponse(200, formula, "Formula fetched successfully"));
});

export const getClubFormulaOptions = asyncHandler(async (req, res) => {
    const clubId = await resolveClubIdForFormula(req.user);
    const data = await listClubFormulaOptions(clubId);

    return res.status(200).json(
        new ApiResponse(200, data, "Formula options fetched successfully")
    );
});

export const getClubFormulaSourceSetting = asyncHandler(async (req, res) => {
    const clubId = await resolveClubIdForFormula(req.user);
    const data = await getClubFormulaSource(clubId);

    return res.status(200).json(
        new ApiResponse(200, data, "Formula source preference fetched successfully")
    );
});

export const patchClubFormulaSourceSetting = asyncHandler(async (req, res) => {
    const clubId = await resolveClubIdForFormula(req.user);
    const club = await updateClubFormulaSource(clubId, req.body.formulaSource);

    return res.status(200).json(
        new ApiResponse(
            200,
            { formulaSource: club.formulaSource },
            "Formula source preference updated successfully"
        )
    );
});

export const createClubFormulaHandler = asyncHandler(async (req, res) => {
    const clubId = await resolveClubIdForFormula(req.user);
    const formula = await createClubFormula(clubId, req.body);

    return res
        .status(201)
        .json(new ApiResponse(201, formula, "Club formula created successfully"));
});

export const updateClubFormulaHandler = asyncHandler(async (req, res) => {
    const clubId = await resolveClubIdForFormula(req.user);
    const formula = await updateClubFormula(clubId, req.params.id, req.body);

    return res
        .status(200)
        .json(new ApiResponse(200, formula, "Club formula updated successfully"));
});

export const deleteClubFormulaHandler = asyncHandler(async (req, res) => {
    const clubId = await resolveClubIdForFormula(req.user);
    await deleteClubFormula(clubId, req.params.id);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Club formula deleted successfully"));
});
