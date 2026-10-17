import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/core/map_project.dart';
import 'package:ocarto_app/core/project_storage.dart';
import 'package:ocarto_app/gps/nmea_parser.dart';

MapProject sampleProject(String name) => MapProject(
      name: name,
      layers: [ProjectLayer(id: 'Mapa editable', name: 'Mapa editable')],
      elements: [
        ProjectElement(
          tool: 'line',
          x: 0,
          y: 0,
          symbol: '506',
          isGpsTrack: true,
          gpsPoints: [
            GpsFix(
              latitude: 36.72345,
              longitude: -4.43123,
              timestamp: DateTime.utc(2026, 10, 16, 12, 30),
              altitudeMeters: 42.5,
              satellites: 9,
            ),
          ],
        ),
      ],
    );

void main() {
  late Directory directory;
  late ProjectStorage storage;

  setUp(() async {
    directory = await Directory.systemTemp.createTemp('ocarto-gps-test-');
    storage = ProjectStorage(directoryProvider: () async => directory);
  });

  tearDown(() async {
    if (await directory.exists()) await directory.delete(recursive: true);
  });

  test('sin copias guardadas no hay proyecto para recuperar', () async {
    expect(await storage.load(), isNull);
  });

  test('escribe un proyecto GPS y conserva posiciones y símbolo', () async {
    await storage.save(sampleProject('Primer mapa'));
    final restored = await storage.load();
    expect(restored?.name, 'Primer mapa');
    expect(restored?.elements.single.symbol, '506');
    expect(restored?.elements.single.gpsPoints.single.latitude, 36.72345);
    expect(restored?.elements.single.gpsPoints.single.longitude, -4.43123);
    expect(restored?.elements.single.gpsPoints.single.altitudeMeters, 42.5);
  });

  test('la copia .bak conserva el proyecto válido anterior', () async {
    await storage.save(sampleProject('Anterior'));
    await storage.save(sampleProject('Actual'));
    expect((await storage.load())!.name, 'Actual');
    final mainFile = await storage.file();
    final backup = File('${mainFile.path}.bak');
    expect(backup.existsSync(), isTrue);
    expect(MapProject.decode(await backup.readAsString()).name, 'Anterior');
  });

  test('si el archivo principal queda truncado recupera .bak', () async {
    await storage.save(sampleProject('Anterior'));
    await storage.save(sampleProject('Actual'));
    final mainFile = await storage.file();
    await mainFile.writeAsString('{"format":');
    expect((await storage.load())!.name, 'Anterior');
  });

  test('prioriza el principal válido sobre un temporal interrumpido', () async {
    await storage.save(sampleProject('Principal'));
    final mainFile = await storage.file();
    await File('${mainFile.path}.tmp').writeAsString('escritura parcial');
    expect((await storage.load())!.name, 'Principal');
  });

  test('recupera un temporal completo si el principal se ha dañado', () async {
    await storage.save(sampleProject('Anterior'));
    final mainFile = await storage.file();
    await mainFile.writeAsString('corrupto');
    await File('${mainFile.path}.tmp')
        .writeAsString(sampleProject('Temporal').encode());
    expect((await storage.load())!.name, 'Temporal');
  });

  test('no sobrescribe la copia buena si el principal está corrupto', () async {
    await storage.save(sampleProject('Respaldo'));
    await storage.save(sampleProject('Principal'));
    final mainFile = await storage.file();
    await mainFile.writeAsString('corrupto');
    await storage.save(sampleProject('Nuevo'));
    final backup = File('${mainFile.path}.bak');
    expect(MapProject.decode(await backup.readAsString()).name, 'Respaldo');
    expect((await storage.load())!.name, 'Nuevo');
  });

  test('informa si existen archivos pero todos son inválidos', () async {
    await storage.save(sampleProject('Antes'));
    final mainFile = await storage.file();
    await mainFile.writeAsString('contenido dañado');
    await expectLater(storage.load(), throwsFormatException);
  });
}
