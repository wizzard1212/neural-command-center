// Windows-Benachrichtigung über die Browser-Notification-API (Abschnitt 5,
// Schritt 5). Der ntfy.sh-Push ans Handy läuft serverseitig unabhängig davon.
export function requestNotificationPermission() {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  void Notification.requestPermission();
}

export function notify(title: string, body?: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    // z. B. in Browsern ohne Benachrichtigungs-Unterstützung – kein kritischer Pfad.
  }
}
