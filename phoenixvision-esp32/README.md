# PhoenixVision ESP32

Firmware điều khiển cảnh báo phiên bản đầu tiên cho ESP32 WROOM 38 Pin.

## Phần cứng

- ESP32 WROOM 38 Pin
- LED đỏ và điện trở 220 ohm
- Module buzzer active
- Relay và bơm nước sẽ được tích hợp sau

Chi tiết đấu nối: [docs/wiring.md](docs/wiring.md).

## Cấu hình WiFi

Firmware đọc thông tin WiFi từ file `src/main/secrets.h`. File này đã được thêm vào `.gitignore`, vì vậy mật khẩu thật sẽ không bị đẩy lên GitHub.

Nếu chưa có file thật, sao chép file mẫu:

```bash
cp src/main/secrets.example.h src/main/secrets.h
```

Sau đó mở `src/main/secrets.h` và thay hai giá trị:

```cpp
const char* WIFI_SSID = "TÊN_WIFI";
const char* WIFI_PASSWORD = "MẬT_KHẨU_WIFI";
```

Repo chỉ lưu `secrets.example.h` để người khác có thể tạo cấu hình riêng. Bạn không cần sửa lại mã nguồn trước mỗi lần commit hoặc push.

## Upload bằng Arduino IDE

1. Cài Arduino IDE.
2. Mở `File > Preferences`.
3. Thêm URL sau vào `Additional Boards Manager URLs`:

   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`

4. Mở `Tools > Board > Boards Manager`, tìm và cài `esp32 by Espressif Systems`.
5. Chọn board `ESP32 Dev Module`.
6. Chọn đúng cổng USB trong `Tools > Port`.
7. Mở file `src/main/main.ino`. Arduino IDE sẽ mở cả `main.ino` và `secrets.h` trong cùng sketch.
8. Chọn `Upload`.
9. Mở `Serial Monitor` và đặt baud rate `115200`.

Sau khi kết nối thành công, Serial Monitor sẽ hiển thị:

```text
[INFO] Đã kết nối WiFi
[INFO] Địa chỉ IP ESP32: 192.168.x.x
[INFO] HTTP Server đã khởi động tại port 80
```

Máy tính và ESP32 phải kết nối cùng mạng WiFi.

## API

Thay `IP_ESP32` bằng địa chỉ được in trong Serial Monitor.

### Kiểm tra trạng thái

```text
GET http://IP_ESP32/status
```

```json
{
  "device": "PhoenixVision-ESP32",
  "online": true,
  "alarm": false
}
```

### Bật cảnh báo

```text
GET http://IP_ESP32/alarm
```

LED và buzzer sẽ được bật.

### Tắt cảnh báo

```text
GET http://IP_ESP32/stop
```

LED và buzzer sẽ được tắt.

## Kiểm tra nhanh

Mở trình duyệt bằng các URL trên hoặc dùng terminal:

```bash
curl http://IP_ESP32/status
curl http://IP_ESP32/alarm
curl http://IP_ESP32/stop
```

## Lưu ý

- Module buzzer hiện tại được cấu hình theo kiểu kích mức `LOW`: `LOW` là kêu, `HIGH` là tắt.
- Nếu buzzer của bạn hoạt động ngược lại, đổi `BUZZER_ON_LEVEL` thành `HIGH` và `BUZZER_OFF_LEVEL` thành `LOW`.
- Không cấp nguồn trực tiếp cho bơm nước từ GPIO ESP32. Giai đoạn sau phải dùng relay và nguồn riêng phù hợp.
