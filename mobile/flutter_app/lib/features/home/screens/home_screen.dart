import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';
import '../../auth/providers/auth_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;
  List<dynamic> _recentAnimals = [];
  Map<String, dynamic>? _featuredPrediction;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final animals = await ApiService.instance.getAnimals();
      Map<String, dynamic>? pred;
      if (animals.isNotEmpty) {
        final firstId = animals.first['animal_id'];
        try {
          pred = await ApiService.instance.getPrediction(firstId);
        } catch (_) {}
      }
      setState(() {
        _recentAnimals = animals;
        _featuredPrediction = pred;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          color: AppTheme.primaryGreen,
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(child: _buildHeader(auth)),

              // Featured AI Prediction Card
              if (_featuredPrediction != null && _featuredPrediction!.containsKey('confidence'))
                SliverToBoxAdapter(child: _buildPredictionCard(_featuredPrediction!))
              else
                SliverToBoxAdapter(child: _buildDefaultPredictionCard()),

              // Quick Actions Grid
              SliverToBoxAdapter(child: _buildQuickActions(context)),

              // Section Title
              SliverToBoxAdapter(child: _buildSectionTitle('Registered Stray Animals')),

              // Animals List
              _loading
                  ? const SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: CircularProgressIndicator(color: AppTheme.primaryGreen),
                        ),
                      ),
                    )
                  : SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => _AnimalTile(animal: _recentAnimals[i]),
                        childCount: _recentAnimals.length > 5 ? 5 : _recentAnimals.length,
                      ),
                    ),

              if (_recentAnimals.isEmpty && !_loading)
                const SliverToBoxAdapter(
                  child: _EmptyState(
                    icon: Icons.pets,
                    message: 'No animals registered yet.\nTap below to register a new stray animal.',
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomNav(context),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.go('/report'),
        backgroundColor: AppTheme.primaryGreen,
        elevation: 6,
        shape: const CircleBorder(),
        child: const Icon(Icons.add_a_photo, color: Colors.white, size: 26),
      ),
    );
  }

  Widget _buildHeader(AuthProvider auth) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
        child: Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Good morning, ${auth.userName.split(' ').first} 👋',
                  style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w800, fontSize: 22, color: Colors.white),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryGreen.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        auth.userRole.toUpperCase(),
                        style: const TextStyle(color: AppTheme.primaryGreen, fontSize: 10, fontWeight: FontWeight.w700),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text('StrayPulse — Predict. Locate. Rescue.', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                  ],
                ),
              ],
            ),
            const Spacer(),
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(
                color: AppTheme.primaryGreen.withOpacity(0.12),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppTheme.primaryGreen.withOpacity(0.3)),
              ),
              child: InkWell(
                onTap: () => context.go('/profile'),
                borderRadius: BorderRadius.circular(14),
                child: const Icon(Icons.person_outline, color: AppTheme.primaryGreen, size: 24),
              ),
            ),
          ],
        ),
      );

  Widget _buildPredictionCard(Map<String, dynamic> pred) {
    final conf = (pred['confidence_percent'] ?? 82).toInt();
    final animalId = pred['animal_id'] ?? 'DOG-00027';
    final zone = pred['predicted_zone'] ?? 'Market Road';
    final timeStart = pred['time_start'] ?? '7:00 AM';
    final timeEnd = pred['time_end'] ?? '9:00 AM';

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.accentPurple.withOpacity(0.2), AppTheme.bgCard],
          begin: Alignment.topLeft, end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.accentPurple.withOpacity(0.35)),
        boxShadow: [
          BoxShadow(color: AppTheme.accentPurple.withOpacity(0.1), blurRadius: 16, spreadRadius: 2),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.accentPurple.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.psychology, color: AppTheme.accentPurple, size: 14),
                    SizedBox(width: 4),
                    Text('AI PREDICTION SPOTLIGHT', style: TextStyle(color: AppTheme.accentPurple, fontSize: 10, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
              const Spacer(),
              Text('$conf% confidence', style: const TextStyle(color: AppTheme.primaryGreen, fontSize: 12, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const Text('🐕 ', style: TextStyle(fontSize: 24)),
              Text(
                animalId,
                style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w800, fontSize: 18, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Likely Location', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: AppTheme.primaryGreen, size: 14),
                        const SizedBox(width: 4),
                        Expanded(child: Text(zone, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700), overflow: TextOverflow.ellipsis)),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Tomorrow Window', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.access_time, color: AppTheme.accentBlue, size: 14),
                        const SizedBox(width: 4),
                        Text('$timeStart – $timeEnd', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => context.go('/prediction/$animalId'),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppTheme.accentPurple.withOpacity(0.5)),
                backgroundColor: AppTheme.accentPurple.withOpacity(0.1),
              ),
              child: const Text('View AI Analytics →', style: TextStyle(color: AppTheme.accentPurple, fontWeight: FontWeight.w600, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultPredictionCard() => Container(
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: AppTheme.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                Icon(Icons.psychology, color: AppTheme.accentPurple, size: 18),
                SizedBox(width: 8),
                Text('AI Spotting Prediction', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 14)),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Select any animal to generate AI movement prediction based on historical GPS sightings.',
              style: TextStyle(color: AppTheme.textSecondary, fontSize: 12, height: 1.4),
            ),
          ],
        ),
      );

  Widget _buildQuickActions(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Row(
          children: [
            _QuickAction(icon: Icons.camera_alt, label: 'Report\nSighting', color: AppTheme.primaryGreen, onTap: () => context.go('/report')),
            const SizedBox(width: 10),
            _QuickAction(icon: Icons.map, label: 'Map\nExplorer', color: AppTheme.accentBlue, onTap: () => context.go('/map')),
            const SizedBox(width: 10),
            _QuickAction(icon: Icons.pets, label: 'All\nAnimals', color: AppTheme.accentPurple, onTap: () => context.go('/animals')),
            const SizedBox(width: 10),
            _QuickAction(icon: Icons.restaurant, label: 'Feeding\nPoints', color: AppTheme.accentOrange, onTap: () => context.go('/feeding')),
          ],
        ),
      );

  Widget _buildSectionTitle(String title) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
        child: Row(
          children: [
            Text(title, style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
            const Spacer(),
            TextButton(
              onPressed: () => context.go('/animals'),
              child: const Text('See all →', style: TextStyle(color: AppTheme.primaryGreen, fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      );

  Widget _buildBottomNav(BuildContext context) => BottomNavigationBar(
        currentIndex: _tab,
        onTap: (i) {
          setState(() => _tab = i);
          const routes = ['/home', '/map', '/report', '/animals', '/profile'];
          if (i == 2) {
            context.go('/report');
          } else {
            context.go(routes[i]);
          }
        },
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.map_outlined), activeIcon: Icon(Icons.map), label: 'Map'),
          BottomNavigationBarItem(icon: Icon(Icons.add_circle_outline, color: Colors.transparent), label: 'Report'),
          BottomNavigationBarItem(icon: Icon(Icons.pets_outlined), activeIcon: Icon(Icons.pets), label: 'Animals'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'Profile'),
        ],
      );
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            height: 88,
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: color.withOpacity(0.25)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: color, size: 24),
                const SizedBox(height: 6),
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600, height: 1.2),
                ),
              ],
            ),
          ),
        ),
      );
}

class _AnimalTile extends StatelessWidget {
  final Map<String, dynamic> animal;
  const _AnimalTile({required this.animal});

  @override
  Widget build(BuildContext context) {
    final isActive = animal['status'] == 'Active';
    return InkWell(
      onTap: () => context.go('/animals/${animal['animal_id']}'),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 52, height: 52,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryGreen.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.primaryGreen.withOpacity(0.2)),
                  ),
                  child: Center(
                    child: Text(
                      animal['animal_type'] == 'Dog' ? '🐕' : animal['animal_type'] == 'Cat' ? '🐈' : '🐾',
                      style: const TextStyle(fontSize: 28),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(animal['animal_id'] ?? '', style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, color: Colors.white, fontSize: 14)),
                      Text(animal['name_label'] ?? animal['animal_type'] ?? '', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                      Text('${animal['total_sightings'] ?? 0} sightings', style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isActive ? AppTheme.primaryGreen.withOpacity(0.15) : Colors.grey.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: isActive ? AppTheme.primaryGreen.withOpacity(0.3) : Colors.grey.withOpacity(0.2)),
                  ),
                  child: Text(
                    isActive ? '🟢 Active' : '⚫ ${animal['status']}',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isActive ? AppTheme.primaryGreen : AppTheme.textMuted),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  const _EmptyState({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 56, color: AppTheme.textMuted),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 15, height: 1.6)),
          ],
        ),
      );
}
