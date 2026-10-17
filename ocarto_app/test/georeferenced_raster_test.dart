import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/core/map_project.dart';
import 'package:ocarto_app/geo/georeferenced_raster.dart';

void main() {
  test('PGW entiende A D B E C F y el centro del píxel', () {
    final w = RasterWorldFile.parse('0.5\n0\n0\n-0.5\n440000\n4475000\n');
    expect(w.atPixel(0, 0).easting, 440000);
    expect(w.atPixel(0, 0).northing, 4475000);
    expect(w.atPixel(100, 200).easting, 440050);
    expect(w.atPixel(100, 200).northing, 4474900);
    final corner = w.atPixel(-0.5, -0.5);
    expect(corner.easting, 439999.75);
    expect(corner.northing, 4475000.25);
  });

  test('PGW con rotación y términos cruzados no se ignoran', () {
    final w = RasterWorldFile.parse('2\n1\n-1\n-2\n500000\n4500000');
    final p = w.atPixel(10, 20);
    expect(p.easting, 500000);
    expect(p.northing, 4499970);
  });

  test('PGW rechaza valores incompletos y matrices degeneradas', () {
    expect(() => RasterWorldFile.parse('1\n2'), throwsFormatException);
    expect(() => RasterWorldFile.parse('1\n0\n0\n0\n0\n0'),
        throwsFormatException);
    expect(() => RasterWorldFile.parse('NaN\n0\n0\n-1\n0\n0'),
        throwsFormatException);
  });

  test('proyección UTM30 coincide con coordenadas conocidas de Madrid', () {
    final p = UtmProjection.forward(40.4168, -3.7038, 25830);
    expect(p.easting, closeTo(440290.458, 0.5));
    expect(p.northing, closeTo(4474257.382, 0.5));
    final inverse = UtmProjection.inverse(p.easting, p.northing, 25830);
    expect(inverse.latitude, closeTo(40.4168, 0.000001));
    expect(inverse.longitude, closeTo(-3.7038, 0.000001));
  });

  test('proyección UTM30 en Málaga y zonas 29N/31N', () {
    final malaga = UtmProjection.forward(36.72016, -4.42034, 25830);
    expect(malaga.easting, closeTo(373158.377, 0.5));
    expect(malaga.northing, closeTo(4064769.669, 0.5));
    final galicia = UtmProjection.forward(42, -8, 25829);
    expect(galicia.easting, closeTo(582818.069, 0.5));
    expect(galicia.northing, closeTo(4650259.847, 0.5));
    final cataluna = UtmProjection.forward(41, 2, 25831);
    expect(cataluna.easting, closeTo(415897.866, 0.5));
    expect(cataluna.northing, closeTo(4539238.589, 0.5));
  });

  test('EPSG y coordenadas inválidas se rechazan sin inventar posición', () {
    expect(() => UtmProjection.zoneForEpsg(4326), throwsFormatException);
    expect(() => UtmProjection.forward(95, -4, 25830), throwsFormatException);
    expect(() => UtmProjection.inverse(500000, -10, 25830),
        throwsFormatException);
  });

  test('plantilla conserva ruta proyección y PGW al guardar proyecto', () {
    final reference = GeoRasterReference(
      imagePath: r'C:\mapas\bobadilla.png',
      epsg: 25830,
      world: RasterWorldFile.parse('0.5\n0\n0\n-0.5\n440000\n4475000'),
    );
    final project = MapProject(
      name: 'Bobadilla',
      layers: [],
      elements: [],
      geoRaster: reference,
    );
    final decoded = MapProject.decode(project.encode());
    expect(decoded.geoRaster?.imagePath, reference.imagePath);
    expect(decoded.geoRaster?.epsg, 25830);
    expect(decoded.geoRaster?.world.toList(), reference.world.toList());
    final center = reference.center(1001, 1001);
    expect(center.latitude, inInclusiveRange(39, 42));
    expect(center.longitude, inInclusiveRange(-5, -2));
  });

  test('se siguen abriendo proyectos antiguos sin plantilla', () {
    final old = MapProject(name: 'Antiguo', layers: [], elements: []);
    expect(MapProject.decode(old.encode()).geoRaster, isNull);
  });
}
