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
   SIREN CONFIG & PATTERNS
========================= */

// Cấu hình loại còi bạn đang sử dụng:
// - true: Còi thụ động (Passive Buzzer) -> Tạo tiếng còi hú quét tần số kịch tính ("ú...ooo...ù")
// - false: Còi chủ động (Active Buzzer) -> Nháy tít tít theo nhịp nâng cấp dồn dập
constexpr bool USE_PASSIVE_BUZZER = false; 

// Kiểu âm thanh / nhịp điệu báo động (Chọn từ 1 đến 4):
// * Đối với Còi thụ động (Passive Buzzer - true):
//   1: Còi hú cứu hỏa truyền thống (Wail) - Quét chậm từ 1200Hz đến 2700Hz (Cực kỳ kịch tính!)
//   2: Còi hú cảnh sát nhanh (Yelp) - Quét cực nhanh từ 1500Hz đến 3000Hz (Chói tai)
//   3: Còi báo động hai âm sắc (Hi-Lo) - Kêu kiểu "tít...te...tít...te" ở tần số cao
//   4: Còi cảnh báo cháy chuẩn ISO (Temporal 3) - 3 tiếng bíp chói tai ở tần số 2700Hz
// * Đối với Còi chủ động (Active Buzzer - false):
//   1: Nhịp kịch tính kết hợp (3 tít nhanh + 1 kêu dài)
//   2: Nhịp còi dồn dập cực nhanh (Machine Gun - 60ms kêu, 60ms nghỉ) - Nghe cực kỳ hối hả!
//   3: Nhịp còi hú nhanh truyền thống (150ms kêu, 150ms nghỉ)
//   4: Nhịp Temporal 3 chuẩn ISO báo cháy (500ms kêu, 500ms nghỉ x 3 lần, nghỉ dài 1.5s)
constexpr int SIREN_STYLE = 1;

// Nhịp còi cho Còi chủ động (Active Buzzer):
const unsigned long patternStyle1[] = { 80, 80, 80, 80, 80, 80, 400, 200 };
const int lengthStyle1 = 8;

const unsigned long patternStyle2[] = { 60, 60 };
const int lengthStyle2 = 2;

const unsigned long patternStyle3[] = { 150, 150 };
const int lengthStyle3 = 2;

const unsigned long patternStyle4[] = { 500, 500, 500, 500, 500, 1500 };
const int lengthStyle4 = 6;

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

// Hiệu ứng 2: Tắt hết bóng, thỉnh thoảng chớp đỏ xen kẽ 1/2 số bóng báo hoạt động (Smoke Detector Blink)
void updateSafeAnimation()
{
  unsigned long now = millis();
  if (now - lastLedUpdate < 40) return; // Kiểm tra mỗi 40ms
  lastLedUpdate = now;

  unsigned long m = now % 4000; // Chu kỳ 4 giây

  if (m < 80) // Chỉ chớp đỏ trong 80ms đầu tiên của chu kỳ 4s
  {
    // Chớp đỏ xen kẽ 1/2 số bóng (chỉ sáng bóng chẵn: 0, 2, 4, 6)
    for (uint16_t i = 0; i < strip.numPixels(); i++)
    {
      if (i % 2 == 0)
      {
        strip.setPixelColor(i, strip.Color(180, 0, 0)); // Màu đỏ vừa phải
      }
      else
      {
        strip.setPixelColor(i, strip.Color(0, 0, 0));
      }
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

  if (USE_PASSIVE_BUZZER)
  {
    noTone(BUZZER_PIN);
    pinMode(BUZZER_PIN, OUTPUT); // Khôi phục OUTPUT vì noTone chuyển pin thành INPUT làm chân bị trôi (floating)
  }
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

    if (USE_PASSIVE_BUZZER)
    {
      int freq = 1000;
      
      if (SIREN_STYLE == 1) // Wail (Còi hú cứu hỏa quét chậm - Cực kỳ kịch tính)
      {
        unsigned long cycle = currentMillis % 1500; // Chu kỳ quét 1.5s
        if (cycle < 750) {
          freq = 1200 + (cycle * 1500 / 750); // 1200Hz -> 2700Hz
        } else {
          freq = 2700 - ((cycle - 750) * 1500 / 750); // 2700Hz -> 1200Hz
        }
        tone(BUZZER_PIN, freq);
      }
      else if (SIREN_STYLE == 2) // Yelp (Còi hú cảnh sát quét cực nhanh)
      {
        unsigned long cycle = currentMillis % 300; // Chu kỳ quét 300ms
        if (cycle < 150) {
          freq = 1500 + (cycle * 1300 / 150); // 1500Hz -> 2800Hz
        } else {
          freq = 2800 - ((cycle - 150) * 1300 / 150);
        }
        tone(BUZZER_PIN, freq);
      }
      else if (SIREN_STYLE == 3) // Hi-Lo (Còi cứu thương Châu Âu)
      {
        unsigned long cycle = currentMillis % 800; // Chu kỳ 800ms
        if (cycle < 400) {
          freq = 2000; // 2000Hz (nốt Cao)
        } else {
          freq = 2600; // 2600Hz (nốt Rất Cao)
        }
        tone(BUZZER_PIN, freq);
      }
      else if (SIREN_STYLE == 4) // Temporal 3 (Báo cháy tiêu chuẩn ISO - tần số réo rắt 2700Hz)
      {
        unsigned long cycle = currentMillis % 4000; // Chu kỳ 4 giây
        // Nhịp Temporal 3: Bíp 0.5s, Tắt 0.5s, Bíp 0.5s, Tắt 0.5s, Bíp 0.5s, Tắt 1.5s
        if (cycle < 500) {
          tone(BUZZER_PIN, 2700);
        } else if (cycle < 1000) {
          noTone(BUZZER_PIN);
          pinMode(BUZZER_PIN, OUTPUT);
          digitalWrite(BUZZER_PIN, BUZZER_OFF_LEVEL);
        } else if (cycle < 1500) {
          tone(BUZZER_PIN, 2700);
        } else if (cycle < 2000) {
          noTone(BUZZER_PIN);
          pinMode(BUZZER_PIN, OUTPUT);
          digitalWrite(BUZZER_PIN, BUZZER_OFF_LEVEL);
        } else if (cycle < 2500) {
          tone(BUZZER_PIN, 2700);
        } else {
          noTone(BUZZER_PIN);
          pinMode(BUZZER_PIN, OUTPUT);
          digitalWrite(BUZZER_PIN, BUZZER_OFF_LEVEL);
        }
      }

      // Nhịp nhấp nháy của đèn LED phụ (LED_PIN) vẫn chạy đồng bộ
      if (currentMillis - previousMillis >= patternStyle1[patternIndex % lengthStyle1])
      {
        previousMillis = currentMillis;
        patternIndex = (patternIndex + 1) % lengthStyle1;
        digitalWrite(LED_PIN, (patternIndex % 2 == 0) ? LED_ON_LEVEL : LED_OFF_LEVEL);
      }
    }
    else
    {
      // Chọn nhịp điệu theo SIREN_STYLE cho Còi chủ động (Active Buzzer)
      const unsigned long* activePattern = patternStyle1;
      int activeLength = lengthStyle1;

      if (SIREN_STYLE == 2) {
        activePattern = patternStyle2;
        activeLength = lengthStyle2;
      } else if (SIREN_STYLE == 3) {
        activePattern = patternStyle3;
        activeLength = lengthStyle3;
      } else if (SIREN_STYLE == 4) {
        activePattern = patternStyle4;
        activeLength = lengthStyle4;
      }

      if (currentMillis - previousMillis >= activePattern[patternIndex % activeLength])
      {
        previousMillis = currentMillis;
        patternIndex = (patternIndex + 1) % activeLength;

        bool isOn = (patternIndex % 2 == 0);
        digitalWrite(LED_PIN, isOn ? LED_ON_LEVEL : LED_OFF_LEVEL);
        digitalWrite(BUZZER_PIN, isOn ? BUZZER_ON_LEVEL : BUZZER_OFF_LEVEL);
      }
    }
  }
  else
  {
    updateSafeAnimation();
  }

  delay(2);
}