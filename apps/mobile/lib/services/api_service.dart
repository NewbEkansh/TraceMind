import 'dart:convert';
import 'package:http/http.dart' as http;

/// Handles communication between the Mobile App, 
/// the AI Sentinel (Port 8001), and the Blockchain Layer.
class ApiService {
  // Use 10.0.2.2 if testing on Android Emulator to hit your Mac's localhost
  static const String baseUrl = 'http://172.20.10.3:8000';
  static const String apiKey = 'tracemind_internal_key_2026';

  final Map<String, String> _headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };

  /// [1] SUBMIT SCAN: Triggers the Geo-Temporal AI Sentinel (Haversine Logic)
  Future<Map<String, dynamic>> submitScan({
    required String unitId,
    required double latitude,
    required double longitude,
    required String timestamp,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify'),
        headers: _headers,
        body: jsonEncode({
          'unit_id': unitId,
          'latitude': latitude,
          'longitude': longitude,
          'timestamp': timestamp,
        }),
      );

      return _handleResponse(response, 'Scan Submission');
    } catch (e) {
      throw Exception('Error submitting scan: $e');
    }
  }

  /// [2] BLOCKCHAIN VERIFY: Validates the Provenance NFT on-chain
  Future<Map<String, dynamic>> verifyBlockchain(int tokenId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/verify/$tokenId'),
        headers: {'x-api-key': apiKey},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Data Normalization for UI
        return {
          'verified': data['verification']?['valid'] ?? false,
          'manufacturer': data['medicine_data']?['manufacturer'] ?? 'Unknown',
          'batch_id': data['medicine_id']?['batch_id'] ?? 'Unknown',
          'expiry_date': data['medicine_data']?['expiry_date'] ?? 'Unknown',
          'revoked': data['medicine_data']?['revoked'] ?? false,
        };
      }
      throw Exception('Blockchain check failed: ${response.statusCode}');
    } catch (e) {
      throw Exception('Error verifying blockchain: $e');
    }
  }

  /// [3] HISTORY: Fetches the chain-of-custody for a specific unit
  Future<Map<String, dynamic>> getHistory(String unitId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/history/$unitId'),
        headers: {'x-api-key': apiKey},
      );
      return _handleResponse(response, 'History Retrieval');
    } catch (e) {
      throw Exception('Error getting history: $e');
    }
  }

  /// [4] ANALYTICS: Retrieves anomaly scores from the Intelligence Engine
  Future<Map<String, dynamic>> getAnalytics(String unitId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/analytics/$unitId'),
        headers: {'x-api-key': apiKey},
      );
      return _handleResponse(response, 'Analytics Retrieval');
    } catch (e) {
      throw Exception('Error getting analytics: $e');
    }
  }

  /// Internal Helper for standardized error handling
  Map<String, dynamic> _handleResponse(http.Response response, String context) {
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('$context failed: ${response.statusCode}');
    }
  }
}