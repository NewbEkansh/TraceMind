import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Change this to your Mac's IP address when testing on phone
  // To find your IP: Open Terminal → type "ipconfig getifaddr en0"
  static const String baseUrl = 'http://172.20.10.3:8000';
  static const String apiKey = 'tracemind_internal_key_2026';
  
  Future<Map<String, dynamic>> submitScan({
    required String unitId,
    required double latitude,
    required double longitude,
    required String timestamp,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/verify'),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: jsonEncode({
          'unit_id': unitId,
          'latitude': latitude,
          'longitude': longitude,
          'timestamp': timestamp,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to submit scan: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error submitting scan: $e');
    }
  }

  Future<Map<String, dynamic>> getHistory(String unitId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/history/$unitId'),
        headers: {
          'x-api-key': apiKey,
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get history: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting history: $e');
    }
  }

  Future<Map<String, dynamic>> getAnalytics(String unitId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/analytics/$unitId'),
        headers: {
          'x-api-key': apiKey,
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get analytics: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error getting analytics: $e');
    }
  }
}