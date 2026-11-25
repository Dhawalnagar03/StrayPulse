import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _user;
  bool _isLoading = false;

  bool get isAuthenticated => _token != null;
  String? get token => _token;
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String get userName => _user?['name'] ?? 'User';
  String get userRole => _user?['role'] ?? 'citizen';

  AuthProvider() {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();

    _token = prefs.getString('sp_token');

    // Restore JWT token into ApiService
    if (_token != null) {
      ApiService.instance.setToken(_token);
    }

    final userJson = prefs.getString('sp_user');

    if (userJson != null) {
      _user = Map<String, dynamic>.from(
        Uri.splitQueryString(userJson)
            .map((k, v) => MapEntry(k, v)),
      );
    }

    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final result = await ApiService.instance.login(email, password);

      _token = result['access_token'];

      // IMPORTANT: attach JWT to future API requests
      ApiService.instance.setToken(_token);

      _user = {
        'id': result['user_id'],
        'name': result['name'],
        'role': result['role'],
        'email': email,
      };

      final prefs = await SharedPreferences.getInstance();

      await prefs.setString('sp_token', _token!);

      await prefs.setString(
        'sp_user',
        'id=${_user!['id']}&'
        'name=${_user!['name']}&'
        'role=${_user!['role']}&'
        'email=$email',
      );

      _isLoading = false;
      notifyListeners();

      return true;
    } catch (e) {
      debugPrint('Login error: $e');

      _isLoading = false;
      notifyListeners();

      return false;
    }
  }

  Future<void> logout() async {
    _token = null;
    _user = null;

    // Remove JWT from ApiService
    ApiService.instance.setToken(_token);

    final prefs = await SharedPreferences.getInstance();

    await prefs.remove('sp_token');
    await prefs.remove('sp_user');

    notifyListeners();
  }
}