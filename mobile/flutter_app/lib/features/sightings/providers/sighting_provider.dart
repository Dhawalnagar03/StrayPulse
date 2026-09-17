import 'package:flutter/foundation.dart';
import '../../../core/services/api_service.dart';

class SightingProvider extends ChangeNotifier {
  List<dynamic> _sightings = [];
  bool _loading = false;

  List<dynamic> get sightings => _sightings;
  bool get loading => _loading;

  Future<void> loadForAnimal(String animalId) async {
    _loading = true;
    notifyListeners();
    try {
      _sightings = await ApiService.instance.getAnimalSightings(animalId);
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>?> submitSighting(Map<String, dynamic> data) async {
    try {
      final result = await ApiService.instance.submitSighting(data);
      notifyListeners();
      return result;
    } catch (_) { return null; }
  }
}
