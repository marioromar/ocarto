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
    expect(recovered.version, 7);
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
  test('modo libre conserva exactamente el otro tirador al arrastrar', () {
    const current = BezierControls(
      incoming: VectorVertex(25, 35),
      outgoing: VectorVertex(60, 50),
      mode: BezierHandleMode.free,
    );
    final edited = current.moveHandle(
      vertex: const VectorVertex(40, 40),
      destination: const VectorVertex(80, 65),
      outgoingSide: true,
    );
    expect(edited.incoming?.x, 25);
    expect(edited.incoming?.y, 35);
    expect(edited.outgoing?.x, 80);
    expect(edited.outgoing?.y, 65);
    expect(edited.mode, BezierHandleMode.free);
    final incomingMoved = edited.moveHandle(
      vertex: const VectorVertex(40, 40),
      destination: const VectorVertex(0, 20),
      outgoingSide: false,
    );
    expect(incomingMoved.outgoing?.x, 80);
    expect(incomingMoved.outgoing?.y, 65);
  });

  test('modo alineado respeta longitud propia del otro tirador', () {
    const anchor = VectorVertex(100, 100);
    const current = BezierControls(
      incoming: VectorVertex(80, 100),
      outgoing: VectorVertex(140, 100),
      mode: BezierHandleMode.aligned,
    );
    final edited = current.moveHandle(
      vertex: anchor,
      destination: const VectorVertex(100, 160),
      outgoingSide: true,
    );
    expect(edited.outgoing?.x, 100);
    expect(edited.outgoing?.y, 160);
    expect(edited.incoming?.x, closeTo(100, 0.0000001));
    expect(edited.incoming?.y, closeTo(80, 0.0000001));
    expect(edited.mode, BezierHandleMode.aligned);
  });

  test('cambiar de libres a alineados conserva longitudes relativas', () {
    const current = BezierControls(
      incoming: VectorVertex(90, 90),
      outgoing: VectorVertex(130, 100),
      mode: BezierHandleMode.free,
    );
    final aligned = current.withMode(
        BezierHandleMode.aligned, const VectorVertex(100, 100));
    expect(aligned.mode, BezierHandleMode.aligned);
    expect(aligned.incoming?.x, closeTo(85.857864, 0.0001));
    expect(aligned.incoming?.y, closeTo(100, 0.0001));
    expect(aligned.outgoing?.x, 130);
  });

  test('pasar a simétricos iguala longitudes', () {
    const current = BezierControls(
      incoming: VectorVertex(90, 90),
      outgoing: VectorVertex(130, 100),
      mode: BezierHandleMode.free,
    );
    final mirrored = current.withMode(
      BezierHandleMode.mirrored, const VectorVertex(100, 100));
    expect(mirrored.incoming?.x, 70);
    expect(mirrored.incoming?.y, 100);
    expect(mirrored.mode, BezierHandleMode.mirrored);
  });

  test('modo alineado evita valores no finitos con tirador cero', () {
    const current = BezierControls(
      incoming: VectorVertex(90, 100),
      outgoing: VectorVertex(100, 100),
      mode: BezierHandleMode.aligned,
    );
    final edited = current.moveHandle(
      vertex: const VectorVertex(100, 100),
      destination: const VectorVertex(100, 100),
      outgoingSide: true,
    );
    expect(edited.incoming?.x, 90);
    expect(edited.incoming?.y, 100);
    expect(edited.outgoing?.x, 100);
  });

  test('proyecto v7 conserva el modo libre al volver a abrirlo', () {
    const controls = BezierControls(
      incoming: VectorVertex(10, 20),
      outgoing: VectorVertex(50, 80),
      mode: BezierHandleMode.free,
    );
    final project = MapProject(
      name: 'Tiradores libres', layers: [],
      elements: [ProjectElement(tool: 'line', x: 0, y: 0,
        vertices: [const VectorVertex(0, 0), const VectorVertex(40, 40)],
        bezier: [null, controls])],
    );
    final reopened = MapProject.decode(project.encode());
    expect(reopened.version, 7);
    expect(reopened.elements.single.bezier[1]?.mode, BezierHandleMode.free);
    expect(reopened.elements.single.bezier[1]?.incoming?.y, 20);
  });

  test('proyecto v6 sin campo mode mantiene simetría de tiradores', () {
    final previous = MapProject(name: 'v6', version: 6, layers: [],
      elements: [ProjectElement(tool: 'line', x: 0, y: 0,
        vertices: [const VectorVertex(0, 0), const VectorVertex(50, 50)],
        bezier: [null, const BezierControls(
          incoming: VectorVertex(30, 30),
          outgoing: VectorVertex(70, 70),
        )])],
    );
    final restored = MapProject.decode(previous.encode());
    expect(restored.version, 6);
    expect(restored.elements.single.bezier[1]?.mode, BezierHandleMode.mirrored);
  });

  test('rechaza modo de tirador Bézier desconocido en archivo', () {
    expect(() => BezierControls.fromJson({'mode': 'unstable'}),
        throwsFormatException);
  });

}
