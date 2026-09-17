import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _page = 0;
  final _ctrl = PageController();

  final _pages = [
    _OnboardPage(
      emoji: '📸',
      title: 'Spot & Report',
      description: 'See a stray animal? Take a photo, capture GPS automatically, and submit a sighting in seconds.',
      color: AppTheme.primaryGreen,
    ),
    _OnboardPage(
      emoji: '🤖',
      title: 'AI Recognition',
      description: 'Our AI detects the animal and matches it with registered animals using computer vision.',
      color: AppTheme.accentBlue,
    ),
    _OnboardPage(
      emoji: '🗺️',
      title: 'Predict Location',
      description: 'Machine learning analyzes movement patterns and predicts where an animal will be tomorrow.',
      color: AppTheme.accentPurple,
    ),
    _OnboardPage(
      emoji: '🤝',
      title: 'Help Rescuers',
      description: 'NGOs and rescuers use predictions to locate animals efficiently — reducing search time dramatically.',
      color: AppTheme.accentOrange,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: () => context.go('/login'),
                child: const Text('Skip', style: TextStyle(color: AppTheme.textMuted)),
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _ctrl,
                onPageChanged: (i) => setState(() => _page = i),
                itemCount: _pages.length,
                itemBuilder: (ctx, i) => _pages[i],
              ),
            ),
            // Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_pages.length, (i) => AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: i == _page ? 24 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: i == _page ? AppTheme.primaryGreen : AppTheme.borderColor,
                  borderRadius: BorderRadius.circular(4),
                ),
              )),
            ),
            const SizedBox(height: 32),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_page < _pages.length - 1) {
                      _ctrl.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                    } else {
                      context.go('/login');
                    }
                  },
                  child: Text(_page < _pages.length - 1 ? 'Next' : 'Get Started'),
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

class _OnboardPage extends StatelessWidget {
  final String emoji;
  final String title;
  final String description;
  final Color color;

  const _OnboardPage({required this.emoji, required this.title, required this.description, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120, height: 120,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(32),
              border: Border.all(color: color.withOpacity(0.3)),
            ),
            child: Center(child: Text(emoji, style: const TextStyle(fontSize: 56))),
          ),
          const SizedBox(height: 40),
          Text(title, style: const TextStyle(
            fontFamily: 'Inter', fontWeight: FontWeight.w800,
            fontSize: 28, color: Colors.white,
          )),
          const SizedBox(height: 16),
          Text(description, textAlign: TextAlign.center, style: const TextStyle(
            fontFamily: 'Inter', color: AppTheme.textSecondary, fontSize: 16, height: 1.6,
          )),
        ],
      ),
    );
  }
}
