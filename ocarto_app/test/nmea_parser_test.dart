import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/gps/nmea_parser.dart';

String nmea(String body) {
  var checksum = 0;
  for (final c in body.codeUnits) { checksum ^= c; }
  return '\$$body*${checksum.toRadixString(16).padLeft(2, '0').toUpperCase()}\r\n';
}

void main() {
  test('lee GGA fragmentado, firma válida y calidad de fijación', () {
    final parser = NmeaParser();
    final sentence = nmea('GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,');
    final first = parser.addBytes(Uint8List.fromList(latin1.encode(sentence.substring(0, 22))));
    expect(first, isEmpty);
    final result = parser.addBytes(Uint8List.fromList(latin1.encode(sentence.substring(22))));
    expect(result.length, 1);
    expect(result.single.latitude, closeTo(48.1173, 0.00001));
    expect(result.single.longitude, closeTo(11.5166667, 0.00001));
    expect(result.single.altitudeMeters, 545.4);
    expect(result.single.hdop, 0.9);
    expect(result.single.satellites, 8);
  });
  test('no incorpora RMC sin fix ni sentencias con checksum erróneo', () {
    final parser = NmeaParser();
    expect(parser.parseLine(r'$GPRMC,123519,A,4807.038,N,01131.000,E,0,0,230394,,*00'), isNull);
    expect(parser.parseLine(nmea('GPRMC,123519,V,4807.038,N,01131.000,E,0,0,230394,,').trim()), isNull);
  });
  test('RMC utiliza la fecha UTC, velocidad y latitud sur/oeste', () {
    final parser = NmeaParser();
    final fix = parser.parseLine(nmea('GPRMC,235959.500,A,3345.000,S,07039.000,W,4.2,85.0,160726,,').trim());
    expect(fix, isNotNull);
    expect(fix!.latitude, closeTo(-33.75, 0.0001));
    expect(fix.longitude, closeTo(-70.65, 0.0001));
    expect(fix.timestamp, DateTime.utc(2026, 7, 16, 23, 59, 59, 500));
    expect(fix.speedKmh, closeTo(7.7784, 0.0001));
  });
  test('la grabación filtra el jitter y los saltos excesivos', () {
    final t = DateTime.utc(2026, 10, 16, 11);
    GpsFix fix(double lat, int sec, {double? hdop}) => GpsFix(latitude: lat, longitude: -4, timestamp: t.add(Duration(seconds: sec)), hdop: hdop);
    const filter = GpsTrackFilter();
    final a = fix(37.0, 0);
    expect(filter.accept(a, null), isTrue);
    expect(filter.accept(fix(37.000001, 1), a), isFalse);
    expect(filter.accept(fix(37.000030, 1), a), isTrue);
    expect(filter.accept(fix(37.01, 1), a), isFalse);
    expect(filter.accept(fix(37.00003, 1, hdop: 7), a), isFalse);
  });
}