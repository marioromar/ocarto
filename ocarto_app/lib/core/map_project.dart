import 'dart:convert';

import '../gps/nmea_parser.dart';
import '../geo/georeferenced_raster.dart';

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
    List<GpsFix>? gpsPoints,
    this.isGpsTrack = false,
  }) : gpsPoints = gpsPoints ?? [];

  final String tool;
  final double x;
  final double y;
  final String symbol;
  final bool isGpsTrack;
  final List<GpsFix> gpsPoints;

  Map<String, Object> toJson() => {
        'tool': tool,
        'x': x,
        'y': y,
        'symbol': symbol,
        if (isGpsTrack) 'gpsTrack': true,
        if (isGpsTrack) 'gpsPoints': gpsPoints.map((p) => p.toJson()).toList(),
      };

  factory ProjectElement.fromJson(Map<String, dynamic> json) => ProjectElement(
        tool: json['tool'] as String,
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        symbol: json['symbol'] as String? ?? 'IOF-placeholder',
        isGpsTrack: json['gpsTrack'] == true,
        gpsPoints: (json['gpsPoints'] as List<dynamic>? ?? const [])
            .map((v) => GpsFix.fromJson(v as Map<String, dynamic>))
            .toList(),
      );
}

class MapProject {
  MapProject({
    required this.name,
    required this.layers,
    required this.elements,
    this.version = 3,
    this.gpsCenterLatitude,
    this.gpsCenterLongitude,
    this.gpsMetersPerPixel = 2,
    this.gpsTrackSymbol = '506',
    this.geoRaster,
    List<String>? favoriteSymbols,
    this.selectedCatalogSymbol,
    this.activeTool,
  }) : favoriteSymbols = List.unmodifiable(favoriteSymbols ?? const <String>[]);

  final String name;
  final int version;
  final List<ProjectLayer> layers;
  final List<ProjectElement> elements;
  final double? gpsCenterLatitude;
  final double? gpsCenterLongitude;
  final double gpsMetersPerPixel;
  final String gpsTrackSymbol;
  final GeoRasterReference? geoRaster;
  final List<String> favoriteSymbols;
  final String? selectedCatalogSymbol;
  final String? activeTool;

  String encode() => jsonEncode({
        'format': 'ocarto-project',
        'version': version,
        'name': name,
        'layers': layers.map((e) => e.toJson()).toList(),
        'elements': elements.map((e) => e.toJson()).toList(),
        if (geoRaster != null) 'geoRaster': geoRaster!.toJson(),
        'favoriteSymbols': favoriteSymbols,
        if (selectedCatalogSymbol != null) 'selectedCatalogSymbol': selectedCatalogSymbol,
        if (activeTool != null) 'activeTool': activeTool,
        'gps': {
          'centerLatitude': gpsCenterLatitude,
          'centerLongitude': gpsCenterLongitude,
          'metersPerPixel': gpsMetersPerPixel,
          'defaultLineSymbol': gpsTrackSymbol,
        },
      });

  factory MapProject.decode(String source) {
    final json = jsonDecode(source) as Map<String, dynamic>;
    if (json['format'] != 'ocarto-project') {
      throw const FormatException('Formato de proyecto no reconocido');
    }
    final gps = json['gps'] is Map<String, dynamic>
        ? json['gps'] as Map<String, dynamic>
        : <String, dynamic>{};
    return MapProject(
      name: json['name'] as String? ?? 'Sin nombre',
      version: json['version'] as int? ?? 1,
      layers: (json['layers'] as List<dynamic>? ?? const [])
          .map((e) => ProjectLayer.fromJson(e as Map<String, dynamic>))
          .toList(),
      elements: (json['elements'] as List<dynamic>? ?? const [])
          .map((e) => ProjectElement.fromJson(e as Map<String, dynamic>))
          .toList(),
      gpsCenterLatitude: (gps['centerLatitude'] as num?)?.toDouble(),
      gpsCenterLongitude: (gps['centerLongitude'] as num?)?.toDouble(),
      gpsMetersPerPixel:
          (gps['metersPerPixel'] as num?)?.toDouble() ?? 2,
      gpsTrackSymbol: gps['defaultLineSymbol'] as String? ?? '506',
      geoRaster: json['geoRaster'] is Map<String, dynamic>
          ? GeoRasterReference.fromJson(json['geoRaster'] as Map<String, dynamic>)
          : null,
      favoriteSymbols: (json['favoriteSymbols'] as List<dynamic>? ?? const [])
          .whereType<String>().toList(),
      selectedCatalogSymbol: json['selectedCatalogSymbol'] as String?,
      activeTool: json['activeTool'] as String?,
    );
  }
}