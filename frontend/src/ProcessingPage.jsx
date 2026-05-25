import {
  useState,
  useEffect
} from 'react';

import axios from 'axios';

import {
  useLocation,
  useNavigate
} from 'react-router-dom';

import excelIcon from './assets/excel.png';

import './App.css';
import './css/processing_page.css';

export default function ProcessingPage() {

  const { state } = useLocation();

  const navigate = useNavigate();

  /* =========================================
     STATES
     ========================================= */

  const [message, setMessage] = useState("");

  const [isError, setIsError] =
    useState(false);

  const [isSuccess, setIsSuccess] =
    useState(false);

  const [isCancelling, setIsCancelling] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [previewData, setPreviewData] =
    useState(null);

  const [isPreviewOpen, setIsPreviewOpen] =
    useState(false);

  const [isLoadingPreview, setIsLoadingPreview] =
    useState(false);

  const [redirectTimer, setRedirectTimer] =
    useState(null);

  /* =========================================
     VALIDATION
     ========================================= */

  useEffect(() => {

    if (!state?.fileName) {

      navigate('/', {
        replace: true
      });
    }

  }, [state, navigate]);

  /* =========================================
     CLEANUP TIMER
     ========================================= */

  useEffect(() => {

    return () => {

      if (redirectTimer) {

        clearInterval(redirectTimer);
      }
    };

  }, [redirectTimer]);

  /* =========================================
     ESC KEY CLOSE
     ========================================= */

  useEffect(() => {

    const handleEsc = (e) => {

      if (e.key === 'Escape') {

        setIsPreviewOpen(false);
      }
    };

    window.addEventListener(
      'keydown',
      handleEsc
    );

    return () => {

      window.removeEventListener(
        'keydown',
        handleEsc
      );
    };

  }, []);

  /* =========================================
     ACTIONS
     ========================================= */

  const handleAction = async (action) => {

    setIsError(false);

    setIsSuccess(false);

    try {

      /* =========================================
         CANCEL
         ========================================= */

      if (action === 'cancel') {

        if (isCancelling) return;

        setIsCancelling(true);

        const res = await axios.delete(
          `http://127.0.0.1:8000/delete/${state.fileName}`
        );

        let seconds = 3;

        setMessage(
          `${res.data.message} Redirecting in ${seconds}`
        );

        const interval = setInterval(() => {

          seconds--;

          if (seconds > 0) {

            setMessage(
              `${res.data.message} Redirecting in ${seconds}`
            );

          } else {

            clearInterval(interval);

            navigate('/', {
              replace: true
            });
          }

        }, 1000);

        setRedirectTimer(interval);

        return;
      }

      /* =========================================
         PREVIEW
         ========================================= */

      if (action === 'preview') {

        setIsLoadingPreview(true);

        const res = await axios.get(
          `http://127.0.0.1:8000/preview/${state.fileName}`
        );

        setPreviewData(res.data);

        setIsPreviewOpen(true);

        return;
      }

      /* =========================================
         SUBMIT
         ========================================= */

      if (action === 'submit') {

        setIsSubmitting(true);

        const res = await axios.post(
          `http://127.0.0.1:8000/move/${state.fileName}`
        );

        setMessage(res.data.message);

        setIsSuccess(true);

        setTimeout(() => {

          navigate('/', {
            replace: true
          });

        }, 1500);

        return;
      }

    } catch (err) {

      setIsError(true);

      setMessage(
        err.response?.data?.detail ||
        "Processing failed"
      );

    } finally {

      setIsLoadingPreview(false);

      setIsSubmitting(false);
    }
  };

  /* =========================================
     CELL UPDATE
     ========================================= */

  const handleCellChange = (
    rowIndex,
    colIndex,
    value
  ) => {

    setPreviewData((prev) => {

      const updatedRows = [...prev.rows];

      updatedRows[rowIndex] = [
        ...updatedRows[rowIndex]
      ];

      updatedRows[rowIndex][colIndex] =
        value;

      return {

        ...prev,

        rows: updatedRows
      };
    });
  };

  /* =========================================
     EMPTY STATE
     ========================================= */

  if (!state) return null;

  return (

    <div className="upload-container">

      <div className="upload-card">

        {/* HEADER */}

        <header className="upload-header">

          <h2 className="heading-main">
            Upload And Compute Portal
          </h2>

          <p>
            <i>
              Preview and validate the data
              before submitting.
            </i>
          </p>

        </header>

        {/* BODY */}

        <div className="form-body">

          {/* FILE */}

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

          {/* DESCRIPTION */}

          <div className="input-group">

            <label className="field-label">
              Uploaded Data Type
            </label>

            <div className="description-preview">
              {state.description}
            </div>

          </div>

          {/* ACTION BUTTONS */}

          <div className="action-grid">

            <button
              className="btn-secondary"
              onClick={() =>
                handleAction('preview')
              }
              disabled={
                isLoadingPreview ||
                isSubmitting ||
                isCancelling
              }
            >

              {
                isLoadingPreview
                  ? 'Loading...'
                  : 'Preview'
              }

            </button>

            <button
              className="btn-next"
              onClick={() =>
                handleAction('submit')
              }
              disabled={
                isSubmitting ||
                isCancelling
              }
            >

              {
                isSubmitting
                  ? 'Submitting...'
                  : 'Submit'
              }

            </button>

          </div>

          {/* FOOTER */}

          <div className="footer-actions">

            <button
              className="btn-cancel-link"
              onClick={() =>
                handleAction('cancel')
              }
              disabled={
                isCancelling ||
                isSubmitting
              }
            >

              {
                isCancelling
                  ? 'Cancelling...'
                  : 'Cancel and Exit'
              }

            </button>

            <div className="status-bar">

              <span className="status-label">
                Status:
              </span>

              <span
                className={`status-value ${
                  isError
                    ? 'text-error'
                    : isCancelling
                    ? 'text-cancel'
                    : isSuccess
                    ? 'text-success'
                    : ''
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

      {/* =========================================
         PREVIEW MODAL
         ========================================= */}

      {
        isPreviewOpen &&
        previewData && (

          <div
            className="preview-overlay"
            onClick={() =>
              setIsPreviewOpen(false)
            }
          >

            <div
              className="preview-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* HEADER */}

              <div className="preview-header">

                <h3>
                  Excel Data Preview
                </h3>

                <button
                  className="close-preview-btn"
                  onClick={() =>
                    setIsPreviewOpen(false)
                  }
                >
                  ✕
                </button>

              </div>

              {/* INFO */}

              <div className="preview-info">

                Showing
                {' '}
                {previewData.preview_rows}
                {' '}
                of
                {' '}
                {previewData.total_rows}
                {' '}
                rows

                {' | '}

                Columns:
                {' '}
                {
                  previewData.columns.length
                }

              </div>

              {/* TABLE */}

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
                                )}px`
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
                                  >

                                    <input
                                      type="text"
                                      value={
                                        cell ?? ""
                                      }
                                      title={
                                        cell ?? ""
                                      }
                                      onChange={(e) =>
                                        handleCellChange(
                                          rowIndex,
                                          colIndex,
                                          e.target.value
                                        )
                                      }
                                    />

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

              {/* FOOTER */}

              <div className="preview-footer">

                <button
                  className="btn-secondary"
                  onClick={() =>
                    setIsPreviewOpen(false)
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