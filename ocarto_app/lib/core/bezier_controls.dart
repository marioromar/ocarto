import 'dart:math' as math;

import 'vector_geometry.dart';

/// How the opposing handle responds to dragging one Bézier handle.
enum BezierHandleMode {
  /// Equal length, opposite direction (v255 behavior).
  mirrored,
  /// Same tangent, independently preserved opposite length.
  aligned,
  /// Move only the selected side. The other control stays untouched.
  free,
}

/// Controls use the same coordinate space as the anchor (local or WGS84).
/// A null per-vertex entry means automatic smoothing. [corner] forces
/// angular joins and takes precedence over handle coordinates.
class BezierControls {
  const BezierControls({
    this.incoming,
    this.outgoing,
    this.corner = false,
    this.mode = BezierHandleMode.mirrored,
  });

  final VectorVertex? incoming;
  final VectorVertex? outgoing;
  final bool corner;
  final BezierHandleMode mode;

  Map<String, Object> toJson() => {
    if (incoming != null) 'incoming': incoming!.toJson(),
    if (outgoing != null) 'outgoing': outgoing!.toJson(),
    if (corner) 'corner': true,
    if (mode != BezierHandleMode.mirrored) 'mode': mode.name,
  };

  factory BezierControls.fromJson(Map<String, dynamic> json) {
    final modeName = json['mode'];
    if (modeName != null &&
        (modeName is! String ||
         !BezierHandleMode.values.any((mode) => mode.name == modeName))) {
      throw const FormatException('Modo de tiradores Bézier no reconocido.');
    }
    return BezierControls(
      incoming: json['incoming'] is Map<String, dynamic>
          ? VectorVertex.fromJson(json['incoming'] as Map<String, dynamic>)
          : null,
      outgoing: json['outgoing'] is Map<String, dynamic>
          ? VectorVertex.fromJson(json['outgoing'] as Map<String, dynamic>)
          : null,
      corner: json['corner'] == true,
      mode: modeName == null ? BezierHandleMode.mirrored
          : BezierHandleMode.values.firstWhere((mode) => mode.name == modeName),
    );
  }

  BezierControls translated(double dx, double dy) {
    VectorVertex? shift(VectorVertex? p) =>
        p == null ? null : VectorVertex(p.x + dx, p.y + dy);
    return BezierControls(
      incoming: shift(incoming),
      outgoing: shift(outgoing),
      corner: corner,
      mode: mode,
    );
  }

  /// Switch modes without producing a backwards tangent discontinuity.
  /// The outgoing handle sets the direction when both handles are present.
  BezierControls withMode(BezierHandleMode selected, VectorVertex vertex) {
    if (selected == BezierHandleMode.free) {
      return BezierControls(incoming: incoming, outgoing: outgoing, mode: selected);
    }
    final primary = outgoing ?? (incoming == null ? null :
      VectorVertex(2 * vertex.x - incoming!.x, 2 * vertex.y - incoming!.y));
    if (primary == null) return BezierControls(
        incoming: incoming, outgoing: outgoing, mode: selected);
    final length = math.sqrt(
        math.pow(primary.x - vertex.x, 2) + math.pow(primary.y - vertex.y, 2));
    final opposite = incoming;
    final oppositeLength = opposite == null ? length : math.sqrt(
        math.pow(opposite.x - vertex.x, 2) + math.pow(opposite.y - vertex.y, 2));
    final keepLength = selected == BezierHandleMode.aligned
        ? oppositeLength : length;
    if (length == 0) {
      return BezierControls(incoming: incoming, outgoing: outgoing, mode: selected);
    }
    return BezierControls(
      incoming: VectorVertex(
        vertex.x - (primary.x - vertex.x) * keepLength / length,
        vertex.y - (primary.y - vertex.y) * keepLength / length,
      ),
      outgoing: primary,
      mode: selected,
    );
  }

  /// A selected handle is freely draggable. The other one either mirrors,
  /// stays collinear with its own previous length, or remains untouched.
  BezierControls moveHandle({
    required VectorVertex vertex,
    required VectorVertex destination,
    required bool outgoingSide,
  }) {
    final unchanged = outgoingSide ? incoming : outgoing;
    final dx = destination.x - vertex.x;
    final dy = destination.y - vertex.y;
    final length = math.sqrt(dx * dx + dy * dy);
    VectorVertex? opposite;
    switch (mode) {
      case BezierHandleMode.free:
        opposite = unchanged;
        break;
      case BezierHandleMode.mirrored:
        opposite = VectorVertex(vertex.x - dx, vertex.y - dy);
        break;
      case BezierHandleMode.aligned:
        if (length == 0) {
          opposite = unchanged;
        } else {
          final preservedLength = unchanged == null ? length : math.sqrt(
              math.pow(unchanged.x - vertex.x, 2) +
              math.pow(unchanged.y - vertex.y, 2));
          opposite = VectorVertex(
            vertex.x - dx * preservedLength / length,
            vertex.y - dy * preservedLength / length,
          );
        }
        break;
    }
    return BezierControls(
      incoming: outgoingSide ? opposite : destination,
      outgoing: outgoingSide ? destination : opposite,
      mode: mode,
    );
  }

  static BezierControls initialize(
      List<VectorVertex> vertices, int index, {bool closed = false}) {
    if (index < 0 || index >= vertices.length || vertices.length < 2) {
      throw RangeError.index(index, vertices, 'index');
    }
    final current = vertices[index];
    final previous = vertices[
        closed ? (index + vertices.length - 1) % vertices.length
               : (index == 0 ? 0 : index - 1)];
    final next = vertices[
        closed ? (index + 1) % vertices.length
               : (index == vertices.length - 1 ? index : index + 1)];
    final tx = (next.x - previous.x) / 6;
    final ty = (next.y - previous.y) / 6;
    return BezierControls(
      incoming: VectorVertex(current.x - tx, current.y - ty),
      outgoing: VectorVertex(current.x + tx, current.y + ty),
    );
  }
}
