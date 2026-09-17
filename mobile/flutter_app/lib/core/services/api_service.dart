import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class ApiService {
  static ApiService? _instance;
  late final Dio _dio;

  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000/api', // Android emulator → localhost
  );

  ApiService._() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (opts, handler) async {
        // Attach token if available
        // Token is injected via setToken
        handler.next(opts);
      },
      onError: (err, handler) {
        if (err.response?.statusCode == 401) {
          // Token expired — trigger logout
          debugPrint('JWT expired or invalid');
        }
        handler.next(err);
      },
    ));
  }

  static ApiService get instance {
    _instance ??= ApiService._();
    return _instance!;
  }

  void setToken(String? token) {
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/auth/login', data: {'email': email, 'password': password});
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> data) async {
    final res = await _dio.post('/auth/register', data: data);
    return Map<String, dynamic>.from(res.data);
  }

  // ── Animals ───────────────────────────────────────────────────────────────
  Future<List<dynamic>> getAnimals({String? search, String? type}) async {
    final res = await _dio.get('/animals/', queryParameters: {
      if (search != null) 'search': search,
      if (type != null) 'animal_type': type,
      'limit': 50,
    });
    return List.from(res.data);
  }

  Future<Map<String, dynamic>> getAnimal(String animalId) async {
    final res = await _dio.get('/animals/$animalId');
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> registerAnimal(Map<String, dynamic> data) async {
    final res = await _dio.post('/animals/', data: data);
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> uploadAnimalPhoto(String animalId, List<int> imageBytes) async {
    final formData = FormData.fromMap({
      'file': MultipartFile.fromBytes(imageBytes, filename: 'animal.jpg'),
    });
    final res = await _dio.post('/animals/$animalId/photo', data: formData);
    return Map<String, dynamic>.from(res.data);
  }

  Future<Map<String, dynamic>> detectAnimal(List<int> imageBytes) async {
    final formData = FormData.fromMap({
      'file': MultipartFile.fromBytes(imageBytes, filename: 'photo.jpg'),
    });
    final res = await _dio.post('/animals/detect', data: formData);
    return Map<String, dynamic>.from(res.data);
  }

  // ── Sightings ─────────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> submitSighting(Map<String, dynamic> data) async {
    final res = await _dio.post('/sightings/', data: data);
    return Map<String, dynamic>.from(res.data);
  }

  Future<List<dynamic>> getAnimalSightings(String animalId) async {
    final res = await _dio.get('/sightings/animal/$animalId', queryParameters: {'limit': 100});
    return List.from(res.data);
  }

  Future<List<dynamic>> getNearbySightings(double lat, double lng, {double radiusKm = 3}) async {
    final res = await _dio.get('/sightings/nearby', queryParameters: {'lat': lat, 'lng': lng, 'radius_km': radiusKm});
    return List.from(res.data);
  }

  Future<Map<String, dynamic>> uploadSightingPhoto(String sightingId, List<int> imageBytes) async {
    final formData = FormData.fromMap({
      'file': MultipartFile.fromBytes(imageBytes, filename: 'sighting.jpg'),
    });
    final res = await _dio.post('/sightings/$sightingId/photo', data: formData);
    return Map<String, dynamic>.from(res.data);
  }

  // ── Predictions ───────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getPrediction(String animalId, {int hour = 8}) async {
    final res = await _dio.get('/predictions/$animalId', queryParameters: {'hour': hour});
    return Map<String, dynamic>.from(res.data);
  }

  // ── Feeding Locations ─────────────────────────────────────────────────────
  Future<List<dynamic>> getFeedingLocations() async {
    final res = await _dio.get('/feeding-locations/');
    return List.from(res.data);
  }

  Future<Map<String, dynamic>> createFeedingLocation(Map<String, dynamic> data) async {
    final res = await _dio.post('/feeding-locations/', data: data);
    return Map<String, dynamic>.from(res.data);
  }
}
