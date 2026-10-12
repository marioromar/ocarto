import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/core/map_project.dart';

void main() {
  test('serializa y recupera un proyecto Ocarto', () {
    final source = MapProject(
      name: 'Prueba',
      layers: [ProjectLayer(id: 'editable', name: 'Mapa editable')],
      elements: [ProjectElement(tool: 'point', x: 12, y: 34)],
    ).encode();
    final restored = MapProject.decode(source);
    expect(restored.name, 'Prueba');
    expect(restored.layers.single.id, 'editable');
    expect(restored.elements.single.x, 12);
  });
}
