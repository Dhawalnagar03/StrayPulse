import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/api_service.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  String _role = 'citizen';
  bool _loading = false;
  String? _error;

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ApiService.instance.register({
        'name': _name.text.trim(),
        'email': _email.text.trim(),
        'phone': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        'password': _password.text,
        'role': _role,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Account created! Please sign in.'), backgroundColor: AppTheme.primaryGreen),
        );
        context.go('/login');
      }
    } catch (e) {
      setState(() => _error = 'Registration failed. Email may already be in use.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgPrimary,
      appBar: AppBar(
        title: const Text('Create Account'),
        leading: IconButton(onPressed: () => context.go('/login'), icon: const Icon(Icons.arrow_back)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: Text(_error!, style: const TextStyle(color: Colors.red)),
                ),

              _label('Full Name'), _field(_name, 'Your name'),
              const SizedBox(height: 16),
              _label('Email'), _emailField(),
              const SizedBox(height: 16),
              _label('Phone (optional)'), _field(_phone, '+91 98765 43210', required: false),
              const SizedBox(height: 16),
              _label('Password'), _passField(),
              const SizedBox(height: 16),
              _label('Role'),
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.bgCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _role,
                    isExpanded: true,
                    dropdownColor: AppTheme.bgCard,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    style: const TextStyle(color: Colors.white, fontFamily: 'Inter'),
                    items: const [
                      DropdownMenuItem(value: 'citizen', child: Text('Citizen / Volunteer')),
                      DropdownMenuItem(value: 'ngo', child: Text('NGO / Rescuer')),
                    ],
                    onChanged: (v) => setState(() => _role = v!),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _register,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Create Account'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Text(text, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
  );

  Widget _field(TextEditingController ctrl, String hint, {bool required = true}) =>
    TextFormField(
      controller: ctrl,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(hintText: hint),
      validator: required ? (v) => v!.isEmpty ? 'Required' : null : null,
    );

  Widget _emailField() => TextFormField(
    controller: _email,
    keyboardType: TextInputType.emailAddress,
    style: const TextStyle(color: Colors.white),
    decoration: const InputDecoration(hintText: 'you@example.com'),
    validator: (v) => v!.isEmpty ? 'Email required' : null,
  );

  Widget _passField() => TextFormField(
    controller: _password,
    obscureText: true,
    style: const TextStyle(color: Colors.white),
    decoration: const InputDecoration(hintText: 'Minimum 8 characters'),
    validator: (v) => (v?.length ?? 0) < 8 ? 'At least 8 characters' : null,
  );
}
