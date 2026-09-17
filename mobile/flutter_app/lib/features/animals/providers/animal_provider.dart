import 'package:flutter/foundation.dart';
import '../../../core/services/api_service.dart';

class AnimalProvider extends ChangeNotifier {
  List<dynamic> _animals = [];
  bool _loading = false;

  List<dynamic> get animals => _animals;
  bool get loading => _loading;

  Future<void> loadAnimals({String? search, String? type}) async {
    _loading = true;
    notifyListeners();
    try {
      _animals = await ApiService.instance.getAnimals(search: search, type: type);
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  Future<Map<String, dynamic>?> getAnimal(String id) async {
    try {
      return await ApiService.instance.getAnimal(id);
    } catch (_) { return null; }
  }
}
