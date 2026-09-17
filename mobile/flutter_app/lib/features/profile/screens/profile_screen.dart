import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('Profile & Settings'),
        leading: IconButton(onPressed: () => context.go('/home'), icon: const Icon(Icons.arrow_back)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const SizedBox(height: 12),

            // Profile Avatar & Header
            Center(
              child: Column(
                children: [
                  Container(
                    width: 88, height: 88,
                    decoration: BoxDecoration(
                      color: AppTheme.primaryGreen.withOpacity(0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppTheme.primaryGreen.withOpacity(0.4), width: 2),
                      boxShadow: [
                        BoxShadow(color: AppTheme.primaryGreen.withOpacity(0.2), blurRadius: 20),
                      ],
                    ),
                    child: const Icon(Icons.person, size: 48, color: AppTheme.primaryGreen),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    auth.userName,
                    style: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w800, fontSize: 22, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?['email'] ?? '',
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppTheme.accentPurple.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.accentPurple.withOpacity(0.3)),
                    ),
                    child: Text(
                      auth.userRole.toUpperCase(),
                      style: const TextStyle(color: AppTheme.accentPurple, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1.1),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Menu Section Card
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.history_outlined, color: AppTheme.accentBlue),
                    title: const Text('My Sighting Reports', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
                    subtitle: const Text('View historical sightings you submitted', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right, color: AppTheme.textMuted),
                    onTap: () => context.go('/my-reports'),
                  ),
                  const Divider(color: AppTheme.borderColor, height: 1),
                  ListTile(
                    leading: const Icon(Icons.restaurant_outlined, color: AppTheme.accentOrange),
                    title: const Text('Community Feeding Points', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
                    subtitle: const Text('View and register animal feeding locations', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right, color: AppTheme.textMuted),
                    onTap: () => context.go('/feeding'),
                  ),
                  const Divider(color: AppTheme.borderColor, height: 1),
                  ListTile(
                    leading: const Icon(Icons.pets_outlined, color: AppTheme.primaryGreen),
                    title: const Text('Register New Animal', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
                    subtitle: const Text('Add a new stray animal profile to StrayPulse', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right, color: AppTheme.textMuted),
                    onTap: () => context.go('/animals/new'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // App info & Disclaimer
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('About StrayPulse', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white, fontSize: 14)),
                    SizedBox(height: 8),
                    Text(
                      'StrayPulse relies on crowdsourced phone GPS sightings and machine learning movement prediction models to assist rescuers and NGOs.',
                      style: TextStyle(color: AppTheme.textSecondary, fontSize: 12, height: 1.5),
                    ),
                    SizedBox(height: 8),
                    Text(
                      '⚠ No continuous hardware tracking or GPS collars are used.',
                      style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontStyle: FontStyle.italic),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Sign Out
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await auth.logout();
                  if (context.mounted) context.go('/login');
                },
                icon: const Icon(Icons.logout, color: Colors.red, size: 18),
                label: const Text('Sign Out', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red, width: 1),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
