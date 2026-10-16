import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:ocarto_app/main.dart';

void main() {
  testWidgets('muestra el editor de Ocarto', (tester) async {
    await tester.pumpWidget(const OcartoApp());
    expect(find.text('Ocarto'), findsOneWidget);
    expect(find.text('Plantilla georreferenciada'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Mapa editable'), 250,
      scrollable: find.byType(Scrollable).first,
      maxScrolls: 20,
    );
    expect(find.text('Mapa editable'), findsOneWidget);
  });
}
