# pyrefly: ignore [missing-import]
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.audio_service import read_audio_file
from app.services.inference_service import inference_service


router = APIRouter()


@router.post("/predict")
async def predict_audio(
    file: UploadFile = File(...)
):
    audio_bytes = await read_audio_file(file)

    try:
        result = inference_service.predict(audio_bytes)
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