#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiUdp.h>
#include <Adafruit_NeoPixel.h>
#include "secrets.h"

/* =========================
   HARDWARE CONFIG
========================= */

constexpr uint8_t LED_PIN = 2;       // LED cũ (onboard hoặc LED đơn)
constexpr uint8_t NEOPIXEL_PIN = 13; // Chân DI của vòng LED mới nối vào G13
constexpr uint16_t LED_COUNT = 8;    // Số lượng bóng LED trên vòng
constexpr uint8_t BUZZER_PIN = 4;
constexpr uint8_t RELAY_PIN = 16;

Adafruit_NeoPixel strip(LED_COUNT, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);

constexpr uint16_t HTTP_PORT = 80;

/* =========================
   DEVICE INFO
========================= */

constexpr const char* DEVICE_NAME = "PhoenixVision-ESP32";
constexpr const char* FIRMWARE_VERSION = "2.0.0";

/* =========================
   LOGIC LEVELS
========================= */

constexpr uint8_t LED_ON_LEVEL = HIGH;
constexpr uint8_t LED_OFF_LEVEL = LOW;

constexpr uint8_t BUZZER_ON_LEVEL = LOW;
constexpr uint8_t BUZZER_OFF_LEVEL = HIGH;

// Relay active HIGH
constexpr uint8_t RELAY_ON_LEVEL = HIGH;
constexpr uint8_t RELAY_OFF_LEVEL = LOW;

/* =========================
   SERVER
========================= */

WebServer server(HTTP_PORT);

/* =========================
   STATES
========================= */

bool alarmActive = false;
bool pumpActive = false;

/* =========================
   SIREN PATTERN
========================= */

// 3 nhịp nhanh + nghỉ
const unsigned long sirenPattern[] = {
  80, 80,
  80, 80,
  80, 300
};

const int patternLength = 6;

unsigned long previousMillis = 0;
int patternIndex = 0;
unsigned long lastLedUpdate = 0;
uint16_t animFrame = 0;

/* =========================
   HELPERS
========================= */

void sendJson(int statusCode, const String& payload)
{
  server.send(
    statusCode,
    "application/json; charset=utf-8",
    payload
  );
}

String getStatusJson()
{
  String response = "{";

  response += "\"device\":\"";
  response += DEVICE_NAME;
  response += "\",";

  response += "\"firmware\":\"";
  response += FIRMWARE_VERSION;
  response += "\",";

  response += "\"online\":true,";

  response += "\"alarm\":";
  response += alarmActive ? "true" : "false";
  response += ",";

  response += "\"pump\":";
  response += pumpActive ? "true" : "false";
  response += ",";

  response += "\"ip\":\"";
  response += WiFi.localIP().toString();
  response += "\"";

  response += "}";

  return response;
}

/* =========================
   WIFI
========================= */

void connectWifi()
{
  Serial.printf(
    "[INFO] Connecting WiFi: %s\n",
    WIFI_SSID
  );

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retry = 0;

  while (
    WiFi.status() != WL_CONNECTED &&
    retry < 60
  )
  {
    delay(500);
    Serial.print(".");
    retry++;
  }

  Serial.println();

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println(
      "[ERROR] Cannot connect WiFi"
    );
    return;
  }

  Serial.println("[INFO] WiFi Connected");
  Serial.print("[INFO] IP: ");
  Serial.println(WiFi.localIP());

  Serial.print("[INFO] RSSI: ");
  Serial.println(WiFi.RSSI());

  registerWithBackend();
}


constexpr uint16_t UDP_DISCOVER_PORT = 50000;
constexpr uint16_t UDP_RESPONSE_PORT = 50001;

String discoverBackendIP()
{
  WiFiUDP udp;
  udp.begin(UDP_RESPONSE_PORT);

  for (int attempt = 0; attempt < 3; attempt++)
  {
    Serial.printf("[INFO] Sending UDP discovery broadcast (attempt %d/3)...\n", attempt + 1);
    IPAddress broadcastIP(255, 255, 255, 255);
    udp.beginPacket(broadcastIP, UDP_DISCOVER_PORT);
    udp.write((const uint8_t*)"PHOENIXVISION_DISCOVER", 22);
    udp.endPacket();

    unsigned long startMs = millis();
    while (millis() - startMs < 1000)
    {
      int packetSize = udp.parsePacket();
      if (packetSize > 0)
      {
        char replyBuffer[32];
        int len = udp.read(replyBuffer, sizeof(replyBuffer) - 1);
        if (len > 0)
        {
          replyBuffer[len] = '\0';
          if (strcmp(replyBuffer, "PHOENIXVISION_BACKEND") == 0)
          {
            IPAddress backendIP = udp.remoteIP();
            Serial.printf("[INFO] Discovered backend IP: %s\n", backendIP.toString().c_str());
            udp.stop();
            return backendIP.toString();
          }
        }
      }
      delay(10);
    }
  }

  udp.stop();
  return "";
}

void registerWithBackend()
{
  String backendIP = discoverBackendIP();
  String registerUrl = "";

  if (backendIP.length() > 0)
  {
    registerUrl = "http://" + backendIP + ":8000/api/v1/iot/register";
  }
  else if (strlen(BACKEND_REGISTER_URL) > 0)
  {
    registerUrl = BACKEND_REGISTER_URL;
    Serial.println("[WARN] UDP discovery failed, falling back to hardcoded BACKEND_REGISTER_URL");
  }
  else
  {
    Serial.println("[WARN] No backend discovered and BACKEND_REGISTER_URL is empty");
    return;
  }

  Serial.printf(
    "[INFO] Registering IP with backend: %s\n",
    registerUrl.c_str()
  );

  HTTPClient http;
  http.begin(registerUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{\"ip\":\"" + WiFi.localIP().toString() + "\"}";
  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0)
  {
    String response = http.getString();
    Serial.printf(
      "[INFO] Backend response: %d - %s\n",
      httpResponseCode,
      response.c_str()
    );
  }
  else
  {
    Serial.printf(
      "[ERROR] Failed to register IP: %s\n",
      http.errorToString(httpResponseCode).c_str()
    );
  }
  http.end();
}

void maintainWifi()
{
  static bool wasConnected = (WiFi.status() == WL_CONNECTED);
  bool isConnected = (WiFi.status() == WL_CONNECTED);

  if (isConnected && !wasConnected)
  {
    Serial.println("[INFO] WiFi Reconnected");
    Serial.print("[INFO] IP: ");
    Serial.println(WiFi.localIP());
    wasConnected = true;

    registerWithBackend();
  }
  else if (!isConnected && wasConnected)
  {
    Serial.println("[WARN] WiFi connection lost");
    wasConnected = false;
  }
}

/* =========================
   PUMP
========================= */

void startPump()
{
  digitalWrite(
    RELAY_PIN,
    RELAY_ON_LEVEL
  );

  pumpActive = true;

  Serial.println(
    "[INFO] Pump ON"
  );
}

void stopPump()
{
  digitalWrite(
    RELAY_PIN,
    RELAY_OFF_LEVEL
  );

  pumpActive = false;

  Serial.println(
    "[INFO] Pump OFF"
  );
}

/* =========================
   ALARM
========================= */

void setRingColor(uint8_t r, uint8_t g, uint8_t b)
{
  for (uint16_t i = 0; i < strip.numPixels(); i++)
  {
    strip.setPixelColor(i, strip.Color(r, g, b));
  }
  strip.show();
}

// Hiệu ứng 1: Còi cứu hỏa đỏ xanh (Xoay tròn đỏ xanh dương + Chớp tắt trắng đỏ nhịp cuối)
void updateAlarmAnimation()
{
  unsigned long now = millis();
  if (now - lastLedUpdate < 45) return; // Quay mỗi 45ms mượt mà
  lastLedUpdate = now;

  uint16_t numLeds = strip.numPixels();
  animFrame = (animFrame + 1) % 12; // Chu kỳ 12 bước

  if (animFrame >= 8) // Bước nhịp cuối (bước 8 -> 11): Chớp trắng & đỏ cường độ cao (Strobe Flash)
  {
    if (animFrame % 2 == 0)
    {
      // Tất cả sáng trắng chói lòa
      for (uint16_t i = 0; i < numLeds; i++) {
        strip.setPixelColor(i, strip.Color(255, 255, 255));
      }
    }
    else
    {
      // Tất cả sáng đỏ rực
      for (uint16_t i = 0; i < numLeds; i++) {
        strip.setPixelColor(i, strip.Color(255, 0, 0));
      }
    }
  }
  else // Bước 0 -> 7: Đỏ và Xanh dương xoay tròn đối xứng nhau
  {
    uint16_t head = animFrame % numLeds;
    for (uint16_t i = 0; i < numLeds; i++)
    {
      // Tính vị trí tương đối so với head đỏ và đối diện xanh dương
      int diffRed = (i - head + numLeds) % numLeds;
      int diffBlue = (i - (head + numLeds / 2) + numLeds) % numLeds;

      if (diffRed == 0 || diffRed == 1)
      {
        strip.setPixelColor(i, strip.Color(255, 0, 0));    // Một nửa màu Đỏ
      }
      else if (diffBlue == 0 || diffBlue == 1)
      {
        strip.setPixelColor(i, strip.Color(0, 0, 255));    // Một nửa màu Xanh Dương
      }
      else
      {
        strip.setPixelColor(i, strip.Color(0, 0, 0));      // Bóng còn lại tắt
      }
    }
  }
  strip.show();
}

// Hiệu ứng 2: Tắt hết bóng, thỉnh thoảng chớp đỏ bóng số 0 báo hoạt động (Smoke Detector Blink)
void updateSafeAnimation()
{
  unsigned long now = millis();
  if (now - lastLedUpdate < 40) return; // Kiểm tra mỗi 40ms
  lastLedUpdate = now;

  unsigned long m = now % 4000; // Chu kỳ 4 giây

  if (m < 80) // Chỉ chớp đỏ trong 80ms đầu tiên của chu kỳ 4s
  {
    // Chớp LED đỏ ở pixel số 0
    strip.setPixelColor(0, strip.Color(180, 0, 0)); 
    for (uint16_t i = 1; i < strip.numPixels(); i++)
    {
      strip.setPixelColor(i, strip.Color(0, 0, 0));
    }
  }
  else
  {
    // Tắt hoàn toàn
    for (uint16_t i = 0; i < strip.numPixels(); i++)
    {
      strip.setPixelColor(i, strip.Color(0, 0, 0));
    }
  }
  strip.show();
}

void startAlarm()
{
  if (alarmActive)
    return;

  alarmActive = true;

  patternIndex = 0;
  previousMillis = millis();
  animFrame = 0;
  lastLedUpdate = 0;

  digitalWrite(
    LED_PIN,
    LED_ON_LEVEL
  );

  digitalWrite(
    BUZZER_PIN,
    BUZZER_ON_LEVEL
  );

  Serial.println(
    "[INFO] Alarm ON"
  );
}

void stopAlarm()
{
  alarmActive = false;

  digitalWrite(
    LED_PIN,
    LED_OFF_LEVEL
  );

  stopPump();

  patternIndex = 0;
  animFrame = 0;
  lastLedUpdate = 0;

  digitalWrite(
    BUZZER_PIN,
    BUZZER_OFF_LEVEL
  );

  Serial.println(
    "[INFO] Alarm OFF"
  );
}

/* =========================
   HTTP ROUTES
========================= */

void setupRoutes()
{
  server.on("/", HTTP_GET, []()
  {
    sendJson(
      200,
      "{\"message\":\"PhoenixVision ESP32 Online\"}"
    );
  });

  server.on("/status", HTTP_GET, []()
  {
    sendJson(
      200,
      getStatusJson()
    );
  });

  server.on("/alarm", HTTP_GET, []()
  {
    startAlarm();

    sendJson(
      200,
      "{\"success\":true}"
    );
  });

  server.on("/stop", HTTP_GET, []()
  {
    stopAlarm();

    sendJson(
      200,
      "{\"success\":true}"
    );
  });

  server.on("/pump/on", HTTP_GET, []()
  {
    startPump();

    sendJson(
      200,
      "{\"pump\":true}"
    );
  });

  server.on("/pump/off", HTTP_GET, []()
  {
    stopPump();

    sendJson(
      200,
      "{\"pump\":false}"
    );
  });

  server.onNotFound([]()
  {
    sendJson(
      404,
      "{\"error\":\"Route not found\"}"
    );
  });
}

/* =========================
   SETUP
========================= */

void setup()
{
  Serial.begin(115200);

  delay(500);

  pinMode(
    LED_PIN,
    OUTPUT
  );

  strip.begin();
  setRingColor(0, 100, 0); // Trạng thái bình thường/an toàn (màu xanh lá)

  pinMode(
    BUZZER_PIN,
    OUTPUT
  );

  pinMode(
    RELAY_PIN,
    OUTPUT
  );

  // Safe state
  digitalWrite(
    LED_PIN,
    LED_OFF_LEVEL
  );

  digitalWrite(
    BUZZER_PIN,
    BUZZER_OFF_LEVEL
  );

  digitalWrite(
    RELAY_PIN,
    RELAY_OFF_LEVEL
  );

  connectWifi();

  setupRoutes();

  server.begin();

  Serial.println(
    "[INFO] HTTP Server Started"
  );
}

/* =========================
   LOOP
========================= */

void loop()
{
  server.handleClient();

  maintainWifi();

  if (alarmActive)
  {
    updateAlarmAnimation();

    unsigned long currentMillis = millis();

    if (
      currentMillis - previousMillis >=
      sirenPattern[patternIndex]
    )
    {
      previousMillis = currentMillis;

      patternIndex =
        (patternIndex + 1)
        % patternLength;

      if (patternIndex % 2 == 0)
      {
        digitalWrite(
          LED_PIN,
          LED_ON_LEVEL
        );

        digitalWrite(
          BUZZER_PIN,
          BUZZER_ON_LEVEL
        );
      }
      else
      {
        digitalWrite(
          LED_PIN,
          LED_OFF_LEVEL
        );

        digitalWrite(
          BUZZER_PIN,
          BUZZER_OFF_LEVEL
        );
      }
    }
  }
  else
  {
    updateSafeAnimation();
  }

  delay(2);
}