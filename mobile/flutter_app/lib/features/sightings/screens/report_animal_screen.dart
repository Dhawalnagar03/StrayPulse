import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

class ReportAnimalScreen extends StatefulWidget {
  const ReportAnimalScreen({super.key});

  @override
  State<ReportAnimalScreen> createState() => _ReportAnimalScreenState();
}

class _ReportAnimalScreenState extends State<ReportAnimalScreen> {
  int _step = 0;

  // Web + Android compatible image storage.
  Uint8List? _photo;

  Position? _position;

  String _animalId = '';
  String _notes = '';

  bool _isFeedingPoint = false;
  bool _loading = false;

  String? _error;

  Map<String, dynamic>? _aiResult;

  final ImagePicker _picker = ImagePicker();

  final TextEditingController _animalIdCtrl =
      TextEditingController();

  final TextEditingController _notesCtrl =
      TextEditingController();

  @override
  void dispose() {
    _animalIdCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,

      appBar: AppBar(
        title: const Text('Report Sighting'),
        leading: IconButton(
          onPressed: () => context.go('/home'),
          icon: const Icon(Icons.close),
        ),
      ),

      body: Column(
        children: [
          // ======================================================
          // PROGRESS INDICATOR
          // ======================================================

          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: List.generate(
                4,
                (i) {
                  return Expanded(
                    child: Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: i <= _step
                                ? AppTheme.primaryGreen
                                : AppTheme.bgCard,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: i <= _step
                                  ? AppTheme.primaryGreen
                                  : AppTheme.borderColor,
                            ),
                          ),
                          child: Center(
                            child: i < _step
                                ? const Icon(
                                    Icons.check,
                                    size: 14,
                                    color: Colors.white,
                                  )
                                : Text(
                                    '${i + 1}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight:
                                          FontWeight.w600,
                                      color: i == _step
                                          ? Colors.white
                                          : AppTheme.textMuted,
                                    ),
                                  ),
                          ),
                        ),

                        if (i < 3)
                          Expanded(
                            child: Container(
                              height: 2,
                              color: i < _step
                                  ? AppTheme.primaryGreen
                                  : AppTheme.borderColor,
                            ),
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),

          // ======================================================
          // CONTENT
          // ======================================================

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: _buildStep(),
            ),
          ),

          // ======================================================
          // BOTTOM BUTTONS
          // ======================================================

          Padding(
            padding: const EdgeInsets.fromLTRB(
              20,
              0,
              20,
              24,
            ),
            child: Row(
              children: [
                if (_step > 0)
                  OutlinedButton(
                    onPressed: _loading
                        ? null
                        : () {
                            setState(() {
                              _step--;
                              _error = null;
                            });
                          },
                    child: const Text('Back'),
                  ),

                if (_step > 0)
                  const SizedBox(width: 12),

                Expanded(
                  child: ElevatedButton(
                    onPressed:
                        _loading ? null : _handleNext,
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child:
                                CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            _step == 3
                                ? 'Submit Sighting 🐾'
                                : 'Next →',
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // STEP CONTROLLER
  // ============================================================

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return _buildPhotoStep();

      case 1:
        return _buildGpsStep();

      case 2:
        return _buildDetailsStep();

      case 3:
        return _buildReviewStep();

      default:
        return const SizedBox();
    }
  }

  // ============================================================
  // STEP 1 - PHOTO
  // ============================================================

  Widget _buildPhotoStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '📸 Take a Photo',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),

        const SizedBox(height: 8),

        const Text(
          'Photograph the animal clearly. AI will attempt to identify and match it.',
          style: TextStyle(
            color: AppTheme.textSecondary,
          ),
        ),

        const SizedBox(height: 24),

        // ========================================================
        // IMAGE PICKER
        // ========================================================

        GestureDetector(
          onTap: _pickPhoto,
          child: Container(
            width: double.infinity,
            height: 240,
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _photo != null
                    ? AppTheme.primaryGreen
                    : AppTheme.borderColor,
                width: 2,
              ),
            ),

            child: _photo != null
                ? ClipRRect(
                    borderRadius:
                        BorderRadius.circular(18),

                    // IMPORTANT:
                    // Image.memory works on Web + Android.
                    child: Image.memory(
                      _photo!,
                      width: double.infinity,
                      height: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  )
                : Column(
                    mainAxisAlignment:
                        MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.camera_alt_outlined,
                        size: 56,
                        color: AppTheme.textMuted,
                      ),

                      const SizedBox(height: 12),

                      const Text(
                        'Tap to take photo or choose from gallery',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color:
                              AppTheme.textSecondary,
                        ),
                      ),

                      const SizedBox(height: 16),

                      Row(
                        mainAxisAlignment:
                            MainAxisAlignment.center,
                        children: [
                          OutlinedButton.icon(
                            onPressed:
                                _loading
                                    ? null
                                    : _takeCamera,
                            icon: const Icon(
                              Icons.camera_alt,
                              size: 18,
                            ),
                            label:
                                const Text('Camera'),
                          ),

                          const SizedBox(width: 12),

                          OutlinedButton.icon(
                            onPressed:
                                _loading
                                    ? null
                                    : _pickGallery,
                            icon: const Icon(
                              Icons.photo_library,
                              size: 18,
                            ),
                            label:
                                const Text('Gallery'),
                          ),
                        ],
                      ),
                    ],
                  ),
          ),
        ),

        // ========================================================
        // AI RESULT
        // ========================================================

        if (_aiResult != null) ...[
          const SizedBox(height: 16),

          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.primaryGreen
                  .withOpacity(0.1),
              borderRadius:
                  BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.primaryGreen
                    .withOpacity(0.3),
              ),
            ),

            child: Row(
              children: [
                const Icon(
                  Icons.auto_awesome,
                  color: AppTheme.primaryGreen,
                  size: 20,
                ),

                const SizedBox(width: 10),

                Expanded(
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'AI Detection Result',
                        style: TextStyle(
                          color:
                              AppTheme.primaryGreen,
                          fontWeight:
                              FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),

                      const SizedBox(height: 4),

                      Text(
                        _aiResult![
                                'detection_result']
                            ?['detected_animal'] ??
                            'Unknown',
                        style:
                            const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                      ),

                      if (_aiResult!['matches'] !=
                              null &&
                          (_aiResult!['matches']
                                  as List)
                              .isNotEmpty)
                        Text(
                          'Possible match: '
                          '${_aiResult!['matches'][0]['animal_id']}',
                          style:
                              const TextStyle(
                            color: AppTheme
                                .textSecondary,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],

        if (_error != null) ...[
          const SizedBox(height: 16),
          _errorBox(_error!),
        ],
      ],
    );
  }

  // ============================================================
  // STEP 2 - GPS
  // ============================================================

  Widget _buildGpsStep() {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        const Text(
          '📍 Confirm Location',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),

        const SizedBox(height: 8),

        const Text(
          'Capture your GPS location where you spotted the animal.',
          style: TextStyle(
            color: AppTheme.textSecondary,
          ),
        ),

        const SizedBox(height: 24),

        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed:
                _loading ? null : _captureGPS,
            icon: const Icon(
              Icons.my_location,
              color: Colors.white,
            ),
            label: Text(
              _position != null
                  ? 'Update GPS Location'
                  : 'Capture GPS Location',
              style: const TextStyle(
                color: Colors.white,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  AppTheme.accentBlue,
            ),
          ),
        ),

        if (_position != null) ...[
          const SizedBox(height: 16),

          Container(
            padding:
                const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.bgCard,
              borderRadius:
                  BorderRadius.circular(16),
              border: Border.all(
                color: AppTheme.borderColor,
              ),
            ),
            child: Column(
              children: [
                _coordRow(
                  'Latitude',
                  _position!.latitude
                      .toStringAsFixed(6),
                ),

                const Divider(
                  color: AppTheme.borderColor,
                  height: 16,
                ),

                _coordRow(
                  'Longitude',
                  _position!.longitude
                      .toStringAsFixed(6),
                ),

                const Divider(
                  color: AppTheme.borderColor,
                  height: 16,
                ),

                _coordRow(
                  'Accuracy',
                  '±${_position!.accuracy.toStringAsFixed(1)} meters',
                ),
              ],
            ),
          ),
        ],

        if (_error != null) ...[
          const SizedBox(height: 16),
          _errorBox(_error!),
        ],
      ],
    );
  }

  Widget _coordRow(
    String label,
    String value,
  ) {
    return Row(
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 13,
          ),
        ),

        const Spacer(),

        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ],
    );
  }

  // ============================================================
  // STEP 3 - DETAILS
  // ============================================================

  Widget _buildDetailsStep() {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        const Text(
          '🐾 Animal Details',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),

        const SizedBox(height: 24),

        const Text(
          'Animal ID',
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),

        const SizedBox(height: 8),

        TextFormField(
          controller: _animalIdCtrl,
          style: const TextStyle(
            color: Colors.white,
            fontFamily: 'monospace',
          ),
          decoration:
              const InputDecoration(
            hintText: 'e.g. DOG-00001',
            prefixIcon: Icon(
              Icons.pets,
              color: AppTheme.textMuted,
              size: 18,
            ),
          ),
          onChanged: (value) {
            _animalId = value.trim();
          },
        ),

        const SizedBox(height: 16),

        const Text(
          'Notes (optional)',
          style: TextStyle(
            color: AppTheme.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),

        const SizedBox(height: 8),

        TextFormField(
          controller: _notesCtrl,
          style: const TextStyle(
            color: Colors.white,
          ),
          maxLines: 3,
          decoration:
              const InputDecoration(
            hintText:
                'Animal condition, behavior, etc.',
          ),
          onChanged: (value) {
            _notes = value;
          },
        ),

        const SizedBox(height: 16),

        Row(
          children: [
            Switch(
              value: _isFeedingPoint,
              onChanged: (value) {
                setState(() {
                  _isFeedingPoint = value;
                });
              },
              activeColor:
                  AppTheme.primaryGreen,
            ),

            const SizedBox(width: 12),

            const Text(
              'This is a feeding point',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
              ),
            ),
          ],
        ),

        if (_error != null) ...[
          const SizedBox(height: 16),
          _errorBox(_error!),
        ],
      ],
    );
  }

  // ============================================================
  // STEP 4 - REVIEW
  // ============================================================

  Widget _buildReviewStep() {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        const Text(
          '✅ Review & Submit',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),

        const SizedBox(height: 24),

        if (_photo != null) ...[
          ClipRRect(
            borderRadius:
                BorderRadius.circular(16),

            child: Image.memory(
              _photo!,
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),

          const SizedBox(height: 16),
        ],

        _reviewRow(
          'Animal ID',
          _animalId.isEmpty
              ? 'Not provided'
              : _animalId,
        ),

        _reviewRow(
          'Latitude',
          _position?.latitude
                  .toStringAsFixed(6) ??
              'Not captured',
        ),

        _reviewRow(
          'Longitude',
          _position?.longitude
                  .toStringAsFixed(6) ??
              'Not captured',
        ),

        _reviewRow(
          'Feeding Point',
          _isFeedingPoint
              ? 'Yes'
              : 'No',
        ),

        if (_notes.isNotEmpty)
          _reviewRow(
            'Notes',
            _notes,
          ),

        if (_error != null) ...[
          const SizedBox(height: 12),
          _errorBox(_error!),
        ],
      ],
    );
  }

  Widget _reviewRow(
    String label,
    String value,
  ) {
    return Padding(
      padding:
          const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                color:
                    AppTheme.textSecondary,
                fontSize: 13,
              ),
            ),
          ),

          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight:
                    FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // ERROR BOX
  // ============================================================

  Widget _errorBox(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color:
            Colors.red.withOpacity(0.1),
        borderRadius:
            BorderRadius.circular(12),
        border: Border.all(
          color:
              Colors.red.withOpacity(0.25),
        ),
      ),
      child: Text(
        message,
        style: const TextStyle(
          color: Colors.red,
          fontSize: 13,
        ),
      ),
    );
  }

  // ============================================================
  // IMAGE PICKER
  // ============================================================

  Future<void> _pickPhoto() async {
    await _pickGallery();
  }

  // ------------------------------------------------------------
  // CAMERA
  // ------------------------------------------------------------

  Future<void> _takeCamera() async {
    try {
      final XFile? xf =
          await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
        maxWidth: 1080,
      );

      if (xf == null) return;

      final Uint8List bytes =
          await xf.readAsBytes();

      if (!mounted) return;

      setState(() {
        _photo = bytes;
        _aiResult = null;
        _error = null;
      });

      await _runAIDetection(bytes);
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error =
            'Unable to capture image: $e';
      });
      debugPrint('SUBMIT SIGHTING ERROR: $e');
    }
  }

  // ------------------------------------------------------------
  // GALLERY
  // ------------------------------------------------------------

  Future<void> _pickGallery() async {
    try {
      final XFile? xf =
          await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
        maxWidth: 1080,
      );

      if (xf == null) return;

      final Uint8List bytes =
          await xf.readAsBytes();

      if (!mounted) return;

      setState(() {
        _photo = bytes;
        _aiResult = null;
        _error = null;
      });

      await _runAIDetection(bytes);
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error =
            'Unable to select image: $e';
      });
    }
  }

  // ============================================================
  // AI DETECTION
  // ============================================================

  Future<void> _runAIDetection(
    Uint8List bytes,
  ) async {
    try {
      if (!mounted) return;

      setState(() {
        _loading = true;
      });

      final result =
          await ApiService.instance
              .detectAnimal(bytes);

      if (!mounted) return;

      setState(() {
        _aiResult = result;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;

      // Photo remains selected even if
      // AI detection is unavailable.
      setState(() {
        _loading = false;
        _aiResult = null;
      });

      ScaffoldMessenger.of(context)
          .showSnackBar(
        const SnackBar(
          content: Text(
            'Image selected. AI detection is unavailable right now.',
          ),
        ),
      );
    }
  }

  // ============================================================
  // GPS
  // ============================================================

  Future<void> _captureGPS() async {
    try {
      setState(() {
        _loading = true;
        _error = null;
      });

      final bool serviceEnabled =
          await Geolocator
              .isLocationServiceEnabled();

      if (!serviceEnabled) {
        if (!mounted) return;

        setState(() {
          _loading = false;
          _error =
              'Please enable location services.';
        });

        return;
      }

      LocationPermission permission =
          await Geolocator.checkPermission();

      if (permission ==
          LocationPermission.denied) {
        permission =
            await Geolocator.requestPermission();
      }

      if (permission ==
          LocationPermission.denied) {
        if (!mounted) return;

        setState(() {
          _loading = false;
          _error =
              'Location permission was denied.';
        });

        return;
      }

      if (permission ==
          LocationPermission.deniedForever) {
        if (!mounted) return;

        setState(() {
          _loading = false;
          _error =
              'Location permission is permanently denied. '
              'Please enable it from browser/device settings.';
        });

        return;
      }

      final Position position =
          await Geolocator
              .getCurrentPosition(
        desiredAccuracy:
            LocationAccuracy.high,
      );

      if (!mounted) return;

      setState(() {
        _position = position;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _error = 'GPS error: $e';
      });
    }
  }

  // ============================================================
  // NEXT BUTTON
  // ============================================================

  Future<void> _handleNext() async {
    setState(() {
      _error = null;
    });

    // ----------------------------------------------------------
    // PHOTO STEP
    // ----------------------------------------------------------

    if (_step == 0) {
      if (_photo == null) {
        setState(() {
          _error =
              'Please take or select an animal photo first.';
        });

        return;
      }

      setState(() {
        _step = 1;
      });

      return;
    }

    // ----------------------------------------------------------
    // GPS STEP
    // ----------------------------------------------------------

    if (_step == 1) {
      if (_position == null) {
        setState(() {
          _error =
              'Please capture your GPS location first.';
        });

        return;
      }

      setState(() {
        _step = 2;
      });

      return;
    }

    // ----------------------------------------------------------
    // DETAILS STEP
    // ----------------------------------------------------------

    if (_step == 2) {
      if (_animalId.trim().isEmpty) {
        setState(() {
          _error =
              'Please enter the Animal ID.';
        });

        return;
      }

      setState(() {
        _step = 3;
      });

      return;
    }

    // ----------------------------------------------------------
    // REVIEW / SUBMIT
    // ----------------------------------------------------------

    await _submitSighting();
  }

  // ============================================================
  // SUBMIT SIGHTING
  // ============================================================

  Future<void> _submitSighting() async {
    if (_animalId.trim().isEmpty ||
        _position == null) {
      setState(() {
        _error =
            'Animal ID and GPS location are required.';
      });

      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result =
          await ApiService.instance
              .submitSighting({
        'animal_id': _animalId.trim(),
        'latitude':
            _position!.latitude,
        'longitude':
            _position!.longitude,
        'gps_accuracy_meters':
            _position!.accuracy,
        'notes':
            _notes.trim().isEmpty
                ? null
                : _notes.trim(),
        'is_feeding_point':
            _isFeedingPoint,
      });

      // --------------------------------------------------------
      // UPLOAD PHOTO
      // --------------------------------------------------------

      if (_photo != null &&
          result['id'] != null) {
        await ApiService.instance
            .uploadSightingPhoto(
          result['id'],
          _photo!,
        );
      }

      if (!mounted) return;

      setState(() {
        _loading = false;
      });

      ScaffoldMessenger.of(context)
          .showSnackBar(
        const SnackBar(
          content: Text(
            '✅ Sighting submitted successfully!',
          ),
          backgroundColor:
              AppTheme.primaryGreen,
        ),
      );

      context.go('/home');
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _loading = false;
        _error =
            'Submission failed. Please check your connection and try again.';
      });
    }
  }
}