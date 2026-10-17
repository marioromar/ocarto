import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_libserialport/flutter_libserialport.dart';

import 'nmea_parser.dart';

/// En Windows, los receptores GPS Bluetooth clásicos (SPP) aparecen como COM.
/// No implica compatibilidad con dispositivos exclusivamente Bluetooth LE.
class GpsSerialService {
  final _fixes = StreamController<GpsFix>.broadcast();
  final _errors = StreamController<String>.broadcast();
  NmeaParser _parser = NmeaParser();
  SerialPort? _port;
  SerialPortReader? _reader;
  StreamSubscription<Uint8List>? _reading;
  bool _closing = false;

  Stream<GpsFix> get fixes => _fixes.stream;
  Stream<String> get errors => _errors.stream;
  bool get connected => _port?.isOpen == true;

  List<String> availablePorts() {
    if (!Platform.isWindows) return [];
    return SerialPort.availablePorts.toList()..sort((a, b) => a.compareTo(b));
  }

  Future<void> connect(String portName, {int baudRate = 4800}) async {
    if (!Platform.isWindows) {
      throw UnsupportedError('La conexión GPS COM está disponible en Windows.');
    }
    await disconnect();
    _parser = NmeaParser();
    if (portName.trim().isEmpty) throw ArgumentError('Selecciona un puerto COM');
    final port = SerialPort(portName);
    try {
      if (!port.openRead()) {
        throw StateError('No se puede abrir $portName: ${SerialPort.lastError}');
      }
      final config = SerialPortConfig()
        ..baudRate = baudRate
        ..bits = 8
        ..parity = SerialPortParity.none
        ..stopBits = 1;
      config.setFlowControl(SerialPortFlowControl.none);
      try {
        port.config = config;
      } finally {
        config.dispose();
      }
      _port = port;
      _closing = false;
      final reader = SerialPortReader(port);
      _reader = reader;
      _reading = reader.stream.listen((chunk) {
        for (final fix in _parser.addBytes(chunk)) {
          if (!_fixes.isClosed) _fixes.add(fix);
        }
      }, onError: (Object error) {
        if (!_closing && !_errors.isClosed) _errors.add('GPS: $error');
      }, onDone: () {
        if (!_closing && !_errors.isClosed) _errors.add('Se ha perdido la conexión GPS');
      });
    } catch (_) {
      if (identical(_port, port)) _port = null;
      if (port.isOpen) port.close();
      port.dispose();
      rethrow;
    }
  }

  Future<void> disconnect() async {
    _closing = true;
    final reading = _reading;
    final reader = _reader;
    final port = _port;
    _reading = null;
    _reader = null;
    _port = null;
    if (reading != null) await reading.cancel();
    reader?.close();
    if (port != null) {
      if (port.isOpen) port.close();
      port.dispose();
    }
  }

  Future<void> dispose() async {
    await disconnect();
    await _fixes.close();
    await _errors.close();
  }
}