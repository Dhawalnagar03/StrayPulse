import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

class RegisterAnimalScreen extends StatefulWidget {
  const RegisterAnimalScreen({super.key});

  @override
  State<RegisterAnimalScreen> createState() => _RegisterAnimalScreenState();
}

class _RegisterAnimalScreenState extends State<RegisterAnimalScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _colorCtrl = TextEditingController();
  final _breedCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();
  final _featuresCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();

  String _animalType = 'Dog';
  String _sex = 'Unknown';
  File? _photo;
  Position? _position;
  bool _loading = false;
  bool _gettingGps = false;
  String? _error;

  final _picker = ImagePicker();

  Future<void> _pickPhoto(ImageSource source) async {
    final xf = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1080);
    if (xf != null) {
      setState(() => _photo = File(xf.path));
    }
  }

  Future<void> _captureGps() async {
    setState(() => _gettingGps = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Location services disabled')));
        setState(() => _gettingGps = false);
        return;
      }
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        setState(() => _gettingGps = false);
        return;
      }
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      setState(() { _position = pos; _gettingGps = false; });
    } catch (e) {
      setState(() => _gettingGps = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });

    try {
      final res = await ApiService.instance.registerAnimal({
        'animal_type': _animalType,
        'name_label': _nameCtrl.text.trim().isEmpty ? null : _nameCtrl.text.trim(),
        'sex': _sex,
        'approximate_age': _ageCtrl.text.trim().isEmpty ? null : _ageCtrl.text.trim(),
        'color': _colorCtrl.text.trim().isEmpty ? null : _colorCtrl.text.trim(),
        'breed': _breedCtrl.text.trim().isEmpty ? null : _breedCtrl.text.trim(),
        'distinctive_features': _featuresCtrl.text.trim().isEmpty ? null : _featuresCtrl.text.trim(),
        'latitude': _position?.latitude,
        'longitude': _position?.longitude,
        'notes': _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      });

      final animalId = res['animal_id'];
      if (_photo != null && animalId != null) {
        final bytes = await _photo!.readAsBytes();
        await ApiService.instance.uploadAnimalPhoto(animalId, bytes);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('✅ Animal registered as $animalId!'),
          backgroundColor: AppTheme.primaryGreen,
        ));
        context.go('/animals/$animalId');
      }
    } catch (e) {
      setState(() { _error = 'Failed to register animal'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('Register New Animal'),
        leading: IconButton(onPressed: () => context.go('/animals'), icon: const Icon(Icons.arrow_back)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
                ),

              // Photo picker
              const Text('Photo', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => _pickPhoto(ImageSource.gallery),
                child: Container(
                  width: double.infinity, height: 160,
                  decoration: BoxDecoration(
                    color: AppTheme.bgCard,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: _photo != null ? AppTheme.primaryGreen : AppTheme.borderColor),
                  ),
                  child: _photo != null
                      ? ClipRRect(borderRadius: BorderRadius.circular(15), child: Image.file(_photo!, fit: BoxFit.cover))
                      : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          const Icon(Icons.add_a_photo_outlined, size: 40, color: AppTheme.textMuted),
                          const SizedBox(height: 8),
                          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                            OutlinedButton.icon(
                              onPressed: () => _pickPhoto(ImageSource.camera),
                              icon: const Icon(Icons.camera_alt, size: 16),
                              label: const Text('Camera'),
                            ),
                            const SizedBox(width: 12),
                            OutlinedButton.icon(
                              onPressed: () => _pickPhoto(ImageSource.gallery),
                              icon: const Icon(Icons.photo_library, size: 16),
                              label: const Text('Gallery'),
                            ),
                          ]),
                        ]),
                ),
              ),
              const SizedBox(height: 20),

              // Animal Type
              const Text('Animal Type *', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              Row(children: ['Dog', 'Cat', 'Other'].map((t) => Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(t),
                    selected: _animalType == t,
                    selectedColor: AppTheme.primaryGreen,
                    backgroundColor: AppTheme.bgCard,
                    labelStyle: TextStyle(color: _animalType == t ? Colors.white : AppTheme.textSecondary),
                    onSelected: (sel) { if (sel) setState(() => _animalType = t); },
                  ),
                ),
              )).toList()),
              const SizedBox(height: 16),

              // Name / Label
              const Text('Name / Informal Label', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _nameCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(hintText: 'e.g. Bruno, Whitey'),
              ),
              const SizedBox(height: 16),

              // Sex & Age
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Sex', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _sex,
                    dropdownColor: AppTheme.bgCard,
                    style: const TextStyle(color: Colors.white, fontFamily: 'Inter'),
                    decoration: const InputDecoration(),
                    items: const [
                      DropdownMenuItem(value: 'Male', child: Text('Male')),
                      DropdownMenuItem(value: 'Female', child: Text('Female')),
                      DropdownMenuItem(value: 'Unknown', child: Text('Unknown')),
                    ],
                    onChanged: (v) => setState(() => _sex = v!),
                  ),
                ])),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Approximate Age', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _ageCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(hintText: 'e.g. 2-3 years'),
                  ),
                ])),
              ]),
              const SizedBox(height: 16),

              // Color & Breed
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Color', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _colorCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(hintText: 'e.g. Brown & White'),
                  ),
                ])),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Breed', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _breedCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(hintText: 'e.g. Indian Pariah'),
                  ),
                ])),
              ]),
              const SizedBox(height: 16),

              // Features
              const Text('Distinctive Features', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _featuresCtrl,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(hintText: 'e.g. Cut on right ear, limp on back leg'),
              ),
              const SizedBox(height: 16),

              // Location GPS
              const Text('Initial Location (GPS)', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _gettingGps ? null : _captureGps,
                icon: const Icon(Icons.my_location, size: 18),
                label: Text(_position != null
                    ? 'GPS: ${_position!.latitude.toStringAsFixed(4)}, ${_position!.longitude.toStringAsFixed(4)}'
                    : _gettingGps ? 'Capturing GPS...' : 'Capture GPS Location'),
              ),
              const SizedBox(height: 16),

              // Notes
              const Text('Notes', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              TextFormField(
                controller: _notesCtrl,
                maxLines: 3,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(hintText: 'Additional details or behavior notes'),
              ),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Register Animal 🐾'),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
