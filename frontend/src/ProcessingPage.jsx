import {
  useEffect,
  useRef,
  useState
} from "react";

import axios from "axios";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import excelIcon from "./assets/excel.png";

const API_BASE_URL =
  (
    import.meta.env.VITE_API_BASE_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");

export default function ProcessingPage() {

  const { state } =
    useLocation();

  const navigate =
    useNavigate();

  const redirectTimerRef =
    useRef(null);

  const [message,
    setMessage] =
    useState("");

  const [isError,
    setIsError] =
    useState(false);

  const [isSuccess,
    setIsSuccess] =
    useState(false);

  const [isCancelling,
    setIsCancelling] =
    useState(false);

  const [isSubmitting,
    setIsSubmitting] =
    useState(false);

  const [previewData,
    setPreviewData] =
    useState(null);

  const [isPreviewOpen,
    setIsPreviewOpen] =
    useState(false);

  const [isLoadingPreview,
    setIsLoadingPreview] =
    useState(false);

  useEffect(() => {

    if (!state?.fileName) {

      navigate("/", {
        replace: true,
      });
    }

  }, [state, navigate]);

  useEffect(() => {

    return () => {

      if (
        redirectTimerRef.current
      ) {

        clearInterval(
          redirectTimerRef.current
        );
      }
    };

  }, []);

  useEffect(() => {

    const handleEsc = (e) => {

      if (e.key === "Escape") {

        setIsPreviewOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEsc
    );

    return () => {

      window.removeEventListener(
        "keydown",
        handleEsc
      );
    };

  }, []);

  const resetStatus = () => {

    setIsError(false);

    setIsSuccess(false);

    setMessage("");
  };

  const getErrorMessage = (
    err,
    fallback
  ) => {

    return (
      err.response?.data?.detail ||
      err.message ||
      fallback
    );
  };

  const encodedFileName =
    encodeURIComponent(
      state?.fileName || ""
    );

  const handleAction =
    async (action) => {

      resetStatus();

      try {

        /* ================================
           CANCEL
           ================================ */

        if (action === "cancel") {

          if (isCancelling) return;

          setIsCancelling(true);

          const res =
            await axios.delete(
              `${API_BASE_URL}/delete/${encodedFileName}`
            );

          let seconds = 3;

          setMessage(
            `${res.data.message} Redirecting in ${seconds}`
          );

          redirectTimerRef.current =
            setInterval(() => {

              seconds--;

              if (seconds > 0) {

                setMessage(
                  `${res.data.message} Redirecting in ${seconds}`
                );

              } else {

                clearInterval(
                  redirectTimerRef.current
                );

                navigate("/", {
                  replace: true,
                });
              }

            }, 1000);

          return;
        }

        /* ================================
           PREVIEW
           ================================ */

        if (action === "preview") {

          setIsLoadingPreview(true);

          const res =
            await axios.get(
              `${API_BASE_URL}/preview/${encodedFileName}`
            );

          setPreviewData(
            res.data
          );

          setIsPreviewOpen(true);

          return;
        }

        /* ================================
           SUBMIT
           ================================ */

        if (action === "submit") {

          setIsSubmitting(true);

          const res =
            await axios.post(
              `${API_BASE_URL}/move/${encodedFileName}`
            );

          setMessage(
            res.data.message
          );

          setIsSuccess(true);

          setTimeout(() => {

            navigate("/", {
              replace: true,
            });

          }, 1500);

          return;
        }

      } catch (err) {

        setIsError(true);

        setMessage(
          getErrorMessage(
            err,
            "Processing failed"
          )
        );

} finally {

  setIsLoadingPreview(
    false
  );

  setIsSubmitting(false);

  if (action !== "cancel") {

    setIsCancelling(false);
  }
}
    };

  if (!state) return null;

  return (

    <div className="upload-container">

      <div className="upload-card">

        <header className="upload-header">

          <h2 className="heading-main">
            Upload And Compute Portal
          </h2>

          <p>
            <i>
              Preview and validate
              the data before
              submitting.
            </i>
          </p>

        </header>

        <div className="form-body">

          <div className="file-upload-zone active">

            <div className="upload-icon">

              <img
                src={excelIcon}
                alt="File"
                className="excel-icon-img"
              />

            </div>

            <span className="file-name">
              {state.fileName}
            </span>

          </div>

          <div className="input-group">

            <label className="field-label">
              Uploaded Data Type
            </label>

            <div className="description-preview">
              {state.description}
            </div>

          </div>

          <div className="action-grid">

            <button
              className="btn-secondary"
              onClick={() =>
                handleAction(
                  "preview"
                )
              }
              disabled={
                isLoadingPreview ||
                isSubmitting ||
                isCancelling
              }
            >

              {
                isLoadingPreview
                  ? "Loading..."
                  : "Preview"
              }

            </button>

            <button
              className="btn-next"
              onClick={() =>
                handleAction(
                  "submit"
                )
              }
              disabled={
                isSubmitting ||
                isCancelling
              }
            >

              {
                isSubmitting
                  ? "Submitting..."
                  : "Submit"
              }

            </button>

          </div>

          <div className="footer-actions">

            <button
              className="btn-cancel-link"
              onClick={() =>
                handleAction(
                  "cancel"
                )
              }
              disabled={
                isCancelling ||
                isSubmitting
              }
            >

              {
                isCancelling
                  ? "Cancelling..."
                  : "Cancel and Exit"
              }

            </button>

            <div className="status-bar">

              <span className="status-label">
                Status:
              </span>

              <span
                className={`status-value ${
                  isError
                    ? "text-error"
                    : isCancelling
                    ? "text-cancel"
                    : isSuccess
                    ? "text-success"
                    : ""
                }`}
              >

                {
                  message ||
                  "Ready to submit"
                }

              </span>

            </div>

          </div>

        </div>

      </div>

      {
        isPreviewOpen &&
        previewData && (

          <div
            className="preview-overlay"
            onClick={() =>
              setIsPreviewOpen(
                false
              )
            }
          >

            <div
              className="preview-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="preview-header">

                <h3>
                  Excel Data Preview
                </h3>

                <button
                  className="close-preview-btn"
                  onClick={() =>
                    setIsPreviewOpen(
                      false
                    )
                  }
                >
                  ✕
                </button>

              </div>

              <div className="preview-info">

                Showing{" "}
                {
                  previewData.preview_rows
                }{" "}
                of{" "}
                {
                  previewData.total_rows
                }{" "}
                rows

                {" | "}

                Columns:{" "}
                {
                  previewData.columns.length
                }

              </div>

              <div className="preview-table-wrapper">

                <table className="preview-table">

                  <thead>

                    <tr>

                      {
                        previewData.columns.map(
                          (
                            column,
                            index
                          ) => (

                            <th
                              key={index}
                              title={column}
                              style={{
                                width: `${Math.max(
                                  column.length * 14,
                                  140
                                )}px`,
                              }}
                            >

                              <div className="header-content">

                                {column}

                              </div>

                            </th>

                          )
                        )
                      }

                    </tr>

                  </thead>

                  <tbody>

  {
    previewData.rows.map(
      (
        row,
        rowIndex
      ) => (

        <tr key={rowIndex}>

          {
            row.map(
              (
                cell,
                colIndex
              ) => (

                <td
                  key={colIndex}
                  title={cell ?? ""}
                >

                  <div className="preview-cell">

                    {cell ?? ""}

                  </div>

                </td>

              )
            )
          }

        </tr>

      )
    )
  }

</tbody>

                </table>

              </div>

              <div className="preview-footer">

                <button
                  className="btn-secondary"
                  onClick={() =>
                    setIsPreviewOpen(
                      false
                    )
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )
      }

    </div>
  );
}