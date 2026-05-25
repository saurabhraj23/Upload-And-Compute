import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import excelIcon from './assets/excel.png';
import './App.css';

export default function UploadPage() {

  const [file, setFile] = useState(null);

  const [description, setDescription] =
    useState("");

  const [error, setError] = useState("");

  const [isUploading, setIsUploading] =
    useState(false);

  // Filename editing state
  const [editableFileName,
    setEditableFileName] = useState("");

  const [isEditingFileName,
    setIsEditingFileName] =
    useState(false);

  // Overwrite button
  const [showOverwrite,
    setShowOverwrite] =
    useState(false);

  // Status message
  const [statusMessage,
    setStatusMessage] =
    useState("");

  const [statusType,
    setStatusType] =
    useState(""); // success | error

  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE =
    25 * 1024 * 1024;

  // =========================================
  // FILE CHANGE
  // =========================================

  const handleFileChange = (e) => {

    const selectedFile =
      e.target.files[0];

    const allowedExtensions =
      ["csv", "xlsx"];

    setError("");

    setStatusMessage("");

    setStatusType("");

    setShowOverwrite(false);

    if (!selectedFile) return;

    const ext = selectedFile.name
      .split('.')
      .pop()
      ?.toLowerCase();

    // =========================================
    // EXTENSION VALIDATION
    // =========================================

    if (!allowedExtensions.includes(ext)) {

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

    // =========================================
    // SIZE VALIDATION
    // =========================================

    if (selectedFile.size >
      MAX_FILE_SIZE) {

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

    // =========================================
    // CLONE FILE
    // =========================================

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

    // =========================================
    // REMOVE EXTENSION
    // =========================================

    const fileNameWithoutExtension =
      selectedFile.name.replace(
        /\.[^/.]+$/,
        ""
      );

    setEditableFileName(
      fileNameWithoutExtension
    );

    setIsEditingFileName(false);
  };

  // =========================================
  // REMOVE FILE
  // =========================================

  const handleRemoveFile = (e) => {

    e.preventDefault();

    e.stopPropagation();

    setFile(null);

    setError("");

    setEditableFileName("");

    setIsEditingFileName(false);

    setShowOverwrite(false);

    setStatusMessage("");

    setStatusType("");

    if (fileInputRef.current) {

      fileInputRef.current.value = "";
    }
  };

  // =========================================
  // VALIDATION
  // =========================================

  const isDescriptionValid =
    description.trim().length >= 3;

  const isFormInvalid =
    !file ||
    !isDescriptionValid ||
    isUploading ||
    editableFileName.trim().length === 0 ||
    isEditingFileName;

  // =========================================
  // UPLOAD REQUEST
  // =========================================

  const uploadRequest = async (
    overwrite
  ) => {

    const formData = new FormData();

    const originalExtension =
      file.name.split('.').pop();

    const finalFileName =
      `${editableFileName.trim()}.${originalExtension}`;

    // =========================================
    // CREATE RENAMED FILE
    // =========================================

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

    const response = await fetch(
      `http://127.0.0.1:8000/upload?overwrite=${overwrite}`,
      {
        method: "POST",
        body: formData,
      }
    );

    return response;
  };

  // =========================================
  // UPLOAD
  // =========================================

  const handleNext = async () => {

    if (isFormInvalid) return;

    setIsUploading(true);

    setError("");

    setStatusMessage("");

    setStatusType("");

    setShowOverwrite(false);

    try {

      let response =
        await uploadRequest(false);

      let data =
        await response.json();

      if (!response.ok) {

        // =========================================
        // FILE EXISTS
        // =========================================

        if (
          data.detail ===
          "File already exists"
        ) {

          setShowOverwrite(true);

          setStatusMessage(
            "File already exists. Rename or overwrite the file."
          );

          setStatusType("error");

          setIsUploading(false);

          return;
        }

        throw new Error(
          data.detail ||
          "Upload failed"
        );
      }

      setStatusMessage(
        "File uploaded successfully."
      );

      setStatusType("success");

      setTimeout(() => {

        navigate('/processing', {
          state: {
            fileName:
              `${editableFileName.trim()}.${file.name.split('.').pop()}`,

            description:
              description.trim(),
          }
        });

      }, 1000);

    } catch (err) {

      setError(
        err.message ||
        "Upload failed"
      );

      setStatusMessage(
        err.message ||
        "Upload failed"
      );

      setStatusType("error");

    } finally {

      setIsUploading(false);
    }
  };

  // =========================================
  // OVERWRITE
  // =========================================

  const handleOverwrite = async () => {

    setIsUploading(true);

    setError("");

    setStatusMessage("");

    setStatusType("");

    try {

      const response =
        await uploadRequest(true);

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Overwrite failed"
        );
      }

      setShowOverwrite(false);

      setStatusMessage(
        "File overwritten successfully."
      );

      setStatusType("success");

      setTimeout(() => {

        navigate('/processing', {
          state: {
            fileName:
              `${editableFileName.trim()}.${file.name.split('.').pop()}`,

            description:
              description.trim(),
          }
        });

      }, 1000);

    } catch (err) {

      setError(
        err.message ||
        "Overwrite failed"
      );

      setStatusMessage(
        err.message ||
        "Overwrite failed"
      );

      setStatusType("error");

    } finally {

      setIsUploading(false);
    }
  };

  // =========================================
  // UI
  // =========================================

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
              file ? 'active' : ''
            } ${
              error ? 'error' : ''
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
                            e.target.value
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
                            editableFileName
                              .trim() === ""
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

                        {editableFileName.trim()}.
                        {file.name
                          .split('.')
                          .pop()}

                      </span>

                      <button
                        type="button"
                        className="file-action-btn rename-btn"
                        onClick={(e) => {

                          e.preventDefault();

                          e.stopPropagation();

                          setShowOverwrite(false);

                          setIsEditingFileName(
                            true
                          );
                        }}
                      >
                        Rename
                      </button>

                      {showOverwrite && (

                        <button
                          type="button"
                          className="file-action-btn overwrite-btn"
                          onClick={(e) => {

                            e.preventDefault();

                            e.stopPropagation();

                            handleOverwrite();
                          }}
                        >
                          Overwrite
                        </button>

                      )}

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
              style={{ display: 'none' }}
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
                  ? 'input-error'
                  : ''
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
            className="btn-next"
            onClick={handleNext}
            disabled={isFormInvalid}
          >

            {isUploading
              ? "Uploading..."
              : "Upload File"}

          </button>

          {statusMessage && (

            <p
              className={`upload-status ${
                statusType === "success"
                  ? "status-success"
                  : "status-error"
              }`}
            >
              {statusMessage}
            </p>

          )}

        </footer>

      </div>

    </div>
  );
}