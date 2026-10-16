import 'package:flutter/material.dart';

/// Catálogo visual inicial del editor Windows. Los códigos sin número son
/// identificadores internos: no se presentan como códigos oficiales IOF.
enum CatalogTool { point, line, area }

class OcartoCatalogSymbol {
  const OcartoCatalogSymbol({
    required this.id,
    required this.name,
    required this.tool,
    required this.icon,
    required this.color,
  });

  final String id;
  final String name;
  final CatalogTool tool;
  final IconData icon;
  final Color color;
}

const catalogSymbols = <OcartoCatalogSymbol>[
  // Puntos (identificadores internos hasta enlazar el catálogo OCAD/OMAP).
  OcartoCatalogSymbol(id: 'Árbol', name: 'Árbol', tool: CatalogTool.point,
      icon: Icons.park, color: Color(0xff2f9a64)),
  OcartoCatalogSymbol(id: 'Arbol grande', name: 'Árbol destacado',
      tool: CatalogTool.point, icon: Icons.forest, color: Color(0xff167a49)),
  OcartoCatalogSymbol(id: 'Roca', name: 'Roca', tool: CatalogTool.point,
      icon: Icons.change_history, color: Color(0xff373c40)),
  OcartoCatalogSymbol(id: 'Piedra', name: 'Piedra', tool: CatalogTool.point,
      icon: Icons.diamond, color: Color(0xff383e47)),
  OcartoCatalogSymbol(id: 'Punto de control', name: 'Punto de control',
      tool: CatalogTool.point, icon: Icons.adjust, color: Color(0xffbd52ab)),
  OcartoCatalogSymbol(id: 'Agua', name: 'Punto de agua', tool: CatalogTool.point,
      icon: Icons.water_drop, color: Color(0xff398ccf)),
  OcartoCatalogSymbol(id: 'Fuente', name: 'Fuente', tool: CatalogTool.point,
      icon: Icons.opacity, color: Color(0xff246ca6)),
  OcartoCatalogSymbol(id: 'Edificio', name: 'Edificio', tool: CatalogTool.point,
      icon: Icons.home, color: Color(0xff353a3e)),
  OcartoCatalogSymbol(id: 'Agujero', name: 'Hoyuelo', tool: CatalogTool.point,
      icon: Icons.circle_outlined, color: Color(0xff805e45)),
  OcartoCatalogSymbol(id: 'Monticulo', name: 'Montículo', tool: CatalogTool.point,
      icon: Icons.terrain, color: Color(0xffb47e53)),
  OcartoCatalogSymbol(id: 'Poste', name: 'Poste', tool: CatalogTool.point,
      icon: Icons.push_pin, color: Color(0xff373e43)),
  OcartoCatalogSymbol(id: 'Escalera', name: 'Escalera', tool: CatalogTool.point,
      icon: Icons.stairs, color: Color(0xff6d6863)),
  // Líneas: los cinco códigos reconocidos se mantienen compatibles
  // con la grabación GPS de la rama v250.
  OcartoCatalogSymbol(id: '506', name: 'Sendero (506)',
      tool: CatalogTool.line, icon: Icons.route, color: Color(0xff805b3e)),
  OcartoCatalogSymbol(id: '504', name: 'Pista (504)',
      tool: CatalogTool.line, icon: Icons.alt_route, color: Color(0xff6f5136)),
  OcartoCatalogSymbol(id: '101', name: 'Curva de nivel (101)',
      tool: CatalogTool.line, icon: Icons.ssid_chart, color: Color(0xffad7256)),
  OcartoCatalogSymbol(id: '304', name: 'Curso de agua (304)',
      tool: CatalogTool.line, icon: Icons.water, color: Color(0xff2685c5)),
  OcartoCatalogSymbol(id: '416', name: 'Límite vegetación (416)',
      tool: CatalogTool.line, icon: Icons.grass, color: Color(0xff408255)),
  OcartoCatalogSymbol(id: 'GPS', name: 'Track GPS',
      tool: CatalogTool.line, icon: Icons.gps_fixed, color: Color(0xfff0aa48)),
  OcartoCatalogSymbol(id: 'Carretera', name: 'Carretera',
      tool: CatalogTool.line, icon: Icons.add_road, color: Color(0xff3f4041)),
  OcartoCatalogSymbol(id: 'Muro', name: 'Muro',
      tool: CatalogTool.line, icon: Icons.horizontal_rule, color: Color(0xff4e504f)),
  OcartoCatalogSymbol(id: 'Valla', name: 'Valla',
      tool: CatalogTool.line, icon: Icons.line_style, color: Color(0xff505656)),
  OcartoCatalogSymbol(id: 'Surco', name: 'Surco de erosión',
      tool: CatalogTool.line, icon: Icons.timeline, color: Color(0xff7d5239)),
  // Superficies: son categorías de dibujo, NO simbología oficial final.
  OcartoCatalogSymbol(id: 'Blanco', name: 'Bosque abierto',
      tool: CatalogTool.area, icon: Icons.crop_square, color: Color(0xffeff5ee)),
  OcartoCatalogSymbol(id: 'Verde claro', name: 'Vegetación ligera',
      tool: CatalogTool.area, icon: Icons.square, color: Color(0xffa4d3a5)),
  OcartoCatalogSymbol(id: 'Verde medio', name: 'Vegetación media',
      tool: CatalogTool.area, icon: Icons.square, color: Color(0xff64a86b)),
  OcartoCatalogSymbol(id: 'Verde oscuro', name: 'Vegetación densa',
      tool: CatalogTool.area, icon: Icons.square, color: Color(0xff278343)),
  OcartoCatalogSymbol(id: 'Amarillo', name: 'Abierto',
      tool: CatalogTool.area, icon: Icons.square, color: Color(0xfff7ce55)),
  OcartoCatalogSymbol(id: 'Cultivo', name: 'Cultivo',
      tool: CatalogTool.area, icon: Icons.grid_on, color: Color(0xffdfba64)),
  OcartoCatalogSymbol(id: 'Agua area', name: 'Lámina de agua',
      tool: CatalogTool.area, icon: Icons.square, color: Color(0xff4e99c6)),
  OcartoCatalogSymbol(id: 'Asfalto', name: 'Pavimento',
      tool: CatalogTool.area, icon: Icons.square, color: Color(0xff999997)),
  OcartoCatalogSymbol(id: 'Privado', name: 'Área privada',
      tool: CatalogTool.area, icon: Icons.crop_free, color: Color(0xff698d72)),
  OcartoCatalogSymbol(id: 'Edificio area', name: 'Edificio (área)',
      tool: CatalogTool.area, icon: Icons.square, color: Color(0xff34373a)),
];

OcartoCatalogSymbol? findCatalogSymbol(String id) {
  for (final entry in catalogSymbols) {
    if (entry.id == id) return entry;
  }
  return null;
}
