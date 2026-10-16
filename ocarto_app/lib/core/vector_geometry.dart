/// Vértice de un objeto vectorial, en píxeles de lienzo o en lon/lat WGS84.
/// No confundir con píxeles de un PNG; el sistema se declara en el elemento.
class VectorVertex {
  const VectorVertex(this.x, this.y);
  final double x;
  final double y;

  Map<String, double> toJson() => {'x': x, 'y': y};

  factory VectorVertex.fromJson(Map<String, dynamic> data) {
    final x = (data['x'] as num).toDouble();
    final y = (data['y'] as num).toDouble();
    if (!x.isFinite || !y.isFinite) {
      throw const FormatException('Vértice no finito en el proyecto.');
    }
    return VectorVertex(x, y);
  }
}

/// Reglas de topología mínimas; la edición mantiene los vértices originales.
/// Una zona se cierra visualmente, sin duplicar el primero como último.
class VectorGeometry {
  static int minimumVertices(String tool) {
    if (tool == 'line') return 2;
    if (tool == 'area') return 3;
    return 1;
  }

  static bool valid(String tool, List<VectorVertex> vertices) {
    if (vertices.length < minimumVertices(tool)) return false;
    if (vertices.any((p) => !p.x.isFinite || !p.y.isFinite)) return false;
    if (tool == 'point') return true;
    for (var i = 1; i < vertices.length; i++) {
      if (vertices[i].x != vertices[i - 1].x ||
          vertices[i].y != vertices[i - 1].y) return true;
    }
    return false;
  }
}
