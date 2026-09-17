"""
Feature engineering for StrayPulse ML pipeline.
Adds lag features, rolling statistics, and zone-level aggregations.

Run: python ml/features/engineer_features.py
"""

import pandas as pd
import numpy as np
import math
from pathlib import Path


def compute_rolling_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add animal-level rolling aggregations."""
    df = df.copy()
    df["timestamp_dt"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["animal_id", "timestamp_dt"])

    results = []
    for animal_id, group in df.groupby("animal_id"):
        group = group.reset_index(drop=True)

        # Rolling average movement distance (last 5 sightings)
        group["avg_movement_5"] = group["movement_distance_m"].rolling(5, min_periods=1).mean()

        # Rolling average feeding distance
        group["avg_feeding_dist_5"] = group["feeding_distance_m"].rolling(5, min_periods=1).mean()

        # Zone frequency (normalized count of current zone in last 20)
        zone_freq = []
        for i, row in group.iterrows():
            window = group.loc[max(0, i - 19):i - 1, "zone_id"]
            freq = (window == row["zone_id"]).sum() / max(len(window), 1)
            zone_freq.append(freq)
        group["recent_zone_freq"] = zone_freq

        # Hour frequency (how often this animal appears at this hour)
        hour_freq = group["hour"].map(group["hour"].value_counts(normalize=True))
        group["hour_freq"] = hour_freq

        # Day of week frequency
        dow_freq = group["day_of_week"].map(group["day_of_week"].value_counts(normalize=True))
        group["dow_freq"] = dow_freq

        results.append(group)

    return pd.concat(results, ignore_index=True)


def engineer_features(input_path: str, output_path: str):
    df = pd.read_csv(input_path)
    print(f"Input: {len(df)} rows, {df['animal_id'].nunique()} animals")

    df = compute_rolling_features(df)

    # Derived features
    df["is_morning"] = ((df["hour"] >= 5) & (df["hour"] < 11)).astype(int)
    df["is_afternoon"] = ((df["hour"] >= 11) & (df["hour"] < 17)).astype(int)
    df["is_evening"] = ((df["hour"] >= 17) & (df["hour"] < 21)).astype(int)
    df["is_night"] = ((df["hour"] >= 21) | (df["hour"] < 5)).astype(int)
    df["is_near_feeding"] = (df["feeding_distance_m"] < 300).astype(int)
    df["is_near_market"] = (df["market_distance_m"] < 300).astype(int)
    df["is_near_garbage"] = (df["garbage_distance_m"] < 300).astype(int)
    df["log_movement"] = np.log1p(df["movement_distance_m"])
    df["log_feeding_dist"] = np.log1p(df["feeding_distance_m"])

    # Animal type encoding
    df["animal_type_enc"] = (df["animal_type"] == "Dog").astype(int)

    # Drop raw timestamp
    df = df.drop(columns=["timestamp", "timestamp_dt"], errors="ignore")

    df.to_csv(output_path, index=False)
    print(f"Output: {len(df)} rows -> {output_path}")
    print(f"Features: {list(df.columns)}")
    return df


FEATURE_COLS = [
    "hour", "day_of_week", "month", "is_weekend",
    "is_morning", "is_afternoon", "is_evening", "is_night",
    "prev_lat", "prev_lng",
    "avg_movement_5", "log_movement",
    "feeding_distance_m", "avg_feeding_dist_5", "log_feeding_dist",
    "road_distance_m", "market_distance_m", "garbage_distance_m",
    "park_distance_m", "water_distance_m",
    "temperature_celsius", "humidity_percent", "rain_probability",
    "recent_zone_freq", "hour_freq", "dow_freq",
    "is_near_feeding", "is_near_market", "is_near_garbage",
    "animal_type_enc",
]

TARGET_COL = "zone_id"


if __name__ == "__main__":
    base = Path(__file__).parent.parent
    input_path = base / "data" / "synthetic_sightings.csv"
    output_path = base / "data" / "features.csv"

    engineer_features(str(input_path), str(output_path))
