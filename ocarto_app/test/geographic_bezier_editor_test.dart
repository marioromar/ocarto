import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/core/bezier_controls.dart';
import 'package:ocarto_app/core/vector_geometry.dart';
import 'package:ocarto_app/geo/geographic_bezier_editor.dart';

void main() {
  final editor = GeographicBezierEditor(25830);

  VectorVertex ll(double x, double y) =>
      editor.toGeographic(VectorVertex(x, y));
  VectorVertex utm(VectorVertex point) => editor.toMeters(point);

  void near(VectorVertex? point, double x, double y,
      {double tolerance = 0.05}) {
    expect(point, isNotNull);
    expect(point!.x, closeTo(x, tolerance));
    expect(point.y, closeTo(y, tolerance));
  }

  test('inicializa tiradores WGS84 usando tangentes métricas UTM', () {
    final vertices = [
      ll(370000, 4064000),
      ll(370050, 4064000),
      ll(370100, 4064030),
    ];
    final control = editor.initialize(vertices, 1);
    near(utm(control.incoming!), 370050 - 100 / 6, 4064000 - 30 / 6);
    near(utm(control.outgoing!), 370050 + 100 / 6, 4064000 + 30 / 6);
  });

  test('modo simétrico refleja el tirador en metros y lo guarda en WGS84', () {
    final anchor = ll(370050, 4064000);
    final outgoing = ll(370082, 4064024);
    final source = BezierControls(
      incoming: ll(370035, 4063995),
      outgoing: ll(370070, 4064010),
    );
    final modified = editor.moveHandle(
      existing: source, anchor: anchor, destination: outgoing,
      outgoingSide: true,
    );
    near(utm(modified.outgoing!), 370082, 4064024);
    near(utm(modified.incoming!), 370018, 4063976);
    expect(modified.mode, BezierHandleMode.mirrored);
  });

  test('modo libre conserva el otro control al mover uno sobre el mapa', () {
    final originalIncoming = ll(370035, 4063990);
    final anchor = ll(370050, 4064000);
    final original = BezierControls(
      incoming: originalIncoming,
      outgoing: ll(370060, 4064010),
      mode: BezierHandleMode.free,
    );
    final modified = editor.moveHandle(
      existing: original, anchor: anchor,
      destination: ll(370075, 4064030), outgoingSide: true,
    );
    near(utm(modified.incoming!), 370035, 4063990);
    near(utm(modified.outgoing!), 370075, 4064030);
  });

  test('modo alineado mantiene la longitud opuesta en metros', () {
    final anchor = ll(370050, 4064000);
    final controls = BezierControls(
      incoming: ll(370035, 4064000),
      outgoing: ll(370065, 4064000),
      mode: BezierHandleMode.aligned,
    );
    final edited = editor.moveHandle(
      existing: controls, anchor: anchor,
      destination: ll(370050, 4064040),
      outgoingSide: true,
    );
    near(utm(edited.incoming!), 370050, 4063985);
    near(utm(edited.outgoing!), 370050, 4064040);
    final incomingMeters = utm(edited.incoming!);
    expect(math.sqrt(math.pow(incomingMeters.x - 370050, 2) +
        math.pow(incomingMeters.y - 4064000, 2)), closeTo(15, 0.05));
  });

  test('cambiar modo de tirador usa longitud métrica, no grados', () {
    final anchor = ll(370050, 4064000);
    final source = BezierControls(
      incoming: ll(370050, 4063980),
      outgoing: ll(370080, 4064000),
      mode: BezierHandleMode.free,
    );
    final aligned = editor.withMode(
        source, BezierHandleMode.aligned, anchor);
    near(utm(aligned.incoming!), 370030, 4064000);
    near(utm(aligned.outgoing!), 370080, 4064000);
    expect(aligned.mode, BezierHandleMode.aligned);
  });

  test('mover ancla desplaza ambos tiradores por la misma distancia UTM', () {
    final anchor = ll(370050, 4064000);
    final destination = ll(370057, 4063996);
    final initial = BezierControls(
      incoming: ll(370030, 4063990),
      outgoing: ll(370070, 4064005),
      mode: BezierHandleMode.free,
    );
    final moved = editor.moveAnchor(
      existing: initial, previous: anchor, destination: destination);
    near(utm(moved.incoming!), 370037, 4063986);
    near(utm(moved.outgoing!), 370077, 4064001);
    expect(moved.mode, BezierHandleMode.free);
  });

  test('conserva precisión en ETRS89 UTM 29N, 30N y 31N', () {
    for (final epsg in [25829, 25830, 25831, 32630]) {
      final testEditor = GeographicBezierEditor(epsg);
      final original = VectorVertex(500000, 4500000);
      final geographic = testEditor.toGeographic(original);
      final restored = testEditor.toMeters(geographic);
      near(restored, original.x, original.y);
    }
  });

  test('rechaza EPSG y coordenadas fuera del dominio', () {
    expect(() => GeographicBezierEditor(4326), throwsFormatException);
    expect(() => editor.toMeters(const VectorVertex(0, 100)),
        throwsFormatException);
  });
}
