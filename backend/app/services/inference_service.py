import sys
import os
import subprocess
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]

MODEL_SRC = PROJECT_ROOT / "model" / "src"

if str(MODEL_SRC) not in sys.path:
    sys.path.insert(0, str(MODEL_SRC))

from inference import predict_audio_buffer


FFMPEG_PATH = (
    r"C:\Users\soham\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.0.1-full_build\bin\ffmpeg.exe"
)


class InferenceService:

    def _convert_to_wav(self, audio_bytes: bytes) -> bytes:
        """
        Convert browser WebM/Opus audio into WAV.
        """

        with tempfile.TemporaryDirectory() as temp_dir:

            temp_dir = Path(temp_dir)

            input_file = temp_dir / "input.webm"
            output_file = temp_dir / "output.wav"

            input_file.write_bytes(
                audio_bytes
            )

            command = [
                FFMPEG_PATH,
                "-y",
                "-i",
                str(input_file),
                "-ac",
                "1",
                "-ar",
                "16000",
                "-sample_fmt",
                "s16",
                str(output_file),
            ]

            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
            )

            if result.returncode != 0:
                raise RuntimeError(
                    "FFmpeg conversion failed: "
                    + result.stderr
                )

            if not output_file.exists():
                raise RuntimeError(
                    "FFmpeg did not create WAV output."
                )

            return output_file.read_bytes()

    def predict(self, audio_bytes: bytes):

        # Browser microphone sends WebM/Opus.
        wav_bytes = self._convert_to_wav(
            audio_bytes
        )

        return predict_audio_buffer(
            wav_bytes,
            checkpoint_path=str(
                PROJECT_ROOT
                / "model"
                / "checkpoints"
                / "voice_spoof_detector.pkl"
            ),
        )


inference_service = InferenceService()