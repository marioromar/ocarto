import '../core/bezier_controls.dart';
import '../core/vector_geometry.dart';
import 'georeferenced_raster.dart';

/// Projects editable WGS84 Bézier points to local metric UTM coordinates for
/// all geometry operations and then stores the result back as WGS84.
///
/// Project files remain portable because the vertex and its handles continue
/// to use lon/lat. This avoids treating degrees of latitude and longitude as
/// equal-sized Cartesian axes when editing a curve on a georeferenced map.
class GeographicBezierEditor {
  GeographicBezierEditor(this.epsg) {
    UtmProjection.zoneForEpsg(epsg);
  }

  final int epsg;

  /// Stored point: x=longitude, y=latitude (WGS84 decimal degrees).
  VectorVertex toMeters(VectorVertex geographic) {
    final p = UtmProjection.forward(geographic.y, geographic.x, epsg);
    return VectorVertex(p.easting, p.northing);
  }

  VectorVertex toGeographic(VectorVertex meters) {
    final p = UtmProjection.inverse(meters.x, meters.y, epsg);
    return VectorVertex(p.longitude, p.latitude);
  }

  BezierControls _mapControls(
      BezierControls control, VectorVertex Function(VectorVertex) map) {
    return BezierControls(
      incoming: control.incoming == null ? null : map(control.incoming!),
      outgoing: control.outgoing == null ? null : map(control.outgoing!),
      corner: control.corner,
      mode: control.mode,
    );
  }

  BezierControls initialize(
      List<VectorVertex> points, int index, {bool closed = false}) {
    final projected = points.map(toMeters).toList();
    final control = BezierControls.initialize(
        projected, index, closed: closed);
    return _mapControls(control, toGeographic);
  }

  BezierControls withMode(
      BezierControls existing, BezierHandleMode mode, VectorVertex anchor) {
    final projected = _mapControls(existing, toMeters);
    final modified = projected.withMode(mode, toMeters(anchor));
    return _mapControls(modified, toGeographic);
  }

  BezierControls moveHandle({
    required BezierControls existing,
    required VectorVertex anchor,
    required VectorVertex destination,
    required bool outgoingSide,
  }) {
    final projected = _mapControls(existing, toMeters);
    final edited = projected.moveHandle(
      vertex: toMeters(anchor),
      destination: toMeters(destination),
      outgoingSide: outgoingSide,
    );
    return _mapControls(edited, toGeographic);
  }

  /// Translation is performed in metres, so the shape stays fixed relative
  /// to the selected anchor even when map latitude changes.
  BezierControls moveAnchor({
    required BezierControls existing,
    required VectorVertex previous,
    required VectorVertex destination,
  }) {
    final oldPoint = toMeters(previous);
    final newPoint = toMeters(destination);
    final projected = _mapControls(existing, toMeters);
    return _mapControls(
      projected.translated(
        newPoint.x - oldPoint.x, newPoint.y - oldPoint.y),
      toGeographic,
    );
  }
}
