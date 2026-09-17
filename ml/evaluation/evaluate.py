"""
Model evaluation script — computes classification and geographic metrics.
Run: python ml/evaluation/evaluate.py
"""

import pandas as pd
import numpy as np
import pickle
import json
import math
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report
)

BASE_DIR = Path(__file__).parent.parent
DATA_PATH = BASE_DIR / "data" / "features.csv"
MODEL_DIR = BASE_DIR / "models"

GRID_CELL_M = 500.0


def zone_to_center(zone_id: str, base_lat: float = 12.9716):
    try:
        _, row_s, col_s = zone_id.split("_")
        row, col = int(row_s), int(col_s)
        lat_d = 1 / 111320
        lng_d = 1 / (111320 * math.cos(math.radians(base_lat)))
        clat = (row + 0.5) * lat_d * GRID_CELL_M
        clng = (col + 0.5) * lng_d * GRID_CELL_M
        return clat, clng
    except Exception:
        return base_lat, 77.5946


def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))


def geographic_error(y_true_zones, y_pred_zones):
    errors = []
    for true_z, pred_z in zip(y_true_zones, y_pred_zones):
        tlat, tlng = zone_to_center(true_z)
        plat, plng = zone_to_center(pred_z)
        errors.append(haversine_km(tlat, tlng, plat, plng))
    return np.mean(errors), np.median(errors)


def evaluate_saved_models():
    from ml.features.engineer_features import FEATURE_COLS, TARGET_COL

    df = pd.read_csv(DATA_PATH)
    zone_counts = df[TARGET_COL].value_counts()
    valid = zone_counts[zone_counts >= 3].index
    df = df[df[TARGET_COL].isin(valid)]

    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0
    df[FEATURE_COLS] = df[FEATURE_COLS].fillna(0.0)

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train_enc, y_test_enc, y_train_z, y_test_z = train_test_split(
        X, y_enc, y, test_size=0.2, random_state=42, stratify=y_enc
    )

    models = ["knn", "random_forest", "xgboost"]
    results = []

    print("=" * 65)
    print(f"{'Model':<20} {'Acc':>6} {'F1':>6} {'Mean Err(km)':>13} {'Med Err(km)':>12}")
    print("=" * 65)

    for model_name in models:
        model_path = MODEL_DIR / f"{model_name}.pkl"
        le_path = MODEL_DIR / f"{model_name}_label_encoder.pkl"
        if not model_path.exists():
            print(f"  {model_name}: model not found, skipping")
            continue

        with open(model_path, "rb") as f:
            model = pickle.load(f)
        with open(le_path, "rb") as f:
            model_le = pickle.load(f)

        y_pred_enc = model.predict(X_test)
        y_pred_zones = model_le.inverse_transform(y_pred_enc)
        y_true_zones = le.inverse_transform(y_test_enc)

        acc = accuracy_score(y_test_enc, y_pred_enc)
        f1 = f1_score(y_test_enc, y_pred_enc, average="macro", zero_division=0)
        mean_err, med_err = geographic_error(y_true_zones, y_pred_zones)

        print(f"{model_name:<20} {acc:>6.3f} {f1:>6.3f} {mean_err:>13.3f} {med_err:>12.3f}")
        results.append({
            "model_name": model_name,
            "accuracy": round(acc, 4),
            "f1_score": round(f1, 4),
            "mean_distance_error_km": round(mean_err, 3),
            "median_distance_error_km": round(med_err, 3),
        })

    print("=" * 65)

    # Save results
    output = {
        "comparison": results,
        "evaluated_at": pd.Timestamp.utcnow().isoformat(),
        "test_samples": len(X_test),
        "zone_classes": int(df[TARGET_COL].nunique()),
    }
    with open(MODEL_DIR / "evaluation_results.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n[OK] Evaluation saved to {MODEL_DIR / 'evaluation_results.json'}")
    return results


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    evaluate_saved_models()
