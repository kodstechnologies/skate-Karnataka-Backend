import { ApiResponse } from "../../util/common/ApiResponse.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import {
    assertDistrictOwnsFormula,
    createDistrictFormula,
    deleteDistrictFormula,
    getDistrictFormulaSource,
    getFormulaByIdOrThrow,
    listDistrictFormulaOptions,
    listDistrictFormulasPaginated,
    resolveDistrictIdForFormula,
    updateDistrictFormula,
    updateDistrictFormulaSource,
} from "../event/formula.service.js";

export const getDistrictFormulas = asyncHandler(async (req, res) => {
    const districtId = await resolveDistrictIdForFormula(req.user);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const result = await listDistrictFormulasPaginated(districtId, { page, limit });

    return res.status(200).json(
        new ApiResponse(200, result, "District formulas fetched successfully")
    );
});

export const getDistrictFormulaById = asyncHandler(async (req, res) => {
    const districtId = await resolveDistrictIdForFormula(req.user);
    const formula = await getFormulaByIdOrThrow(req.params.id);
    assertDistrictOwnsFormula(formula, districtId);

    return res
        .status(200)
        .json(new ApiResponse(200, formula, "Formula fetched successfully"));
});

export const getDistrictFormulaOptions = asyncHandler(async (req, res) => {
    const districtId = await resolveDistrictIdForFormula(req.user);
    const data = await listDistrictFormulaOptions(districtId);

    return res.status(200).json(
        new ApiResponse(200, data, "Formula options fetched successfully")
    );
});

export const getDistrictFormulaSourceSetting = asyncHandler(async (req, res) => {
    const districtId = await resolveDistrictIdForFormula(req.user);
    const data = await getDistrictFormulaSource(districtId);

    return res.status(200).json(
        new ApiResponse(200, data, "Formula source preference fetched successfully")
    );
});

export const patchDistrictFormulaSourceSetting = asyncHandler(async (req, res) => {
    const districtId = await resolveDistrictIdForFormula(req.user);
    const district = await updateDistrictFormulaSource(districtId, req.body.formulaSource);

    return res.status(200).json(
        new ApiResponse(
            200,
            { formulaSource: district.formulaSource },
            "Formula source preference updated successfully"
        )
    );
});

export const createDistrictFormulaHandler = asyncHandler(async (req, res) => {
    const districtId = await resolveDistrictIdForFormula(req.user);
    const formula = await createDistrictFormula(districtId, req.body);

    return res
        .status(201)
        .json(new ApiResponse(201, formula, "District formula created successfully"));
});

export const updateDistrictFormulaHandler = asyncHandler(async (req, res) => {
    const districtId = await resolveDistrictIdForFormula(req.user);
    const formula = await updateDistrictFormula(districtId, req.params.id, req.body);

    return res
        .status(200)
        .json(new ApiResponse(200, formula, "District formula updated successfully"));
});

export const deleteDistrictFormulaHandler = asyncHandler(async (req, res) => {
    const districtId = await resolveDistrictIdForFormula(req.user);
    await deleteDistrictFormula(districtId, req.params.id);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "District formula deleted successfully"));
});
