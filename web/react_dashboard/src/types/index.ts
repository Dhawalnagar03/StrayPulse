// API Types for StrayPulse

export type UserRole = 'admin' | 'citizen' | 'individual' | 'ngo' | 'rescuer' | 'volunteer' | 'feeder';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  profile_type?: string;
  organization_name?: string;
  is_active: boolean;
  total_sightings: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: string;
  name: string;
}

export type AnimalType = 'Dog' | 'Cat' | 'Other' | 'Unknown';
export type AnimalStatus = 'Active' | 'Missing from recent sightings' | 'Adopted' | 'Relocated' | 'Deceased' | 'Unknown';
export type AnimalSex = 'Male' | 'Female' | 'Unknown';

export interface Animal {
  animal_id: string;
  animal_type: AnimalType;
  name_label?: string;
  sex: AnimalSex;
  approximate_age?: string;
  color?: string;
  breed?: string;
  distinctive_features?: string;
  primary_photo?: string;
  status: AnimalStatus;
  total_sightings: number;
  last_seen_at?: string;
  last_seen_lat?: number;
  last_seen_lng?: number;
  most_common_area?: string;
  initial_lat?: number;
  initial_lng?: number;
  location_accuracy?: number;
  notes?: string;
  is_demo: boolean;
  created_at: string;
}

export type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface Sighting {
  id: string;
  animal_id: string;
  user_id: string;
  photo_url?: string;
  latitude: number;
  longitude: number;
  gps_accuracy_meters?: number;
  timestamp: string;
  day_of_week: number;
  time_of_day: TimeOfDay;
  hour: number;
  weather_condition?: string;
  temperature_celsius?: number;
  humidity_percent?: number;
  rain_probability?: number;
  feeding_point_distance?: number;
  road_distance?: number;
  market_distance?: number;
  garbage_point_distance?: number;
  park_distance?: number;
  zone_id?: string;
  zone_name?: string;
  notes?: string;
  is_feeding_point: boolean;
  verification_status: VerificationStatus;
  is_suspicious: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface Prediction {
  animal_id: string;
  prediction_date: string;
  model_name: string;
  model_version: string;
  predicted_zone: string;
  predicted_zone_id: string;
  latitude: number;
  longitude: number;
  prediction_radius_meters: number;
  time_start: string;
  time_end: string;
  confidence: number;
  confidence_label: 'High' | 'Medium' | 'Low';
  confidence_percent: number;
  factors: string[];
  top_features: Record<string, number>;
  training_sightings_used: number;
  is_demo: boolean;
  generated_at: string;
}

export interface PredictionInsufficientData {
  animal_id: string;
  message: string;
  sightings_count: number;
  minimum_required: number;
  suggestion: string;
}

export interface FeedingLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  feeding_time?: string;
  feeding_frequency?: string;
  animal_ids: string[];
  notes?: string;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface EnvironmentalLocation {
  id: string;
  name: string;
  env_type: string;
  latitude: number;
  longitude: number;
  description?: string;
  is_demo: boolean;
}

export interface Analytics {
  total_animals: number;
  total_sightings: number;
  active_animals: number;
  todays_sightings: number;
  predictions_generated: number;
  high_confidence_predictions: number;
  sightings_by_day: Record<string, number>;
  sightings_by_hour: Record<string, number>;
  animal_distribution: Record<string, number>;
  top_locations: Array<{ zone: string; count: number; lat: number; lng: number }>;
}
