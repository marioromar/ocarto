import 'dart:convert';

class ProjectLayer {
  ProjectLayer({
    required this.id,
    required this.name,
    this.visible = true,
    this.opacity = 1,
  });
  final String id;
  final String name;
  bool visible;
  double opacity;
  Map<String, Object> toJson() => {
    'id': id,
    'name': name,
    'visible': visible,
    'opacity': opacity,
  };
  factory ProjectLayer.fromJson(Map<String, dynamic> json) => ProjectLayer(
    id: json['id'] as String,
    name: json['name'] as String,
    visible: json['visible'] as bool? ?? true,
    opacity: (json['opacity'] as num?)?.toDouble() ?? 1,
  );
}

class ProjectElement {
  ProjectElement({
    required this.tool,
    required this.x,
    required this.y,
    this.symbol = 'IOF-placeholder',
  });
  final String tool;
  final double x;
  final double y;
  final String symbol;
  Map<String, Object> toJson() => {
    'tool': tool,
    'x': x,
    'y': y,
    'symbol': symbol,
  };
  factory ProjectElement.fromJson(Map<String, dynamic> json) => ProjectElement(
    tool: json['tool'] as String,
    x: (json['x'] as num).toDouble(),
    y: (json['y'] as num).toDouble(),
    symbol: json['symbol'] as String? ?? 'IOF-placeholder',
  );
}

class MapProject {
  MapProject({
    required this.name,
    required this.layers,
    required this.elements,
    this.version = 1,
  });
  final String name;
  final int version;
  final List<ProjectLayer> layers;
  final List<ProjectElement> elements;
  String encode() => jsonEncode({
    'format': 'ocarto-project',
    'version': version,
    'name': name,
    'layers': layers.map((e) => e.toJson()).toList(),
    'elements': elements.map((e) => e.toJson()).toList(),
  });
  factory MapProject.decode(String source) {
    final json = jsonDecode(source) as Map<String, dynamic>;
    if (json['format'] != 'ocarto-project') {
      throw const FormatException('Formato de proyecto no reconocido');
    }
    return MapProject(
      name: json['name'] as String? ?? 'Sin nombre',
      version: json['version'] as int? ?? 1,
      layers: (json['layers'] as List<dynamic>? ?? [])
          .map((e) => ProjectLayer.fromJson(e as Map<String, dynamic>))
          .toList(),
      elements: (json['elements'] as List<dynamic>? ?? [])
          .map((e) => ProjectElement.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
