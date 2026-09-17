"""
Train all StrayPulse models: Baseline, KNN, Random Forest, XGBoost.
Saves the best model as best_model.pkl.

Run: python ml/training/train_all.py
"""

import pandas as pd
import numpy as np
import pickle
import json
from pathlib import Path
from datetime import datetime
from collections import Counter

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, classification_report
)
import xgboost as xgb

# Fix path
BASE_DIR = Path(__file__).parent.parent
DATA_PATH = BASE_DIR / "data" / "features.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

from ml.features.engineer_features import FEATURE_COLS, TARGET_COL


def load_data():
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} rows, {df[TARGET_COL].nunique()} zone classes")

    # Keep only zones with enough samples
    zone_counts = df[TARGET_COL].value_counts()
    valid_zones = zone_counts[zone_counts >= 3].index
    df = df[df[TARGET_COL].isin(valid_zones)]
    print(f"After filtering rare zones: {len(df)} rows, {df[TARGET_COL].nunique()} zones")

    # Fill missing features
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0.0
    df[FEATURE_COLS] = df[FEATURE_COLS].fillna(0.0)

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    return X, y_enc, le, df


def frequency_baseline(X_train, y_train, X_test, le):
    """Most frequent zone in training set — simplest baseline."""
    most_common = Counter(y_train).most_common(1)[0][0]
    y_pred = np.full(len(X_test), most_common)
    return y_pred


def train_knn(X_train, y_train):
    model = KNeighborsClassifier(n_neighbors=7, weights="distance", n_jobs=-1)
    model.fit(X_train, y_train)
    return model


def train_random_forest(X_train, y_train):
    model = RandomForestClassifier(
        n_estimators=200, max_depth=12, min_samples_leaf=2,
        class_weight="balanced", random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)
    return model


def train_xgboost(X_train, y_train):
    n_classes = len(set(y_train))
    model = xgb.XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.08,
        subsample=0.8, colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="mlogloss",
        objective="multi:softprob",
        num_class=n_classes,
        random_state=42, n_jobs=-1,
    )
    model.fit(X_train, y_train, eval_set=[(X_train, y_train)], verbose=False)
    return model


def evaluate_model(name, y_test, y_pred, le):
    acc = accuracy_score(y_test, y_pred)
    # Use macro average for multi-class
    prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
    rec = recall_score(y_test, y_pred, average="macro", zero_division=0)
    f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
    print(f"\n{name}:")
    print(f"  Accuracy:  {acc:.4f}")
    print(f"  Precision: {prec:.4f}")
    print(f"  Recall:    {rec:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    return {"model_name": name, "accuracy": acc, "precision": prec, "recall": rec, "f1_score": f1}


def save_model(model, name, metrics, le, version="1.0"):
    model_path = MODEL_DIR / f"{name}.pkl"
    le_path = MODEL_DIR / f"{name}_label_encoder.pkl"
    meta_path = MODEL_DIR / f"{name}_meta.json"

    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    with open(le_path, "wb") as f:
        pickle.dump(le, f)

    meta = {
        "model_name": name,
        "version": version,
        "training_date": datetime.utcnow().isoformat(),
        "training_samples": metrics.get("training_samples", 0),
        "accuracy": metrics["accuracy"],
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "f1_score": metrics["f1_score"],
        "features": FEATURE_COLS,
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    print(f"  Saved: {model_path}")
    return str(model_path)


def main():
    print("=" * 60)
    print("StrayPulse ML Training Pipeline")
    print("=" * 60)

    X, y, le, df = load_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train: {len(X_train)} | Test: {len(X_test)}")

    results = []

    # 1. Frequency Baseline
    y_baseline = frequency_baseline(X_train, y_train, X_test, le)
    r = evaluate_model("frequency_baseline", y_test, y_baseline, le)
    r["training_samples"] = len(X_train)
    results.append(r)

    # 2. KNN
    print("\nTraining KNN...")
    knn = train_knn(X_train, y_train)
    y_knn = knn.predict(X_test)
    r = evaluate_model("knn", y_test, y_knn, le)
    r["training_samples"] = len(X_train)
    results.append(r)
    save_model(knn, "knn", r, le)

    # 3. Random Forest
    print("\nTraining Random Forest...")
    rf = train_random_forest(X_train, y_train)
    y_rf = rf.predict(X_test)
    r = evaluate_model("random_forest", y_test, y_rf, le)
    r["training_samples"] = len(X_train)
    results.append(r)
    save_model(rf, "random_forest", r, le)

    # 4. XGBoost
    print("\nTraining XGBoost...")
    xgb_model = train_xgboost(X_train, y_train)
    y_xgb = xgb_model.predict(X_test)
    r = evaluate_model("xgboost", y_test, y_xgb, le)
    r["training_samples"] = len(X_train)
    results.append(r)
    save_model(xgb_model, "xgboost", r, le)

    # Select best by F1
    best = max(results[1:], key=lambda x: x["f1_score"])  # skip baseline for best model
    print(f"\n[BEST] Best model: {best['model_name']} (F1={best['f1_score']:.4f})")

    # Copy best model as best_model
    best_model_path = MODEL_DIR / f"{best['model_name']}.pkl"
    best_le_path = MODEL_DIR / f"{best['model_name']}_label_encoder.pkl"
    import shutil
    shutil.copy(best_model_path, MODEL_DIR / "best_model.pkl")
    shutil.copy(best_le_path, MODEL_DIR / "best_model_label_encoder.pkl")

    with open(MODEL_DIR / "best_model_meta.json", "w") as f:
        json.dump(best, f, indent=2)

    # Save evaluation results
    with open(MODEL_DIR / "evaluation_results.json", "w") as f:
        json.dump({
            "comparison": results,
            "best_model": best["model_name"],
            "evaluated_at": datetime.utcnow().isoformat(),
        }, f, indent=2)

    print(f"\n[DONE] All models trained. Best model saved to {MODEL_DIR / 'best_model.pkl'}")
    return results


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))
    main()
