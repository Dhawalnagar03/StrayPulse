import 'package:intl/intl.dart';

const _istOffset = Duration(hours: 5, minutes: 30);

DateTime parseIstDisplayDate(dynamic value) {
  if (value == null) {
    return DateTime.now().toUtc();
  }

  final raw = value.toString().trim();
  if (raw.isEmpty) {
    return DateTime.now().toUtc();
  }

  final normalized = raw.endsWith('Z') || raw.contains('+') ? raw : '$rawZ';
  final utcDate = DateTime.parse(normalized).toUtc();
  return utcDate.add(_istOffset);
}

String formatDateTimeIst(dynamic value) {
  final dt = parseIstDisplayDate(value);
  return DateFormat('MMM d, h:mm a', 'en_IN').format(dt);
}

String formatDateOnlyIst(dynamic value) {
  final dt = parseIstDisplayDate(value);
  return DateFormat('MMM d, yyyy', 'en_IN').format(dt);
}

String formatTimeOnlyIst(dynamic value) {
  final dt = parseIstDisplayDate(value);
  return DateFormat('h:mm a', 'en_IN').format(dt);
}

String getGreetingByIst() {
  final now = DateTime.now().toUtc().add(_istOffset);
  final hour = now.hour;
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
