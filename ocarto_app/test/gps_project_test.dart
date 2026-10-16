import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/core/map_project.dart';
import 'package:ocarto_app/gps/nmea_parser.dart';

void main() {
  test('un track GPS se conserva como línea geográfica editable', () {
    final gps = [
      GpsFix(latitude: 37.23456789, longitude: -4.7654321, timestamp: DateTime.utc(2026, 10, 16, 8), altitudeMeters: 525),
      GpsFix(latitude: 37.23457789, longitude: -4.7654421, timestamp: DateTime.utc(2026, 10, 16, 8, 0, 5)),
    ];
    final data = MapProject(
      name: 'Bobadilla',
      layers: [ProjectLayer(id: 'Mapa editable', name: 'Mapa editable')],
      elements: [ProjectElement(tool: 'line', x: 0, y: 0,
          symbol: '506', isGpsTrack: true, gpsPoints: gps)],
      gpsCenterLatitude: gps.first.latitude,
      gpsCenterLongitude: gps.first.longitude,
    ).encode();
    final restored = MapProject.decode(data);
    expect(restored.elements.single.isGpsTrack, true);
    expect(restored.elements.single.symbol, '506');
    expect(restored.elements.single.gpsPoints.length, 2);
    expect(restored.elements.single.gpsPoints.first.longitude, gps.first.longitude);
    expect(restored.elements.single.gpsPoints.first.altitudeMeters, 525);
    expect(restored.gpsCenterLatitude, gps.first.latitude);
  });
  test('proyecto antiguo sin GPS sigue siendo compatible', () {
    const data = '{"format":"ocarto-project","name":"Antiguo","elements":[],"layers":[]}';
    final loaded = MapProject.decode(data);
    expect(loaded.gpsTrackSymbol, '506');
    expect(loaded.elements, isEmpty);
  });
}