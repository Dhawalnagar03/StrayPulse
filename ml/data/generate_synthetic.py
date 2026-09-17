"""
Synthetic dataset generator for StrayPulse ML training.
Generates realistic movement pattern data for 7 demo animals in Bangalore.

Run: python ml/data/generate_synthetic.py
"""

import pandas as pd
import numpy as np
import random
import math
from datetime import datetime, timedelta
from pathlib import Path

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_LAT = 12.9716
BASE_LNG = 77.5946
GRID_CELL_M = 500.0
SIGHTINGS_PER_ANIMAL = 200
RANDOM_SEED = 42

random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

ANIMALS = [
    {"id": "DOG-00001", "type": "Dog", "pattern": "market_morning",   "lat": BASE_LAT + 0.005, "lng": BASE_LNG + 0.010},
    {"id": "DOG-00002", "type": "Dog", "pattern": "garbage_evening",  "lat": BASE_LAT - 0.008, "lng": BASE_LNG + 0.005},
    {"id": "DOG-00003", "type": "Dog", "pattern": "park_water",       "lat": BASE_LAT + 0.012, "lng": BASE_LNG - 0.008},
    {"id": "DOG-00004", "type": "Dog", "pattern": "irregular",        "lat": BASE_LAT - 0.003, "lng": BASE_LNG - 0.012},
    {"id": "DOG-00005", "type": "Dog", "pattern": "feeding_dependent","lat": BASE_LAT + 0.001, "lng": BASE_LNG + 0.018},
    {"id": "CAT-00001", "type": "Cat", "pattern": "nocturnal_market", "lat": BASE_LAT + 0.007, "lng": BASE_LNG + 0.003},
    {"id": "CAT-00002", "type": "Cat", "pattern": "temple_residential","lat": BASE_LAT - 0.005, "lng": BASE_LNG - 0.006},
]

ENV_FEATURES = {
    "markets": [
        {"lat": BASE_LAT + 0.004, "lng": BASE_LNG + 0.009},
        {"lat": BASE_LAT + 0.008, "lng": BASE_LNG + 0.002},
    ],
    "parks": [
        {"lat": BASE_LAT + 0.011, "lng": BASE_LNG - 0.007},
        {"lat": BASE_LAT - 0.014, "lng": BASE_LNG - 0.004},
    ],
    "garbage": [
        {"lat": BASE_LAT - 0.009, "lng": BASE_LNG + 0.006},
        {"lat": BASE_LAT - 0.006, "lng": BASE_LNG + 0.014},
    ],
    "roads": [
        {"lat": BASE_LAT + 0.006, "lng": BASE_LNG + 0.001},
        {"lat": BASE_LAT + 0.002, "lng": BASE_LNG + 0.004},
    ],
    "water": [
        {"lat": BASE_LAT + 0.009, "lng": BASE_LNG + 0.008},
    ],
    "feeding": [
        {"lat": BASE_LAT + 0.011, "lng": BASE_LNG - 0.007},
        {"lat": BASE_LAT + 0.005, "lng": BASE_LNG + 0.010},
        {"lat": BASE_LAT - 0.005, "lng": BASE_LNG - 0.006},
    ],
}


def haversine_m(lat1, lng1, lat2, lng2):
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def nearest_m(lat, lng, locs):
    if not locs:
        return 9999.0
    return min(haversine_m(lat, lng, l["lat"], l["lng"]) for l in locs)


def lat_lng_to_zone(lat, lng):
    lat_d = 1 / 111320
    lng_d = 1 / (111320 * math.cos(math.radians(lat)))
    row = int(lat / (lat_d * GRID_CELL_M))
    col = int(lng / (lng_d * GRID_CELL_M))
    return f"Z_{row}_{col}"


def generate_hour(pattern, day_of_week):
    if pattern == "market_morning":
        return random.choices(range(5, 23), weights=[1,2,5,8,10,10,7,5,4,3,3,3,4,5,5,3,2,1], k=1)[0]
    elif pattern == "garbage_evening":
        return random.choices(range(5, 23), weights=[2,3,3,3,3,3,3,4,6,8,10,10,8,5,4,3,2,2], k=1)[0]
    elif pattern == "park_water":
        return random.choices(range(5, 23), weights=[5,8,7,5,3,3,3,4,5,5,4,4,6,8,7,5,3,2], k=1)[0]
    elif pattern == "nocturnal_market":
        return random.choices(range(0, 24), weights=[4,5,4,2,1,1,2,3,2,2,2,2,2,2,2,2,3,4,5,6,7,7,6,5], k=1)[0]
    elif pattern == "temple_residential":
        return random.choices(range(5, 23), weights=[4,6,6,4,3,3,3,4,4,4,4,3,4,5,6,5,4,3], k=1)[0]
    elif pattern == "feeding_dependent":
        return random.choices(range(5, 23), weights=[2,3,8,10,8,5,4,4,4,4,4,3,5,8,8,5,3,2], k=1)[0]
    else:  # irregular
        return random.randint(0, 23)


def generate_location(pattern, base_lat, base_lng, hour):
    spread = 0.003
    if pattern == "irregular":
        spread = 0.015
    elif pattern in ("market_morning", "nocturnal_market") and 6 <= hour <= 10:
        spread = 0.0015
    elif pattern == "garbage_evening" and 17 <= hour <= 20:
        spread = 0.002

    lat = base_lat + np.random.normal(0, spread)
    lng = base_lng + np.random.normal(0, spread)
    return lat, lng


def generate_weather(hour):
    base_temp = 28 + (5 if 10 <= hour <= 16 else 0)
    conditions = ["Clear", "Clouds", "Mist", "Drizzle", "Rain"]
    weights = [40, 30, 15, 10, 5]
    cond = random.choices(conditions, weights=weights, k=1)[0]
    return {
        "weather_condition": cond,
        "temperature_celsius": round(base_temp + random.gauss(0, 2), 1),
        "humidity_percent": round(random.uniform(50, 85), 1),
        "rain_probability": 0.6 if cond in ("Rain", "Drizzle") else random.uniform(0.0, 0.2),
    }


def build_dataset():
    records = []
    now = datetime.utcnow()

    for animal in ANIMALS:
        prev_lat, prev_lng = animal["lat"], animal["lng"]

        for i in range(SIGHTINGS_PER_ANIMAL):
            days_ago = random.randint(0, 90)
            ts = now - timedelta(days=days_ago, minutes=random.randint(0, 1440))
            dow = ts.weekday()
            hour = generate_hour(animal["pattern"], dow)
            ts = ts.replace(hour=hour, minute=random.randint(0, 59))

            lat, lng = generate_location(animal["pattern"], animal["lat"], animal["lng"], hour)

            weather = generate_weather(hour)
            zone = lat_lng_to_zone(lat, lng)

            dist_from_prev = haversine_m(lat, lng, prev_lat, prev_lng)
            time_since_prev = random.uniform(0.5, 48.0)

            record = {
                "animal_id": animal["id"],
                "animal_type": animal["type"],
                "pattern": animal["pattern"],
                "latitude": round(lat, 6),
                "longitude": round(lng, 6),
                "timestamp": ts.isoformat(),
                "hour": hour,
                "day_of_week": dow,
                "month": ts.month,
                "is_weekend": int(dow >= 5),
                "time_of_day": ("Morning" if 5<=hour<11 else "Afternoon" if 11<=hour<17 else "Evening" if 17<=hour<21 else "Night"),
                "zone_id": zone,
                "prev_lat": round(prev_lat, 6),
                "prev_lng": round(prev_lng, 6),
                "movement_distance_m": round(dist_from_prev, 1),
                "time_since_prev_h": round(time_since_prev, 2),
                "feeding_distance_m": round(nearest_m(lat, lng, ENV_FEATURES["feeding"]), 1),
                "road_distance_m": round(nearest_m(lat, lng, ENV_FEATURES["roads"]), 1),
                "market_distance_m": round(nearest_m(lat, lng, ENV_FEATURES["markets"]), 1),
                "garbage_distance_m": round(nearest_m(lat, lng, ENV_FEATURES["garbage"]), 1),
                "park_distance_m": round(nearest_m(lat, lng, ENV_FEATURES["parks"]), 1),
                "water_distance_m": round(nearest_m(lat, lng, ENV_FEATURES["water"]), 1),
                **weather,
            }
            records.append(record)
            prev_lat, prev_lng = lat, lng

    return pd.DataFrame(records)


if __name__ == "__main__":
    out_dir = Path(__file__).parent
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Generating synthetic dataset...")
    df = build_dataset()
    out_path = out_dir / "synthetic_sightings.csv"
    df.to_csv(out_path, index=False)
    print(f"  [OK] {len(df)} rows written to {out_path}")
    print(f"  Animals: {df['animal_id'].nunique()}")
    print(f"  Zone classes: {df['zone_id'].nunique()}")
    print(df[["animal_id", "pattern", "hour", "zone_id"]].groupby(["animal_id", "pattern"]).agg({"hour": "mean", "zone_id": "nunique"}).to_string())
