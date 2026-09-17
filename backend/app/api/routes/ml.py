from fastapi import APIRouter, Depends
from app.auth.jwt import get_current_admin
from app.database.connection import get_database
from app.config import settings
import subprocess, sys, os

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])


@router.get("/status")
async def ml_status(current_user=Depends(get_current_admin)):
    """Check ML model status."""
    from pathlib import Path
    import json

    model_dir = Path(settings.ML_MODEL_DIR)
    meta_path = model_dir / "best_model_meta.json"

    if not meta_path.exists():
        return {
            "status": "no_model",
            "message": "No trained model found. Run training pipeline first.",
            "model_dir": str(model_dir),
        }

    with open(meta_path, "r") as f:
        meta = json.load(f)

    return {
        "status": "ready",
        "model_name": meta.get("model_name"),
        "version": meta.get("version"),
        "training_date": meta.get("training_date"),
        "accuracy": meta.get("accuracy"),
        "f1_score": meta.get("f1_score"),
    }


@router.post("/trigger-training")
async def trigger_training(current_user=Depends(get_current_admin)):
    """
    Trigger the ML training pipeline asynchronously.
    In production, this should be replaced with a proper task queue (Celery/RQ).
    """
    ml_dir = os.path.join(os.path.dirname(__file__), "../../../../ml")
    train_script = os.path.join(ml_dir, "training", "train_all.py")

    if not os.path.exists(train_script):
        return {
            "status": "error",
            "message": "Training script not found. Ensure ML pipeline is set up.",
        }

    # Fire and forget (simple implementation)
    try:
        subprocess.Popen(
            [sys.executable, train_script],
            cwd=ml_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return {"status": "triggered", "message": "Training pipeline started in background."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/evaluation-results")
async def get_evaluation_results(current_user=Depends(get_current_admin)):
    """Return latest model evaluation results."""
    from pathlib import Path
    import json

    results_path = Path(settings.ML_MODEL_DIR) / "evaluation_results.json"
    if not results_path.exists():
        return {"message": "No evaluation results found. Run evaluation script first."}

    with open(results_path, "r") as f:
        return json.load(f)
