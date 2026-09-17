import 'package:flutter/material.dart';

class GpsConfirmScreen extends StatelessWidget {
  const GpsConfirmScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Confirm Location'),
      ),
      body: const Center(
        child: Text('GPS confirmation'),
      ),
    );
  }
}