import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;
  String? _error;

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 32),
                // Logo
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 72, height: 72,
                        decoration: BoxDecoration(
                          color: AppTheme.primaryGreen,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [BoxShadow(color: AppTheme.primaryGreen.withOpacity(0.4), blurRadius: 24)],
                        ),
                        child: const Icon(Icons.pets, color: Colors.white, size: 40),
                      ),
                      const SizedBox(height: 16),
                      const Text('Welcome Back', style: TextStyle(
                        fontFamily: 'Inter', fontWeight: FontWeight.w800,
                        fontSize: 26, color: Colors.white,
                      )),
                      const SizedBox(height: 4),
                      const Text('Sign in to StrayPulse', style: TextStyle(
                        color: AppTheme.textSecondary, fontSize: 14,
                      )),
                    ],
                  ),
                ),
                const SizedBox(height: 40),

                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.withOpacity(0.3)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                    ]),
                  ),

                // Email
                const Text('Email', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  style: const TextStyle(color: Colors.white),
                  decoration: const InputDecoration(
                    hintText: 'you@example.com',
                    prefixIcon: Icon(Icons.email_outlined, color: AppTheme.textMuted, size: 20),
                  ),
                  validator: (v) => v!.isEmpty ? 'Email required' : null,
                ),
                const SizedBox(height: 16),

                // Password
                const Text('Password', style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscure,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: '••••••••',
                    prefixIcon: const Icon(Icons.lock_outline, color: AppTheme.textMuted, size: 20),
                    suffixIcon: IconButton(
                      onPressed: () => setState(() => _obscure = !_obscure),
                      icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          color: AppTheme.textMuted, size: 20),
                    ),
                  ),
                  validator: (v) => v!.isEmpty ? 'Password required' : null,
                ),
                const SizedBox(height: 28),

                // Login button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: auth.isLoading ? null : _handleLogin,
                    child: auth.isLoading
                        ? const SizedBox(width: 20, height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Sign In'),
                  ),
                ),
                const SizedBox(height: 16),

                // Demo fill
                Row(children: [
                  Expanded(child: OutlinedButton(
                    onPressed: () {
                      _emailCtrl.text = 'admin@straypulse.org';
                      _passCtrl.text = 'Admin@StrayPulse2026!';
                    },
                    child: const Text('Demo Admin', style: TextStyle(fontSize: 12)),
                  )),
                  const SizedBox(width: 12),
                  Expanded(child: OutlinedButton(
                    onPressed: () {
                      _emailCtrl.text = 'citizen@demo.com';
                      _passCtrl.text = 'Demo@1234!';
                    },
                    child: const Text('Demo User', style: TextStyle(fontSize: 12)),
                  )),
                ]),
                const SizedBox(height: 24),

                Center(child: TextButton(
                  onPressed: () => context.go('/register'),
                  child: const Text.rich(TextSpan(children: [
                    TextSpan(text: "Don't have an account? ", style: TextStyle(color: AppTheme.textMuted)),
                    TextSpan(text: 'Sign up', style: TextStyle(color: AppTheme.primaryGreen, fontWeight: FontWeight.w600)),
                  ])),
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _error = null);
    final auth = context.read<AuthProvider>();
    final success = await auth.login(_emailCtrl.text.trim(), _passCtrl.text);
    if (!mounted) return;
    if (success) {
      context.go('/home');
    } else {
      setState(() => _error = 'Invalid email or password');
    }
  }
}
