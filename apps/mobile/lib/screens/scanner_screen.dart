import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import 'dart:convert';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({Key? key}) : super(key: key);

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  MobileScannerController cameraController = MobileScannerController();
  bool isProcessing = false;
  final ApiService apiService = ApiService();
  
  // GPS status tracking
  bool gpsReady = false;
  double? currentAccuracy;
  Position? lastKnownPosition;

  @override
  void initState() {
    super.initState();
    _initializeGPS();
  }

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  // Initialize and warm up GPS
  Future<void> _initializeGPS() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('⚠️ Location services are disabled. Please enable them.'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 5),
            ),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('⚠️ Location permissions denied'),
                backgroundColor: Colors.red,
              ),
            );
          }
          return;
        }
      }

      print('🛰️ Warming up GPS...');
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      setState(() {
        lastKnownPosition = position;
        currentAccuracy = position.accuracy;
        gpsReady = position.accuracy < 100;
      });

      print('GPS Ready: ${position.latitude}, ${position.longitude}');
      print('Accuracy: ${position.accuracy}m');

      if (position.accuracy > 100) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('⚠️ GPS accuracy: ${position.accuracy.toStringAsFixed(0)}m (waiting for better signal...)'),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 3),
            ),
          );
        }
        await _improveGPSAccuracy();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ GPS Ready (${position.accuracy.toStringAsFixed(0)}m accuracy)'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    } catch (e) {
      print('GPS initialization error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('⚠️ GPS error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _improveGPSAccuracy() async {
    for (int i = 0; i < 3; i++) {
      await Future.delayed(const Duration(seconds: 2));
      try {
        Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );
        
        setState(() {
          lastKnownPosition = position;
          currentAccuracy = position.accuracy;
          gpsReady = position.accuracy < 100;
        });

        print('GPS retry $i: accuracy ${position.accuracy}m');

        if (position.accuracy < 50) {
          print('✅ Good GPS lock achieved');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('✅ GPS Ready (${position.accuracy.toStringAsFixed(0)}m)'),
                backgroundColor: Colors.green,
                duration: const Duration(seconds: 2),
              ),
            );
          }
          break;
        }
      } catch (e) {
        print('GPS retry error: $e');
      }
    }
  }

  // Extract token_id from QR code (if it's JSON)
  int? _extractTokenId(String code) {
    try {
      final data = jsonDecode(code);
      if (data is Map && data.containsKey('token_id')) {
        return data['token_id'] as int;
      }
    } catch (e) {
      if (code.startsWith('TOKEN_')) {
        return int.tryParse(code.replaceFirst('TOKEN_', ''));
      }
    }
    return null;
  }

  Future<void> _handleScan(String code) async {
    if (isProcessing) return;
    
    setState(() => isProcessing = true);

    try {
      Position position;
      int retries = 0;
      
      do {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 15),
        );
        
        print('GPS Reading: ${position.latitude}, ${position.longitude} (accuracy: ${position.accuracy}m)');
        
        retries++;
        if (position.accuracy > 50 && retries < 3) {
          print('Poor accuracy, retrying...');
          await Future.delayed(const Duration(seconds: 1));
        }
      } while (position.accuracy > 50 && retries < 3);

      if (position.accuracy > 100) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('⚠️ GPS accuracy: ${position.accuracy.toStringAsFixed(0)}m - results may be inaccurate'),
            backgroundColor: Colors.orange,
            duration: const Duration(seconds: 3),
          ),
        );
      }

      final timestamp = DateTime.now().toUtc().toIso8601String();

      // ✅ Parse QR JSON to extract unit_id
      String unitId = code;
      try {
        final qrData = jsonDecode(code);
        if (qrData is Map && qrData.containsKey('unit_id')) {
          unitId = qrData['unit_id'];
        }
      } catch (e) {
        unitId = code; // fallback to raw string if not JSON
      }
      
      // Submit scan to backend (AI-powered GPS anomaly detection)
      final response = await apiService.submitScan(
        unitId: unitId,
        latitude: position.latitude,
        longitude: position.longitude,
        timestamp: timestamp,
      );

      // Extract AI-powered results
      final isAnomalous = response['anomaly_detected'] ?? false;
      final speedKmh = response['speed_kmh']?.toStringAsFixed(2) ?? 'N/A';
      final distanceKm = response['distance_km']?.toStringAsFixed(2) ?? 'N/A';
      final String riskLevel = response['risk_level'] ?? 'UNKNOWN';
      final bool isMLPowered = response['ml_powered'] ?? false;

      // Try blockchain verification
      String blockchainStatus = '';
      final tokenId = _extractTokenId(code);
      
      if (tokenId != null) {
        try {
          final blockchainData = await apiService.verifyBlockchain(tokenId);
          
          if (blockchainData['verified'] == true) {
            final manufacturer = blockchainData['manufacturer'] ?? 'Unknown';
            final expiry = blockchainData['expiry_date'] ?? 'Unknown';
            final revoked = blockchainData['revoked'] ?? false;
            
            if (revoked) {
              blockchainStatus = '\n\n🚫 BLOCKCHAIN: REVOKED\nDO NOT USE THIS MEDICINE';
            } else {
              blockchainStatus = '\n\n✅ Blockchain Verified\n'
                  'Manufacturer: $manufacturer\n'
                  'Expiry: $expiry';
            }
          } else {
            blockchainStatus = '\n\n⚠️ Not verified on blockchain';
          }
        } catch (e) {
          blockchainStatus = '\n\n⚠️ Blockchain check failed';
          print('Blockchain error: $e');
        }
      } else {
        blockchainStatus = '\n\n💡 No token_id found in QR';
      }

      // Show AI-powered result
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              isAnomalous
                  ? '🤖 AI ANOMALY DETECTED!\n'
                    'Risk Level: $riskLevel\n'
                    'Speed: $speedKmh km/h\n'
                    'Distance: $distanceKm km\n'
                    'GPS: ${position.latitude.toStringAsFixed(3)}, ${position.longitude.toStringAsFixed(3)}\n'
                    'Accuracy: ${position.accuracy.toStringAsFixed(0)}m'
                    '$blockchainStatus'
                  : '✅ AI VERIFIED SAFE\n'
                    'Risk Level: $riskLevel\n'
                    'Speed: $speedKmh km/h\n'
                    'Distance: $distanceKm km\n'
                    'GPS: ${position.latitude.toStringAsFixed(3)}, ${position.longitude.toStringAsFixed(3)}\n'
                    'Accuracy: ${position.accuracy.toStringAsFixed(0)}m'
                    '$blockchainStatus',
            ),
            backgroundColor: isAnomalous ? Colors.red : Colors.green,
            duration: const Duration(seconds: 8),
          ),
        );
      }

      print('API Response: $response');
      print('AI Risk Level: $riskLevel');
      print('ML Powered: $isMLPowered');
      print('Blockchain Status: $blockchainStatus');
      print('GPS Accuracy: ${position.accuracy}m');

    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      print('Error: $e');
    } finally {
      await Future.delayed(const Duration(seconds: 3));
      setState(() => isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TraceMind AI Scanner'),
        actions: [
          if (currentAccuracy != null)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: gpsReady ? Colors.green : Colors.orange,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        gpsReady ? Icons.gps_fixed : Icons.gps_not_fixed,
                        size: 16,
                        color: Colors.white,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${currentAccuracy!.toStringAsFixed(0)}m',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          IconButton(
            icon: Icon(cameraController.torchEnabled ? Icons.flash_on : Icons.flash_off),
            onPressed: () => cameraController.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: cameraController,
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  _handleScan(barcode.rawValue!);
                  break;
                }
              }
            },
          ),
          if (isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'AI Analyzing GPS + Blockchain...',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}