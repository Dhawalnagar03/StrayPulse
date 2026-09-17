import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

class FeedingPointsScreen extends StatefulWidget {
  const FeedingPointsScreen({super.key});

  @override
  State<FeedingPointsScreen> createState() => _FeedingPointsScreenState();
}

class _FeedingPointsScreenState extends State<FeedingPointsScreen> {
  List<dynamic> _feedingLocations = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadFeedingLocations();
  }

  Future<void> _loadFeedingLocations() async {
    setState(() => _loading = true);
    try {
      final locs = await ApiService.instance.getFeedingLocations();
      setState(() {
        _feedingLocations = locs;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _showAddModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.bgSecondary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => const _AddFeedingLocationModal(),
    ).then((_) => _loadFeedingLocations());
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _feedingLocations.where((loc) {
      final name = (loc['name'] ?? '').toString().toLowerCase();
      final notes = (loc['notes'] ?? '').toString().toLowerCase();
      final q = _search.toLowerCase();
      return name.contains(q) || notes.contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('Feeding Locations'),
        leading: IconButton(onPressed: () => context.go('/home'), icon: const Icon(Icons.arrow_back)),
        actions: [
          IconButton(onPressed: _showAddModal, icon: const Icon(Icons.add, color: AppTheme.primaryGreen)),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                hintText: 'Search feeding points...',
                prefixIcon: Icon(Icons.search, color: AppTheme.textMuted, size: 20),
              ),
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryGreen))
                : filtered.isEmpty
                    ? const Center(
                        child: Text('No feeding locations found', style: TextStyle(color: AppTheme.textSecondary)),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadFeedingLocations,
                        color: AppTheme.primaryGreen,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: filtered.length,
                          itemBuilder: (ctx, i) {
                            final loc = filtered[i];
                            final animalsCount = (loc['animal_ids'] as List?)?.length ?? 0;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          width: 40, height: 40,
                                          decoration: BoxDecoration(
                                            color: AppTheme.accentOrange.withOpacity(0.12),
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          child: const Icon(Icons.restaurant, color: AppTheme.accentOrange, size: 20),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                loc['name'] ?? 'Feeding Spot',
                                                style: const TextStyle(
                                                  fontFamily: 'Inter', fontWeight: FontWeight.w700,
                                                  fontSize: 15, color: Colors.white,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                '${loc['latitude']?.toStringAsFixed(4)}, ${loc['longitude']?.toStringAsFixed(4)}',
                                                style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, fontFamily: 'monospace'),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppTheme.primaryGreen.withOpacity(0.12),
                                            borderRadius: BorderRadius.circular(20),
                                          ),
                                          child: Text(
                                            loc['feeding_frequency'] ?? 'Daily',
                                            style: const TextStyle(color: AppTheme.primaryGreen, fontSize: 11, fontWeight: FontWeight.w600),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        const Icon(Icons.access_time, size: 14, color: AppTheme.textMuted),
                                        const SizedBox(width: 4),
                                        Text(
                                          loc['feeding_time'] ?? '08:00 AM',
                                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                        ),
                                        const SizedBox(width: 16),
                                        const Icon(Icons.pets, size: 14, color: AppTheme.accentPurple),
                                        const SizedBox(width: 4),
                                        Text(
                                          '$animalsCount animals linked',
                                          style: const TextStyle(color: AppTheme.accentPurple, fontSize: 12, fontWeight: FontWeight.w500),
                                        ),
                                      ],
                                    ),
                                    if (loc['notes'] != null && loc['notes'].toString().isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Text(
                                        loc['notes'],
                                        style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddModal,
        backgroundColor: AppTheme.accentOrange,
        icon: const Icon(Icons.add_location_alt, color: Colors.white),
        label: const Text('Add Point', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _AddFeedingLocationModal extends StatefulWidget {
  const _AddFeedingLocationModal();

  @override
  State<_AddFeedingLocationModal> createState() => _AddFeedingLocationModalState();
}

class _AddFeedingLocationModalState extends State<_AddFeedingLocationModal> {
  final _nameCtrl = TextEditingController();
  final _timeCtrl = TextEditingController(text: '08:00 AM');
  final _animalsCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String _frequency = 'Daily';
  Position? _pos;
  bool _gettingGps = false;
  bool _saving = false;

  Future<void> _captureGps() async {
    setState(() => _gettingGps = true);
    try {
      final pos = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      setState(() { _pos = pos; _gettingGps = false; });
    } catch (_) {
      setState(() => _gettingGps = false);
    }
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    setState(() => _saving = true);
    try {
      final animalIds = _animalsCtrl.text
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e.isNotEmpty)
          .toList();

      await ApiService.instance.createFeedingLocation({
        'name': _nameCtrl.text.trim(),
        'latitude': _pos?.latitude ?? 12.9716,
        'longitude': _pos?.longitude ?? 77.5946,
        'feeding_time': _timeCtrl.text.trim(),
        'feeding_frequency': _frequency,
        'animal_ids': animalIds,
        'notes': _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      });

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('✅ Feeding location created!'),
          backgroundColor: AppTheme.primaryGreen,
        ));
      }
    } catch (e) {
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text('Add Feeding Location', style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, fontSize: 18, color: Colors.white)),
              const Spacer(),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
            ],
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _nameCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(hintText: 'Location Name (e.g. Park Gate Feeder)'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _timeCtrl,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(hintText: 'Time (e.g. 08:00 AM)'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _frequency,
                  dropdownColor: AppTheme.bgCard,
                  style: const TextStyle(color: Colors.white, fontFamily: 'Inter'),
                  decoration: const InputDecoration(),
                  items: const [
                    DropdownMenuItem(value: 'Daily', child: Text('Daily')),
                    DropdownMenuItem(value: 'Twice Daily', child: Text('Twice Daily')),
                    DropdownMenuItem(value: 'Alternate Days', child: Text('Alternate Days')),
                    DropdownMenuItem(value: 'Weekly', child: Text('Weekly')),
                  ],
                  onChanged: (v) => setState(() => _frequency = v!),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _gettingGps ? null : _captureGps,
            icon: const Icon(Icons.my_location, size: 18),
            label: Text(_pos != null
                ? 'GPS: ${_pos!.latitude.toStringAsFixed(4)}, ${_pos!.longitude.toStringAsFixed(4)}'
                : _gettingGps ? 'Fetching GPS...' : 'Use Current GPS Location'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _animalsCtrl,
            style: const TextStyle(color: Colors.white, fontFamily: 'monospace'),
            decoration: const InputDecoration(hintText: 'Animal IDs (e.g. DOG-00001, CAT-00002)'),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _notesCtrl,
            maxLines: 2,
            style: const TextStyle(color: Colors.white),
            decoration: const InputDecoration(hintText: 'Notes & Landmark instructions'),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.accentOrange),
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Text('Save Feeding Location'),
            ),
          ),
        ],
      ),
    );
  }
}

extension IterableExtension<T> on Iterable<T> {
  List<T> filter(bool Function(T element) test) => where(test).toList();
}
