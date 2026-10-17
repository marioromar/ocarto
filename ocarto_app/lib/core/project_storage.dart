import 'dart:io';

import 'package:path_provider/path_provider.dart';

import 'map_project.dart';

/// Almacén del proyecto con sustitución atómica y copia de seguridad.
/// La ruta puede inyectarse para comprobar la recuperación sin GPS físico.
class ProjectStorage {
  ProjectStorage({Future<Directory> Function()? directoryProvider})
      : _directoryProvider = directoryProvider ?? getApplicationDocumentsDirectory;

  final Future<Directory> Function() _directoryProvider;

  Future<File> file() async {
    final directory = await _directoryProvider();
    await directory.create(recursive: true);
    return File('${directory.path}${Platform.pathSeparator}ocarto-project.json');
  }

  /// Descarta una copia truncada o inválida, pero deja que los errores de
  /// lectura reales lleguen al usuario en lugar de ocultarlos.
  Future<MapProject?> _readIfValid(File candidate) async {
    if (!await candidate.exists()) return null;
    final source = await candidate.readAsString();
    try {
      return MapProject.decode(source);
    } on FormatException {
      return null;
    } on TypeError {
      return null;
    } on RangeError {
      return null;
    }
  }

  /// Escribe primero un archivo temporal completo. Antes de sustituir el
  /// archivo principal se conserva una copia del último proyecto legible.
  /// Nunca se reemplaza una copia buena por un archivo principal corrupto.
  Future<void> save(MapProject project) async {
    final target = await file();
    final temporary = File('${target.path}.tmp');
    final backup = File('${target.path}.bak');
    final backupTemporary = File('${target.path}.bak.tmp');

    await temporary.writeAsString(project.encode(), flush: true);

    if (await _readIfValid(target) != null) {
      await target.copy(backupTemporary.path);
      await backupTemporary.rename(backup.path);
    }

    // Rename reemplaza el destino sin abrirlo para escritura parcial.
    // Si la sustitución falla, el archivo anterior continúa disponible.
    await temporary.rename(target.path);
  }

  /// Da prioridad al proyecto principal, luego a la escritura interrumpida
  /// y finalmente a la copia anterior. No elimina automáticamente ninguna
  /// copia dañada para facilitar una recuperación posterior.
  Future<MapProject?> load() async {
    final target = await file();
    final candidates = [
      target,
      File('${target.path}.tmp'),
      File('${target.path}.bak'),
    ];
    var anyFile = false;
    for (final candidate in candidates) {
      if (!await candidate.exists()) continue;
      anyFile = true;
      final project = await _readIfValid(candidate);
      if (project != null) return project;
    }
    if (anyFile) {
      throw const FormatException(
          'Las copias de recuperación del proyecto están dañadas');
    }
    return null;
  }
}
