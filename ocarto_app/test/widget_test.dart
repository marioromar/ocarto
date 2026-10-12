import 'package:flutter_test/flutter_test.dart';
import 'package:ocarto_app/main.dart';

void main() {
  testWidgets('muestra el editor de Ocarto', (tester) async {
    await tester.pumpWidget(const OcartoApp());
    expect(find.text('Ocarto'), findsOneWidget);
    expect(find.text('Plantilla georreferenciada'), findsOneWidget);
    expect(find.text('Mapa editable'), findsOneWidget);
  });
}
