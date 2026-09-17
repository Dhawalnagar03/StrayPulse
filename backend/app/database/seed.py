"""
Database seeder — generates realistic synthetic demo data for StrayPulse.
Run: python -m app.database.seed
"""

import asyncio
import math
import random
from datetime import datetime, timedelta
from app.database.connection import connect_to_mongo, get_database
from app.auth.jwt import hash_password
from app.services.geo import lat_lng_to_zone_id

# Bangalore centre
BASE_LAT = 12.9716
BASE_LNG = 77.5946

DEMO_ANIMALS = [
    {
        "animal_id": "DOG-00001", "animal_type": "Dog", "name_label": "Bharat",
        "color": "Brown and white", "breed": "Indian Pariah", "sex": "Male",
        "approximate_age": "2-3 years", "pattern": "market_morning",
        "base_lat": BASE_LAT + 0.005, "base_lng": BASE_LNG + 0.010,
        "primary_photo": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80",
    },
    {
        "animal_id": "DOG-00002", "animal_type": "Dog", "name_label": "Kali",
        "color": "Black", "breed": "Indian Pariah", "sex": "Female",
        "approximate_age": "4-5 years", "pattern": "garbage_evening",
        "base_lat": BASE_LAT - 0.008, "base_lng": BASE_LNG + 0.005,
        "primary_photo": "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=400&q=80",
    },
    {
        "animal_id": "DOG-00003", "animal_type": "Dog", "name_label": "Raju",
        "color": "Light brown", "breed": "Indian Pariah", "sex": "Male",
        "approximate_age": "1-2 years", "pattern": "park_water",
        "base_lat": BASE_LAT + 0.012, "base_lng": BASE_LNG - 0.008,
        "primary_photo": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=400&q=80",
    },
    {
        "animal_id": "DOG-00004", "animal_type": "Dog", "name_label": "Buddy",
        "color": "Golden", "breed": "Labrador Mix", "sex": "Male",
        "approximate_age": "3-4 years", "pattern": "irregular",
        "base_lat": BASE_LAT - 0.003, "base_lng": BASE_LNG - 0.012,
        "primary_photo": "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=400&q=80",
    },
    {
        "animal_id": "DOG-00005", "animal_type": "Dog", "name_label": "Lakshmi",
        "color": "White with brown spots", "breed": "Indian Pariah", "sex": "Female",
        "approximate_age": "5-6 years", "pattern": "feeding_dependent",
        "base_lat": BASE_LAT + 0.001, "base_lng": BASE_LNG + 0.018,
        "primary_photo": "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=400&q=80",
    },
    {
        "animal_id": "CAT-00001", "animal_type": "Cat", "name_label": "Meow",
        "color": "Orange tabby", "breed": "Domestic Shorthair", "sex": "Male",
        "approximate_age": "2-3 years", "pattern": "nocturnal_market",
        "base_lat": BASE_LAT + 0.007, "base_lng": BASE_LNG + 0.003,
        "primary_photo": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80",
    },
    {
        "animal_id": "CAT-00002", "animal_type": "Cat", "name_label": "Ganga",
        "color": "Grey and white", "breed": "Domestic Shorthair", "sex": "Female",
        "approximate_age": "3-4 years", "pattern": "temple_residential",
        "base_lat": BASE_LAT - 0.005, "base_lng": BASE_LNG - 0.006,
        "primary_photo": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&q=80",
    },
]

ENV_LOCATIONS = [
    {"name": "KR Market", "env_type": "market", "lat": BASE_LAT + 0.004, "lng": BASE_LNG + 0.009},
    {"name": "Commercial Street", "env_type": "market", "lat": BASE_LAT + 0.008, "lng": BASE_LNG + 0.002},
    {"name": "Cubbon Park", "env_type": "park", "lat": BASE_LAT + 0.011, "lng": BASE_LNG - 0.007},
    {"name": "Lalbagh Park", "env_type": "park", "lat": BASE_LAT - 0.014, "lng": BASE_LNG - 0.004},
    {"name": "BBMP Garbage Yard", "env_type": "garbage_point", "lat": BASE_LAT - 0.009, "lng": BASE_LNG + 0.006},
    {"name": "Old garbage dump", "env_type": "garbage_point", "lat": BASE_LAT - 0.006, "lng": BASE_LNG + 0.014},
    {"name": "MG Road", "env_type": "road", "lat": BASE_LAT + 0.006, "lng": BASE_LNG + 0.001},
    {"name": "Residency Road", "env_type": "road", "lat": BASE_LAT + 0.002, "lng": BASE_LNG + 0.004},
    {"name": "Ulsoor Lake", "env_type": "water_source", "lat": BASE_LAT + 0.009, "lng": BASE_LNG + 0.008},
    {"name": "ISKCON Temple", "env_type": "temple", "lat": BASE_LAT - 0.004, "lng": BASE_LNG - 0.007},
    {"name": "Ganesh Temple", "env_type": "temple", "lat": BASE_LAT - 0.006, "lng": BASE_LNG - 0.005},
]

FEEDING_LOCATIONS = [
    {"name": "Park Gate Feeding Point", "lat": BASE_LAT + 0.011, "lng": BASE_LNG - 0.007,
     "feeding_time": "07:30 AM", "feeding_frequency": "Daily"},
    {"name": "Market Lane Feeder", "lat": BASE_LAT + 0.005, "lng": BASE_LNG + 0.010,
     "feeding_time": "08:00 AM", "feeding_frequency": "Daily"},
    {"name": "Temple Street Feeder", "lat": BASE_LAT - 0.005, "lng": BASE_LNG - 0.006,
     "feeding_time": "06:00 PM", "feeding_frequency": "Daily"},
]

WEATHER_CONDITIONS = ["Clear", "Clouds", "Mist", "Drizzle"]


def _generate_sightings_for_pattern(animal: dict, count: int) -> list:
    pattern = animal["pattern"]
    base_lat = animal["base_lat"]
    base_lng = animal["base_lng"]
    sightings = []
    now = datetime.utcnow()

    for i in range(count):
        # Generate timestamp over last 60 days
        days_ago = random.randint(0, 60)
        ts = now - timedelta(days=days_ago, hours=random.randint(0, 23), minutes=random.randint(0, 59))

        # Hour based on pattern
        if pattern == "market_morning":
            hour = random.choice([7, 7, 8, 8, 8, 9, 9, 10, 14, 16])
        elif pattern == "garbage_evening":
            hour = random.choice([17, 18, 18, 19, 19, 20, 6, 7])
        elif pattern == "park_water":
            hour = random.choice([6, 7, 8, 16, 17, 18, 9])
        elif pattern == "irregular":
            hour = random.randint(0, 23)
        elif pattern == "feeding_dependent":
            hour = random.choice([7, 8, 8, 8, 9, 17, 18, 18])
        elif pattern == "nocturnal_market":
            hour = random.choice([20, 21, 22, 23, 0, 1, 6])
        elif pattern == "temple_residential":
            hour = random.choice([6, 7, 16, 17, 18, 19])
        else:
            hour = random.randint(5, 22)

        ts = ts.replace(hour=hour, minute=random.randint(0, 59))

        # Location with realistic jitter
        spread = 0.003 if pattern != "irregular" else 0.015
        lat = base_lat + random.gauss(0, spread)
        lng = base_lng + random.gauss(0, spread)

        zone_id = lat_lng_to_zone_id(lat, lng)
        weather = random.choice(WEATHER_CONDITIONS)

        def _time_of_day(h):
            if 5 <= h < 11: return "Morning"
            elif 11 <= h < 17: return "Afternoon"
            elif 17 <= h < 21: return "Evening"
            else: return "Night"

        sightings.append({
            "animal_id": animal["animal_id"],
            "user_id": "demo_seed",
            "photo_url": None,
            "location": {"type": "Point", "coordinates": [lng, lat]},
            "latitude": lat,
            "longitude": lng,
            "gps_accuracy_meters": random.uniform(5, 20),
            "timestamp": ts,
            "day_of_week": ts.weekday(),
            "time_of_day": _time_of_day(hour),
            "hour": hour,
            "weather_condition": weather,
            "temperature_celsius": round(random.uniform(22, 35), 1),
            "humidity_percent": round(random.uniform(50, 85), 1),
            "rain_probability": 0.3 if "Rain" in weather else 0.05,
            "wind_speed_kmh": round(random.uniform(5, 20), 1),
            "feeding_point_distance": round(random.uniform(50, 800), 1),
            "road_distance": round(random.uniform(10, 300), 1),
            "market_distance": round(random.uniform(50, 1000), 1),
            "garbage_point_distance": round(random.uniform(100, 1200), 1),
            "park_distance": round(random.uniform(80, 900), 1),
            "water_source_distance": round(random.uniform(100, 1500), 1),
            "zone_id": zone_id,
            "zone_name": None,
            "notes": None,
            "is_feeding_point": random.random() < 0.15,
            "verification_status": "Verified",
            "verified_by": "demo_seed",
            "verified_at": ts + timedelta(hours=1),
            "is_suspicious": False,
            "suspicious_reason": None,
            "is_demo": True,
            "created_at": ts + timedelta(minutes=5),
        })

    return sightings


async def seed():
    await connect_to_mongo()
    db = get_database()

    print("🌱 Seeding StrayPulse demo data...")

    # Clear demo data
    demo_ids = [a["animal_id"] for a in DEMO_ANIMALS]
    await db.animals.delete_many({"$or": [{"is_demo": True}, {"animal_id": {"$in": demo_ids}}]})
    await db.sightings.delete_many({"$or": [{"is_demo": True}, {"animal_id": {"$in": demo_ids}}]})
    await db.feeding_locations.delete_many({"is_demo": True})
    await db.environmental_locations.delete_many({"is_demo": True})
    await db.predictions.delete_many({"is_demo": True})

    # Insert animals
    for a in DEMO_ANIMALS:
        doc = {
            "animal_id": a["animal_id"],
            "animal_type": a["animal_type"],
            "name_label": a["name_label"],
            "sex": a["sex"],
            "approximate_age": a["approximate_age"],
            "color": a["color"],
            "breed": a["breed"],
            "distinctive_features": None,
            "primary_photo": a.get("primary_photo"),
            "additional_photos": [],
            "status": "Active",
            "total_sightings": 0,
            "last_seen_at": None,
            "last_seen_lat": None,
            "last_seen_lng": None,
            "most_common_area": None,
            "is_demo": True,
            "created_by": "demo_seed",
            "created_at": datetime.utcnow() - timedelta(days=65),
            "updated_at": datetime.utcnow(),
        }
        await db.animals.insert_one(doc)

    print(f"  ✓ {len(DEMO_ANIMALS)} animals inserted")

    # Insert environmental locations
    for loc in ENV_LOCATIONS:
        await db.environmental_locations.insert_one({
            "name": loc["name"],
            "env_type": loc["env_type"],
            "location": {"type": "Point", "coordinates": [loc["lng"], loc["lat"]]},
            "latitude": loc["lat"],
            "longitude": loc["lng"],
            "description": f"Demo {loc['env_type']} in Bangalore",
            "is_active": True,
            "is_demo": True,
            "created_at": datetime.utcnow(),
        })
    print(f"  ✓ {len(ENV_LOCATIONS)} environmental locations inserted")

    # Insert feeding locations
    admin_user = await db.users.find_one({"role": "admin"})
    admin_id = str(admin_user["_id"]) if admin_user else "demo_seed"

    for fl in FEEDING_LOCATIONS:
        await db.feeding_locations.insert_one({
            "name": fl["name"],
            "location": {"type": "Point", "coordinates": [fl["lng"], fl["lat"]]},
            "latitude": fl["lat"],
            "longitude": fl["lng"],
            "feeding_time": fl["feeding_time"],
            "feeding_frequency": fl["feeding_frequency"],
            "animal_ids": [],
            "notes": "Demo feeding location",
            "is_active": True,
            "is_demo": True,
            "created_by": admin_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })
    print(f"  ✓ {len(FEEDING_LOCATIONS)} feeding locations inserted")

    # Insert sightings
    total_sightings = 0
    for animal in DEMO_ANIMALS:
        count = random.randint(25, 50)
        sightings = _generate_sightings_for_pattern(animal, count)
        if sightings:
            await db.sightings.insert_many(sightings)
            # Update animal stats
            last = sorted(sightings, key=lambda s: s["timestamp"], reverse=True)[0]
            from collections import Counter
            zones = [s["zone_id"] for s in sightings]
            most_common = Counter(zones).most_common(1)[0][0]
            await db.animals.update_one(
                {"animal_id": animal["animal_id"]},
                {"$set": {
                    "total_sightings": len(sightings),
                    "last_seen_at": last["timestamp"],
                    "last_seen_lat": last["latitude"],
                    "last_seen_lng": last["longitude"],
                    "most_common_area": most_common,
                }}
            )
            total_sightings += len(sightings)

    print(f"  ✓ {total_sightings} sightings inserted")
    print("✅ Demo data seeded successfully!")
    print(f"\n📊 Demo Animals:")
    for a in DEMO_ANIMALS:
        print(f"   {a['animal_id']} — {a['name_label']} ({a['pattern']})")
    print(f"\n🔑 Admin login: {(await db.users.find_one({'role': 'admin'}))['email'] if await db.users.count_documents({'role': 'admin'}) > 0 else 'N/A'}")


if __name__ == "__main__":
    asyncio.run(seed())
