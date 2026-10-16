import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/core/bezier_controls.dart';
import 'package:ocarto_app/core/map_project.dart';
import 'package:ocarto_app/core/vector_geometry.dart';

void main() {
  test('inicializa tangentes simétricas sin invertir su dirección', () {
    const vertices = [
      VectorVertex(0, 0),
      VectorVertex(60, 20),
      VectorVertex(120, 80),
    ];
    final controls = BezierControls.initialize(vertices, 1);
    expect(controls.incoming?.x, 40);
    expect(controls.outgoing?.x, 80);
    expect(controls.incoming?.y, closeTo(6.666666667, .00001));
    expect(controls.outgoing?.y, closeTo(33.333333333, .00001));
    expect(controls.corner, isFalse);
  });

  test('tirador saliente conserva tangente continua al mover su opuesto', () {
    const anchor = VectorVertex(50, 40);
    const moved = VectorVertex(90, 60);
    final controls = const BezierControls().moveHandle(
        vertex: anchor, destination: moved, outgoingSide: true);
    expect(controls.outgoing?.x, 90);
    expect(controls.outgoing?.y, 60);
    expect(controls.incoming?.x, 10);
    expect(controls.incoming?.y, 20);
  });

  test('tirador entrante refleja el saliente y permite corregir curva', () {
    final controls = const BezierControls(corner: true).moveHandle(
      vertex: const VectorVertex(10, 20),
      destination: const VectorVertex(-10, 20),
      outgoingSide: false,
    );
    expect(controls.corner, isFalse);
    expect(controls.incoming?.x, -10);
    expect(controls.outgoing?.x, 30);
  });

  test('desplazar un vértice transporta sus tiradores sin deformar la curva', () {
    const controls = BezierControls(
      incoming: VectorVertex(30, 35),
      outgoing: VectorVertex(70, 45),
    );
    final shifted = controls.translated(10, -5);
    expect(shifted.incoming?.x, 40);
    expect(shifted.incoming?.y, 30);
    expect(shifted.outgoing?.x, 80);
    expect(shifted.outgoing?.y, 40);
  });

  test('control de esquina no conserva tiradores manuales', () {
    const corner = BezierControls(corner: true);
    expect(corner.toJson(), {'corner': true});
    expect(BezierControls.fromJson(corner.toJson()).corner, isTrue);
  });

  test('proyecto Ocarto v6 conserva tiradores, esquinas y WGS84', () {
    const points = [
      VectorVertex(-4.430, 36.720),
      VectorVertex(-4.429, 36.721),
      VectorVertex(-4.428, 36.720),
    ];
    const controls = BezierControls(
      incoming: VectorVertex(-4.4293, 36.7207),
      outgoing: VectorVertex(-4.4287, 36.7213),
    );
    final original = MapProject(
      name: 'Bobadilla Bézier',
      layers: [],
      elements: [
        ProjectElement(
          tool: 'line', x: 0, y: 0, symbol: '506', geographic: true,
          vertices: points,
          bezier: [null, controls, const BezierControls(corner: true)],
        ),
      ],
    );
    final recovered = MapProject.decode(original.encode());
    expect(recovered.version, 6);
    final geometry = recovered.elements.single;
    expect(geometry.geographic, isTrue);
    expect(geometry.bezier.length, points.length);
    expect(geometry.bezier[0], isNull);
    expect(geometry.bezier[1]?.incoming?.y, 36.7207);
    expect(geometry.bezier[1]?.outgoing?.x, -4.4287);
    expect(geometry.bezier[2]?.corner, isTrue);
  });

  test('los proyectos v5 con vértices siguen abriendo sin tiradores', () {
    final old = MapProject(
      name: 'Anterior',
      version: 5,
      layers: [],
      elements: [
        ProjectElement(tool: 'line', x: 0, y: 0,
          vertices: [const VectorVertex(0, 0), const VectorVertex(100, 0)]),
      ],
    );
    final restored = MapProject.decode(old.encode());
    expect(restored.version, 5);
    expect(restored.elements.single.bezier, isEmpty);
  });

  test('rechaza listas de tiradores con índices desalineados', () {
    expect(() => ProjectElement(
      tool: 'line', x: 0, y: 0,
      vertices: [const VectorVertex(0, 0), const VectorVertex(40, 0)],
      bezier: [const BezierControls(corner: true)],
    ), throwsFormatException);
  });
}
