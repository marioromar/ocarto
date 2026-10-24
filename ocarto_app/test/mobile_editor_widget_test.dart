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
    expect(find.text('Móvil v290'), findsOneWidget);
    expect(find.byKey(const ValueKey('drawing-0')), findsOneWidget);
    expect(find.byKey(const ValueKey('mobile-tool-select')), findsOneWidget);
    expect(find.byKey(const ValueKey('mobile-tool-point')), findsOneWidget);
    expect(find.byKey(const ValueKey('mobile-tool-line')), findsOneWidget);
    expect(find.byKey(const ValueKey('mobile-tool-area')), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byKey(const ValueKey('mobile-tool-point')));
    await tester.pump();
    await tester.tapAt(const Offset(180, 180));
    await tester.pump();
    CustomPainter currentPainter() => tester.widget<CustomPaint>(
      find.byKey(const ValueKey('drawing-0'))).painter!;
    expect((currentPainter() as MapPainter).elements, hasLength(1));
    expect((currentPainter() as MapPainter).elements.single.tool, MapTool.point);

    await tester.tap(find.byKey(const ValueKey('mobile-tool-line')));
    await tester.pump();
    await tester.tapAt(const Offset(160, 280));
    await tester.tapAt(const Offset(220, 310));
    await tester.tapAt(const Offset(280, 340));
    await tester.pump();
    expect(find.byKey(const ValueKey('mobile-finish-drawing')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('mobile-finish-drawing')));
    await tester.pump();
    expect((currentPainter() as MapPainter).elements, hasLength(2));
    expect((currentPainter() as MapPainter).elements.last.tool, MapTool.line);

    await tester.tap(find.byKey(const ValueKey('mobile-tool-area')));
    await tester.pump();
    await tester.tapAt(const Offset(150, 420));
    await tester.tapAt(const Offset(220, 400));
    await tester.tapAt(const Offset(270, 450));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('mobile-finish-drawing')));
    await tester.pump();
    expect((currentPainter() as MapPainter).elements, hasLength(3));
    expect((currentPainter() as MapPainter).elements.last.tool, MapTool.area);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byKey(const ValueKey('mobile-symbols-toggle')));
    await tester.pumpAndSettle();
    expect(find.text('Símbolos favoritos'), findsOneWidget);
    expect(find.text('Piedra'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.byKey(const ValueKey('mobile-symbols-close')));
    await tester.pumpAndSettle();
    expect(find.text('Símbolos favoritos'), findsNothing);

    await tester.tap(find.byIcon(Icons.layers));
    await tester.pumpAndSettle();
    expect(find.text('Plantilla georreferenciada'), findsOneWidget);
    expect(find.text('Proyecto y sincronización'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
