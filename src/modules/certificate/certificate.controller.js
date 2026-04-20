import { ApiResponse } from "../../util/common/ApiResponse.js";
import { AppError } from "../../util/common/AppError.js";
import { asyncHandler } from "../../util/common/asyncHandler.js";
import { apply_request_schema, create_certificate_services, display_all_certificate_service } from "./certificate.service.js";

const createCertificate = asyncHandler(async (req, res) => {
    const certificate = await create_certificate_services(req.body);
    return res.status(200).json(new ApiResponse(200, null, "certificate created successfully"))
})

const updateCertificates = asyncHandler(async (req, res) => {

})

const deleteCertificates = asyncHandler(async (req, res) => {

})

const displaySingleCertificate = asyncHandler(async (req, res) => {

})

const displayAllCertificate = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10 } = req.query;
    const id = req.user._id;
    console.log(id,"=================")
    const certificates = await display_all_certificate_service({
        id,
        page,
        limit
    });

    return res.status(200).json(
        new ApiResponse(200, certificates, "Certificates displayed successfully")
    );
});

const applyRequest = asyncHandler(async (req, res) => {
    const {id} = req.params;
    await apply_request_schema( id);
    return res.status(200).json(new ApiResponse(200, null, "Applied for certificate successfully"));
})

export {
    createCertificate,
    updateCertificates,
    deleteCertificates,
    displaySingleCertificate,
    displayAllCertificate,
    applyRequest,
}