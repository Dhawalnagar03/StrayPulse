import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/onboarding_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/animals/screens/animals_screen.dart';
import '../../features/animals/screens/register_animal_screen.dart';
import '../../features/animals/screens/animal_detail_screen.dart';
import '../../features/sightings/screens/report_animal_screen.dart';
import '../../features/sightings/screens/camera_screen.dart';
import '../../features/sightings/screens/gps_confirm_screen.dart';
import '../../features/sightings/screens/animal_match_screen.dart';
import '../../features/maps/screens/map_screen.dart';
import '../../features/predictions/screens/prediction_screen.dart';
import '../../features/feeding/screens/feeding_points_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/profile/screens/my_reports_screen.dart';

class AppRouter {
  static GoRouter createRouter(AuthProvider auth) {
    return GoRouter(
      initialLocation: '/splash',
      redirect: (context, state) {
        final isLoggedIn = auth.isAuthenticated;
        final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/register';
        final isSplash = state.matchedLocation == '/splash' || state.matchedLocation == '/onboarding';
        if (!isLoggedIn && !isAuthRoute && !isSplash) return '/login';
        if (isLoggedIn && isAuthRoute) return '/home';
        return null;
      },
      refreshListenable: auth,
      routes: [
        GoRoute(path: '/splash',        builder: (ctx, s) => const SplashScreen()),
        GoRoute(path: '/onboarding',    builder: (ctx, s) => const OnboardingScreen()),
        GoRoute(path: '/login',         builder: (ctx, s) => const LoginScreen()),
        GoRoute(path: '/register',      builder: (ctx, s) => const RegisterScreen()),
        GoRoute(path: '/home',          builder: (ctx, s) => const HomeScreen()),
        GoRoute(path: '/animals',       builder: (ctx, s) => const AnimalsScreen()),
        GoRoute(path: '/animals/new',   builder: (ctx, s) => const RegisterAnimalScreen()),
        GoRoute(path: '/animals/:id',   builder: (ctx, s) => AnimalDetailScreen(animalId: s.pathParameters['id']!)),
        GoRoute(path: '/report',        builder: (ctx, s) => const ReportAnimalScreen()),
        GoRoute(path: '/camera',        builder: (ctx, s) => const CameraScreen()),
        GoRoute(path: '/gps-confirm',   builder: (ctx, s) => const GpsConfirmScreen()),
        GoRoute(path: '/animal-match',  builder: (ctx, s) => const AnimalMatchScreen()),
        GoRoute(path: '/map',           builder: (ctx, s) => const MapScreen()),
        GoRoute(path: '/prediction/:id', builder: (ctx, s) => PredictionScreen(animalId: s.pathParameters['id']!)),
        GoRoute(path: '/feeding',       builder: (ctx, s) => const FeedingPointsScreen()),
        GoRoute(path: '/my-reports',    builder: (ctx, s) => const MyReportsScreen()),
        GoRoute(path: '/profile',       builder: (ctx, s) => const ProfileScreen()),
      ],
    );
  }
}
