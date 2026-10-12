import 'dart:io';

import 'package:flutter/material.dart';
import 'package:file_selector/file_selector.dart';

import 'core/map_project.dart';
import 'core/project_storage.dart';

void main() => runApp(const OcartoApp());

enum MapTool { point, line, area }

class MapElement {
  MapElement(this.tool, this.position);
  final MapTool tool;
  final Offset position;
}

class OcartoApp extends StatelessWidget {
  const OcartoApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Ocarto',
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff1b5e3b)),
      useMaterial3: true,
    ),
    home: const OcartoHome(),
  );
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
  String projectName = 'Mi mapa Ocarto';
  MapTool tool = MapTool.point;
  double opacity = 1;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Ocarto'),
      actions: const [
        Padding(
          padding: EdgeInsets.all(16),
          child: Text('Cartografía de orientación'),
        ),
      ],
    ),
    body: Row(
      children: [
        SizedBox(
          width: 290,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Capas', style: Theme.of(context).textTheme.titleMedium),
              ...layers.keys.map(
                (name) => CheckboxListTile(
                  value: layers[name],
                  title: Text(name),
                  onChanged: (v) => setState(() => layers[name] = v ?? false),
                ),
              ),
              const SizedBox(height: 8),
              const Text('Transparencia de plantilla'),
              Slider(
                value: opacity,
                onChanged: (v) => setState(() => opacity = v),
              ),
              const Divider(),
              Text(
                'Herramientas',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              _toolButton(MapTool.point, Icons.place, 'Punto'),
              _toolButton(MapTool.line, Icons.polyline, 'Línea'),
              _toolButton(MapTool.area, Icons.pentagon_outlined, 'Área'),
              OutlinedButton.icon(
                onPressed: elements.isEmpty
                    ? null
                    : () => setState(elements.clear),
                icon: const Icon(Icons.delete_outline),
                label: const Text('Limpiar editables'),
              ),
              FilledButton.icon(
                onPressed: _saveProject,
                icon: const Icon(Icons.save_outlined),
                label: const Text('Guardar proyecto'),
              ),
              OutlinedButton.icon(
                onPressed: _loadProject,
                icon: const Icon(Icons.folder_open),
                label: const Text('Cargar proyecto'),
              ),
              Text(
                '${elements.length} elemento(s) editable(s)',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: GestureDetector(
              onTapUp: (details) => setState(
                () => elements.add(MapElement(tool, details.localPosition)),
              ),
              child: CustomPaint(
                painter: MapPainter(
                  layers: layers,
                  opacity: opacity,
                  elements: elements,
                  tool: tool,
                ),
                child: const SizedBox.expand(),
              ),
            ),
          ),
        ),
      ],
    ),
  );

  Future<void> _saveProject() async {
    final name = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController(text: projectName);
        return AlertDialog(
          title: const Text('Nombre del proyecto'),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Nombre'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Guardar'),
            ),
          ],
        );
      },
    );
    if (name == null || name.isEmpty) return;
    projectName = name;
    final project = MapProject(
      name: projectName,
      layers: layers.entries
          .map(
            (entry) => ProjectLayer(
              id: entry.key,
              name: entry.key,
              visible: entry.value,
              opacity: entry.key == 'Plantilla georreferenciada' ? opacity : 1,
            ),
          )
          .toList(),
      elements: elements
          .map(
            (element) => ProjectElement(
              tool: element.tool.name,
              x: element.position.dx,
              y: element.position.dy,
            ),
          )
          .toList(),
    );
    final location = await getSaveLocation(
      suggestedName: '${projectName.replaceAll(' ', '_')}.ocarto',
      acceptedTypeGroups: [
        const XTypeGroup(label: 'Proyecto Ocarto', extensions: ['ocarto']),
      ],
    );
    if (location == null) return;
    await File(location.path).writeAsString(project.encode());
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Proyecto guardado localmente')),
      );
    }
  }

  Future<void> _loadProject() async {
    final file = await openFile(
      acceptedTypeGroups: [
        const XTypeGroup(
          label: 'Proyecto Ocarto',
          extensions: ['ocarto', 'json'],
        ),
      ],
    );
    final project = file == null
        ? await storage.load()
        : MapProject.decode(await file.readAsString());
    if (project == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Todavía no hay un proyecto guardado')),
        );
      }
      return;
    }
    setState(() {
      projectName = project.name;
      for (final layer in project.layers) {
        if (layers.containsKey(layer.id)) layers[layer.id] = layer.visible;
        if (layer.id == 'Plantilla georreferenciada') opacity = layer.opacity;
      }
      elements
        ..clear()
        ..addAll(
          project.elements.map(
            (element) => MapElement(
              MapTool.values.firstWhere(
                (tool) => tool.name == element.tool,
                orElse: () => MapTool.point,
              ),
              Offset(element.x, element.y),
            ),
          ),
        );
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Proyecto cargado: ${project.name}')),
      );
    }
  }

  Widget _toolButton(MapTool value, IconData icon, String label) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: value == tool
        ? FilledButton.icon(
            onPressed: () => setState(() => tool = value),
            icon: Icon(icon),
            label: Text(label),
          )
        : OutlinedButton.icon(
            onPressed: () => setState(() => tool = value),
            icon: Icon(icon),
            label: Text(label),
          ),
  );
}

class MapPainter extends CustomPainter {
  MapPainter({
    required this.layers,
    required this.opacity,
    required this.elements,
    required this.tool,
  });
  final Map<String, bool> layers;
  final double opacity;
  final List<MapElement> elements;
  final MapTool tool;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xffedf0e7),
    );
    if (layers['Plantilla georreferenciada'] == true) {
      final p = Paint()
        ..color = const Color(0xff71866d).withValues(alpha: opacity)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      for (var y = 80.0; y < size.height; y += 150) {
        canvas.drawArc(
          Rect.fromLTWH(-80, y - 60, size.width + 160, 120),
          0,
          3.14,
          false,
          p,
        );
      }
    }
    if (layers['Ortofoto / vegetación'] == true) {
      final p = Paint()..color = const Color(0xff9db48d).withValues(alpha: .55);
      canvas.drawCircle(Offset(size.width * .2, size.height * .25), 70, p);
      canvas.drawCircle(Offset(size.width * .8, size.height * .7), 95, p);
    }
    for (final element in elements) {
      final p = Paint()
        ..color = const Color(0xff1f6f50)
        ..style = PaintingStyle.fill;
      if (element.tool == MapTool.point) {
        canvas.drawCircle(element.position, 8, p);
      }
      if (element.tool == MapTool.line) {
        canvas.drawRect(
          Rect.fromCenter(center: element.position, width: 70, height: 8),
          p,
        );
      }
      if (element.tool == MapTool.area) {
        canvas.drawRect(
          Rect.fromCenter(center: element.position, width: 70, height: 45),
          p,
        );
      }
    }
    final hint = TextPainter(
      text: TextSpan(
        text: 'Clic para añadir ${tool.name}',
        style: const TextStyle(color: Colors.black54),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    hint.paint(canvas, const Offset(16, 16));
  }

  @override
  bool shouldRepaint(covariant MapPainter oldDelegate) => true;
}
