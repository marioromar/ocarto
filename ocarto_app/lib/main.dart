import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';

import 'core/map_project.dart';
import 'core/project_storage.dart';
import 'core/symbol_catalog.dart';
import 'core/vector_geometry.dart';
import 'core/bezier_controls.dart';
import 'gps/gps_serial_service.dart';
import 'gps/nmea_parser.dart';
import 'geo/georeferenced_raster.dart';

void main() => runApp(const OcartoApp());

enum MapTool { select, point, line, area }

class MapElement {
  MapElement(
    this.tool,
    this.position,
    this.symbol, {
    this.isGpsTrack = false,
    List<GpsFix>? gpsPoints,
    List<Offset>? vertices,
    List<BezierControls?>? bezier,
    this.geographic = false,
  }) : gpsPoints = gpsPoints ?? <GpsFix>[],
       vertices = vertices ?? <Offset>[],
       bezier = bezier == null || bezier.isEmpty
           ? List<BezierControls?>.filled(vertices?.length ?? 0, null, growable: true)
           : List<BezierControls?>.from(bezier);

  final MapTool tool;
  Offset position;
  String symbol;
  final bool isGpsTrack;
  final bool geographic;
  final List<GpsFix> gpsPoints;
  final List<Offset> vertices;
  final List<BezierControls?> bezier;
}

class GpsLineSymbol {
  const GpsLineSymbol(this.code, this.label, this.color,
      {this.width = 2, this.dashed = false});
  final String code;
  final String label;
  final Color color;
  final double width;
  final bool dashed;
}

const gpsLineSymbols = <GpsLineSymbol>[
  GpsLineSymbol('506', '506 · Sendero', Color(0xff5a382c), width: 2.3, dashed: true),
  GpsLineSymbol('504', '504 · Pista de vehículos', Color(0xff65422d), width: 4),
  GpsLineSymbol('101', '101 · Curva de nivel', Color(0xffad7256), width: 1.9),
  GpsLineSymbol('304', '304 · Curso de agua', Color(0xff398ccf), width: 2),
  GpsLineSymbol('416', '416 · Límite vegetación', Color(0xff358d5a), width: 2, dashed: true),
  GpsLineSymbol('GPS', 'GPS · Track provisional', Color(0xfff0aa48), width: 2.5),
];

GpsLineSymbol styleFor(String symbol) {
  for (final value in gpsLineSymbols) {
    if (value.code == symbol) return value;
  }
  return gpsLineSymbols.last;
}

/// Proyección plana LOCAL para visualizar un GNSS WGS84 sobre una cuadrícula.
/// Cada vértice se guarda siempre en latitud/longitud, no en píxeles.
Offset gpsToScreen(GpsFix point, GpsFix origin, Size size, double metersPerPixel,
    {int? epsg}) {
  if (epsg != null) {
    final p = UtmProjection.forward(point.latitude, point.longitude, epsg);
    final o = UtmProjection.forward(origin.latitude, origin.longitude, epsg);
    return Offset(size.width / 2 + (p.easting - o.easting) / metersPerPixel,
        size.height / 2 - (p.northing - o.northing) / metersPerPixel);
  }
  const metersPerDegree = 111319.49079327358;
  final east = (point.longitude - origin.longitude) *
      metersPerDegree * math.cos(origin.latitude * math.pi / 180);
  final north = (point.latitude - origin.latitude) * metersPerDegree;
  return Offset(size.width / 2 + east / metersPerPixel,
      size.height / 2 - north / metersPerPixel);
}

GpsFix screenToGps(Offset screen, GpsFix origin, Size size, double metersPerPixel,
    GpsFix original, {int? epsg}) {
  if (epsg != null) {
    final o = UtmProjection.forward(origin.latitude, origin.longitude, epsg);
    final p = UtmProjection.inverse(
        o.easting + (screen.dx - size.width / 2) * metersPerPixel,
        o.northing - (screen.dy - size.height / 2) * metersPerPixel,
        epsg);
    return GpsFix(
      latitude: p.latitude,
      longitude: p.longitude,
      timestamp: original.timestamp,
      altitudeMeters: original.altitudeMeters,
      hdop: original.hdop,
      satellites: original.satellites,
      fixQuality: original.fixQuality,
      speedKmh: original.speedKmh,
      courseDegrees: original.courseDegrees,
    );
  }
  const metersPerDegree = 111319.49079327358;
  final lonFactor = metersPerDegree *
      math.cos(origin.latitude * math.pi / 180);
  if (lonFactor.abs() < 0.000001) return original;
  return GpsFix(
    latitude: origin.latitude + (size.height / 2 - screen.dy) *
        metersPerPixel / metersPerDegree,
    longitude: origin.longitude + (screen.dx - size.width / 2) *
        metersPerPixel / lonFactor,
    timestamp: original.timestamp,
    altitudeMeters: original.altitudeMeters,
    hdop: original.hdop,
    satellites: original.satellites,
    fixQuality: original.fixQuality,
    speedKmh: original.speedKmh,
    courseDegrees: original.courseDegrees,
  );
}

class OcartoApp extends StatelessWidget {
  const OcartoApp({super.key});

  @override
  Widget build(BuildContext context) {
    const background = Color(0xff161d20);
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Ocarto · Cartografía y GPS',
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff6cc7a7),
          brightness: Brightness.dark,
          surface: const Color(0xff202b2f),
        ),
        appBarTheme: const AppBarTheme(backgroundColor: background),
        dividerColor: const Color(0xff39474c),
      ),
      home: const OcartoHome(),
    );
  }
}

class OcartoHome extends StatefulWidget {
  const OcartoHome({super.key});

  @override
  State<OcartoHome> createState() => _OcartoHomeState();
}

class _OcartoHomeState extends State<OcartoHome> {
  final layers = <String, bool>{
    'Plantilla georreferenciada': true,
    'Ortofoto / vegetación': true,
    'Mapa editable': true,
  };
  final elements = <MapElement>[];
  final storage = ProjectStorage();
  final gps = GpsSerialService();
  final gpsFilter = const GpsTrackFilter();
  late final StreamSubscription<GpsFix> _gpsSubscription;
  late final StreamSubscription<String> _errorSubscription;
  Future<void> _saveQueue = Future<void>.value();
  DateTime _lastAutosave = DateTime.fromMillisecondsSinceEpoch(0);
  Timer? _gpsStaleTimer;

  String projectName = 'Mi mapa Ocarto';
  MapTool tool = MapTool.select;
  String symbol = 'Árbol';
  final Set<String> _favoriteSymbols = <String>{};
  double opacity = 1;

  List<String> _ports = [];
  String? _selectedPort;
  int _baudRate = 4800;
  bool _connecting = false;
  String _gpsStatus = 'GPS desconectado';
  GpsFix? _currentFix;
  GpsFix? _gpsCenter;
  DateTime? _lastFixReceived;
  bool _followGps = true;
  double _metersPerPixel = 2;
  String _gpsLineSymbol = '506';
  GeoRasterReference? _geoRaster;
  ui.Image? _rasterImage;
  int _rasterWidth = 0;
  int _rasterHeight = 0;
  int _rasterEpsg = 25830;
  bool _rasterLoading = false;

  MapElement? _activeTrack;
  GpsFix? _lastRecordedFix;
  int? _selectedElement;
  int? _selectedVertex;
  bool _movingVertex = false;
  int _dragHandleSide = 0; // -1 entrante, +1 saliente, 0 ancla.
  bool _recording = false;
  MapElement? _draft;

  @override
  void initState() {
    super.initState();
    _gpsSubscription = gps.fixes.listen(_onGpsFix);
    _gpsStaleTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      final last = _lastFixReceived;
      if (!mounted || !gps.connected || last == null) return;
      if (DateTime.now().difference(last).inSeconds > 10 &&
          _gpsStatus != 'GPS conectado · sin posición reciente') {
        setState(() => _gpsStatus = 'GPS conectado · sin posición reciente');
      }
    });
    _errorSubscription = gps.errors.listen((message) {
      if (!mounted) return;
      setState(() => _gpsStatus = message);
      if (_recording) unawaited(_stopRecording());
      unawaited(gps.disconnect());
    });
    if (Platform.isWindows) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _refreshPorts());
    }
  }

  @override
  void dispose() {
    _gpsStaleTimer?.cancel();
    unawaited(_gpsSubscription.cancel());
    unawaited(_errorSubscription.cancel());
    unawaited(gps.dispose());
    _rasterImage?.dispose();
    super.dispose();
  }

  void _snack(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  void _refreshPorts() {
    try {
      final available = gps.availablePorts();
      setState(() {
        _ports = available;
        if (!available.contains(_selectedPort)) {
          _selectedPort = available.isEmpty ? null : available.first;
        }
      });
    } catch (error) {
      _snack('No se pudieron consultar los puertos GPS: $error');
    }
  }

  Future<void> _connectGps() async {
    if (_connecting || _selectedPort == null) return;
    setState(() { _connecting = true; _gpsStatus = 'Conectando a $_selectedPort…'; });
    try {
      await gps.connect(_selectedPort!, baudRate: _baudRate);
      if (!mounted) return;
      setState(() => _gpsStatus = 'Conectado a $_selectedPort · esperando posición NMEA');
    } catch (error) {
      if (!mounted) return;
      setState(() => _gpsStatus = 'Error de conexión GPS');
      _snack('No se pudo conectar al GPS: $error');
    } finally {
      if (mounted) setState(() => _connecting = false);
    }
  }

  Future<void> _disconnectGps() async {
    if (_recording) await _stopRecording();
    await gps.disconnect();
    if (mounted) {
      setState(() { _gpsStatus = 'GPS desconectado'; _currentFix = null; });
    }
  }

  void _onGpsFix(GpsFix fix) {
    if (!mounted) return;
    setState(() {
      _currentFix = fix;
      _lastFixReceived = DateTime.now();
      _gpsStatus = 'GPS · posición válida';
      if (_gpsCenter == null || _followGps) _gpsCenter = fix;
      if (_recording && _activeTrack != null &&
          gpsFilter.accept(fix, _lastRecordedFix)) {
        _activeTrack!.gpsPoints.add(fix);
        _lastRecordedFix = fix;
        _scheduleAutosave();
      }
    });
  }

  MapProject _makeProject() => MapProject(
        name: projectName,
        layers: layers.entries.map((entry) => ProjectLayer(
          id: entry.key, name: entry.key, visible: entry.value,
          opacity: entry.key == 'Plantilla georreferenciada' ? opacity : 1,
        )).toList(),
        elements: elements.map((e) => ProjectElement(
          tool: e.tool.name,
          x: e.position.dx, y: e.position.dy, symbol: e.symbol,
          isGpsTrack: e.isGpsTrack, gpsPoints: List<GpsFix>.from(e.gpsPoints),
          vertices: e.vertices.map((v) => VectorVertex(v.dx, v.dy)).toList(),
          bezier: List<BezierControls?>.from(e.bezier),
          geographic: e.geographic,
        )).toList(),
        gpsCenterLatitude: _gpsCenter?.latitude,
        gpsCenterLongitude: _gpsCenter?.longitude,
        gpsMetersPerPixel: _metersPerPixel,
        gpsTrackSymbol: _gpsLineSymbol,
        geoRaster: _geoRaster,
        favoriteSymbols: _favoriteSymbols.toList()..sort(),
        selectedCatalogSymbol: symbol,
        activeTool: tool.name,
      );

  Future<void> _autosave() {
    final snapshot = _makeProject();
    _saveQueue = _saveQueue.catchError((Object _) {}).then((_) => storage.save(snapshot));
    return _saveQueue;
  }

  void _scheduleAutosave() {
    final now = DateTime.now();
    if (now.difference(_lastAutosave).inSeconds < 3) return;
    _lastAutosave = now;
    unawaited(_autosave().catchError((Object error) {
      if (mounted) _snack('Error de autoguardado GPS: $error');
    }));
  }

  Future<void> _startRecording() async {
    final last = _lastFixReceived;
    if (!gps.connected || _currentFix == null || last == null ||
        DateTime.now().difference(last).inSeconds > 10) {
      _snack('Conecta el GPS y espera una posición válida antes de grabar.');
      return;
    }
    if (_recording) return;
    setState(() {
      _recording = true;
      _activeTrack = MapElement(MapTool.line, Offset.zero, _gpsLineSymbol,
          isGpsTrack: true);
      elements.add(_activeTrack!);
      _selectedElement = elements.length - 1;
      _selectedVertex = null;
      _lastRecordedFix = null;
      _followGps = true;
      _gpsCenter = _currentFix;
    });
    _onGpsFix(_currentFix!);
    try { await _autosave(); } catch (error) { _snack('Error al guardar track: $error'); }
  }

  Future<void> _stopRecording() async {
    if (!_recording) return;
    setState(() {
      _recording = false;
      _activeTrack = null;
      _lastRecordedFix = null;
    });
    try { await _autosave(); } catch (error) { _snack('Error al guardar track: $error'); }
  }

  Future<void> _saveProject() async {
    try {
      final location = await getSaveLocation(
        suggestedName: '${projectName.replaceAll(' ', '_')}.ocarto',
        acceptedTypeGroups: [
          const XTypeGroup(label: 'Proyecto Ocarto', extensions: ['ocarto']),
        ],
      );
      if (location == null) return;
      await File(location.path).writeAsString(_makeProject().encode(), flush: true);
      await _autosave();
      _snack('Proyecto guardado: ${location.path}');
    } catch (error) {
      _snack('No se pudo guardar el proyecto: $error');
    }
  }

  Future<void> _loadProject({bool recovery = false}) async {
    try {
      MapProject? project;
      if (recovery) {
        project = await storage.load();
      } else {
        final file = await openFile(acceptedTypeGroups: [
          const XTypeGroup(label: 'Proyecto Ocarto', extensions: ['ocarto', 'json']),
        ]);
        if (file == null) return;
        project = MapProject.decode(await file.readAsString());
      }
      if (project == null) { _snack('No hay copia de recuperación.'); return; }
      if (_recording) await _stopRecording();
      final rasterToLoad = project.geoRaster;
      setState(() {
        final oldRasterImage = _rasterImage;
        _rasterImage = null;
        oldRasterImage?.dispose();
        _geoRaster = rasterToLoad;
        if (rasterToLoad != null) _rasterEpsg = rasterToLoad.epsg;
        projectName = project!.name;
        _favoriteSymbols
          ..clear()
          ..addAll(project.favoriteSymbols.where((id) => findCatalogSymbol(id) != null));
        symbol = findCatalogSymbol(project.selectedCatalogSymbol ?? '') != null
            ? project.selectedCatalogSymbol! : 'Árbol';
        tool = MapTool.values.firstWhere(
          (value) => value.name == project!.activeTool,
          orElse: () => MapTool.select,
        );
        for (final layer in project.layers) {
          if (layers.containsKey(layer.id)) layers[layer.id] = layer.visible;
          if (layer.id == 'Plantilla georreferenciada') opacity = layer.opacity;
        }
        elements
          ..clear()
          ..addAll(project.elements.map((element) => MapElement(
            MapTool.values.firstWhere((v) => v.name == element.tool,
                orElse: () => MapTool.point),
            Offset(element.x, element.y), element.symbol,
            isGpsTrack: element.isGpsTrack,
            gpsPoints: List<GpsFix>.from(element.gpsPoints),
            vertices: element.vertices.map((v) => Offset(v.x, v.y)).toList(),
            bezier: element.bezier,
            geographic: element.geographic,
          )));
        _gpsCenter = null;
        if (project.gpsCenterLatitude != null &&
            project.gpsCenterLongitude != null) {
          _gpsCenter = GpsFix(
            latitude: project.gpsCenterLatitude!,
            longitude: project.gpsCenterLongitude!,
            timestamp: DateTime.now().toUtc(),
          );
          _followGps = false;
        }
        _metersPerPixel = [0.5, 1.0, 2.0, 5.0, 10.0, 20.0]
                .contains(project.gpsMetersPerPixel)
            ? project.gpsMetersPerPixel : 2;
        _gpsLineSymbol = gpsLineSymbols.any((s) => s.code == project!.gpsTrackSymbol)
            ? project.gpsTrackSymbol : '506';
        _selectedElement = null;
        _selectedVertex = null;
        _dragHandleSide = 0;
        _draft = null;
      });
      if (rasterToLoad != null) {
        try {
          await _showRaster(rasterToLoad, recenter: _gpsCenter == null);
        } catch (error) {
          _snack('Proyecto abierto, pero falta la plantilla PNG: $error');
        }
      }
      _snack('Proyecto cargado: ${project.name}');
    } catch (error) {
      _snack('Error al cargar el proyecto: $error');
    }
  }

  String _xml(String value) => value
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

  Future<void> _exportGpx() async {
    final tracks = elements.where((e) => e.isGpsTrack && e.gpsPoints.isNotEmpty).toList();
    if (tracks.isEmpty) { _snack('Todavía no hay tracks GPS para exportar.'); return; }
    try {
      final location = await getSaveLocation(
        suggestedName: '${projectName.replaceAll(' ', '_')}-GPS.gpx',
        acceptedTypeGroups: [const XTypeGroup(label: 'GPX 1.1', extensions: ['gpx'])],
      );
      if (location == null) return;
      final xml = StringBuffer('<?xml version="1.0" encoding="UTF-8"?>\n'
          '<gpx version="1.1" creator="Ocarto" xmlns="http://www.topografix.com/GPX/1/1">\n');
      for (final track in tracks) {
        xml.writeln('<trk><name>${_xml(projectName)} · ${_xml(styleFor(track.symbol).label)}</name><trkseg>');
        for (final point in track.gpsPoints) {
          xml.write('<trkpt lat="${point.latitude.toStringAsFixed(8)}" lon="${point.longitude.toStringAsFixed(8)}">');
          if (point.altitudeMeters != null) xml.write('<ele>${point.altitudeMeters}</ele>');
          xml.write('<time>${point.timestamp.toUtc().toIso8601String()}</time></trkpt>\n');
        }
        xml.writeln('</trkseg></trk>');
      }
      xml.write('</gpx>');
      await File(location.path).writeAsString(xml.toString(), flush: true);
      _snack('Tracks GPS exportados: ${location.path}');
    } catch (error) {
      _snack('Error al exportar GPX: $error');
    }
  }

  /// Con un origen GPS válido, almacena lon/lat WGS84.
  /// Sin referencia espacial conserva las coordenadas del lienzo local.
  Offset _storePosition(Offset screen, Size size, bool geographic) {
    if (!geographic || _gpsCenter == null) return screen;
    final fix = screenToGps(screen, _gpsCenter!, size, _metersPerPixel,
        _gpsCenter!, epsg: _rasterImage == null ? null : _geoRaster?.epsg);
    return Offset(fix.longitude, fix.latitude);
  }

  Offset? _screenPosition(Offset stored, Size size, bool geographic) {
    if (!geographic) return stored;
    if (_gpsCenter == null) return null;
    return gpsToScreen(GpsFix(latitude: stored.dy, longitude: stored.dx,
        timestamp: _gpsCenter!.timestamp), _gpsCenter!, size, _metersPerPixel,
        epsg: _rasterImage == null ? null : _geoRaster?.epsg);
  }

  void _selectAt(Offset position, Size size) {
    const maxDistance = 16.0;
    var best = maxDistance * maxDistance;
    int? bestElement;
    int? bestVertex;
    for (var i = 0; i < elements.length; i++) {
      final element = elements[i];
      if (element.isGpsTrack && _gpsCenter != null) {
        for (var j = 0; j < element.gpsPoints.length; j++) {
          final candidate = gpsToScreen(element.gpsPoints[j], _gpsCenter!,
              size, _metersPerPixel,
              epsg: _rasterImage == null ? null : _geoRaster?.epsg);
          final squared = (candidate - position).distanceSquared;
          if (squared < best) { best = squared; bestElement = i; bestVertex = j; }
        }
      } else if (!element.isGpsTrack) {
        final vertices = element.vertices.isEmpty ?
            <Offset>[element.position] : element.vertices;
        for (var j = 0; j < vertices.length; j++) {
          final candidate = _screenPosition(vertices[j], size, element.geographic);
          if (candidate == null) continue;
          final squared = (candidate - position).distanceSquared;
          if (squared < best) { best = squared; bestElement = i; bestVertex = j; }
        }
      }
    }
    setState(() { _selectedElement = bestElement; _selectedVertex = bestVertex; });
  }

  void _onMapTap(Offset position, Size size) {
    if (tool == MapTool.select) { _selectAt(position, size); return; }
    final geographic = _gpsCenter != null;
    final stored = _storePosition(position, size, geographic);
    if (tool == MapTool.point) {
      setState(() => elements.add(MapElement(tool, stored, symbol,
          geographic: geographic)));
      _scheduleAutosave();
      return;
    }
    if (_draft == null) {
      setState(() => _draft = MapElement(tool, stored, symbol,
          vertices: <Offset>[stored], geographic: geographic));
    } else {
      final prev = _screenPosition(_draft!.vertices.last, size, _draft!.geographic);
      if (prev != null && (prev - position).distance < 3) return;
      setState(() {
        _draft!.vertices.add(_storePosition(position, size, _draft!.geographic));
        _draft!.bezier.add(null);
      });
    }
  }

  /// Doble clic para terminar: el último vértice no se duplica.
  bool _finishDrawing() {
    final draft = _draft;
    if (draft == null) return true;
    final vertices = draft.vertices.map((v) => VectorVertex(v.dx, v.dy)).toList();
    if (!VectorGeometry.valid(draft.tool.name, vertices)) {
      _snack(draft.tool == MapTool.area
          ? 'El área necesita tres vértices distintos.'
          : 'La línea necesita dos vértices distintos.');
      return false;
    }
    setState(() {
      elements.add(draft);
      _selectedElement = elements.length - 1;
      _selectedVertex = null;
      _draft = null;
    });
    unawaited(_autosave().catchError((Object error) {
      if (mounted) _snack('No se pudo guardar el trazado: $error');
    }));
    return true;
  }

  void _cancelDrawing() {
    if (_draft != null) setState(() => _draft = null);
  }

  void _changeTool(MapTool value) {
    if (!_finishDrawing()) return;
    setState(() { tool = value; _selectedElement = null; _selectedVertex = null;
      _dragHandleSide = 0; });
  }

  MapElement? get _selectedEditable {
    final index = _selectedElement;
    final vertex = _selectedVertex;
    if (tool != MapTool.select || index == null || vertex == null ||
        index < 0 || index >= elements.length) return null;
    final element = elements[index];
    if (element.isGpsTrack || element.vertices.length <= vertex ||
        element.tool == MapTool.point || vertex < 0) return null;
    return element;
  }

  void _enableBezierHandles() {
    final element = _selectedEditable;
    final vertex = _selectedVertex;
    if (element == null || vertex == null) return;
    final points = element.vertices
        .map((v) => VectorVertex(v.dx, v.dy)).toList();
    setState(() {
      element.bezier[vertex] = BezierControls.initialize(
          points, vertex, closed: element.tool == MapTool.area);
      _dragHandleSide = 0;
    });
    unawaited(_autosave().catchError((Object error) {
      if (mounted) _snack('Error guardando tiradores: $error');
    }));
  }

  void _changeBezierMode({required bool corner}) {
    final element = _selectedEditable;
    final vertex = _selectedVertex;
    if (element == null || vertex == null) return;
    setState(() {
      element.bezier[vertex] = corner ? const BezierControls(corner: true) : null;
      _dragHandleSide = 0;
    });
    unawaited(_autosave().catchError((Object error) {
      if (mounted) _snack('Error guardando vértice: $error');
    }));
  }

  void _onMapDragStart(Offset position, Size size) {
    if (tool != MapTool.select || _recording) return;
    // A handle belongs to the selected vertex, so test its hit target
    // BEFORE selecting the nearest anchor.
    final element = _selectedEditable;
    final vertex = _selectedVertex;
    if (element != null && vertex != null) {
      final control = element.bezier[vertex];
      if (control != null && !control.corner) {
        for (final side in [-1, 1]) {
          final p = side < 0 ? control.incoming : control.outgoing;
          if (p == null) continue;
          final screen = _screenPosition(Offset(p.x, p.y), size, element.geographic);
          if (screen != null && (screen - position).distance <= 15) {
            setState(() { _dragHandleSide = side; _movingVertex = true; });
            return;
          }
        }
      }
    }
    _dragHandleSide = 0;
    _selectAt(position, size);
    final index = _selectedElement;
    setState(() => _movingVertex = index != null && _selectedVertex != null);
  }

  void _onMapDrag(Offset position, Size size) {
    if (!_movingVertex) return;
    final index = _selectedElement;
    final vertex = _selectedVertex;
    if (index == null || vertex == null || index >= elements.length) return;
    final element = elements[index];
    if (element.isGpsTrack) {
      if (_gpsCenter == null || vertex >= element.gpsPoints.length) return;
      setState(() => element.gpsPoints[vertex] = screenToGps(
          position, _gpsCenter!, size, _metersPerPixel, element.gpsPoints[vertex],
          epsg: _rasterImage == null ? null : _geoRaster?.epsg));
    } else {
      final stored = _storePosition(position, size, element.geographic);
      setState(() {
        if (element.vertices.isNotEmpty && vertex < element.vertices.length) {
          if (_dragHandleSide != 0) {
            final anchor = element.vertices[vertex];
            final old = element.bezier[vertex];
            final controls = old ?? const BezierControls();
            element.bezier[vertex] = controls.moveHandle(
              vertex: VectorVertex(anchor.dx, anchor.dy),
              destination: VectorVertex(stored.dx, stored.dy),
              outgoingSide: _dragHandleSide > 0,
            );
          } else {
            final previous = element.vertices[vertex];
            element.vertices[vertex] = stored;
            final control = element.bezier[vertex];
            if (control != null) {
              element.bezier[vertex] = control.translated(
                  stored.dx - previous.dx, stored.dy - previous.dy);
            }
          }
        } else if (element.tool == MapTool.point) {
          element.position = stored;
        }
      });
    }
    _scheduleAutosave();
  }

  /// Decodifica una vista previa limitada a 4096 px por lado para no
  /// ocupar cientos de megabytes con imágenes LiDAR de alta resolución.
  Future<void> _showRaster(GeoRasterReference ref, {bool recenter = true}) async {
    final file = File(ref.imagePath);
    final bytes = await file.readAsBytes();
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < 24 ||
        !List.generate(8, (i) => bytes[i] == pngSignature[i]).every((valid) => valid)) {
      throw const FormatException('La plantilla seleccionada no es un PNG válido.');
    }
    final data = ByteData.sublistView(bytes);
    final width = data.getUint32(16, Endian.big);
    final height = data.getUint32(20, Endian.big);
    if (width <= 0 || height <= 0 || width > 100000 || height > 100000) {
      throw const FormatException('Dimensiones PNG no válidas.');
    }
    final maxDimension = math.max(width, height);
    final desired = math.min(4096, maxDimension);
    final codec = await ui.instantiateImageCodec(bytes,
      targetWidth: width >= height ? desired : null,
      targetHeight: height > width ? desired : null,
      allowUpscaling: false);
    late ui.Image image;
    try {
      image = (await codec.getNextFrame()).image;
    } finally {
      codec.dispose();
    }
    if (!mounted) { image.dispose(); return; }
    final center = ref.center(width, height);
    setState(() {
      final old = _rasterImage;
      _geoRaster = ref;
      _rasterImage = image;
      _rasterWidth = width;
      _rasterHeight = height;
      _rasterEpsg = ref.epsg;
      if (recenter || _gpsCenter == null) {
        _gpsCenter = GpsFix(latitude: center.latitude,
            longitude: center.longitude, timestamp: DateTime.now().toUtc());
        _followGps = false;
      }
      old?.dispose();
    });
  }

  Future<void> _importRaster() async {
    if (_rasterLoading) return;
    try {
      final image = await openFile(acceptedTypeGroups: [
        const XTypeGroup(label: 'Plantilla PNG', extensions: ['png']),
      ]);
      if (image == null) return;
      final path = image.path;
      final dot = path.lastIndexOf('.');
      final stem = dot < 0 ? path : path.substring(0, dot);
      File? worldFile;
      for (final candidate in ['$stem.pgw', '$stem.PGW', '$path' 'w', '$path' 'W']) {
        final file = File(candidate);
        if (await file.exists()) { worldFile = file; break; }
      }
      if (worldFile == null) {
        throw const FormatException('No se encuentra el PGW junto al PNG con el mismo nombre.');
      }
      if (mounted) setState(() => _rasterLoading = true);
      final world = RasterWorldFile.parse(await worldFile.readAsString());
      final ref = GeoRasterReference(imagePath: path, epsg: _rasterEpsg, world: world);
      await _showRaster(ref);
      await _autosave();
      _snack('Plantilla PNG/PGW georreferenciada cargada (EPSG:${ref.epsg}).');
    } catch (error) {
      _snack('No se pudo importar la plantilla: $error');
    } finally {
      if (mounted) setState(() => _rasterLoading = false);
    }
  }

  Widget _rasterMenu() {
    return _section('Plantilla georreferenciada', Icons.map_rounded, [
      const Text('PNG con archivo PGW en la misma carpeta. El PGW no define EPSG.'),
      const SizedBox(height: 8),
      DropdownButtonFormField<int>(
        key: ValueKey('raster-epsg-$_rasterEpsg'),
        initialValue: _rasterEpsg,
        decoration: const InputDecoration(labelText: 'Sistema de coordenadas', isDense: true),
        isExpanded: true,
        items: const [
          DropdownMenuItem(value: 25829, child: Text('ETRS89 / UTM 29N · 25829')),
          DropdownMenuItem(value: 25830, child: Text('ETRS89 / UTM 30N · 25830')),
          DropdownMenuItem(value: 25831, child: Text('ETRS89 / UTM 31N · 25831')),
          DropdownMenuItem(value: 32629, child: Text('WGS84 / UTM 29N · 32629')),
          DropdownMenuItem(value: 32630, child: Text('WGS84 / UTM 30N · 32630')),
          DropdownMenuItem(value: 32631, child: Text('WGS84 / UTM 31N · 32631')),
        ],
        onChanged: _geoRaster != null ? null :
            (v) => setState(() => _rasterEpsg = v ?? 25830),
      ),
      const SizedBox(height: 8),
      FilledButton.icon(
        onPressed: _rasterLoading ? null : _importRaster,
        icon: const Icon(Icons.add_photo_alternate_outlined),
        label: Text(_rasterLoading ? 'Cargando PNG…' : 'Importar PNG + PGW'),
      ),
      if (_geoRaster != null) ...[
        const SizedBox(height: 6),
        Text(_geoRaster!.imagePath.split(Platform.pathSeparator).last,
            style: Theme.of(context).textTheme.bodySmall),
        if (_rasterImage == null)
          const Text('No se ha podido mostrar el archivo de plantilla.'),
        TextButton.icon(
          onPressed: () {
            setState(() {
              _rasterImage?.dispose();
              _rasterImage = null;
              _geoRaster = null;
            });
            _scheduleAutosave();
          },
          icon: const Icon(Icons.layers_clear),
          label: const Text('Quitar plantilla'),
        ),
      ],
      const Text('Solo vista previa ráster: no modifica el original. Para cambiar de EPSG, quita la plantilla y vuelve a importarla.',
          style: TextStyle(fontSize: 11.5, color: Color(0xffa9bdbe))),
    ], expanded: true);
  }

  void _chooseCatalogSymbol(OcartoCatalogSymbol entry) {
    if (!_finishDrawing()) return;
    setState(() {
      _dragHandleSide = 0;
      _selectedElement = null;
      _selectedVertex = null;
      symbol = entry.id;
      tool = switch (entry.tool) {
        CatalogTool.point => MapTool.point,
        CatalogTool.line => MapTool.line,
        CatalogTool.area => MapTool.area,
      };
      if (!_recording && gpsLineSymbols.any((item) => item.code == entry.id)) {
        _gpsLineSymbol = entry.id;
      }
    });
    unawaited(_autosave().catchError((Object error) {
      if (mounted) _snack('Error guardando selección: $error');
    }));
  }

  void _toggleFavorite(String id) {
    setState(() {
      if (!_favoriteSymbols.add(id)) _favoriteSymbols.remove(id);
    });
    unawaited(_autosave().catchError((Object error) {
      if (mounted) _snack('Error guardando favoritos: $error');
    }));
  }

  Widget _catalogTile(OcartoCatalogSymbol entry, double width) {
    final isFavorite = _favoriteSymbols.contains(entry.id);
    final isSelected = symbol == entry.id && tool != MapTool.select;
    return Tooltip(
      message: '${entry.name} · clic para dibujar; clic derecho o pulsación larga para favoritos',
      child: SizedBox(
        width: width,
        height: 79,
        child: Material(
          color: isSelected ? const Color(0xff38544f) : const Color(0xff2a383c),
          borderRadius: BorderRadius.circular(9),
          child: InkWell(
            borderRadius: BorderRadius.circular(9),
            onTap: () => _chooseCatalogSymbol(entry),
            onSecondaryTap: () => _toggleFavorite(entry.id),
            onLongPress: () => _toggleFavorite(entry.id),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(4, 12, 4, 4),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(entry.icon, size: 32, color: entry.color),
                      const SizedBox(height: 4),
                      Text(entry.name, textAlign: TextAlign.center,
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ),
                Positioned(
                  top: 0, right: 0,
                  child: SizedBox(
                    width: 24, height: 24,
                    child: IconButton(
                      padding: EdgeInsets.zero,
                      iconSize: 16,
                      tooltip: isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
                      onPressed: () => _toggleFavorite(entry.id),
                      icon: Icon(isFavorite ? Icons.star : Icons.star_border,
                        color: isFavorite ? const Color(0xfff8cf64) :
                            const Color(0xff93a4a5)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _symbolDock() {
    final favoriteEntries = catalogSymbols
        .where((entry) => _favoriteSymbols.contains(entry.id)).toList();
    return LayoutBuilder(builder: (context, constraints) {
      final columns = constraints.maxWidth >= 305 ? 4 : 3;
      final width = (constraints.maxWidth - 22 - (columns - 1) * 4) / columns;
      Widget tiles(Iterable<OcartoCatalogSymbol> entries) => Wrap(
        spacing: 4, runSpacing: 4,
        children: entries.map((entry) => _catalogTile(entry, width)).toList(),
      );
      Widget title(String text, IconData icon) => Padding(
        padding: const EdgeInsets.only(bottom: 7, top: 5),
        child: Row(children: [
          Icon(icon, size: 18, color: const Color(0xfff5c95b)),
          const SizedBox(width: 6),
          Expanded(child: Text(text,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13))),
        ]),
      );
      return Material(
        color: const Color(0xff202b2f),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(9, 11, 9, 9),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Row(children: [
              Icon(Icons.palette, color: Color(0xff82d5bc), size: 22),
              SizedBox(width: 8),
              Expanded(child: Text('Símbolos', style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.bold))),
            ]),
            const SizedBox(height: 5),
            Text('Seleccionado: ${findCatalogSymbol(symbol)?.name ?? symbol}',
              maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11.5, color: Color(0xffb0cac2))),
            const SizedBox(height: 8),
            title('Símbolos favoritos', Icons.star),
            if (favoriteEntries.isEmpty)
              const Text('Marca la estrella o mantén pulsado un símbolo.',
                style: TextStyle(fontSize: 11.5, color: Color(0xff9caeae)))
            else
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 170),
                child: SingleChildScrollView(child: tiles(favoriteEntries)),
              ),
            const Divider(height: 19),
            Expanded(child: Scrollbar(
              child: ListView(children: [
                title('Puntos', Icons.place),
                tiles(catalogSymbols.where((entry) =>
                    entry.tool == CatalogTool.point)),
                const SizedBox(height: 10),
                title('Líneas', Icons.timeline),
                tiles(catalogSymbols.where((entry) =>
                    entry.tool == CatalogTool.line)),
                const SizedBox(height: 10),
                title('Áreas', Icons.crop_square),
                tiles(catalogSymbols.where((entry) =>
                    entry.tool == CatalogTool.area)),
                const SizedBox(height: 10),
                const Text('Catálogo visual provisional. La correspondencia completa con OCAD/ISOM y el trazado vectorial profesional están pendientes.',
                  style: TextStyle(fontSize: 10.5, color: Color(0xffa8b9b9))),
              ]),
            )),
          ]),
        ),
      );
    });
  }

  Widget _section(String title, IconData icon, List<Widget> children,
      {bool expanded = false}) {
    return ExpansionTile(
      key: PageStorageKey('section-$title'),
      leading: Icon(icon, color: const Color(0xff81d4bb)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      initiallyExpanded: expanded,
      childrenPadding: const EdgeInsets.fromLTRB(13, 4, 13, 14),
      expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
      children: children,
    );
  }

  Widget _toolButton(MapTool value, IconData icon, String text) {
    final selected = value == tool;
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: selected
          ? FilledButton.icon(
              onPressed: () => _changeTool(value),
              icon: Icon(icon), label: Text(text),
            )
          : OutlinedButton.icon(
              onPressed: () => _changeTool(value),
              icon: Icon(icon), label: Text(text),
            ),
    );
  }

  Widget _gpsMenu() {
    final fix = _currentFix;
    final stale = _lastFixReceived == null ||
        DateTime.now().difference(_lastFixReceived!).inSeconds > 10;
    return _section('GPS', Icons.satellite_alt_rounded, [
      Text('Bluetooth clásico (SPP) / USB · puerto COM de Windows',
          style: Theme.of(context).textTheme.bodySmall),
      const SizedBox(height: 10),
      if (!Platform.isWindows)
        const Text('La conexión a un GPS Bluetooth por COM está disponible en Windows.'),
      if (Platform.isWindows) ...[
        Row(children: [
          Expanded(child: DropdownButtonFormField<String>(
            key: ValueKey('port-$_selectedPort'),
            initialValue: _selectedPort,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Puerto GPS', isDense: true),
            items: _ports.map((name) => DropdownMenuItem(value: name, child: Text(name))).toList(),
            onChanged: gps.connected ? null : (value) => setState(() => _selectedPort = value),
          )),
          IconButton(
            tooltip: 'Buscar puertos COM', icon: const Icon(Icons.refresh),
            onPressed: gps.connected ? null : _refreshPorts,
          ),
        ]),
        const SizedBox(height: 8),
        DropdownButtonFormField<int>(
          key: ValueKey('baud-$_baudRate'),
          initialValue: _baudRate,
          decoration: const InputDecoration(labelText: 'Velocidad (baudios)', isDense: true),
          items: [4800, 9600, 19200, 38400, 57600, 115200]
              .map((baud) => DropdownMenuItem(value: baud, child: Text('$baud'))).toList(),
          onChanged: gps.connected ? null : (value) => setState(() => _baudRate = value ?? 4800),
        ),
        const SizedBox(height: 9),
        FilledButton.icon(
          onPressed: _connecting ? null : (gps.connected ? _disconnectGps : (_selectedPort == null ? null : _connectGps)),
          icon: Icon(gps.connected ? Icons.bluetooth_disabled : Icons.bluetooth_connected),
          label: Text(gps.connected ? 'Desconectar GPS' : 'Conectar GPS'),
        ),
      ],
      const SizedBox(height: 6),
      Text(_gpsStatus, style: TextStyle(
        color: !stale && gps.connected ? const Color(0xff92ddbc) : const Color(0xffeabf7a),
      )),
      const SizedBox(height: 6),
      if (fix != null) ...[
        Text('Lat. ${fix.latitude.toStringAsFixed(7)}° · Lon. ${fix.longitude.toStringAsFixed(7)}°'),
        Text('Satélites ${fix.satellites?.toString() ?? '—'} · HDOP ${fix.hdop?.toStringAsFixed(1) ?? '—'} · ${fix.speedKmh?.toStringAsFixed(1) ?? '—'} km/h'),
        if (stale) const Text('Sin posición reciente: revisa la señal.', style: TextStyle(color: Color(0xfff2b875))),
      ],
      const SizedBox(height: 10),
      Row(children: [
        const Expanded(child: Text('Seguir mi posición')),
        Switch(value: _followGps, onChanged: (v) => setState(() {
          _followGps = v;
          if (v && _currentFix != null) _gpsCenter = _currentFix;
        })),
        IconButton(tooltip: 'Centrar GPS', onPressed: fix == null ? null : () => setState(() => _gpsCenter = fix), icon: const Icon(Icons.my_location)),
      ]),
      DropdownButtonFormField<double>(
        key: ValueKey('zoom-$_metersPerPixel'),
        initialValue: _metersPerPixel,
        decoration: const InputDecoration(labelText: 'Escala de la cuadrícula GPS', isDense: true),
        items: [0.5, 1.0, 2.0, 5.0, 10.0, 20.0]
            .map((v) => DropdownMenuItem(value: v, child: Text('$v m/píxel'))).toList(),
        onChanged: (v) => setState(() => _metersPerPixel = v ?? 2),
      ),
      const Divider(height: 23),
      Text('Grabación automática de línea', style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 8),
      DropdownButtonFormField<String>(
        key: ValueKey('gpssymbol-$_gpsLineSymbol'),
        initialValue: _gpsLineSymbol,
        isExpanded: true,
        decoration: const InputDecoration(labelText: 'Símbolo lineal predefinido', isDense: true),
        items: gpsLineSymbols.map((s) => DropdownMenuItem(
          value: s.code, child: Text(s.label, overflow: TextOverflow.ellipsis),
        )).toList(),
        onChanged: (value) => setState(() {
          _gpsLineSymbol = value ?? '506';
          final selected = _selectedElement;
          if (!_recording && selected != null && elements[selected].isGpsTrack) {
            elements[selected].symbol = _gpsLineSymbol;
            _scheduleAutosave();
          }
        }),
      ),
      const SizedBox(height: 9),
      FilledButton.icon(
        style: FilledButton.styleFrom(
          backgroundColor: _recording ? const Color(0xffb8554b) : null,
        ),
        onPressed: _recording ? _stopRecording : _startRecording,
        icon: Icon(_recording ? Icons.stop_rounded : Icons.fiber_manual_record),
        label: Text(_recording ? 'Detener grabación' : 'Iniciar grabación'),
      ),
      Text(_recording
          ? 'Grabando · ${_activeTrack?.gpsPoints.length ?? 0} vértices · símbolo ${_activeTrack?.symbol}'
          : 'Las líneas GPS se guardan como objetos del mapa y pueden editarse.',
          style: Theme.of(context).textTheme.bodySmall),
      const SizedBox(height: 8),
      OutlinedButton.icon(
        onPressed: _exportGpx,
        icon: const Icon(Icons.route),
        label: const Text('Exportar tracks GPX'),
      ),
      const Text('No se fabrica una posición si el receptor no envía NMEA válido. El autoguardado conserva el track cada pocos segundos.',
          style: TextStyle(fontSize: 11.5, color: Color(0xffa9bdbe))),
    ], expanded: Platform.isWindows);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.terrain, color: Color(0xff87d8b2)),
        SizedBox(width: 10),
        Text('Ocarto'),
        SizedBox(width: 10),
        Text('v255', style: TextStyle(color: Color(0xff9bb9b2), fontSize: 13)),
      ]),
      actions: [
        if (_recording)
          const Padding(padding: EdgeInsets.symmetric(horizontal: 9),
            child: Chip(avatar: Icon(Icons.fiber_manual_record, color: Color(0xffef7164), size: 18),
              label: Text('REC GPS'))),
        IconButton(tooltip: 'Guardar proyecto', icon: const Icon(Icons.save_outlined), onPressed: _saveProject),
        const SizedBox(width: 12),
      ],
    ),
    body: Row(children: [
      SizedBox(
        width: MediaQuery.sizeOf(context).width < 1100 ? 235 : 280,
        child: Material(
          color: const Color(0xff202b2f),
          child: ListView(children: [
            Padding(padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Text(projectName, maxLines: 2, overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleSmall)),
            _section('Herramientas', Icons.draw_rounded, [
              _toolButton(MapTool.select, Icons.touch_app, 'Seleccionar / editar vértices'),
              _toolButton(MapTool.point, Icons.place, 'Punto'),
              _toolButton(MapTool.line, Icons.polyline, 'Línea'),
              _toolButton(MapTool.area, Icons.pentagon_outlined, 'Área'),
              if (_selectedEditable != null) ...[
                const Divider(height: 16),
                Text('Vértice ${_selectedVertex! + 1} · edición Bézier',
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                FilledButton.tonalIcon(
                  key: const ValueKey('enable-bezier-handles'),
                  onPressed: _enableBezierHandles,
                  icon: const Icon(Icons.tune),
                  label: const Text('Editar tiradores Bézier'),
                ),
                OutlinedButton.icon(
                  key: const ValueKey('bezier-corner'),
                  onPressed: () => _changeBezierMode(corner: true),
                  icon: const Icon(Icons.change_history),
                  label: const Text('Vértice de esquina'),
                ),
                TextButton.icon(
                  key: const ValueKey('bezier-auto'),
                  onPressed: () => _changeBezierMode(corner: false),
                  icon: const Icon(Icons.auto_fix_high),
                  label: const Text('Suavizado automático'),
                ),
                const Text('Arrastra un tirador para modificar la curva. El opuesto se refleja para conservar la tangente.',
                    style: TextStyle(fontSize: 11.5, color: Color(0xffabc4ba))),
              ],
              const SizedBox(height: 5),
              if (_draft != null) ...[
                Text('Trazado: ${_draft!.vertices.length} ${_draft!.vertices.length == 1 ? 'vértice' : 'vértices'}',
                  style: const TextStyle(color: Color(0xffe6c879))),
                Row(children: [
                  Expanded(child: FilledButton.tonalIcon(
                    onPressed: _finishDrawing,
                    icon: const Icon(Icons.done, size: 18),
                    label: const Text('Terminar'),
                  )),
                  const SizedBox(width: 5),
                  IconButton(
                    tooltip: 'Cancelar trazado en curso',
                    onPressed: _cancelDrawing,
                    icon: const Icon(Icons.close),
                  ),
                ]),
              ],
              const Text('Línea/área: clic para añadir vértices, doble clic para terminar; seleccionar y arrastrar para corregir.',
                  style: TextStyle(fontSize: 11.5, color: Color(0xffa6c1b8))),
              const Text('Elige los símbolos en la columna derecha.',
                  style: TextStyle(fontSize: 11.5, color: Color(0xffa6c1b8))),
              const SizedBox(height: 8),
              Text('Seleccionar: toca un vértice de una línea, área o track terminado para editarlo.',
                  style: Theme.of(context).textTheme.bodySmall),
            ]),
            _gpsMenu(),
            _rasterMenu(),
            _section('Capas', Icons.layers_outlined, [
              ...layers.keys.map((name) => CheckboxListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                value: layers[name], title: Text(name),
                onChanged: (v) => setState(() => layers[name] = v ?? false),
              )),
              const Text('Opacidad de plantilla'),
              Slider(value: opacity, onChanged: (v) => setState(() => opacity = v)),
            ], expanded: true),
            _section('Proyecto', Icons.folder_open_rounded, [
              FilledButton.icon(onPressed: _saveProject, icon: const Icon(Icons.save), label: const Text('Guardar proyecto')),
              OutlinedButton.icon(onPressed: () => _loadProject(), icon: const Icon(Icons.folder_open), label: const Text('Abrir proyecto')),
              OutlinedButton.icon(onPressed: () => _loadProject(recovery: true), icon: const Icon(Icons.history), label: const Text('Recuperar autoguardado')),
              const SizedBox(height: 6),
              OutlinedButton.icon(
                onPressed: _recording ? null : () {
                  setState(() { elements.clear(); _draft = null; _selectedElement = null; _selectedVertex = null; });
                  _scheduleAutosave();
                },
                icon: const Icon(Icons.delete_outline),
                label: const Text('Limpiar elementos'),
              ),
              Text('${elements.length} elementos en el proyecto',
                  style: Theme.of(context).textTheme.bodySmall),
            ]),
          ]),
        ),
      ),
      const VerticalDivider(width: 1),
      Expanded(child: LayoutBuilder(builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapUp: (d) => _onMapTap(d.localPosition, size),
          onDoubleTap: _finishDrawing,
          onPanStart: (d) => _onMapDragStart(d.localPosition, size),
          onPanUpdate: (d) => _onMapDrag(d.localPosition, size),
          onPanEnd: (_) {
            if (_movingVertex) {
              _movingVertex = false;
              _dragHandleSide = 0;
              unawaited(_autosave().catchError((Object error) => _snack('Error guardando cambios: $error')));
            }
          },
          child: CustomPaint(
            key: ValueKey('drawing-${_draft?.vertices.length ?? 0}'),
            painter: MapPainter(
              layers: layers,
              opacity: opacity,
              elements: elements,
              draft: _draft,
              tool: tool,
              gpsCenter: _gpsCenter,
              currentFix: _currentFix,
              metersPerPixel: _metersPerPixel,
              selectedElement: _selectedElement,
              selectedVertex: _selectedVertex,
              selectedHandleSide: _dragHandleSide,
              rasterImage: _rasterImage,
              raster: _geoRaster,
              rasterWidth: _rasterWidth,
              rasterHeight: _rasterHeight,
            ),
            child: const SizedBox.expand(),
          ),
        );
      })),
      const VerticalDivider(width: 1),
      SizedBox(
        width: MediaQuery.sizeOf(context).width < 1100 ? 245 : 324,
        child: _symbolDock(),
      ),
    ]),
  );
}

class MapPainter extends CustomPainter {
  MapPainter({
    required this.layers,
    required this.opacity,
    required this.elements,
    required this.tool,
    this.draft,
    required this.gpsCenter,
    required this.currentFix,
    required this.metersPerPixel,
    this.selectedElement,
    this.selectedVertex,
    this.selectedHandleSide = 0,
    this.rasterImage,
    this.raster,
    this.rasterWidth = 0,
    this.rasterHeight = 0,
  });

  final Map<String, bool> layers;
  final double opacity;
  final List<MapElement> elements;
  final MapElement? draft;
  final MapTool tool;
  final GpsFix? gpsCenter;
  final GpsFix? currentFix;
  final double metersPerPixel;
  final int? selectedElement;
  final int? selectedVertex;
  final int selectedHandleSide;
  final ui.Image? rasterImage;
  final GeoRasterReference? raster;
  final int rasterWidth, rasterHeight;

  int? get _projection => rasterImage == null ? null : raster?.epsg;

  void _paintRaster(Canvas canvas, Size size) {
    if (rasterImage == null || raster == null || gpsCenter == null ||
        rasterWidth == 0 || rasterHeight == 0 ||
        layers['Plantilla georreferenciada'] != true) return;
    final origin = UtmProjection.forward(
        gpsCenter!.latitude, gpsCenter!.longitude, raster!.epsg);
    final firstCorner = raster!.world.atPixel(-0.5, -0.5);
    final colScale = rasterWidth / rasterImage!.width;
    final rowScale = rasterHeight / rasterImage!.height;
    final world = raster!.world;
    final matrix = Float64List.fromList([
      world.a * colScale / metersPerPixel,
      -world.d * colScale / metersPerPixel, 0, 0,
      world.b * rowScale / metersPerPixel,
      -world.e * rowScale / metersPerPixel, 0, 0,
      0, 0, 1, 0,
      size.width / 2 + (firstCorner.easting - origin.easting) / metersPerPixel,
      size.height / 2 - (firstCorner.northing - origin.northing) / metersPerPixel,
      0, 1,
    ]);
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    canvas.transform(matrix);
    canvas.drawImage(rasterImage!, Offset.zero, Paint()
      ..filterQuality = FilterQuality.medium
      ..colorFilter = ColorFilter.mode(
          Colors.white.withValues(alpha: opacity), BlendMode.modulate));
    canvas.restore();
  }

  Offset? _vectorToScreen(Offset stored, bool geographic, Size size) {
    if (!geographic) return stored;
    if (gpsCenter == null) return null;
    final fix = GpsFix(latitude: stored.dy, longitude: stored.dx,
        timestamp: gpsCenter!.timestamp);
    return gpsToScreen(fix, gpsCenter!, size, metersPerPixel,
        epsg: _projection);
  }

  /// Keep automatic tangents inside the forward half of their segment.
  /// Unlike an unchecked Catmull-Rom tangent, this cannot reverse at tight
  /// bends: it falls back to a short segment-aligned tangent.
  Offset _forwardTangent(Offset candidate, Offset segment) {
    if (segment.distance < 1e-9) return Offset.zero;
    if ((candidate.dx * segment.dx + candidate.dy * segment.dy) <= 0 ||
        candidate.distance < 1e-8) return segment * .25;
    final cap = segment.distance * .42;
    return candidate.distance > cap
        ? candidate * (cap / candidate.distance)
        : candidate;
  }

  /// The geometric Bézier controls are independent for every vertex.
  /// Legacy vectors keep auto smoothing; buildings default to straight
  /// sides, unless the user explicitly creates a smooth anchor.
  Path _shapePath(List<Offset> points, {
    required bool closed,
    required bool angular,
    required List<BezierControls?> bezier,
    required bool geographic,
    required Size size,
  }) {
    final path = Path();
    if (points.isEmpty) return path;
    path.moveTo(points.first.dx, points.first.dy);
    if (points.length == 1) return path;
    final n = points.length;
    final segments = closed ? n : n - 1;
    bool corner(int i) => i >= bezier.length
        ? angular : (bezier[i]?.corner ?? angular);
    Offset? handle(int i, {required bool outgoing}) {
      if (i >= bezier.length || bezier[i] == null) return null;
      final v = outgoing ? bezier[i]!.outgoing : bezier[i]!.incoming;
      return v == null ? null :
          _vectorToScreen(Offset(v.x, v.y), geographic, size);
    }
    for (var i = 0; i < segments; i++) {
      final j = (i + 1) % n;
      final first = points[i];
      final last = points[j];
      if (corner(i) && corner(j)) {
        path.lineTo(last.dx, last.dy);
        continue;
      }
      final before = points[closed ? (i + n - 1) % n : math.max(0, i - 1)];
      final after = points[closed ? (j + 1) % n : math.min(n - 1, j + 1)];
      final segment = last - first;
      final autoOutgoing = _forwardTangent((last - before) * (1 / 6), segment);
      final autoIncoming = _forwardTangent((after - first) * (1 / 6), segment);
      final c1 = corner(i) ? first + segment * .25
          : (handle(i, outgoing: true) ?? first + autoOutgoing);
      final c2 = corner(j) ? last - segment * .25
          : (handle(j, outgoing: false) ?? last - autoIncoming);
      path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, last.dx, last.dy);
    }
    if (closed) path.close();
    return path;
  }

  void _paintVector(Canvas canvas, Size size, MapElement element,
      int index, {bool inProgress = false}) {
    final baseColor = findCatalogSymbol(element.symbol)?.color
        ?? const Color(0xff1f6f50);
    final raw = element.vertices.isEmpty
        ? <Offset>[element.position] : element.vertices;
    final points = <Offset>[];
    for (final vertex in raw) {
      final p = _vectorToScreen(vertex, element.geographic, size);
      if (p == null) return;
      points.add(p);
    }
    if (points.isEmpty) return;
    if (element.tool == MapTool.point) {
      canvas.drawCircle(points.first, 6.5, Paint()..color = baseColor);
      canvas.drawCircle(points.first, 6.5, Paint()
        ..color = const Color(0xfff5f5f1)..style = PaintingStyle.stroke
        ..strokeWidth = 1.3);
    } else if (element.vertices.isNotEmpty) {
      final closed = element.tool == MapTool.area && !inProgress;
      final angular = <String>{
        'Edificio area', 'Edificio', 'Muro', 'Valla', 'Privado',
      }.contains(element.symbol);
      final path = _shapePath(points, closed: closed, angular: angular,
          bezier: element.bezier, geographic: element.geographic, size: size);
      if (closed && points.length >= 3) {
        canvas.drawPath(path, Paint()
          ..color = baseColor.withValues(alpha: .60)
          ..style = PaintingStyle.fill);
      }
      final outline = Paint()
        ..color = inProgress ? const Color(0xffefb657) : baseColor
        ..strokeWidth = 2.8
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;
      if (points.length == 1) {
        canvas.drawCircle(points.first, 3.5, Paint()..color = outline.color);
      } else if (inProgress) {
        _dashed(canvas, path, outline);
      } else {
        canvas.drawPath(path, outline);
      }
    } else if (element.tool == MapTool.line) {
      // Compatibilidad con los prototipos: conserva el trazo antiguo.
      canvas.drawLine(element.position - const Offset(35, 0),
          element.position + const Offset(35, 0),
          Paint()..color = baseColor..strokeWidth = 3);
    } else if (element.tool == MapTool.area) {
      canvas.drawRect(Rect.fromCenter(center: element.position,
          width: 70, height: 45), Paint()..color = baseColor);
    }
    if (!inProgress && selectedElement == index &&
        selectedVertex != null && selectedVertex! < points.length &&
        selectedVertex! < element.bezier.length) {
      final controls = element.bezier[selectedVertex!];
      if (controls != null && !controls.corner) {
        final anchor = points[selectedVertex!];
        for (final side in [-1, 1]) {
          final stored = side < 0 ? controls.incoming : controls.outgoing;
          if (stored == null) continue;
          final p = _vectorToScreen(Offset(stored.x, stored.y),
              element.geographic, size);
          if (p == null) continue;
          canvas.drawLine(anchor, p, Paint()
            ..color = const Color(0xffe5a33d)
            ..strokeWidth = 1.6);
          canvas.drawCircle(p, side == selectedHandleSide ? 6.5 : 5.4,
            Paint()..color = side == selectedHandleSide
                ? const Color(0xffffd978) : const Color(0xfff5bd56));
          canvas.drawCircle(p, side == selectedHandleSide ? 6.5 : 5.4,
            Paint()..color = const Color(0xff2b454b)
              ..strokeWidth = 1.3..style = PaintingStyle.stroke);
        }
      }
    }
    if (inProgress || selectedElement == index) {
      for (var j = 0; j < points.length; j++) {
        final selected = !inProgress && selectedVertex == j;
        canvas.drawCircle(points[j], selected ? 5.8 : 4.1,
          Paint()..color = selected
            ? const Color(0xffe9aa37) : Colors.white);
        canvas.drawCircle(points[j], selected ? 5.8 : 4.1,
          Paint()..color = const Color(0xff147d98)
            ..strokeWidth = 1.5..style = PaintingStyle.stroke);
      }
    }
  }

  void _grid(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = const Color(0xffe9eeeb));
    final steps = [10.0, 20, 50, 100, 200, 500, 1000, 2000];
    final step = steps.firstWhere((v) => v / metersPerPixel >= 75,
        orElse: () => steps.last);
    final gap = step / metersPerPixel;
    final paint = Paint()..color = const Color(0xffcad9d1)..strokeWidth = 1;
    for (var x = size.width / 2 % gap; x < size.width; x += gap) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (var y = size.height / 2 % gap; y < size.height; y += gap) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
    canvas.drawLine(Offset(size.width / 2, 0), Offset(size.width / 2, size.height),
      Paint()..color = const Color(0xffa5c4b5)..strokeWidth = 1.4);
    canvas.drawLine(Offset(0, size.height / 2), Offset(size.width, size.height / 2),
      Paint()..color = const Color(0xffa5c4b5)..strokeWidth = 1.4);
    _label(canvas, 'GPS · WGS84  |  Cuadrícula local ${step.toInt()} m',
        const Offset(16, 14));
    _label(canvas, rasterImage == null
        ? 'Sin plantilla PNG/PGW importada.'
        : 'Plantilla georreferenciada EPSG:${raster!.epsg}',
        const Offset(16, 36));
  }

  void _label(Canvas canvas, String text, Offset offset) {
    final tp = TextPainter(
      text: TextSpan(text: text,
        style: const TextStyle(fontSize: 12, color: Color(0xff3c5757))),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, offset);
  }

  void _dashed(Canvas canvas, Path path, Paint paint) {
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        final end = math.min(metric.length, distance + 10);
        canvas.drawPath(metric.extractPath(distance, end), paint);
        distance += 16;
      }
    }
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (gpsCenter != null) {
      _grid(canvas, size);
      _paintRaster(canvas, size);
    } else {
      canvas.drawRect(Offset.zero & size, Paint()..color = const Color(0xffedf0e7));
      if (layers['Plantilla georreferenciada'] == true) {
        final p = Paint()
          ..color = const Color(0xff71866d).withValues(alpha: opacity)
          ..style = PaintingStyle.stroke..strokeWidth = 2;
        for (var y = 80.0; y < size.height; y += 150) {
          canvas.drawArc(Rect.fromLTWH(-80, y - 60, size.width + 160, 120),
              0, 3.14, false, p);
        }
      }
      if (layers['Ortofoto / vegetación'] == true) {
        final p = Paint()..color = const Color(0xff9db48d).withValues(alpha: .55);
        canvas.drawCircle(Offset(size.width * .2, size.height * .25), 70, p);
        canvas.drawCircle(Offset(size.width * .8, size.height * .7), 95, p);
      }
    }
    if (layers['Mapa editable'] == true) {
      for (var i = 0; i < elements.length; i++) {
        final e = elements[i];
        if (e.isGpsTrack) {
          if (gpsCenter == null || e.gpsPoints.isEmpty) continue;
          final points = e.gpsPoints.map((fix) => gpsToScreen(
            fix, gpsCenter!, size, metersPerPixel,
            epsg: _projection,
          )).toList();
          final style = styleFor(e.symbol);
          final paint = Paint()..color = style.color
              ..style = PaintingStyle.stroke..strokeWidth = style.width
              ..strokeCap = StrokeCap.round..strokeJoin = StrokeJoin.round;
          final path = Path()..moveTo(points.first.dx, points.first.dy);
          for (final pos in points.skip(1)) { path.lineTo(pos.dx, pos.dy); }
          if (points.length == 1) {
            canvas.drawCircle(points.first, 2.8, Paint()..color = style.color);
          } else if (style.dashed) {
            _dashed(canvas, path, paint);
          } else {
            canvas.drawPath(path, paint);
          }
          if (selectedElement == i) {
            for (var j = 0; j < points.length; j++) {
              canvas.drawCircle(points[j], selectedVertex == j ? 5.5 : 3.2,
                Paint()..color = j == selectedVertex
                    ? const Color(0xff127ca0) : const Color(0xffffffff));
              canvas.drawCircle(points[j], selectedVertex == j ? 5.5 : 3.2,
                Paint()..color = const Color(0xff127ca0)
                  ..style = PaintingStyle.stroke..strokeWidth = 1.3);
            }
          }
          continue;
        }
        _paintVector(canvas, size, e, i);
      }
    }
    if (layers['Mapa editable'] == true && draft != null) {
      _paintVector(canvas, size, draft!, elements.length, inProgress: true);
    }
    if (gpsCenter != null && currentFix != null) {
      final pos = gpsToScreen(currentFix!, gpsCenter!, size, metersPerPixel,
          epsg: _projection);
      canvas.drawCircle(pos, 13, Paint()..color = const Color(0xff2486db).withValues(alpha: .2));
      canvas.drawCircle(pos, 6, Paint()..color = const Color(0xff1978c5));
      canvas.drawCircle(pos, 6, Paint()..color = Colors.white
        ..style = PaintingStyle.stroke..strokeWidth = 2);
      _label(canvas, 'GPS', pos + const Offset(11, -18));
    }
    if (gpsCenter == null) {
      _label(canvas, 'Selecciona una herramienta para dibujar o abre GPS y conecta un receptor.',
          const Offset(16, 16));
    }
  }

  @override
  bool shouldRepaint(covariant MapPainter oldDelegate) => true;
}