import 'vector_geometry.dart';

/// Controls are absolute coordinates in the same system as the vertex:
/// local editor coordinates or WGS84 longitude/latitude. A null entry means
/// automatic smoothing; [corner] intentionally breaks the tangent.
class BezierControls {
  const BezierControls({
    this.incoming,
    this.outgoing,
    this.corner = false,
  });

  final VectorVertex? incoming;
  final VectorVertex? outgoing;
  final bool corner;

  Map<String, Object> toJson() => {
    if (incoming != null) 'incoming': incoming!.toJson(),
    if (outgoing != null) 'outgoing': outgoing!.toJson(),
    if (corner) 'corner': true,
  };

  factory BezierControls.fromJson(Map<String, dynamic> json) {
    return BezierControls(
      incoming: json['incoming'] is Map<String, dynamic>
          ? VectorVertex.fromJson(json['incoming'] as Map<String, dynamic>)
          : null,
      outgoing: json['outgoing'] is Map<String, dynamic>
          ? VectorVertex.fromJson(json['outgoing'] as Map<String, dynamic>)
          : null,
      corner: json['corner'] == true,
    );
  }

  /// When moving the anchor, its absolute control points move with it.
  BezierControls translated(double dx, double dy) {
    VectorVertex? shift(VectorVertex? p) =>
        p == null ? null : VectorVertex(p.x + dx, p.y + dy);
    return BezierControls(
      incoming: shift(incoming),
      outgoing: shift(outgoing),
      corner: corner,
    );
  }

  /// Move one handle and mirror the other around the vertex. This enforces
  /// a continuous tangent, even when a vertex was previously a corner.
  BezierControls moveHandle({
    required VectorVertex vertex,
    required VectorVertex destination,
    required bool outgoingSide,
  }) {
    final opposite = VectorVertex(
      2 * vertex.x - destination.x,
      2 * vertex.y - destination.y,
    );
    return BezierControls(
      incoming: outgoingSide ? opposite : destination,
      outgoing: outgoingSide ? destination : opposite,
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
    // 1/6 Catmull-Rom tangent: a starting point only, manually adjustable.
    final tx = (next.x - previous.x) / 6;
    final ty = (next.y - previous.y) / 6;
    return BezierControls(
      incoming: VectorVertex(current.x - tx, current.y - ty),
      outgoing: VectorVertex(current.x + tx, current.y + ty),
    );
  }
}
