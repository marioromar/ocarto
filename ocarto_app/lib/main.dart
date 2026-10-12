import 'package:flutter/material.dart';

void main() => runApp(const OcartoApp());

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
              Text('Elementos', style: Theme.of(context).textTheme.titleMedium),
              FilledButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.place),
                label: const Text('Añadir punto'),
              ),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.polyline),
                label: const Text('Añadir línea'),
              ),
              OutlinedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.pentagon_outlined),
                label: const Text('Añadir área'),
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: const Color(0xffedf0e7),
                border: Border.all(color: Colors.black26),
              ),
              child: Center(
                child: Text(
                  'Lienzo vectorial\n\nPlantillas protegidas · mapa editable\n\nBase preparada para LAS/LAZ',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
