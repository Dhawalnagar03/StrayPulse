import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';
import '../../../core/utils/ist_date.dart';

class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  List<dynamic> _sightings = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSightings();
  }

  Future<void> _loadSightings() async {
    setState(() => _loading = true);
    try {
      final s = await ApiService.instance.getNearbySightings(12.9716, 77.5946, radiusKm: 10);
      setState(() {
        _sightings = s;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('My Sighting Reports'),
        leading: IconButton(onPressed: () => context.go('/home'), icon: const Icon(Icons.arrow_back)),
        actions: [
          IconButton(onPressed: _loadSightings, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryGreen))
          : _sightings.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.history, size: 64, color: AppTheme.textMuted),
                      const SizedBox(height: 16),
                      const Text('No Sighting Reports Yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white)),
                      const SizedBox(height: 8),
                      const Text('Your reported stray animal sightings will appear here', style: TextStyle(color: AppTheme.textSecondary)),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: () => context.go('/report'),
                        icon: const Icon(Icons.add_a_photo, size: 16),
                        label: const Text('Report a Sighting'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadSightings,
                  color: AppTheme.primaryGreen,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _sightings.length,
                    itemBuilder: (ctx, i) {
                      final s = _sightings[i];
                      final isVerified = s['verification_status'] == 'Verified';
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
                                    width: 44, height: 44,
                                    decoration: BoxDecoration(
                                      color: AppTheme.accentBlue.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.location_on, color: AppTheme.accentBlue, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          s['animal_id'] ?? 'Animal Sighting',
                                          style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, fontSize: 15, color: Colors.white),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          formatDateTimeIst(s['timestamp']),
                                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: isVerified ? AppTheme.primaryGreen.withOpacity(0.12) : AppTheme.accentOrange.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      s['verification_status'] ?? 'Verified',
                                      style: TextStyle(
                                        color: isVerified ? AppTheme.primaryGreen : AppTheme.accentOrange,
                                        fontSize: 11, fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  const Icon(Icons.wb_sunny_outlined, size: 14, color: AppTheme.textMuted),
                                  const SizedBox(width: 4),
                                  Text(s['weather_condition'] ?? 'Clear', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                                  const SizedBox(width: 16),
                                  const Icon(Icons.gps_fixed, size: 14, color: AppTheme.textMuted),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${(s['latitude'] as num?)?.toStringAsFixed(4)}, ${(s['longitude'] as num?)?.toStringAsFixed(4)}',
                                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontFamily: 'monospace'),
                                  ),
                                ],
                              ),
                              if (s['notes'] != null && s['notes'].toString().isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Text(s['notes'], style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
