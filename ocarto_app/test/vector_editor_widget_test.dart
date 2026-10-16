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
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('drawing-1')), findsOneWidget);
    await tester.tapAt(const Offset(430, 380));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('drawing-2')), findsOneWidget);
    await tester.tap(find.text('Terminar'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('drawing-0')), findsOneWidget);
    expect(find.text('Símbolos favoritos'), findsOneWidget);
  });

  testWidgets('no confirma un área con solo dos vértices',
      (tester) async {
    await tester.pumpWidget(const OcartoApp());
    await tester.tap(find.text('Herramientas'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Área'));
    await tester.pump();
    expect(find.byKey(const ValueKey('drawing-0')), findsOneWidget);
    await tester.tapAt(const Offset(310, 320));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('drawing-1')), findsOneWidget);
    await tester.tapAt(const Offset(430, 380));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('drawing-2')), findsOneWidget);
    await tester.tap(find.text('Terminar'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('drawing-2')), findsOneWidget);
    await tester.tap(find.byTooltip('Cancelar trazado en curso'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('drawing-0')), findsOneWidget);
  });
  testWidgets('selecciona vértice y permite activar, romper y restaurar Bézier',
      (tester) async {
    await tester.pumpWidget(const OcartoApp());
    await tester.tap(find.text('Herramientas'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Línea'));
    await tester.pump();
    await tester.tapAt(const Offset(310, 320));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tapAt(const Offset(430, 380));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Terminar'));
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.text('Seleccionar / editar vértices'));
    await tester.pump();
    await tester.tapAt(const Offset(310, 320));
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.byKey(const ValueKey('enable-bezier-handles')), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('enable-bezier-handles')));
    await tester.tap(find.byKey(const ValueKey('enable-bezier-handles')));
    await tester.pump();
    expect(find.byKey(const ValueKey('bezier-corner')), findsOneWidget);
    await Scrollable.ensureVisible(
      tester.element(find.byKey(const ValueKey('bezier-mode-free'))),
      alignment: 0.5, duration: const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('bezier-mode-free')));
    await tester.pump();
    expect(tester.widget<ChoiceChip>(
        find.byKey(const ValueKey('bezier-mode-free'))).selected, isTrue);
    await Scrollable.ensureVisible(
      tester.element(find.byKey(const ValueKey('bezier-mode-aligned'))),
      alignment: 0.5, duration: const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('bezier-mode-aligned')));
    await tester.pump();
    expect(tester.widget<ChoiceChip>(
        find.byKey(const ValueKey('bezier-mode-aligned'))).selected, isTrue);
    await tester.ensureVisible(find.byKey(const ValueKey('bezier-corner')));
    await tester.tap(find.byKey(const ValueKey('bezier-corner')));
    await tester.pump();
    await tester.ensureVisible(find.byKey(const ValueKey('bezier-auto')));
    await tester.tap(find.byKey(const ValueKey('bezier-auto')));
    await tester.pump();
    expect(find.byKey(const ValueKey('enable-bezier-handles')), findsOneWidget);
  });

}
