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
    final unique = <String>{};
    for (final p in vertices) {
      unique.add('${p.x}:${p.y}');
    }
    if (unique.length < minimumVertices(tool)) return false;
    if (tool != 'area') return true;
    // Área de zapatero con origen local para reducir cancelación en
    // coordenadas UTM o grados de longitud/latitud cercanos entre sí.
    final origin = vertices.first;
    var doubleArea = 0.0;
    for (var i = 0; i < vertices.length; i++) {
      final a = vertices[i];
      final b = vertices[(i + 1) % vertices.length];
      doubleArea += (a.x - origin.x) * (b.y - origin.y) -
          (b.x - origin.x) * (a.y - origin.y);
    }
    return doubleArea != 0 && doubleArea.isFinite;
  }
}
