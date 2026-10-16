import 'dart:math' as math;

/// Coordenadas proyectadas (metros) en zona UTM.
class ProjectedPoint {
  const ProjectedPoint(this.easting, this.northing);
  final double easting;
  final double northing;
}

/// Coordenadas geográficas WGS84 (grados decimales).
class LatLon {
  const LatLon(this.latitude, this.longitude);
  final double latitude;
  final double longitude;
}

/// Conversión WGS84/ETRS89 aproximada a UTM. Ambas usan el elipsoide GRS80/
/// WGS84, con diferencias muy pequeñas para visualizar tracks en cartografía
/// española. No aplica transformaciones geodésicas de alta precisión.
class UtmProjection {
  static const _a = 6378137.0;
  static const _e2 = 0.0066943799901413165;
  static const _k0 = 0.9996;

  static int zoneForEpsg(int epsg) {
    if (epsg >= 25829 && epsg <= 25831) return epsg - 25800;
    if (epsg >= 32629 && epsg <= 32631) return epsg - 32600;
    throw FormatException('Sistema EPSG:$epsg no admitido. Usa 25829-25831 o 32629-32631.');
  }

  static ProjectedPoint forward(double latitude, double longitude, int epsg) {
    final zone = zoneForEpsg(epsg);
    if (!latitude.isFinite || !longitude.isFinite ||
        latitude < -80 || latitude > 84 || longitude < -180 || longitude > 180) {
      throw const FormatException('Coordenada WGS84 fuera del dominio UTM.');
    }
    final lon0 = (zone * 6 - 183) * math.pi / 180;
    final lat = latitude * math.pi / 180;
    final lon = longitude * math.pi / 180;
    final sinLat = math.sin(lat);
    final cosLat = math.cos(lat);
    final tanLat = math.tan(lat);
    const ep2 = _e2 / (1 - _e2);
    final n = _a / math.sqrt(1 - _e2 * sinLat * sinLat);
    final t = tanLat * tanLat;
    final c = ep2 * cosLat * cosLat;
    final aa = cosLat * (lon - lon0);
    final m = _a *
        ((1 - _e2 / 4 - 3 * math.pow(_e2, 2) / 64 - 5 * math.pow(_e2, 3) / 256) * lat
        - (3 * _e2 / 8 + 3 * math.pow(_e2, 2) / 32 + 45 * math.pow(_e2, 3) / 1024) * math.sin(2 * lat)
        + (15 * math.pow(_e2, 2) / 256 + 45 * math.pow(_e2, 3) / 1024) * math.sin(4 * lat)
        - 35 * math.pow(_e2, 3) / 3072 * math.sin(6 * lat));
    final x = _k0 * n * (aa + (1 - t + c) * math.pow(aa, 3) / 6 +
        (5 - 18 * t + t * t + 72 * c - 58 * ep2) * math.pow(aa, 5) / 120) + 500000;
    final y = _k0 * (m + n * tanLat * (aa * aa / 2 +
        (5 - t + 9 * c + 4 * c * c) * math.pow(aa, 4) / 24 +
        (61 - 58 * t + t * t + 600 * c - 330 * ep2) * math.pow(aa, 6) / 720));
    return ProjectedPoint(x.toDouble(), (latitude < 0 ? y + 10000000 : y).toDouble());
  }

  /// Inversa válida para las zonas del hemisferio norte admitidas por Ocarto.
  static LatLon inverse(double easting, double northing, int epsg) {
    final zone = zoneForEpsg(epsg);
    if (!easting.isFinite || !northing.isFinite ||
        easting < 100000 || easting > 900000 || northing < 0 || northing > 9400000) {
      throw const FormatException('Coordenada UTM fuera de rango.');
    }
    const ep2 = _e2 / (1 - _e2);
    final x = easting - 500000;
    final m = northing / _k0;
    final mu = m / (_a * (1 - _e2 / 4 -
        3 * math.pow(_e2, 2) / 64 - 5 * math.pow(_e2, 3) / 256));
    final e1 = (1 - math.sqrt(1 - _e2)) / (1 + math.sqrt(1 - _e2));
    final p = mu + (3 * e1 / 2 - 27 * math.pow(e1, 3) / 32) * math.sin(2 * mu)
        + (21 * math.pow(e1, 2) / 16 - 55 * math.pow(e1, 4) / 32) * math.sin(4 * mu)
        + 151 * math.pow(e1, 3) / 96 * math.sin(6 * mu)
        + 1097 * math.pow(e1, 4) / 512 * math.sin(8 * mu);
    final sp = math.sin(p);
    final cp = math.cos(p);
    final tp = math.tan(p);
    final n1 = _a / math.sqrt(1 - _e2 * sp * sp);
    final r1 = _a * (1 - _e2) / math.pow(1 - _e2 * sp * sp, 1.5);
    final t1 = tp * tp;
    final c1 = ep2 * cp * cp;
    final d = x / (n1 * _k0);
    final lat = p - (n1 * tp / r1) *
        (d * d / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * ep2) * math.pow(d, 4) / 24 +
         (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * ep2 - 3 * c1 * c1) *
             math.pow(d, 6) / 720);
    final lon = (zone * 6 - 183) * math.pi / 180 +
        (d - (1 + 2 * t1 + c1) * math.pow(d, 3) / 6 +
         (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * ep2 + 24 * t1 * t1) *
             math.pow(d, 5) / 120) / cp;
    return LatLon(lat * 180 / math.pi, lon * 180 / math.pi);
  }
}

/// World file PNG (PGW): A, D, B, E, C, F.
/// C/F se refieren al centro del píxel superior izquierdo, no a su esquina.
class RasterWorldFile {
  const RasterWorldFile(this.a, this.d, this.b, this.e, this.c, this.f);
  final double a, d, b, e, c, f;

  factory RasterWorldFile.parse(String source) {
    final lines = source.split(RegExp(r'\\r?\\n'))
        .map((line) => line.trim()).where((line) => line.isNotEmpty).toList();
    if (lines.length != 6) {
      throw const FormatException('El PGW debe contener seis valores numéricos.');
    }
    final values = lines.map(double.tryParse).toList();
    if (values.any((v) => v == null || !v.isFinite)) {
      throw const FormatException('El PGW contiene valores no válidos.');
    }
    final v = values.cast<double>();
    if ((v[0] * v[3] - v[2] * v[1]).abs() < 1e-12) {
      throw const FormatException('El PGW tiene una transformación no invertible.');
    }
    return RasterWorldFile(v[0], v[1], v[2], v[3], v[4], v[5]);
  }

  ProjectedPoint atPixel(double column, double row) =>
      ProjectedPoint(a * column + b * row + c,
                     d * column + e * row + f);

  List<double> toList() => [a, d, b, e, c, f];

  factory RasterWorldFile.fromList(List<dynamic> values) {
    if (values.length != 6 || values.any((v) => v is! num)) {
      throw const FormatException('Transformación PGW inválida en el proyecto.');
    }
    return RasterWorldFile.parse(values.map((v) => (v as num).toString()).join('\\n'));
  }
}

/// Ruta de archivo local, EPSG conocido y referencia espacial persistida.
class GeoRasterReference {
  GeoRasterReference({
    required this.imagePath,
    required this.epsg,
    required this.world,
  }) {
    UtmProjection.zoneForEpsg(epsg);
    if (imagePath.trim().isEmpty) {
      throw const FormatException('La plantilla no tiene ruta de imagen.');
    }
  }

  final String imagePath;
  final int epsg;
  final RasterWorldFile world;

  Map<String, Object> toJson() => {
    'imagePath': imagePath,
    'epsg': epsg,
    'world': world.toList(),
  };

  factory GeoRasterReference.fromJson(Map<String, dynamic> data) =>
      GeoRasterReference(
        imagePath: data['imagePath'] as String,
        epsg: data['epsg'] as int,
        world: RasterWorldFile.fromList(data['world'] as List<dynamic>),
      );

  LatLon center(int imageWidth, int imageHeight) {
    final p = world.atPixel((imageWidth - 1) / 2, (imageHeight - 1) / 2);
    return UtmProjection.inverse(p.easting, p.northing, epsg);
  }
}
