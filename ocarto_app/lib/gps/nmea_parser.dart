import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';

/// Una posición GNSS derivada exclusivamente de sentencias NMEA validadas.
class GpsFix {
  const GpsFix({
    required this.latitude,
    required this.longitude,
    required this.timestamp,
    this.altitudeMeters,
    this.hdop,
    this.satellites,
    this.fixQuality,
    this.speedKmh,
    this.courseDegrees,
  });

  final double latitude;
  final double longitude;
  final DateTime timestamp;
  final double? altitudeMeters;
  final double? hdop;
  final int? satellites;
  final int? fixQuality;
  final double? speedKmh;
  final double? courseDegrees;

  Map<String, dynamic> toJson() => {
        'lat': latitude,
        'lon': longitude,
        'time': timestamp.toUtc().toIso8601String(),
        if (altitudeMeters != null) 'altitude': altitudeMeters,
        if (hdop != null) 'hdop': hdop,
        if (satellites != null) 'satellites': satellites,
        if (fixQuality != null) 'fixQuality': fixQuality,
        if (speedKmh != null) 'speedKmh': speedKmh,
        if (courseDegrees != null) 'course': courseDegrees,
      };

  factory GpsFix.fromJson(Map<String, dynamic> json) => GpsFix(
        latitude: (json['lat'] as num).toDouble(),
        longitude: (json['lon'] as num).toDouble(),
        timestamp: DateTime.parse(json['time'] as String).toUtc(),
        altitudeMeters: (json['altitude'] as num?)?.toDouble(),
        hdop: (json['hdop'] as num?)?.toDouble(),
        satellites: (json['satellites'] as num?)?.toInt(),
        fixQuality: (json['fixQuality'] as num?)?.toInt(),
        speedKmh: (json['speedKmh'] as num?)?.toDouble(),
        courseDegrees: (json['course'] as num?)?.toDouble(),
      );
}

class NmeaParser {
  final StringBuffer _buffer = StringBuffer();
  GpsFix? _lastGga;

  /// Conserva las sentencias partidas entre lecturas de puerto serie.
  List<GpsFix> addBytes(Uint8List bytes) {
    if (bytes.isEmpty) return const [];
    _buffer.write(latin1.decode(bytes, allowInvalid: true));
    final text = _buffer.toString();
    var cursor = 0;
    final results = <GpsFix>[];
    while (true) {
      final end = text.indexOf('\n', cursor);
      if (end < 0) break;
      final parsed = parseLine(text.substring(cursor, end).trim());
      if (parsed != null) results.add(parsed);
      cursor = end + 1;
    }
    _buffer.clear();
    if (text.length - cursor <= 8192) {
      _buffer.write(text.substring(cursor));
    } // descartar ruido continuo o sentencias mal formadas muy largas
    return results;
  }

  GpsFix? parseLine(String sentence) {
    if (!sentence.startsWith(r'$')) return null;
    final star = sentence.indexOf('*');
    if (star < 0 || star + 3 != sentence.length) return null;
    final expected = int.tryParse(sentence.substring(star + 1), radix: 16);
    if (expected == null) return null;
    var actual = 0;
    for (var i = 1; i < star; i++) {
      actual ^= sentence.codeUnitAt(i);
    }
    if (actual != expected) return null;
    final fields = sentence.substring(1, star).split(',');
    if (fields.isEmpty || fields[0].length < 5) return null;
    final kind = fields[0].substring(fields[0].length - 3);
    if (kind == 'GGA') return _parseGga(fields);
    if (kind == 'RMC') return _parseRmc(fields);
    return null;
  }

  GpsFix? _parseGga(List<String> f) {
    if (f.length < 10) return null;
    final quality = int.tryParse(f[6]);
    if (quality == null || quality <= 0) return null;
    final lat = _angle(f[2], f[3], latitude: true);
    final lon = _angle(f[4], f[5], latitude: false);
    final utc = _nmeaTime(f[1]);
    if (lat == null || lon == null || utc == null) return null;
    final now = DateTime.now().toUtc();
    var time = DateTime.utc(now.year, now.month, now.day, utc.$1, utc.$2,
        utc.$3, utc.$4);
    if (time.difference(now).inHours > 12) {
      time = time.subtract(const Duration(days: 1));
    } else if (now.difference(time).inHours > 12) {
      time = time.add(const Duration(days: 1));
    }
    final fix = GpsFix(
      latitude: lat,
      longitude: lon,
      timestamp: time,
      altitudeMeters: double.tryParse(f[9]),
      hdop: double.tryParse(f[8]),
      satellites: int.tryParse(f[7]),
      fixQuality: quality,
    );
    _lastGga = fix;
    return fix;
  }

  GpsFix? _parseRmc(List<String> f) {
    if (f.length < 10 || f[2] != 'A') return null;
    final lat = _angle(f[3], f[4], latitude: true);
    final lon = _angle(f[5], f[6], latitude: false);
    final utc = _nmeaTime(f[1]);
    final date = f[9];
    if (lat == null || lon == null || utc == null || date.length != 6) {
      return null;
    }
    final day = int.tryParse(date.substring(0, 2));
    final month = int.tryParse(date.substring(2, 4));
    final yr = int.tryParse(date.substring(4, 6));
    if (day == null || month == null || yr == null || day < 1 || day > 31 ||
        month < 1 || month > 12) return null;
    final year = yr >= 80 ? 1900 + yr : 2000 + yr;
    final timestamp = DateTime.utc(
        year, month, day, utc.$1, utc.$2, utc.$3, utc.$4);
    if (timestamp.day != day || timestamp.month != month) return null;
    final gga = _lastGga;
    final sameEpoch = gga != null &&
        gga.timestamp.difference(timestamp).inSeconds.abs() < 3 &&
        haversineMeters(gga.latitude, gga.longitude, lat, lon) < 20;
    final knots = double.tryParse(f[7]);
    return GpsFix(
      latitude: lat,
      longitude: lon,
      timestamp: timestamp,
      speedKmh: knots == null ? null : knots * 1.852,
      courseDegrees: double.tryParse(f[8]),
      altitudeMeters: sameEpoch ? gga.altitudeMeters : null,
      hdop: sameEpoch ? gga.hdop : null,
      satellites: sameEpoch ? gga.satellites : null,
      fixQuality: sameEpoch ? gga.fixQuality : null,
    );
  }

  static (int, int, int, int)? _nmeaTime(String raw) {
    if (raw.length < 6) return null;
    final hh = int.tryParse(raw.substring(0, 2));
    final mm = int.tryParse(raw.substring(2, 4));
    final seconds = double.tryParse(raw.substring(4));
    if (hh == null || mm == null || seconds == null ||
        hh > 23 || mm > 59 || seconds < 0 || seconds >= 60) return null;
    final ss = seconds.floor();
    return (hh, mm, ss, ((seconds - ss) * 1000).round().clamp(0, 999));
  }

  static double? _angle(String raw, String hemisphere,
      {required bool latitude}) {
    final value = double.tryParse(raw);
    if (value == null || value.isNaN || value.isInfinite) return null;
    final degrees = value ~/ 100;
    final minutes = value - degrees * 100;
    if (minutes < 0 || minutes >= 60 ||
        (latitude ? degrees > 90 : degrees > 180)) return null;
    if (latitude && hemisphere != 'N' && hemisphere != 'S') return null;
    if (!latitude && hemisphere != 'E' && hemisphere != 'W') return null;
    final signed = degrees + minutes / 60;
    return (hemisphere == 'S' || hemisphere == 'W') ? -signed : signed;
  }
}

double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
  const earthRadius = 6371008.8;
  final dLat = (lat2 - lat1) * math.pi / 180;
  final dLon = (lon2 - lon1) * math.pi / 180;
  final a = math.pow(math.sin(dLat / 2), 2) +
      math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) *
          math.pow(math.sin(dLon / 2), 2);
  return earthRadius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
}

/// Limita el ruido en reposo, el HDOP alto y los saltos inverosímiles.
class GpsTrackFilter {
  const GpsTrackFilter({
    this.minimumDistanceMeters = 2,
    this.maximumHdop = 5,
    this.maximumSpeedMetersPerSecond = 30,
  });

  final double minimumDistanceMeters;
  final double maximumHdop;
  final double maximumSpeedMetersPerSecond;

  bool accept(GpsFix next, GpsFix? previous) {
    if (next.hdop != null && (next.hdop! <= 0 || next.hdop! > maximumHdop)) {
      return false;
    }
    if (next.fixQuality != null && next.fixQuality! <= 0) return false;
    if (previous == null) return true;
    final distance = haversineMeters(previous.latitude, previous.longitude,
        next.latitude, next.longitude);
    final seconds = next.timestamp.difference(previous.timestamp).inMilliseconds / 1000;
    if (seconds <= 0 || distance < minimumDistanceMeters) return false;
    if (distance / seconds > maximumSpeedMetersPerSecond) return false;
    return true;
  }
}