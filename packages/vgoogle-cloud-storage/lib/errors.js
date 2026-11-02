"use strict";
// Existing diagnostic strings are retained as part of the public contract.
exports.FileExceptionMessages = {
  EXPIRATION_TIME_NA: "An expiration time is not available.",
  DESTINATION_NO_NAME: "Destination file should have a name.",
  INVALID_VALIDATION_FILE_RANGE:
    "Cannot use validation with file ranges (start/end).",
  MD5_NOT_AVAILABLE:
    "MD5 verification was specified, but is not available for the requested object. MD5 is not available for composite objects.",
  EQUALS_CONDITION_TWO_ELEMENTS:
    "Equals condition must be an array of 2 elements.",
  STARTS_WITH_TWO_ELEMENTS:
    "StartsWith condition must be an array of 2 elements.",
  CONTENT_LENGTH_RANGE_MIN_MAX:
    "ContentLengthRange must have numeric min & max fields.",
  DOWNLOAD_MISMATCH:
    "The downloaded data did not match the data from the server. To be sure the content is the same, you should download the file again.",
  UPLOAD_MISMATCH_DELETE_FAIL:
    "The uploaded data did not match the data from the server.\n    As a precaution, we attempted to delete the file, but it was not successful.\n    To be sure the content is the same, you should try removing the file manually,\n    then uploading the file again.\n    \n\nThe delete attempt failed with this message:\n\n  ",
  UPLOAD_MISMATCH:
    "The uploaded data did not match the data from the server.\n    As a precaution, the file has been deleted.\n    To be sure the content is the same, you should try uploading the file again.",
  MD5_RESUMED_UPLOAD:
    "MD5 cannot be used with a continued resumable upload as MD5 cannot be extended from an existing value",
  MISSING_RESUME_CRC32C_FINAL_UPLOAD:
    "The CRC32C is missing for the final portion of a resumed upload, which is required for validation. Please provide `resumeCRC32C` if validation is required, or disable `validation`.",
};
class ApiError extends Error {
  constructor(input, response) {
    const value = typeof input === "string" ? { message: input } : input || {};
    super(value.message || response?.statusMessage || "Storage request failed");
    this.name = "ApiError";
    this.code = value.code ?? response?.statusCode;
    this.errors = value.errors || [];
    this.response = response;
  }
}
class RequestError extends ApiError {}
exports.ApiError = ApiError;
exports.RequestError = RequestError;
