import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

class AnimalDetailScreen extends StatefulWidget {
  final String animalId;
  const AnimalDetailScreen({super.key, required this.animalId});

  @override
  State<AnimalDetailScreen> createState() => _AnimalDetailScreenState();
}

class _AnimalDetailScreenState extends State<AnimalDetailScreen> {
  Map<String, dynamic>? _animal;
  List<dynamic> _sightings = [];
  Map<String, dynamic>? _prediction;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final animal = await ApiService.instance.getAnimal(widget.animalId);
      final sightings = await ApiService.instance.getAnimalSightings(widget.animalId);
      Map<String, dynamic>? prediction;
      try {
        prediction = await ApiService.instance.getPrediction(widget.animalId);
      } catch (_) {}
      setState(() {
        _animal = animal;
        _sightings = sightings;
        _prediction = prediction;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: AppTheme.bgPrimary,
        body: Center(child: CircularProgressIndicator(color: AppTheme.primaryGreen)),
      );
    }
    if (_animal == null) {
      return Scaffold(
        backgroundColor: AppTheme.bgPrimary,
        appBar: AppBar(title: const Text('Animal')),
        body: const Center(child: Text('Animal not found', style: TextStyle(color: AppTheme.textSecondary))),
      );
    }

    final animal = _animal!;
    final isActive = animal['status'] == 'Active';
    final hasPrediction = _prediction != null && _prediction!.containsKey('confidence');
    final confidence = hasPrediction ? (_prediction!['confidence'] as num).toDouble() : 0.0;
    final confidenceColor = confidence >= 0.75 ? AppTheme.primaryGreen : confidence >= 0.50 ? AppTheme.accentOrange : Colors.red;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: AppTheme.bgSecondary,
            leading: IconButton(onPressed: () => context.go('/animals'), icon: const Icon(Icons.arrow_back)),
            flexibleSpace: FlexibleSpaceBar(
              title: Text(animal['animal_id'] ?? '', style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w800, fontSize: 16)),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [AppTheme.primaryGreen.withOpacity(0.3), AppTheme.bgPrimary],
                  ),
                ),
                child: Center(child: Text(
                  animal['animal_type'] == 'Dog' ? '🐕' : animal['animal_type'] == 'Cat' ? '🐈' : '🐾',
                  style: const TextStyle(fontSize: 80),
                )),
              ),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Status + tags
                Wrap(spacing: 8, children: [
                  _badge(isActive ? '🟢 Active' : '⚫ ${animal['status']}', isActive ? AppTheme.primaryGreen : Colors.grey),
                  if (animal['animal_type'] != null) _badge(animal['animal_type'], AppTheme.accentBlue),
                  if (animal['sex'] != null) _badge(animal['sex'], AppTheme.accentPurple),
                  if (animal['is_demo'] == true) _badge('Demo', AppTheme.accentOrange),
                ]),
                const SizedBox(height: 20),

                // AI Prediction Card
                if (hasPrediction) ...[
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppTheme.primaryGreen.withOpacity(0.12), AppTheme.accentBlue.withOpacity(0.06)],
                        begin: Alignment.topLeft, end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.primaryGreen.withOpacity(0.3)),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        const Icon(Icons.psychology, color: AppTheme.primaryGreen, size: 20),
                        const SizedBox(width: 8),
                        const Text('AI Prediction', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 16)),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: AppTheme.accentPurple.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                          child: Text(_prediction!['model_name'] ?? 'AI', style: const TextStyle(color: AppTheme.accentPurple, fontSize: 11, fontWeight: FontWeight.w600)),
                        ),
                      ]),
                      const SizedBox(height: 14),
                      const Text('Likely Location Tomorrow', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      const SizedBox(height: 4),
                      Row(children: [
                        const Icon(Icons.location_on, color: AppTheme.primaryGreen, size: 18),
                        const SizedBox(width: 6),
                        Expanded(child: Text(_prediction!['predicted_zone'] ?? 'Unknown Zone',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white))),
                      ]),
                      const SizedBox(height: 12),
                      Row(children: [
                        Expanded(child: _predStat('Time Window', '${_prediction!['time_start']} – ${_prediction!['time_end']}')),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Confidence', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                          Text('${_prediction!['confidence_percent']}%',
                            style: TextStyle(color: confidenceColor, fontSize: 22, fontWeight: FontWeight.w800)),
                        ])),
                      ]),
                      const SizedBox(height: 10),
                      LinearProgressIndicator(
                        value: confidence,
                        backgroundColor: AppTheme.bgCard,
                        valueColor: AlwaysStoppedAnimation<Color>(confidenceColor),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      const SizedBox(height: 10),
                      ElevatedButton.icon(
                        onPressed: () => context.go('/map'),
                        icon: const Icon(Icons.map, size: 16),
                        label: const Text('View on Map'),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryGreen, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10)),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 16),
                ],

                // Insufficient data
                if (!hasPrediction && _prediction != null && _prediction!.containsKey('minimum_required')) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.accentOrange.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.accentOrange.withOpacity(0.3)),
                    ),
                    child: Column(children: [
                      const Icon(Icons.warning_amber, color: AppTheme.accentOrange, size: 32),
                      const SizedBox(height: 8),
                      const Text('Insufficient Data', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                      Text('${_prediction!['sightings_count']} / ${_prediction!['minimum_required']} sightings needed',
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                    ]),
                  ),
                  const SizedBox(height: 16),
                ],

                // Animal details
                _sectionCard('Animal Details', [
                  if (animal['name_label'] != null) _detailRow('Name', animal['name_label']),
                  _detailRow('Type', animal['animal_type']),
                  if (animal['breed'] != null) _detailRow('Breed', animal['breed']),
                  if (animal['color'] != null) _detailRow('Color', animal['color']),
                  if (animal['sex'] != null) _detailRow('Sex', animal['sex']),
                  if (animal['approximate_age'] != null) _detailRow('Age', animal['approximate_age']),
                  _detailRow('Sightings', '${animal['total_sightings']}'),
                  if (animal['most_common_area'] != null) _detailRow('Common Area', animal['most_common_area']),
                ]),
                const SizedBox(height: 16),

                // Recent sightings
                _sectionCard('Recent Sightings (${_sightings.length})',
                  _sightings.take(5).map((s) => _SightingTile(sighting: s)).toList()),

                const SizedBox(height: 24),
              ]),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/report'),
        backgroundColor: AppTheme.primaryGreen,
        icon: const Icon(Icons.add_a_photo, color: Colors.white),
        label: const Text('Report Sighting', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _badge(String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: color.withOpacity(0.12),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: color.withOpacity(0.3)),
    ),
    child: Text(text, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
  );

  Widget _predStat(String label, String value) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
    const SizedBox(height: 2),
    Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
  ]);

  Widget _sectionCard(String title, List<Widget> children) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 15)),
        const SizedBox(height: 12),
        ...children,
      ]),
    ),
  );

  Widget _detailRow(String label, String? value) {
    if (value == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(children: [
        SizedBox(width: 100, child: Text(label, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13))),
        Expanded(child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500))),
      ]),
    );
  }
}

class _SightingTile extends StatelessWidget {
  final Map<String, dynamic> sighting;
  const _SightingTile({required this.sighting});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(children: [
      Container(
        width: 36, height: 36,
        decoration: BoxDecoration(color: AppTheme.accentBlue.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
        child: const Icon(Icons.visibility, color: AppTheme.accentBlue, size: 18),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(sighting['timestamp']?.toString().substring(0, 16).replaceFirst('T', ' ') ?? '',
          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500)),
        Text('${sighting['time_of_day']} · ${sighting['weather_condition'] ?? 'N/A'}',
          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
      ])),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: sighting['verification_status'] == 'Verified' ? AppTheme.primaryGreen.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(sighting['verification_status'] ?? 'Pending',
          style: TextStyle(fontSize: 10, color: sighting['verification_status'] == 'Verified' ? AppTheme.primaryGreen : AppTheme.textMuted)),
      ),
    ]),
  );
}
