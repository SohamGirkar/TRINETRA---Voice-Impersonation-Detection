# pyrefly: ignore [missing-import]

import os
import requests

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.audio_service import read_audio_file
from app.services.inference_service import inference_service


router = APIRouter()


# Activepieces webhook URL
# Set this as an environment variable before starting the backend.
ACTIVEPIECES_WEBHOOK_URL = os.getenv(
    "TRINETRA_ACTIVEPIECES_WEBHOOK",
    "",
)


@router.post("/predict")
async def predict_audio(
    file: UploadFile = File(...)
):
    audio_bytes = await read_audio_file(file)

    try:
        # Run TRINETRA prediction
        result = inference_service.predict(audio_bytes)

        # Send prediction to Activepieces
        if ACTIVEPIECES_WEBHOOK_URL:
            try:
                requests.post(
                    ACTIVEPIECES_WEBHOOK_URL,
                    json=result,
                    timeout=5,
                )
            except requests.RequestException as webhook_error:
                print(
                    "[Warning] Activepieces webhook failed: "
                    f"{webhook_error}"
                )
        else:
            print(
                "[Info] TRINETRA_ACTIVEPIECES_WEBHOOK is not set; "
                "skipping Activepieces notification."
            )

    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Model not ready: {e}. "
                "The voice_spoof_detector.pkl checkpoint is missing or untrained. "
                "Please train the model first using model/src/train.py."
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference error: {e}"
        )

    return {
        "success": True,
        "filename": file.filename,
        "result": result
    }