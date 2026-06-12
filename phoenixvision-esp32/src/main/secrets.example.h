#pragma once

// Copy file này thành secrets.h rồi điền thông tin WiFi thật.
const char* WIFI_SSID = "TÊN_WIFI";
const char* WIFI_PASSWORD = "MẬT_KHẨU_WIFI";

// Backend endpoint để ESP32 tự đăng ký IP mỗi lần boot/reconnect.
// Ví dụ: "http://192.168.1.10:8000/api/v1/iot/register"
// Để trống nếu chỉ muốn backend dùng ESP32_BASE_URL hoặc mDNS.
const char* BACKEND_REGISTER_URL = "";
