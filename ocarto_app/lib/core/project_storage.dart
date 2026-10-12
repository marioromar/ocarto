import 'dart:io';

import 'package:path_provider/path_provider.dart';

import 'map_project.dart';

class ProjectStorage {
  Future<File> _file() async {
    final directory = await getApplicationDocumentsDirectory();
    return File(
      '${directory.path}${Platform.pathSeparator}ocarto-project.json',
    );
  }

  Future<void> save(MapProject project) async =>
      (await _file()).writeAsString(project.encode());

  Future<MapProject?> load() async {
    final file = await _file();
    if (!await file.exists()) return null;
    return MapProject.decode(await file.readAsString());
  }
}
