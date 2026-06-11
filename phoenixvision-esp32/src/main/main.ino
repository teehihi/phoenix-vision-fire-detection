#include <WiFi.h>
#include <WebServer.h>
#include "secrets.h"

constexpr uint8_t LED_PIN = 2;
constexpr uint8_t BUZZER_PIN = 4;
constexpr uint16_t HTTP_PORT = 80;

WebServer server(HTTP_PORT);

bool alarmActive = false;

// Biến cho hiệu ứng nháy còi/đèn (non-blocking)
unsigned long previousMillis = 0;
bool sirenState = false;
const long sirenInterval = 300; // Thời gian mỗi nhịp kêu/sáng (ms) - đổi số này để chớp nhanh/chậm

// Buzzer của ông chạy ổn với:
// VCC -> 3V3
// GND -> GND
// I/O -> G4
constexpr uint8_t LED_ON_LEVEL = HIGH;
constexpr uint8_t LED_OFF_LEVEL = LOW;

constexpr uint8_t BUZZER_ON_LEVEL = LOW;
constexpr uint8_t BUZZER_OFF_LEVEL = HIGH;

void sendJson(int statusCode, const String& payload) {
  server.send(statusCode, "application/json; charset=utf-8", payload);
}

void connectWifi() {
  Serial.printf("[INFO] Dang ket noi WiFi: %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 60) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] Khong ket noi duoc WiFi");
    return;
  }

  Serial.println("[INFO] Da ket noi WiFi");
  Serial.print("[INFO] SSID: ");
  Serial.println(WiFi.SSID());
  Serial.print("[INFO] IP ESP32: ");
  Serial.println(WiFi.localIP());
  Serial.print("[INFO] Gateway: ");
  Serial.println(WiFi.gatewayIP());
}

void startAlarm() {
  alarmActive = true;
  // Trạng thái đèn/còi sẽ được cập nhật liên tục trong loop()
  Serial.println("[INFO] Alarm ON");
}

void stopAlarm() {
  alarmActive = false;
  sirenState = false; // Reset trạng thái
  digitalWrite(LED_PIN, LED_OFF_LEVEL);
  digitalWrite(BUZZER_PIN, BUZZER_OFF_LEVEL);
  Serial.println("[INFO] Alarm OFF");
}

void setupRoutes() {
  server.on("/", HTTP_GET, []() {
    sendJson(200, "{\"message\":\"PhoenixVision ESP32 is running\"}");
  });

  server.on("/status", HTTP_GET, []() {
    String response = "{";
    response += "\"device\":\"PhoenixVision-ESP32\",";
    response += "\"online\":true,";
    response += "\"alarm\":";
    response += alarmActive ? "true" : "false";
    response += "}";
    sendJson(200, response);
  });

  server.on("/alarm", HTTP_GET, []() {
    startAlarm();
    sendJson(200, "{\"success\":true,\"alarm\":true}");
  });

  server.on("/stop", HTTP_GET, []() {
    stopAlarm();
    sendJson(200, "{\"success\":true,\"alarm\":false}");
  });

  server.onNotFound([]() {
    sendJson(404, "{\"success\":false,\"error\":\"Route not found\"}");
  });
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  stopAlarm();

  connectWifi();
  setupRoutes();
  server.begin();

  Serial.println("[INFO] HTTP Server started on port 80");
}

void loop() {
  server.handleClient();

  // Hiệu ứng nháy còi báo động mà không dùng delay()
  if (alarmActive) {
    unsigned long currentMillis = millis();
    if (currentMillis - previousMillis >= sirenInterval) {
      previousMillis = currentMillis;
      sirenState = !sirenState; // Đảo trạng thái

      if (sirenState) {
        digitalWrite(LED_PIN, LED_ON_LEVEL);
        digitalWrite(BUZZER_PIN, BUZZER_ON_LEVEL);
      } else {
        digitalWrite(LED_PIN, LED_OFF_LEVEL);
        digitalWrite(BUZZER_PIN, BUZZER_OFF_LEVEL);
      }
    }
  }

  delay(2);
}