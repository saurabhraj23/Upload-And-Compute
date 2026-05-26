import {
  useEffect,
  useRef,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

import excelIcon from "./assets/excel.png";

const API_BASE_URL =
  (
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");

const MAX_FILE_SIZE =
  25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "csv",
  "xlsx",
];

const sanitizeFileName = (
  name
) => {

  return name.replace(
    /[<>:"/\\|?*\x00-\x1F]/g,
    ""
  );
};

export default function UploadPage() {

  const [file, setFile] =
    useState(null);

  const [description,
    setDescription] =
    useState("");

  const [error,
    setError] =
    useState("");

  const [isUploading,
    setIsUploading] =
    useState(false);

  const [editableFileName,
    setEditableFileName] =
    useState("");

  const [isEditingFileName,
    setIsEditingFileName] =
    useState(false);

  const [fileExists,
    setFileExists] =
    useState(false);

  const [checkingExists,
    setCheckingExists] =
    useState(false);

  const [statusMessage,
    setStatusMessage] =
    useState("");

  const [statusType,
    setStatusType] =
    useState("");

  const navigate =
    useNavigate();

  const fileInputRef =
    useRef(null);

  const resetStatus = () => {
const resetStatus = () => {
  setError("");
};
  };

  const checkFileExists =
    async (
      fileName,
      extension
    ) => {

      if (!fileName) return;

      try {

        setCheckingExists(true);

        const finalFileName =
          `${fileName}.${extension}`;

        const response =
          await fetch(
            `${API_BASE_URL}/exists/${encodeURIComponent(finalFileName)}`
          );

        const data =
          await response.json();

        if (data.exists) {

          setFileExists(true);

          setStatusMessage(
            "File already exists with same name."
          );

          setStatusType("error");

        } else {

          setFileExists(false);

          setStatusMessage(
            "Ready to upload."
          );

          setStatusType("ready");
        }

      } catch {

        setStatusMessage(
          "Failed to validate filename."
        );

        setStatusType("error");

      } finally {

        setCheckingExists(false);
      }
    };

  useEffect(() => {

    if (!file) return;

    const extension =
      file.name.split(".").pop();

    const sanitized =
      sanitizeFileName(
        editableFileName.trim()
      );

    if (!sanitized) return;

    const timer =
      setTimeout(() => {

        checkFileExists(
          sanitized,
          extension
        );

      }, 300);

    return () =>
      clearTimeout(timer);

  }, [editableFileName]);

  const handleFileChange = (e) => {

    const selectedFile =
      e.target.files?.[0];

    resetStatus();

    if (!selectedFile) return;

    const ext =
      selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      !ALLOWED_EXTENSIONS.includes(ext)
    ) {

      setError(
        "Invalid format. Please upload .csv or .xlsx only."
      );

      setStatusMessage(
        "Invalid format selected."
      );

      setStatusType("error");

      setFile(null);

      e.target.value = "";

      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {

      setError(
        "File too large. Max 25MB allowed."
      );

      setStatusMessage(
        "File size exceeds 25MB."
      );

      setStatusType("error");

      setFile(null);

      e.target.value = "";

      return;
    }

    const clonedFile = new File(
      [selectedFile],
      selectedFile.name,
      {
        type: selectedFile.type,
        lastModified:
          selectedFile.lastModified,
      }
    );

    setFile(clonedFile);

    setEditableFileName(
      selectedFile.name.replace(
        /\.[^/.]+$/,
        ""
      )
    );

    setIsEditingFileName(false);
  };

  const handleRemoveFile = (e) => {

    e.preventDefault();

    e.stopPropagation();

    setFile(null);

    setEditableFileName("");

    setIsEditingFileName(false);

    setFileExists(false);

    setStatusMessage("");

    setStatusType("");

    resetStatus();

    if (fileInputRef.current) {

      fileInputRef.current.value = "";
    }
  };

  const isDescriptionValid =
    description.trim().length >= 3;

  const sanitizedFileName =
    sanitizeFileName(
      editableFileName.trim()
    );

  const isFormInvalid =
    !file ||
    !isDescriptionValid ||
    isUploading ||
    !sanitizedFileName ||
    isEditingFileName ||
    checkingExists;

  const uploadRequest = async (
    overwrite = false
  ) => {

    const formData =
      new FormData();

    const extension =
      file.name.split(".").pop();

    const finalFileName =
      `${sanitizedFileName}.${extension}`;

    const renamedFile = new File(
      [file],
      finalFileName,
      {
        type: file.type,
        lastModified: Date.now(),
      }
    );

    formData.append(
      "file",
      renamedFile,
      finalFileName
    );

    formData.append(
      "description",
      description.trim()
    );

    return fetch(
      `${API_BASE_URL}/upload?overwrite=${overwrite}`,
      {
        method: "POST",
        body: formData,
      }
    );
  };

  const navigateToProcessing =
    () => {

      navigate("/processing", {
        state: {
          fileName:
            `${sanitizedFileName}.${file.name.split(".").pop()}`,

          description:
            description.trim(),
        },
      });
    };

  const handleUpload =
    async () => {

      if (isFormInvalid) return;

      setIsUploading(true);

      try {

        const response =
          await uploadRequest(
            fileExists
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.detail ||
            "Upload failed"
          );
        }

        setStatusMessage(
          fileExists
            ? "File overwritten successfully."
            : "File uploaded successfully."
        );

        setStatusType("upload-success");

        setTimeout(
          navigateToProcessing,
          1000
        );

      } catch (err) {

        setError(
          err.message
        );

        setStatusMessage(
          err.message
        );

        setStatusType("error");

      } finally {

        setIsUploading(false);
      }
    };

  return (

    <div className="upload-container">

      <div className="upload-card">

        <header className="upload-header">

          <h2 className="heading-main">
            Upload And Compute Portal
          </h2>

          <p>
            <i>
              Upload your excel file below.
            </i>
          </p>

        </header>

        <div className="form-body">

          <div
            className={`file-upload-zone ${
              file ? "active" : ""
            } ${
              error ? "error" : ""
            }`}
          >

            <label htmlFor="file-input">

              <span className="upload-icon">

                {file ? (

                  <img
                    src={excelIcon}
                    alt="Excel File"
                    className="excel-icon-img"
                  />

                ) : (

                  <span className="placeholder-emoji">
                    📄
                  </span>

                )}

              </span>

              {file ? (

                <div className="file-name-wrapper">

                  {isEditingFileName ? (

                    <div
                      className="file-edit-box"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >

                      <input
                        type="text"
                        className="file-name-input"
                        value={editableFileName}
                        onChange={(e) =>
                          setEditableFileName(
                            sanitizeFileName(
                              e.target.value
                            )
                          )
                        }
                      />

                      <button
                        type="button"
                        className="file-action-btn ok-btn"
                        onClick={(e) => {

                          e.preventDefault();

                          e.stopPropagation();

                          if (
                            !sanitizedFileName
                          ) {
                            return;
                          }

                          setIsEditingFileName(
                            false
                          );
                        }}
                      >
                        Confirm
                      </button>

                    </div>

                  ) : (

                    <div
                      className="confirmed-file-box"
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >

                      <span className="confirmed-file-name">

                        {sanitizedFileName}.
                        {
                          file.name
                            .split(".")
                            .pop()
                        }

                      </span>

                      <button
                        type="button"
                        className="file-action-btn rename-btn"
                        onClick={(e) => {

                          e.preventDefault();

                          e.stopPropagation();

                          setIsEditingFileName(
                            true
                          );
                        }}
                      >
                        Rename
                      </button>

                    </div>

                  )}

                </div>

              ) : (

                <span className="file-name">
                  Click to select file
                </span>

              )}

              {!file && (

                <span className="file-limit">
                  CSV or XLSX (Max 25MB)
                </span>

              )}

            </label>

            {file && (

              <button
                className="remove-file-link"
                onClick={handleRemoveFile}
              >
                Remove file
              </button>

            )}

            <input
              id="file-input"
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              style={{
                display: "none",
              }}
            />

          </div>

          {error && (

            <p className="error-message">
              {error}
            </p>

          )}

          <div className="input-group">

            <div className="label-row">

              <label className="field-label">
                Uploaded Data Type
              </label>

              {!isDescriptionValid && (

                <span className="char-count invalid">
                  {description.length}/3
                  characters
                </span>

              )}

            </div>

            <input
              type="text"
              className={`text-input ${
                description.length > 0 &&
                !isDescriptionValid
                  ? "input-error"
                  : ""
              }`}
              placeholder="e.g. Sales Data"
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
            />

          </div>

        </div>

<footer className="upload-footer">

  <button
    className={`btn-next ${
      fileExists &&
      !isFormInvalid
        ? "btn-overwrite"
        : ""
    }`}
    onClick={handleUpload}
    disabled={isFormInvalid}
  >

    {
      fileExists
        ? "Overwrite File"
        : "Upload File"
    }

  </button>

  <div className="status-wrapper">

    <span className="status-title">
      Status:
    </span>

    <p
className={`upload-status ${
  statusType === "ready"
    ? "status-ready"
    : statusType === "upload-success"
    ? "status-upload-success"
    : statusType === "error"
    ? "status-error"
    : ""
}`}    
    >

      {
        checkingExists
          ? "Checking filename..."
          : statusMessage || "Waiting for file selection."
      }

    </p>

  </div>

</footer>
      </div>

    </div>
  );
}