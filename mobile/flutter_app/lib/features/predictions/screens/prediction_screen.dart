import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

class PredictionScreen extends StatefulWidget {
  final String animalId;
  const PredictionScreen({super.key, required this.animalId});

  @override
  State<PredictionScreen> createState() => _PredictionScreenState();
}

class _PredictionScreenState extends State<PredictionScreen> {
  Map<String, dynamic>? _prediction;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final p = await ApiService.instance.getPrediction(widget.animalId);
      setState(() {
        _prediction = p;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: AppTheme.bgPrimary,
        appBar: AppBar(title: Text('AI Analytics — ${widget.animalId}')),
        body: const Center(child: CircularProgressIndicator(color: AppTheme.primaryGreen)),
      );
    }

    final hasPred = _prediction != null && _prediction!.containsKey('confidence');
    final isInsufficient = _prediction != null && _prediction!.containsKey('minimum_required');

    final confidence = hasPred ? (_prediction!['confidence'] as num).toDouble() : 0.0;
    final confPercent = hasPred ? _prediction!['confidence_percent'] : 0;
    final confColor = confidence >= 0.75
        ? AppTheme.primaryGreen
        : confidence >= 0.50
            ? AppTheme.accentOrange
            : Colors.red;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
  title: Text('AI Analytics — ${widget.animalId}'),
  leading: IconButton(
    onPressed: () {
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/home');
      }
    },
    icon: const Icon(Icons.arrow_back),
  ),
),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.accentPurple.withOpacity(0.2), AppTheme.primaryGreen.withOpacity(0.1)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.accentPurple.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      color: AppTheme.accentPurple.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.psychology, color: AppTheme.accentPurple, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('AI MOVEMENT PREDICTION',
                          style: TextStyle(color: AppTheme.accentPurple, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.1)),
                        const SizedBox(height: 2),
                        Text(widget.animalId,
                          style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w800, fontSize: 20, color: Colors.white)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (hasPred) ...[
              // Prediction Main Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on, color: AppTheme.primaryGreen, size: 22),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _prediction!['predicted_zone'] ?? 'Unknown Area',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: confColor.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: confColor.withOpacity(0.3)),
                            ),
                            child: Text(
                              '${_prediction!['confidence_label']} ($confPercent%)',
                              style: TextStyle(color: confColor, fontSize: 12, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(color: AppTheme.borderColor),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Expected Time Window', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                const SizedBox(height: 4),
                                Text(
                                  '${_prediction!['time_start']} – ${_prediction!['time_end']}',
                                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Uncertainty Radius', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                const SizedBox(height: 4),
                                Text(
                                  '±${_prediction!['prediction_radius_meters'] ?? 500}m grid cell',
                                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      const Text('Confidence Level', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: confidence,
                          minHeight: 10,
                          backgroundColor: AppTheme.bgPrimary,
                          valueColor: AlwaysStoppedAnimation<Color>(confColor),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Why this prediction? (Model Factors)
              if (_prediction!['factors'] != null && (_prediction!['factors'] as List).isNotEmpty) ...[
                const Text('Why this prediction?', style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
                const SizedBox(height: 10),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: (_prediction!['factors'] as List).map((f) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.check_circle_outline, color: AppTheme.primaryGreen, size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(f.toString(), style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.4)),
                            ),
                          ],
                        ),
                      )).toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // Model Metadata Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Model Metadata', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 14)),
                      const SizedBox(height: 10),
                      _metaRow('ML Model', _prediction!['model_name'] ?? 'XGBoost Grid Classifier'),
                      _metaRow('Model Version', _prediction!['model_version'] ?? 'v1.0.0'),
                      _metaRow('Sightings Used', '${_prediction!['training_sightings_used'] ?? 0} historical sightings'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Ethical Disclaimer
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.accentOrange.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppTheme.accentOrange.withOpacity(0.25)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.info_outline, color: AppTheme.accentOrange, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Predictions are probabilistic estimates based on historical patterns. Actual animal locations may differ. Always cross-check with ground volunteers.',
                        style: TextStyle(color: AppTheme.accentOrange, fontSize: 11, height: 1.4),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Cold Start Banner (Insufficient Data)
            if (isInsufficient || !hasPred) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      const Icon(Icons.show_chart_rounded, color: AppTheme.accentOrange, size: 48),
                      const SizedBox(height: 14),
                      const Text('Not Enough Historical Data',
                        style: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, fontSize: 18, color: Colors.white)),
                      const SizedBox(height: 8),
                      Text(
                        _prediction?['message'] ?? 'More sightings are needed before a reliable individual movement prediction can be generated.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.5),
                      ),
                      if (_prediction != null && _prediction!['sightings_count'] != null) ...[
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: (_prediction!['sightings_count'] as num) / (_prediction!['minimum_required'] as num),
                            minHeight: 8,
                            backgroundColor: AppTheme.bgPrimary,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accentOrange),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${_prediction!['sightings_count']} / ${_prediction!['minimum_required']} sightings collected',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                        ),
                      ],
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: () => context.go('/report'),
                        icon: const Icon(Icons.add_a_photo, size: 16),
                        label: const Text('Report Sighting to Help Train'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _metaRow(String label, String value) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(
      children: [
        Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 12)),
        const Spacer(),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
      ],
    ),
  );
}
