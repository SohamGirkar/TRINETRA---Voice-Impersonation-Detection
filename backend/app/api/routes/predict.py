from fastapi import APIRouter, UploadFile, File

from app.services.audio_service import read_audio_file
from app.services.inference_service import inference_service


router = APIRouter()


@router.post("/predict")
async def predict_audio(
    file: UploadFile = File(...)
):

    audio_bytes = await read_audio_file(file)

    result = inference_service.predict(audio_bytes)

    return {
        "success": True,
        "filename": file.filename,
        "result": result
    }