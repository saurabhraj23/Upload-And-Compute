from pathlib import Path
import shutil

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "../uploads"
MOVED_DIR = BASE_DIR / "../moved"

UPLOAD_DIR.mkdir(exist_ok=True)
MOVED_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
MAX_SIZE = 25 * 1024 * 1024
PREVIEW_LIMIT = 100


def safe_filename(filename: str) -> str:
    return Path(filename).name


def validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Use CSV or XLSX only.",
        )

    return ext


def load_dataframe(path: Path) -> pd.DataFrame:
    ext = path.suffix.lower()

    try:
        if ext == ".csv":
            df = pd.read_csv(
                path,
                sep=None,
                engine="python",
                dtype=str,
                keep_default_na=False,
            )
        elif ext == ".xlsx":
            df = pd.read_excel(path, dtype=str)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type",
            )

        return df.fillna("").astype(str)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read file: {e}",
        )


@app.get("/")
async def root():
    return {"message": "FastAPI Upload Service Running"}


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    description: str = Form(...),
    overwrite: bool = Query(False),
):
    filename = safe_filename(file.filename)
    validate_extension(filename)

    content = await file.read()

    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Max 25MB allowed.",
        )

    path = UPLOAD_DIR / filename

    if path.exists() and not overwrite:
        raise HTTPException(
            status_code=400,
            detail="File already exists",
        )

    try:
        path.write_bytes(content)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {e}",
        )

    return {
        "message": "Uploaded successfully",
        "status": "success",
        "filename": filename,
        "description": description.strip(),
    }


@app.delete("/delete/{filename}")
async def delete_file(filename: str):
    filename = safe_filename(filename)
    path = UPLOAD_DIR / filename

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    try:
        path.unlink()

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Delete failed: {e}",
        )

    return {
        "message": "Cancelling upload",
        "status": "cancel",
    }


@app.post("/move/{filename}")
async def move_file(filename: str):
    filename = safe_filename(filename)

    src = UPLOAD_DIR / filename
    dst = MOVED_DIR / filename

    if not src.exists():
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    if dst.exists():
        raise HTTPException(
            status_code=400,
            detail="File with same name already exists.",
        )

    try:
        shutil.move(src, dst)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Move failed: {e}",
        )

    return {
        "message": "Successfully Submitted",
        "status": "success",
    }


@app.get("/preview/{filename}")
async def preview_file(filename: str):
    filename = safe_filename(filename)
    path = UPLOAD_DIR / filename

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    df = load_dataframe(path)
    preview = df.head(PREVIEW_LIMIT)

    return JSONResponse(
        {
            "columns": preview.columns.tolist(),
            "rows": preview.values.tolist(),
            "total_rows": len(df),
            "preview_rows": len(preview),
        }
    )


@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/exists/{filename}")
async def check_file_exists(filename: str):

    filename = safe_filename(filename)

    path = UPLOAD_DIR / filename

    return {
        "exists": path.exists()
    }