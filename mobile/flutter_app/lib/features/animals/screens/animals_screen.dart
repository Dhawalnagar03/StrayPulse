import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';

class AnimalsScreen extends StatefulWidget {
  const AnimalsScreen({super.key});
  @override
  State<AnimalsScreen> createState() => _AnimalsScreenState();
}

class _AnimalsScreenState extends State<AnimalsScreen> {
  List<dynamic> _animals = [];
  bool _loading = true;
  String _search = '';
  String _typeFilter = '';

  @override
  void initState() {
    super.initState();
    _loadAnimals();
  }

  Future<void> _loadAnimals() async {
    setState(() => _loading = true);
    try {
      final animals = await ApiService.instance.getAnimals(
        search: _search.isEmpty ? null : _search,
        type: _typeFilter.isEmpty ? null : _typeFilter,
      );
      setState(() {
        _animals = animals;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: AppTheme.bgPrimary,
        appBar: AppBar(
          title: const Text('Registered Animals'),
          leading: IconButton(onPressed: () => context.go('/home'), icon: const Icon(Icons.arrow_back)),
          actions: [
            TextButton.icon(
              onPressed: () => context.go('/animals/new'),
              icon: const Icon(Icons.add, color: AppTheme.primaryGreen, size: 18),
              label: const Text('Register', style: TextStyle(color: AppTheme.primaryGreen, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  hintText: 'Search by ID, name or breed…',
                  prefixIcon: Icon(Icons.search, color: AppTheme.textMuted, size: 20),
                ),
                onSubmitted: (v) {
                  _search = v;
                  _loadAnimals();
                },
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  _filterChip('', 'All Types'),
                  const SizedBox(width: 8),
                  _filterChip('Dog', '🐕 Dogs'),
                  const SizedBox(width: 8),
                  _filterChip('Cat', '🐈 Cats'),
                  const SizedBox(width: 8),
                  _filterChip('Other', '🐾 Other'),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryGreen))
                  : _animals.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.pets, size: 56, color: AppTheme.textMuted),
                              const SizedBox(height: 16),
                              const Text('No Animals Found', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 8),
                              const Text('Try adjusting your search or register a new animal', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
                              const SizedBox(height: 20),
                              ElevatedButton.icon(
                                onPressed: () => context.go('/animals/new'),
                                icon: const Icon(Icons.add, size: 16),
                                label: const Text('Register New Animal'),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadAnimals,
                          color: AppTheme.primaryGreen,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            itemCount: _animals.length,
                            itemBuilder: (ctx, i) {
                              final a = _animals[i];
                              final isActive = a['status'] == 'Active';
                              return Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                child: InkWell(
                                  onTap: () => context.go('/animals/${a['animal_id']}'),
                                  borderRadius: BorderRadius.circular(16),
                                  child: Padding(
                                    padding: const EdgeInsets.all(14),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 54, height: 54,
                                          decoration: BoxDecoration(
                                            color: AppTheme.primaryGreen.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(14),
                                            border: Border.all(color: AppTheme.primaryGreen.withOpacity(0.2)),
                                          ),
                                          child: Center(
                                            child: Text(
                                              a['animal_type'] == 'Dog' ? '🐕' : a['animal_type'] == 'Cat' ? '🐈' : '🐾',
                                              style: const TextStyle(fontSize: 28),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Text(
                                                    a['animal_id'] ?? '',
                                                    style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontFamily: 'Inter', fontSize: 14),
                                                  ),
                                                  if (a['is_demo'] == true) ...[
                                                    const SizedBox(width: 6),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                      decoration: BoxDecoration(
                                                        color: AppTheme.accentOrange.withOpacity(0.15),
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                      child: const Text('Demo', style: TextStyle(color: AppTheme.accentOrange, fontSize: 9, fontWeight: FontWeight.w700)),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                '${a['name_label'] ?? a['animal_type']} · ${a['breed'] ?? 'Indie'}',
                                                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                                              ),
                                              Text(
                                                '${a['total_sightings'] ?? 0} sightings recorded',
                                                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                                              ),
                                            ],
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isActive ? AppTheme.primaryGreen.withOpacity(0.12) : Colors.grey.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(20),
                                            border: Border.all(color: isActive ? AppTheme.primaryGreen.withOpacity(0.3) : Colors.grey.withOpacity(0.2)),
                                          ),
                                          child: Text(
                                            isActive ? '🟢 Active' : '⚫ ${a['status']}',
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isActive ? AppTheme.primaryGreen : AppTheme.textMuted),
                                          ),
                                        ),
                                      ],
                                    ),
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
          onPressed: () => context.go('/animals/new'),
          backgroundColor: AppTheme.primaryGreen,
          icon: const Icon(Icons.add, color: Colors.white),
          label: const Text('Register Animal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        ),
      );

  Widget _filterChip(String value, String label) {
    final sel = _typeFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: sel,
      selectedColor: AppTheme.primaryGreen,
      backgroundColor: AppTheme.bgCard,
      labelStyle: TextStyle(color: sel ? Colors.white : AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
      onSelected: (s) {
        if (s) {
          setState(() => _typeFilter = value);
          _loadAnimals();
        }
      },
    );
  }
}
