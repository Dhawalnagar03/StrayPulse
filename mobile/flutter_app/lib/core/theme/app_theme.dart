import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Colors
  static const Color primaryGreen = Color(0xFF22C55E);
  static const Color primaryGreenDark = Color(0xFF16A34A);
  static const Color bgPrimary = Color(0xFF0A0E1A);
  static const Color bgSecondary = Color(0xFF111827);
  static const Color bgCard = Color(0xFF1A2235);
  static const Color textPrimary = Color(0xFFF9FAFB);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color accentBlue = Color(0xFF3B82F6);
  static const Color accentPurple = Color(0xFF8B5CF6);
  static const Color accentOrange = Color(0xFFF97316);
  static const Color borderColor = Color(0x14FFFFFF);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: bgPrimary,
      colorScheme: const ColorScheme.dark(
        primary: primaryGreen,
        secondary: accentBlue,
        surface: bgCard,
        onPrimary: Colors.white,
        onSurface: textPrimary,
      ),
      textTheme: TextTheme(
        displayLarge: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w800, color: textPrimary, fontSize: 32),
        headlineLarge: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w700, color: textPrimary, fontSize: 24),
        headlineMedium: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, color: textPrimary, fontSize: 20),
        titleLarge: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, color: textPrimary, fontSize: 17),
        titleMedium: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w500, color: textPrimary, fontSize: 15),
        bodyLarge: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w400, color: textPrimary, fontSize: 16),
        bodyMedium: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w400, color: textSecondary, fontSize: 14),
        bodySmall: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w400, color: textMuted, fontSize: 12),
        labelLarge: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, color: textPrimary, fontSize: 14),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: bgSecondary,
        foregroundColor: textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter', fontWeight: FontWeight.w700,
          fontSize: 18, color: textPrimary,
        ),
      ),
      cardTheme: CardThemeData(
        color: bgCard,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: borderColor),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryGreen,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: const TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, fontSize: 15),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: textPrimary,
          side: const BorderSide(color: borderColor),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: bgCard,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryGreen, width: 1.5),
        ),
        hintStyle: const TextStyle(color: textMuted, fontFamily: 'Inter'),
        labelStyle: const TextStyle(color: textSecondary, fontFamily: 'Inter'),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: bgSecondary,
        selectedItemColor: primaryGreen,
        unselectedItemColor: textMuted,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      dividerColor: borderColor,
      iconTheme: const IconThemeData(color: textSecondary),
    );
  }
}
