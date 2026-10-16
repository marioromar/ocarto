import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/core/map_project.dart';
import 'package:ocarto_app/core/symbol_catalog.dart';

void main() {
  test('el catálogo tiene identificadores únicos y categorías definidas', () {
    expect(catalogSymbols.length, greaterThanOrEqualTo(30));
    final ids = catalogSymbols.map((symbol) => symbol.id).toList();
    expect(ids.toSet().length, ids.length);
    expect(catalogSymbols.where((s) => s.tool == CatalogTool.point), isNotEmpty);
    expect(catalogSymbols.where((s) => s.tool == CatalogTool.line), isNotEmpty);
    expect(catalogSymbols.where((s) => s.tool == CatalogTool.area), isNotEmpty);
    expect(findCatalogSymbol('506')?.name, contains('Sendero'));
    expect(findCatalogSymbol('nada'), isNull);
  });

  test('la selección y favoritos se conservan en el proyecto .ocarto', () {
    final project = MapProject(
      name: 'Bobadilla',
      layers: [],
      elements: [],
      favoriteSymbols: ['506', 'Árbol', '304'],
      selectedCatalogSymbol: 'Árbol',
      activeTool: 'point',
    );
    final restored = MapProject.decode(project.encode());
    expect(restored.favoriteSymbols, containsAll(['506', 'Árbol', '304']));
    expect(restored.selectedCatalogSymbol, 'Árbol');
    expect(restored.activeTool, 'point');
  });

  test('los proyectos anteriores se abren sin perder compatibilidad', () {
    final restored = MapProject.decode(
        MapProject(name: 'Antiguo', layers: [], elements: []).encode());
    expect(restored.favoriteSymbols, isEmpty);
    expect(restored.selectedCatalogSymbol, isNull);
    expect(restored.activeTool, isNull);
  });
}
