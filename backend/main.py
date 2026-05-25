from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Form,
    HTTPException,
    Query
)

from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import JSONResponse

import os
import shutil
import pandas as pd

# =========================================
# APP
# =========================================

app = FastAPI()

# =========================================
# CORS
# =========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================
# DIRECTORIES
# =========================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

UPLOAD_DIR = os.path.join(BASE_DIR, "../uploads")

MOVED_DIR = os.path.join(BASE_DIR, "../moved")

os.makedirs(UPLOAD_DIR, exist_ok=True)

os.makedirs(MOVED_DIR, exist_ok=True)

# =========================================
# CONFIG
# =========================================

ALLOWED_EXTENSIONS = {
    ".csv",
    ".xlsx"
}

MAX_SIZE = 25 * 1024 * 1024  # 25MB

PREVIEW_LIMIT = 100

# =========================================
# HELPERS
# =========================================

def validate_extension(filename: str):

    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported format. Use CSV or XLSX only."
        )

    return ext


def safe_filename(filename: str):

    return os.path.basename(filename)


def load_dataframe(path: str, filename: str):

    ext = os.path.splitext(filename)[1].lower()

    try:

        # =========================================
        # CSV
        # =========================================

        if ext == ".csv":

            # Auto-detect delimiter
            # Handles:
            # ;
            # ,
            # tab

            df = pd.read_csv(
                path,
                sep=None,
                engine="python",
                dtype=str,
                keep_default_na=False
            )

        # =========================================
        # EXCEL
        # =========================================

        elif ext == ".xlsx":

            df = pd.read_excel(
                path,
                dtype=str
            )

        else:

            raise HTTPException(
                status_code=400,
                detail="Unsupported file type"
            )

        # =========================================
        # CLEAN DATA
        # =========================================

        df = df.fillna("").astype(str)

        return df

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to read file: {str(e)}"
        )

# =========================================
# ROOT
# =========================================

@app.get("/")
async def root():

    return {
        "message": "FastAPI Upload Service Running"
    }

# =========================================
# UPLOAD
# =========================================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    description: str = Form(...),
    overwrite: bool = Query(False)
):

    filename = safe_filename(file.filename)

    validate_extension(filename)

    # =========================================
    # READ CONTENT
    # =========================================

    content = await file.read()

    # =========================================
    # FILE SIZE CHECK
    # =========================================

    if len(content) > MAX_SIZE:

        raise HTTPException(
            status_code=400,
            detail="File too large. Max 25MB allowed."
        )

    # =========================================
    # SAVE PATH
    # =========================================

    path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    # =========================================
    # EXISTENCE CHECK
    # =========================================

    if os.path.exists(path) and not overwrite:

        raise HTTPException(
            status_code=400,
            detail="File already exists"
        )

    # =========================================
    # SAVE FILE
    # =========================================

    try:

        with open(path, "wb") as f:
            f.write(content)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    # =========================================
    # RESPONSE
    # =========================================

    return {
        "message": "Uploaded successfully",
        "status": "success",
        "filename": filename,
        "description": description.strip()
    }

# =========================================
# DELETE
# =========================================

@app.delete("/delete/{filename}")
async def delete_file(filename: str):

    filename = safe_filename(filename)

    path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    # =========================================
    # EXISTENCE CHECK
    # =========================================

    if not os.path.exists(path):

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # =========================================
    # DELETE FILE
    # =========================================

    try:

        os.remove(path)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Delete failed: {str(e)}"
        )

    return {
    "message": "Cancelling upload",
    "status": "cancel"
}

# =========================================
# MOVE
# =========================================

@app.post("/move/{filename}")
async def move_file(filename: str):

    filename = safe_filename(filename)

    src = os.path.join(
        UPLOAD_DIR,
        filename
    )

    dst = os.path.join(
        MOVED_DIR,
        filename
    )

    # =========================================
    # EXISTENCE CHECK
    # =========================================

    if not os.path.exists(src):

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    if os.path.exists(dst):

        raise HTTPException(
            status_code=400,
            detail="File with same name already exists. Please rename first."
        )

    # =========================================
    # MOVE FILE
    # =========================================

    try:

        shutil.move(src, dst)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Move failed: {str(e)}"
        )

    return {
        "message": "Successfully Submitted",
        "status": "success"
}

# =========================================
# PREVIEW
# =========================================

@app.get("/preview/{filename}")
async def preview_file(filename: str):

    filename = safe_filename(filename)

    path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    # =========================================
    # EXISTENCE CHECK
    # =========================================

    if not os.path.exists(path):

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # =========================================
    # LOAD DATAFRAME
    # =========================================

    df = load_dataframe(path, filename)

    # =========================================
    # PREVIEW
    # =========================================

    preview = df.head(PREVIEW_LIMIT)

    # =========================================
    # RESPONSE
    # =========================================

    return JSONResponse({

        "columns":
            preview.columns.tolist(),

        "rows":
            preview.values.tolist(),

        "total_rows":
            int(len(df)),

        "preview_rows":
            int(len(preview))
    })

# =========================================
# HEALTH CHECK
# =========================================

@app.get("/health")
async def health():

    return {
        "status": "ok"
    }