import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';

import 'core/map_project.dart';
import 'core/project_storage.dart';
import 'gps/gps_serial_service.dart';
import 'gps/nmea_parser.dart';

void main() => runApp(const OcartoApp());

enum MapTool { select, point, line, area }

class MapElement {
  MapElement(
    this.tool,
    this.position,
    this.symbol, {
    this.isGpsTrack = false,
    List<GpsFix>? gpsPoints,
  }) : gpsPoints = gpsPoints ?? <GpsFix>[];

  final MapTool tool;
  final Offset position;
  String symbol;
  final bool isGpsTrack;
  final List<GpsFix> gpsPoints;
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
Offset gpsToScreen(GpsFix point, GpsFix origin, Size size, double metersPerPixel) {
  const metersPerDegree = 111319.49079327358;
  final east = (point.longitude - origin.longitude) *
      metersPerDegree * math.cos(origin.latitude * math.pi / 180);
  final north = (point.latitude - origin.latitude) * metersPerDegree;
  return Offset(size.width / 2 + east / metersPerPixel,
      size.height / 2 - north / metersPerPixel);
}

GpsFix screenToGps(Offset screen, GpsFix origin, Size size, double metersPerPixel,
    GpsFix original) {
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
  static const symbols = ['Punto de control', 'Árbol', 'Roca', 'Agua', 'IOF-placeholder'];
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
  MapElement? _activeTrack;
  GpsFix? _lastRecordedFix;
  int? _selectedElement;
  int? _selectedVertex;
  bool _movingVertex = false;
  bool _recording = false;

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
        )).toList(),
        gpsCenterLatitude: _gpsCenter?.latitude,
        gpsCenterLongitude: _gpsCenter?.longitude,
        gpsMetersPerPixel: _metersPerPixel,
        gpsTrackSymbol: _gpsLineSymbol,
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
      setState(() {
        projectName = project!.name;
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
          )));
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
      });
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

  void _selectAt(Offset position, Size size) {
    final center = _gpsCenter;
    if (center == null) return;
    const maxDistance = 16.0;
    var best = maxDistance * maxDistance;
    int? bestElement;
    int? bestVertex;
    for (var i = 0; i < elements.length; i++) {
      final feature = elements[i];
      if (!feature.isGpsTrack || feature.gpsPoints.isEmpty) continue;
      for (var j = 0; j < feature.gpsPoints.length; j++) {
        final candidate = gpsToScreen(feature.gpsPoints[j], center, size, _metersPerPixel);
        final squared = (candidate - position).distanceSquared;
        if (squared < best) {
          best = squared;
          bestElement = i;
          bestVertex = j;
        }
      }
    }
    setState(() { _selectedElement = bestElement; _selectedVertex = bestVertex; });
  }

  void _onMapTap(Offset position, Size size) {
    if (tool == MapTool.select) { _selectAt(position, size); return; }
    setState(() { elements.add(MapElement(tool, position, symbol)); });
    _scheduleAutosave();
  }

  void _onMapDragStart(Offset position, Size size) {
    if (tool != MapTool.select || _recording) return;
    _selectAt(position, size);
    final index = _selectedElement;
    setState(() => _movingVertex = index != null &&
        elements[index].isGpsTrack && _selectedVertex != null);
  }

  void _onMapDrag(Offset position, Size size) {
    if (!_movingVertex || _gpsCenter == null) return;
    final index = _selectedElement;
    final vertex = _selectedVertex;
    if (index == null || vertex == null) return;
    final element = elements[index];
    if (vertex >= element.gpsPoints.length) return;
    setState(() => element.gpsPoints[vertex] = screenToGps(
      position, _gpsCenter!, size, _metersPerPixel, element.gpsPoints[vertex],
    ));
    _scheduleAutosave();
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
              onPressed: () => setState(() => tool = value),
              icon: Icon(icon), label: Text(text),
            )
          : OutlinedButton.icon(
              onPressed: () => setState(() => tool = value),
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
        width: 315,
        child: Container(
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
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                key: ValueKey('symbol-$symbol'),
                initialValue: symbol,
                decoration: const InputDecoration(labelText: 'Símbolo básico', isDense: true),
                items: symbols.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                onChanged: (value) => setState(() => symbol = value ?? symbol),
              ),
              const SizedBox(height: 8),
              Text('Seleccionar: toca un vértice de una línea GPS terminada y arrástralo para editarla.',
                  style: Theme.of(context).textTheme.bodySmall),
            ]),
            _gpsMenu(),
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
                  setState(() { elements.clear(); _selectedElement = null; _selectedVertex = null; });
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
          onPanStart: (d) => _onMapDragStart(d.localPosition, size),
          onPanUpdate: (d) => _onMapDrag(d.localPosition, size),
          onPanEnd: (_) {
            if (_movingVertex) {
              _movingVertex = false;
              unawaited(_autosave().catchError((Object error) => _snack('Error guardando cambios: $error')));
            }
          },
          child: CustomPaint(
            painter: MapPainter(
              layers: layers,
              opacity: opacity,
              elements: elements,
              tool: tool,
              gpsCenter: _gpsCenter,
              currentFix: _currentFix,
              metersPerPixel: _metersPerPixel,
              selectedElement: _selectedElement,
              selectedVertex: _selectedVertex,
            ),
            child: const SizedBox.expand(),
          ),
        );
      })),
    ]),
  );
}

class MapPainter extends CustomPainter {
  MapPainter({
    required this.layers,
    required this.opacity,
    required this.elements,
    required this.tool,
    required this.gpsCenter,
    required this.currentFix,
    required this.metersPerPixel,
    this.selectedElement,
    this.selectedVertex,
  });

  final Map<String, bool> layers;
  final double opacity;
  final List<MapElement> elements;
  final MapTool tool;
  final GpsFix? gpsCenter;
  final GpsFix? currentFix;
  final double metersPerPixel;
  final int? selectedElement;
  final int? selectedVertex;

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
    _label(canvas, 'El fondo cartográfico de este prototipo no está georreferenciado.',
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
        final paint = Paint()..color = const Color(0xff1f6f50)
            ..style = PaintingStyle.fill;
        if (e.tool == MapTool.point) canvas.drawCircle(e.position, 8, paint);
        if (e.tool == MapTool.line) {
          canvas.drawRect(Rect.fromCenter(center: e.position, width: 70, height: 8), paint);
        }
        if (e.tool == MapTool.area) {
          canvas.drawRect(Rect.fromCenter(center: e.position, width: 70, height: 45), paint);
        }
      }
    }
    if (gpsCenter != null && currentFix != null) {
      final pos = gpsToScreen(currentFix!, gpsCenter!, size, metersPerPixel);
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