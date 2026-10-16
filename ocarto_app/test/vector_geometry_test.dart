import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/core/map_project.dart';
import 'package:ocarto_app/core/vector_geometry.dart';

void main() {
  test('dos vértices distintos hacen línea editable', () {
    const a = VectorVertex(10, 20);
    const b = VectorVertex(45, 75);
    expect(VectorGeometry.valid('line', [a, b]), isTrue);
    expect(VectorGeometry.valid('line', [a]), isFalse);
    expect(VectorGeometry.valid('line', [a, a]), isFalse);
  });

  test('polígonos requieren tres vértices distintos y superficie', () {
    const a = VectorVertex(0, 0);
    const b = VectorVertex(10, 0);
    const c = VectorVertex(10, 10);
    expect(VectorGeometry.valid('area', [a, b, c]), isTrue);
    expect(VectorGeometry.valid('area', [a, b]), isFalse);
    expect(VectorGeometry.valid('area', [a, b, b]), isFalse);
    expect(VectorGeometry.valid('area',
        [a, b, const VectorVertex(20, 0)]), isFalse);
  });

  test('lienzo local serializa coordenadas sin truncarlas', () {
    final source = MapProject(name: 'Líneas',
      layers: [], elements: [
        ProjectElement(tool: 'line', x: 15, y: 25, symbol: '506',
            vertices: [const VectorVertex(15.25, 25.5),
                       const VectorVertex(125.75, 205.125)]),
      ]);
    final restored = MapProject.decode(source.encode());
    final e = restored.elements.single;
    expect(e.tool, 'line');
    expect(e.symbol, '506');
    expect(e.geographic, isFalse);
    expect(e.vertices.map((v) => v.toJson()).toList(),
        source.elements.single.vertices.map((v) => v.toJson()).toList());
    expect(restored.version, 5);
  });

  test('área con longitud y latitud WGS84 recupera geometría', () {
    const ring = [
      VectorVertex(-4.422100, 36.725100),
      VectorVertex(-4.422000, 36.725110),
      VectorVertex(-4.422015, 36.725000),
    ];
    final source = MapProject(name: 'Área geográfica',
      layers: [], elements: [
        ProjectElement(tool: 'area', x: 0, y: 0,
          symbol: 'Verde oscuro', geographic: true, vertices: ring),
      ]);
    final restored = MapProject.decode(source.encode()).elements.single;
    expect(restored.geographic, isTrue);
    expect(restored.vertices.length, 3);
    expect(restored.vertices[1].x, -4.422000);
    expect(VectorGeometry.valid('area', restored.vertices), isTrue);
  });

  test('un punto geográfico sin lista de vértices conserva WGS84', () {
    final project = MapProject(name: 'GPS', layers: [], elements: [
      ProjectElement(tool: 'point', x: -4.422, y: 36.725,
          symbol: 'Árbol', geographic: true),
    ]);
    final restored = MapProject.decode(project.encode()).elements.single;
    expect(restored.geographic, isTrue);
    expect(restored.x, -4.422);
    expect(restored.y, 36.725);
    expect(restored.vertices, isEmpty);
  });

  test('el proyecto antiguo sin vertices sigue siendo válido', () {
    final old = MapProject(name: 'Antiguo', layers: [],
      elements: [ProjectElement(tool: 'point', x: 5, y: 10)]);
    final recovered = MapProject.decode(old.encode());
    expect(recovered.elements.single.vertices, isEmpty);
    expect(recovered.elements.single.geographic, isFalse);
  });

  test('rechaza coordenadas no finitas en objetos persistidos', () {
    expect(() => VectorVertex.fromJson({'x': double.infinity, 'y': 1}),
        throwsFormatException);
    expect(() => VectorVertex.fromJson({'x': double.nan, 'y': 1}),
        throwsFormatException);
  });
}
