import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/main.dart';

void main() {
  testWidgets('traza línea por vértices y permite terminarla',
      (tester) async {
    await tester.pumpWidget(const OcartoApp());
    await tester.tap(find.text('Herramientas'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Línea'));
    await tester.pump();
    // En el test de escritorio: panel izquierdo 235, mapa central y
    // catálogo derecho 245, con lienzo en x=236..554.
    await tester.tapAt(const Offset(310, 320));
    await tester.pump();
    expect(find.text('Trazado: 1 vértice'), findsOneWidget);
    await tester.tapAt(const Offset(430, 380));
    await tester.pump();
    expect(find.text('Trazado: 2 vértices'), findsOneWidget);
    await tester.tap(find.text('Terminar'));
    await tester.pump();
    expect(find.text('Trazado: 2 vértices'), findsNothing);
    expect(find.text('Símbolos favoritos'), findsOneWidget);
  });

  testWidgets('no confirma un área con solo dos vértices',
      (tester) async {
    await tester.pumpWidget(const OcartoApp());
    await tester.tap(find.text('Herramientas'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Área'));
    await tester.pump();
    await tester.tapAt(const Offset(300, 310));
    await tester.pump();
    await tester.tapAt(const Offset(435, 410));
    await tester.pump();
    await tester.tap(find.text('Terminar'));
    await tester.pump();
    expect(find.text('Trazado: 2 vértices'), findsOneWidget);
    await tester.tap(find.byTooltip('Cancelar trazado en curso'));
    await tester.pump();
    expect(find.text('Trazado: 2 vértices'), findsNothing);
  });
}
