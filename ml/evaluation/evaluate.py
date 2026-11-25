"""Chronological ML evaluation for StrayPulse using historical sighting data.

This script intentionally blocks when the dataset is too small, the target labels are missing,
or the feature pipeline is inconsistent. It never invents metrics or uses synthetic data as real-world accuracy.

Run from the repo root:
    python ml/evaluation/evaluate.py
"""

from __future__ import annotations

import json
import math
import pickle
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Sequence, Tuple

import numpy as np
from pymongo import MongoClient
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.preprocessing import LabelEncoder

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.geo import haversine_distance, zone_id_to_center
from ml.features.engineer_features import FEATURE_COLS

MODEL_DIR = REPO_ROOT / "ml" / "models"


def _iso(dt: Any) -> datetime:
    if isinstance(dt, datetime):
        return dt
    if isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return datetime.utcnow()
    return datetime.utcnow()


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _zone_center(zone_id: str) -> Tuple[float, float]:
    if zone_id and zone_id.startswith("Z_"):
        try:
            lat, lng = zone_id_to_center(zone_id)
            return float(lat), float(lng)
        except Exception:
            pass
    return 12.9716, 77.5946


def build_feature_row(history: Sequence[Dict[str, Any]], target_hour: int, target_day: int, animal_type: str | None = None) -> Dict[str, float]:
    history = list(history)
    if not history:
        return {name: 0.0 for name in FEATURE_COLS}

    ordered = sorted(history, key=lambda s: _iso(s.get("timestamp")))
    latest = ordered[-1]
    previous = ordered[-2] if len(ordered) > 1 else latest

    movement_distances = []
    for idx in range(1, len(ordered)):
        prev = ordered[idx - 1]
        current = ordered[idx]
        movement_distances.append(
            haversine_distance(
                _safe_float(prev.get("latitude"), 0.0),
                _safe_float(prev.get("longitude"), 0.0),
                _safe_float(current.get("latitude"), 0.0),
                _safe_float(current.get("longitude"), 0.0),
            )
        )

    avg_movement_5 = float(np.mean(movement_distances[-5:])) if movement_distances else 0.0
    recent_zone_counts = Counter(
        lat_lng_to_zone_id(s.get("latitude"), s.get("longitude"))
        for s in ordered[-20:]
        if s.get("latitude") is not None and s.get("longitude") is not None
    )
    recent_zone_freq = recent_zone_counts.most_common(1)[0][1] / max(len(ordered[-20:]), 1) if recent_zone_counts else 0.0
    hour_freq = sum(1 for s in ordered if int(s.get("hour", target_hour)) == target_hour) / max(len(ordered), 1)
    dow_freq = sum(1 for s in ordered if int(s.get("day_of_week", target_day)) == target_day) / max(len(ordered), 1)

    feeding_distance_m = _safe_float(latest.get("feeding_point_distance"), 500.0)
    feeding_window = [
        _safe_float(s.get("feeding_point_distance"), 0.0)
        for s in ordered[-5:]
        if s.get("feeding_point_distance") is not None
    ]
    avg_feeding_dist_5 = float(np.mean(feeding_window)) if feeding_window else 0.0

    row = {
        "hour": float(target_hour),
        "day_of_week": float(target_day),
        "month": float(_iso(latest.get("timestamp")).month if latest.get("timestamp") else datetime.utcnow().month),
        "is_weekend": 1.0 if target_day >= 5 else 0.0,
        "is_morning": 1.0 if 5 <= target_hour < 11 else 0.0,
        "is_afternoon": 1.0 if 11 <= target_hour < 17 else 0.0,
        "is_evening": 1.0 if 17 <= target_hour < 21 else 0.0,
        "is_night": 1.0 if target_hour >= 21 or target_hour < 5 else 0.0,
        "prev_lat": _safe_float(previous.get("latitude"), 12.9716),
        "prev_lng": _safe_float(previous.get("longitude"), 77.5946),
        "avg_movement_5": float(avg_movement_5),
        "log_movement": float(math.log1p(max(movement_distances[-1], 0.0))) if movement_distances else 0.0,
        "feeding_distance_m": float(feeding_distance_m),
        "avg_feeding_dist_5": float(avg_feeding_dist_5),
        "log_feeding_dist": float(math.log1p(max(feeding_distance_m, 0.0))),
        "road_distance_m": _safe_float(latest.get("road_distance"), 100.0),
        "market_distance_m": _safe_float(latest.get("market_distance"), 400.0),
        "garbage_distance_m": _safe_float(latest.get("garbage_point_distance"), 300.0),
        "park_distance_m": _safe_float(latest.get("park_distance"), 600.0),
        "water_distance_m": _safe_float(latest.get("water_source_distance"), 250.0),
        "temperature_celsius": _safe_float(latest.get("temperature_celsius"), 25.0),
        "humidity_percent": _safe_float(latest.get("humidity_percent"), 65.0),
        "rain_probability": _safe_float(latest.get("rain_probability"), 0.1),
        "recent_zone_freq": float(recent_zone_freq),
        "hour_freq": float(hour_freq),
        "dow_freq": float(dow_freq),
        "is_near_feeding": 1.0 if feeding_distance_m < 300 else 0.0,
        "is_near_market": 1.0 if _safe_float(latest.get("market_distance"), 400.0) < 300 else 0.0,
        "is_near_garbage": 1.0 if _safe_float(latest.get("garbage_point_distance"), 300.0) < 300 else 0.0,
        "animal_type_enc": 1.0 if str(animal_type or "").lower() == "dog" else 0.0,
    }
    return {name: float(row.get(name, 0.0)) for name in FEATURE_COLS}


def lat_lng_to_zone_id(lat: Any, lng: Any) -> str:
    try:
        return __import__("app.services.geo", fromlist=["lat_lng_to_zone_id"]).lat_lng_to_zone_id(float(lat), float(lng))
    except Exception:
        return "Z_unknown"


def load_historical_sightings() -> List[Dict[str, Any]]:
    try:
        client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=2000)
        db = client["straypulse"]
        docs = list(db.sightings.find({
            "animal_id": {"$exists": True, "$ne": None},
            "timestamp": {"$exists": True},
            "zone_id": {"$exists": True, "$ne": None},
        }).sort("timestamp", 1))
        client.close()
        return docs
    except Exception:
        return []


def prepare_evaluation_rows(sightings: Sequence[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], int, int]:
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for item in sightings:
        animal_id = item.get("animal_id")
        if not animal_id:
            continue
        grouped.setdefault(str(animal_id), []).append(item)

    train_rows: List[Dict[str, Any]] = []
    test_rows: List[Dict[str, Any]] = []
    excluded_records = 0

    for animal_id, animal_records in grouped.items():
        ordered = sorted(animal_records, key=lambda s: _iso(s.get("timestamp")))
        if len(ordered) < 4:
            excluded_records += len(ordered)
            continue

        split_index = max(2, int(len(ordered) * 0.8))
        for idx in range(1, len(ordered)):
            current = ordered[idx]
            history = ordered[:idx]
            if not current.get("zone_id"):
                excluded_records += 1
                continue
            record = {
                "animal_id": animal_id,
                "timestamp": current.get("timestamp"),
                "target_zone": current["zone_id"],
                "features": build_feature_row(history, int(current.get("hour", 8)), int(current.get("day_of_week", 0)), animal_type=current.get("animal_type")),
                "latitude": current.get("latitude"),
                "longitude": current.get("longitude"),
            }
            if idx < split_index:
                train_rows.append(record)
            else:
                test_rows.append(record)

    return train_rows, test_rows, len(grouped), excluded_records


def evaluate_model(train_rows: Sequence[Dict[str, Any]], test_rows: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    if not train_rows or not test_rows:
        raise ValueError("Insufficient data for evaluation: need both train and test rows.")

    X_train = np.asarray([list(row["features"].values()) for row in train_rows], dtype=float)
    y_train = np.asarray([row["target_zone"] for row in train_rows])
    X_test = np.asarray([list(row["features"].values()) for row in test_rows], dtype=float)
    y_test = np.asarray([row["target_zone"] for row in test_rows])

    label_encoder = LabelEncoder()
    y_train_enc = label_encoder.fit_transform(y_train)
    y_test_enc = label_encoder.transform(y_test)

    baseline_values = Counter(y_train.tolist())
    baseline_pred = np.asarray([baseline_values.most_common(1)[0][0] for _ in y_test], dtype=object)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train_enc)
    y_pred_enc = model.predict(X_test)
    y_pred = label_encoder.inverse_transform(y_pred_enc)

    def metrics(y_true: Sequence[str], y_predicted: Sequence[str]) -> Dict[str, Any]:
        labels = sorted(set(y_true) | set(y_predicted))
        cm = confusion_matrix(y_true, y_predicted, labels=labels)
        return {
            "accuracy": float(accuracy_score(y_true, y_predicted)),
            "precision": float(precision_score(y_true, y_predicted, average="macro", labels=labels, zero_division=0)),
            "recall": float(recall_score(y_true, y_predicted, average="macro", labels=labels, zero_division=0)),
            "f1_score": float(f1_score(y_true, y_predicted, average="macro", labels=labels, zero_division=0)),
            "confusion_matrix": cm.tolist(),
            "labels": labels,
        }

    def geographic_errors(actual_zones: Sequence[str], predicted_zones: Sequence[str]) -> Dict[str, float]:
        distances = []
        for actual, predicted in zip(actual_zones, predicted_zones):
            actual_lat, actual_lng = _zone_center(actual)
            pred_lat, pred_lng = _zone_center(predicted)
            distances.append(haversine_distance(actual_lat, actual_lng, pred_lat, pred_lng))
        return {
            "mean_meters": float(np.mean(distances)) if distances else 0.0,
            "median_meters": float(np.median(distances)) if distances else 0.0,
        }

    baseline_metrics = metrics(y_test.tolist(), baseline_pred.tolist())
    model_metrics = metrics(y_test.tolist(), y_pred.tolist())
    model_geo = geographic_errors(y_test.tolist(), y_pred.tolist())
    baseline_geo = geographic_errors(y_test.tolist(), baseline_pred.tolist())

    return {
        "baseline": {
            **baseline_metrics,
            **baseline_geo,
        },
        "trained_model": {
            **model_metrics,
            **model_geo,
        },
        "training_samples": len(train_rows),
        "test_samples": len(test_rows),
        "feature_count": len(FEATURE_COLS),
        "used_model": True,
        "model_name": "random_forest",
    }


def main() -> None:
    print("=" * 70)
    print("StrayPulse ML evaluation")
    print("=" * 70)

    sightings = load_historical_sightings()
    if not sightings:
        print("BLOCKED: no usable historical sightings found in MongoDB at mongodb://localhost:27017/straypulse.")
        print("Reproduce: python ml/evaluation/evaluate.py")
        result = {
            "status": "blocked",
            "reason": "No historical sighting records found.",
            "usable_animals": 0,
            "usable_sightings": 0,
            "training_samples": 0,
            "test_samples": 0,
            "excluded_records": 0,
            "metrics": None,
        }
        print(json.dumps(result, indent=2))
        return

    train_rows, test_rows, animal_count, excluded_records = prepare_evaluation_rows(sightings)
    if len(train_rows) < 10 or len(test_rows) < 5:
        print("BLOCKED: insufficient chronological data to evaluate model safely.")
        print(f"Usable animals: {animal_count}")
        print(f"Training rows: {len(train_rows)}")
        print(f"Test rows: {len(test_rows)}")
        print(f"Excluded records: {excluded_records}")
        result = {
            "status": "blocked",
            "reason": "Dataset too small for reliable ML evaluation.",
            "usable_animals": animal_count,
            "usable_sightings": len(train_rows) + len(test_rows) + excluded_records,
            "training_samples": len(train_rows),
            "test_samples": len(test_rows),
            "excluded_records": excluded_records,
            "metrics": None,
        }
        print(json.dumps(result, indent=2))
        return

    try:
        report = evaluate_model(train_rows, test_rows)
    except Exception as exc:
        print(f"BLOCKED: feature pipeline inconsistent with trained model: {exc}")
        result = {
            "status": "blocked",
            "reason": str(exc),
            "usable_animals": animal_count,
            "usable_sightings": len(train_rows) + len(test_rows) + excluded_records,
            "training_samples": len(train_rows),
            "test_samples": len(test_rows),
            "excluded_records": excluded_records,
            "metrics": None,
        }
        print(json.dumps(result, indent=2))
        return

    output = {
        "status": "ok",
        "usable_animals": animal_count,
        "usable_sightings": len(train_rows) + len(test_rows) + excluded_records,
        "training_samples": report["training_samples"],
        "test_samples": report["test_samples"],
        "excluded_records": excluded_records,
        "feature_count": report["feature_count"],
        "baseline": report["baseline"],
        "trained_model": report["trained_model"],
        "model_name": report["model_name"],
        "generated_at": datetime.utcnow().isoformat(),
    }

    output_path = MODEL_DIR / "historical_evaluation_report.json"
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    print("Summary")
    print(f"Usable animals: {output['usable_animals']}")
    print(f"Usable sightings: {output['usable_sightings']}")
    print(f"Training samples: {output['training_samples']}")
    print(f"Test samples: {output['test_samples']}")
    print(f"Excluded records: {output['excluded_records']}")
    print(f"Feature count: {output['feature_count']}")
    print(f"Baseline accuracy: {output['baseline']['accuracy']:.4f} | F1: {output['baseline']['f1_score']:.4f}")
    print(f"Trained model accuracy: {output['trained_model']['accuracy']:.4f} | F1: {output['trained_model']['f1_score']:.4f}")
    print(f"Mean distance error: {output['trained_model']['mean_meters']:.1f} m | Median: {output['trained_model']['median_meters']:.1f} m")
    print(f"Report written to {output_path}")
    print(json.dumps({
        "baseline": output["baseline"],
        "trained_model": output["trained_model"],
    }, indent=2))


if __name__ == "__main__":
    main()
