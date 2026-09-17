import math
from typing import List, Tuple, Optional
from app.config import settings


def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in meters between two lat/lng points."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def bearing(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return bearing in degrees (0=N, 90=E, 180=S, 270=W)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lng2 - lng1)
    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def lat_lng_to_zone_id(lat: float, lng: float, cell_size_m: float = None) -> str:
    """
    Convert a lat/lng coordinate to a grid zone ID.
    Zone IDs are based on a fixed-size grid centred on the city's bounding box.
    Format: 'Z_<row>_<col>'
    """
    cell_size_m = cell_size_m or settings.GRID_CELL_SIZE_METERS
    # Approximate degrees per meter
    lat_deg_per_m = 1 / 111320
    lng_deg_per_m = 1 / (111320 * math.cos(math.radians(lat)))

    row = int(lat / (lat_deg_per_m * cell_size_m))
    col = int(lng / (lng_deg_per_m * cell_size_m))
    return f"Z_{row}_{col}"


def zone_id_to_center(zone_id: str, cell_size_m: float = None) -> Tuple[float, float]:
    """Return the center lat/lng of a zone."""
    cell_size_m = cell_size_m or settings.GRID_CELL_SIZE_METERS
    _, row_str, col_str = zone_id.split("_")
    row, col = int(row_str), int(col_str)

    lat_deg_per_m = 1 / 111320
    # Use default city lat for the cosine approximation
    lng_deg_per_m = 1 / (111320 * math.cos(math.radians(settings.DEFAULT_CITY_LAT)))

    center_lat = (row + 0.5) * lat_deg_per_m * cell_size_m
    center_lng = (col + 0.5) * lng_deg_per_m * cell_size_m
    return center_lat, center_lng


def nearest_distance(lat: float, lng: float, locations: List[dict]) -> Optional[float]:
    """Return nearest distance in meters from lat/lng to a list of {'lat': .., 'lng': ..} dicts."""
    if not locations:
        return None
    distances = [haversine_distance(lat, lng, loc["lat"], loc["lng"]) for loc in locations]
    return min(distances)
