import 'dart:io';

import 'package:path_provider/path_provider.dart';

import 'map_project.dart';

class ProjectStorage {
  /// Copia de recuperación del proyecto y de los tracks GPS.
  /// Se escribe también durante la grabación para no perder un recorrido.
  Future<File> file() async {
    final directory = await getApplicationDocumentsDirectory();
    return File('${directory.path}${Platform.pathSeparator}ocarto-project.json');
  }

  Future<void> save(MapProject project) async {
    final target = await file();
    await target.writeAsString(project.encode(), flush: true);
  }

  Future<MapProject?> load() async {
    final target = await file();
    if (!await target.exists()) return null;
    return MapProject.decode(await target.readAsString());
  }
}