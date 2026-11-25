import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});
  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  String _activeFilter = 'all'; // 'all', 'sightings', 'feeding', 'predictions'
  List<dynamic> _feeding = [];
  List<dynamic> _sightings = [];
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final f = await ApiService.instance.getFeedingLocations();
      final s = await ApiService.instance.getNearbySightings(12.9716, 77.5946, radiusKm: 5);
      setState(() {
        _feeding = f;
        _sightings = s;
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('Map Explorer'),
        leading: IconButton(onPressed: () => context.go('/home'), icon: const Icon(Icons.arrow_back)),
        actions: [
          IconButton(onPressed: _loadData, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: Column(
        children: [
          // Layer filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _filterChip('all', 'All Layers', Icons.layers, AppTheme.primaryGreen),
                const SizedBox(width: 8),
                _filterChip('sightings', 'Sightings (${_sightings.length})', Icons.location_on, AppTheme.accentBlue),
                const SizedBox(width: 8),
                _filterChip('feeding', 'Feeding (${_feeding.length})', Icons.restaurant, AppTheme.accentOrange),
                const SizedBox(width: 8),
                _filterChip('predictions', 'AI Predictions', Icons.psychology, AppTheme.accentPurple),
              ],
            ),
          ),

          // Map Area Representation
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.bgCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.borderColor),
              ),
              child: Stack(
                children: [
                  // Map Background placeholder
                  Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 80, height: 80,
                          decoration: BoxDecoration(
                            color: AppTheme.primaryGreen.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.map, size: 40, color: AppTheme.primaryGreen),
                        ),
                        const SizedBox(height: 14),
                        const Text('Interactive Map Explorer',
                          style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, fontSize: 18, color: Colors.white)),
                        const SizedBox(height: 4),
                        const Text('Bangalore Grid — 500m Cells',
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                        const SizedBox(height: 16),
                        Wrap(
                          spacing: 12,
                          alignment: WrapAlignment.center,
                          children: [
                            _legendDot('Recent Sightings', AppTheme.accentBlue),
                            _legendDot('Feeding Points', AppTheme.accentOrange),
                            _legendDot('Predicted Zones', AppTheme.accentPurple),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Active markers badge
                  Positioned(
                    top: 16, right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.bgSecondary.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Text(
                        '${_sightings.length} Sightings · ${_feeding.length} Feeding Points',
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Bottom List Sheet
          Container(
            height: 220,
            decoration: const BoxDecoration(
              color: AppTheme.bgSecondary,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Text(
                    _activeFilter == 'feeding' ? 'Feeding Locations' : 'Nearby Sighting Reports',
                    style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, fontSize: 15, color: Colors.white),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _activeFilter == 'feeding' ? _feeding.length : _sightings.length,
                    itemBuilder: (ctx, i) {
                      if (_activeFilter == 'feeding') {
                        final f = _feeding[i];
                        return ListTile(
                          leading: Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(color: AppTheme.accentOrange.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                            child: const Icon(Icons.restaurant, color: AppTheme.accentOrange, size: 18),
                          ),
                          title: Text(f['name'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                          subtitle: Text('${f['feeding_time'] ?? '08:00 AM'} · ${f['feeding_frequency'] ?? 'Daily'}',
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                          trailing: const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 18),
                          onTap: () => context.go('/feeding'),
                        );
                      } else {
                        final s = _sightings[i];
                        return ListTile(
                          leading: Container(
                            width: 36, height: 36,
                            decoration: BoxDecoration(color: AppTheme.accentBlue.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
                            child: const Icon(Icons.location_on, color: AppTheme.accentBlue, size: 18),
                          ),
                          title: Text(s['animal_id'] ?? 'Sighting', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600, fontFamily: 'monospace')),
                          subtitle: Text('${s['time_of_day'] ?? ''} · ${s['weather_condition'] ?? 'Clear'}', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryGreen.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(s['verification_status'] ?? 'Verified', style: const TextStyle(color: AppTheme.primaryGreen, fontSize: 10, fontWeight: FontWeight.w600)),
                          ),
                          onTap: () => context.go('/animals/${s['animal_id']}'),
                        );
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String id, String label, IconData icon, Color color) {
    final sel = _activeFilter == id;
    return ChoiceChip(
      avatar: Icon(icon, size: 16, color: sel ? Colors.white : color),
      label: Text(label),
      selected: sel,
      selectedColor: color,
      backgroundColor: AppTheme.bgCard,
      labelStyle: TextStyle(color: sel ? Colors.white : AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
      onSelected: (s) { if (s) setState(() => _activeFilter = id); },
    );
  }

  Widget _legendDot(String label, Color color) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
    ],
  );
}
