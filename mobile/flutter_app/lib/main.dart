import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/animals/providers/animal_provider.dart';
import 'features/sightings/providers/sighting_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  await dotenv.load(fileName: ".env");

  runApp(const StrayPulseApp());
}

class StrayPulseApp extends StatelessWidget {
  const StrayPulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => AnimalProvider()),
        ChangeNotifierProvider(create: (_) => SightingProvider()),
      ],
      child: Builder(
        builder: (context) {
          final authProvider = context.watch<AuthProvider>();

          return MaterialApp.router(
            title: 'StrayPulse',
            theme: AppTheme.darkTheme,
            routerConfig: AppRouter.createRouter(authProvider),
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}