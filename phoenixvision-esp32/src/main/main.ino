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
constexpr uint8_t LED_G12_PIN = 12;  // LED G12 mới
constexpr uint8_t LED_G14_PIN = 14;  // LED G14 mới
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
String alarmLevel = "medium";

// Nhịp còi cho Còi chủ động (Active Buzzer) theo cấp độ:
const unsigned long patternMedium[] = { 300, 700 };
const int lengthMedium = 2;

const unsigned long patternHigh[] = { 150, 150, 150, 550 };
const int lengthHigh = 4;

const unsigned long patternCritical[] = { 80, 80, 80, 80, 80, 80, 400, 200 };
const int lengthCritical = 8;

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
unsigned long lastMediumLedMs = 0;
int mediumLedStep = 0;

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

  response += "\"alarm_level\":\"";
  response += alarmLevel;
  response += "\",";

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

// Hiệu ứng còi báo động theo cấp độ
void updateAlarmAnimation()
{
  unsigned long now = millis();
  
  if (alarmLevel == "medium")
  {
    // Hiệu ứng thở (breathing) màu Cam
    if (now - lastLedUpdate < 15) return;
    lastLedUpdate = now;
    
    // Nhịp chu kỳ thở dài tầm 2.5 giây (2500ms)
    float pulse = (sin(now / 400.0) + 1.0) / 2.0; // Giá trị từ 0.0 đến 1.0
    uint8_t r = (uint8_t)(pulse * 255.0);
    uint8_t g = (uint8_t)(pulse * 100.0); // Màu cam rực
    uint8_t b = 0;
    
    for (uint16_t i = 0; i < strip.numPixels(); i++)
    {
      strip.setPixelColor(i, strip.Color(r, g, b));
    }
    strip.show();
  }
  else if (alarmLevel == "high")
  {
    // Đuổi màu Vàng và Đỏ
    if (now - lastLedUpdate < 100) return; // Quay mỗi 100ms
    lastLedUpdate = now;
    
    uint16_t numLeds = strip.numPixels();
    animFrame = (animFrame + 1) % numLeds;
    
    for (uint16_t i = 0; i < numLeds; i++)
    {
      // Xen kẽ các bóng LED Vàng (255, 200, 0) và Đỏ (255, 0, 0) đuổi nhau
      if ((i + animFrame) % 2 == 0) {
        strip.setPixelColor(i, strip.Color(255, 200, 0)); // Vàng
      } else {
        strip.setPixelColor(i, strip.Color(255, 0, 0));   // Đỏ
      }
    }
    strip.show();
  }
  else // critical
  {
    // Còi cứu hỏa đỏ xanh (Xoay tròn đỏ xanh dương + Chớp tắt trắng đỏ nhịp cuối)
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

void updateMediumLEDs(unsigned long currentMillis)
{
  const unsigned long stepDurations[] = {
    60, 60, 60, 120, // LED 1 (G2): ON 60ms, OFF 60ms, ON 60ms, OFF 120ms
    60, 60, 60, 120, // LED 2 (G12): ON 60ms, OFF 60ms, ON 60ms, OFF 120ms
    60, 60, 60, 300  // LED 3 (G14): ON 60ms, OFF 60ms, ON 60ms, OFF 300ms
  };
  constexpr int totalSteps = sizeof(stepDurations) / sizeof(stepDurations[0]);

  if (currentMillis - lastMediumLedMs >= stepDurations[mediumLedStep])
  {
    lastMediumLedMs = currentMillis;
    mediumLedStep = (mediumLedStep + 1) % totalSteps;

    // Reset all LEDs to OFF
    digitalWrite(LED_PIN, LED_OFF_LEVEL);
    digitalWrite(LED_G12_PIN, LED_OFF_LEVEL);
    digitalWrite(LED_G14_PIN, LED_OFF_LEVEL);

    bool soundOn = false;

    // Turn ON the correct LED based on current step
    if (mediumLedStep == 0 || mediumLedStep == 2)
    {
      digitalWrite(LED_PIN, LED_ON_LEVEL);
      soundOn = true;
    }
    else if (mediumLedStep == 4 || mediumLedStep == 6)
    {
      digitalWrite(LED_G12_PIN, LED_ON_LEVEL);
      soundOn = true;
    }
    else if (mediumLedStep == 8 || mediumLedStep == 10)
    {
      digitalWrite(LED_G14_PIN, LED_ON_LEVEL);
      soundOn = true;
    }

    if (soundOn)
    {
      if (USE_PASSIVE_BUZZER)
      {
        tone(BUZZER_PIN, 1200);
      }
      else
      {
        digitalWrite(BUZZER_PIN, BUZZER_ON_LEVEL);
      }
    }
    else
    {
      if (USE_PASSIVE_BUZZER)
      {
        noTone(BUZZER_PIN);
        pinMode(BUZZER_PIN, OUTPUT);
      }
      digitalWrite(BUZZER_PIN, BUZZER_OFF_LEVEL);
    }
  }
}

void startAlarm(String level = "medium")
{
  level.toLowerCase();
  if (level == "medium" || level == "high" || level == "critical") {
    alarmLevel = level;
  } else {
    alarmLevel = "medium";
  }

  if (alarmActive)
    return;

  alarmActive = true;

  patternIndex = 0;
  previousMillis = millis();
  animFrame = 0;
  lastLedUpdate = 0;

  if (alarmLevel == "medium")
  {
    digitalWrite(LED_PIN, LED_ON_LEVEL);
    digitalWrite(LED_G12_PIN, LED_OFF_LEVEL);
    digitalWrite(LED_G14_PIN, LED_OFF_LEVEL);
    mediumLedStep = 0;
    lastMediumLedMs = millis();
    if (USE_PASSIVE_BUZZER)
    {
      tone(BUZZER_PIN, 1200);
    }
    else
    {
      digitalWrite(BUZZER_PIN, BUZZER_ON_LEVEL);
    }
  }
  else
  {
    digitalWrite(LED_PIN, LED_ON_LEVEL);
    digitalWrite(LED_G12_PIN, LED_ON_LEVEL);
    digitalWrite(LED_G14_PIN, LED_ON_LEVEL);
    digitalWrite(
      BUZZER_PIN,
      BUZZER_ON_LEVEL
    );
  }

  Serial.println(
    "[INFO] Alarm ON (Level: " + alarmLevel + ")"
  );
}

void stopAlarm()
{
  alarmActive = false;

  digitalWrite(
    LED_PIN,
    LED_OFF_LEVEL
  );
  digitalWrite(LED_G12_PIN, LED_OFF_LEVEL);
  digitalWrite(LED_G14_PIN, LED_OFF_LEVEL);

  stopPump();

  patternIndex = 0;
  animFrame = 0;
  lastLedUpdate = 0;
  lastMediumLedMs = 0;
  mediumLedStep = 0;

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
    String level = "medium";
    if (server.hasArg("level"))
    {
      level = server.arg("level");
    }
    
    startAlarm(level);

    sendJson(
      200,
      "{\"success\":true,\"level\":\"" + alarmLevel + "\"}"
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
  pinMode(LED_G12_PIN, OUTPUT);
  pinMode(LED_G14_PIN, OUTPUT);

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
  digitalWrite(LED_G12_PIN, LED_OFF_LEVEL);
  digitalWrite(LED_G14_PIN, LED_OFF_LEVEL);

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
      if (alarmLevel == "medium")
      {
        // Controlled in updateMediumLEDs
      }
      else if (alarmLevel == "high")
      {
        unsigned long cycle = currentMillis % 800;
        if (cycle < 400) {
          tone(BUZZER_PIN, 1800);
        } else {
          tone(BUZZER_PIN, 2400);
        }
      }
      else // critical
      {
        unsigned long cycle = currentMillis % 300;
        if (cycle < 150) {
          freq = 1500 + (cycle * 1300 / 150);
        } else {
          freq = 2800 - ((cycle - 150) * 1300 / 150);
        }
        tone(BUZZER_PIN, freq);
      }

      // Nhịp nhấp nháy của đèn LED phụ (LED_PIN) vẫn chạy đồng bộ
      if (alarmLevel == "medium")
      {
        updateMediumLEDs(currentMillis);
      }
      else if (currentMillis - previousMillis >= 250)
      {
        previousMillis = currentMillis;
        uint8_t nextState = !digitalRead(LED_PIN);
        digitalWrite(LED_PIN, nextState);
        digitalWrite(LED_G12_PIN, nextState);
        digitalWrite(LED_G14_PIN, nextState);
      }
    }
    else
    {
      // Chọn nhịp điệu theo alarmLevel cho Còi chủ động (Active Buzzer)
      const unsigned long* activePattern = patternMedium;
      int activeLength = lengthMedium;

      if (alarmLevel == "high") {
        activePattern = patternHigh;
        activeLength = lengthHigh;
      } else if (alarmLevel == "critical") {
        activePattern = patternCritical;
        activeLength = lengthCritical;
      }

      if (alarmLevel == "medium")
      {
        updateMediumLEDs(currentMillis);
      }
      else
      {
        if (currentMillis - previousMillis >= activePattern[patternIndex % activeLength])
        {
          previousMillis = currentMillis;
          patternIndex = (patternIndex + 1) % activeLength;

          bool isOn = (patternIndex % 2 == 0);
          digitalWrite(LED_PIN, isOn ? LED_ON_LEVEL : LED_OFF_LEVEL);
          digitalWrite(LED_G12_PIN, isOn ? LED_ON_LEVEL : LED_OFF_LEVEL);
          digitalWrite(LED_G14_PIN, isOn ? LED_ON_LEVEL : LED_OFF_LEVEL);
          digitalWrite(BUZZER_PIN, isOn ? BUZZER_ON_LEVEL : BUZZER_OFF_LEVEL);
        }
      }
    }
  }
  else
  {
    updateSafeAnimation();
  }

  delay(2);
}