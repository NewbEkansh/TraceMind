import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({Key? key}) : super(key: key);

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final ApiService _apiService = ApiService();
  final MobileScannerController controller = MobileScannerController();
  
  String? _result;
  bool _isScanning = false;
  bool _scanRequested = false; // Only scan when button is pressed

  Future<void> _handleScan(String code) async {
    setState(() {
      _isScanning = true;
      _scanRequested = false; // Disable further scans
      _result = 'Verifying with backend...';
    });

    try {
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      final response = await _apiService.submitScan(
        unitId: code,
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: DateTime.now().toIso8601String(),
      );
      
      setState(() {
        if (response['anomaly_detected'] == true) {
          _result = '⚠️ ANOMALY DETECTED!\nSpeed: ${response['speed_kmh']?.toStringAsFixed(2)} km/h\nDistance: ${response['distance_km']?.toStringAsFixed(2)} km';
        } else {
          _result = '✅ Scan verified\nSpeed: ${response['speed_kmh']?.toStringAsFixed(2)} km/h\nDistance: ${response['distance_km']?.toStringAsFixed(2)} km';
        }
        _isScanning = false;
      });

      // Clear result after 3 seconds
      await Future.delayed(const Duration(seconds: 3));
      setState(() {
        _result = null;
      });
    } catch (e) {
      setState(() {
        _result = '❌ Error: $e';
        _isScanning = false;
      });
    }
  }

  void _requestScan() {
    setState(() {
      _scanRequested = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TraceMind Scanner'),
        backgroundColor: Colors.deepPurple,
      ),
      body: Stack(
        children: [
          // Camera view
          MobileScanner(
            controller: controller,
            onDetect: (capture) {
              // Only process if scan was requested via button
              if (!_scanRequested || _isScanning) return;
              
              final List<Barcode> barcodes = capture.barcodes;
              if (barcodes.isNotEmpty) {
                final String? code = barcodes.first.displayValue;
                if (code != null) {
                  _handleScan(code);
                }
              }
            },
          ),
          
          // Scan frame guide
          Center(
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _scanRequested ? Colors.green : Colors.white,
                  width: 3,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Center(
                child: Text(
                  _scanRequested ? 'SCANNING...' : 'Align QR Code',
                  style: TextStyle(
                    color: _scanRequested ? Colors.green : Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    backgroundColor: Colors.black54,
                  ),
                ),
              ),
            ),
          ),
          
          // Result overlay
          if (_result != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(20),
                color: _result!.contains('ANOMALY') 
                    ? Colors.red 
                    : _result!.contains('verified')
                        ? Colors.green
                        : Colors.orange,
                child: Text(
                  _result!,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          
          // Manual Scan Button
          Positioned(
            bottom: _result != null ? 120 : 40,
            left: 0,
            right: 0,
            child: Center(
              child: ElevatedButton(
                onPressed: _isScanning ? null : _requestScan,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _scanRequested ? Colors.green : Colors.deepPurple,
                  disabledBackgroundColor: Colors.grey,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 50,
                    vertical: 20,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30),
                  ),
                ),
                child: Text(
                  _isScanning 
                      ? 'PROCESSING...' 
                      : _scanRequested 
                          ? 'READY - POINT AT QR'
                          : 'TAP TO SCAN',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }
}