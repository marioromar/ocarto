import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/main.dart';

void main() {
  testWidgets('editor móvil muestra mapa y navegación táctil para dibujar',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(const OcartoApp());
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Móvil v289'), findsOneWidget);
    expect(find.byKey(const ValueKey('drawing-0')), findsOneWidget);

    await tester.tap(find.byIcon(Icons.draw_rounded));
    await tester.pumpAndSettle();
    expect(find.text('Seleccionar y editar'), findsOneWidget);
    expect(find.text('Punto'), findsOneWidget);
    expect(find.text('Línea'), findsOneWidget);
    expect(find.text('Área'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.grid_view_rounded));
    await tester.pumpAndSettle();
    expect(find.text('Símbolos favoritos'), findsOneWidget);
    expect(find.text('Piedra'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.layers));
    await tester.pumpAndSettle();
    expect(find.text('Plantilla georreferenciada'), findsOneWidget);
    expect(find.text('Proyecto y sincronización'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
