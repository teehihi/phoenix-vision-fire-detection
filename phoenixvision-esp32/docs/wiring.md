# Sơ đồ đấu nối

## LED đỏ

```text
GPIO2 -> điện trở 220 ohm -> chân dương LED
GND   -> chân âm LED
```

## Buzzer active

```text
GPIO4  -> chân tín hiệu/S của buzzer
3V3/5V -> VCC theo thông số module
GND   -> GND
```

Nếu buzzer là linh kiện rời thay vì module có mạch điều khiển, không nên cấp tải lớn trực tiếp từ GPIO. Hãy dùng transistor và diode bảo vệ phù hợp.

## Mapping firmware

```cpp
constexpr uint8_t LED_PIN = 2;
constexpr uint8_t BUZZER_PIN = 4;
```

Relay và bơm nước chưa được khai báo trong firmware phiên bản này.

## Mức kích hoạt buzzer

Firmware hiện cấu hình module buzzer theo kiểu kích mức thấp:

```cpp
constexpr uint8_t BUZZER_ON_LEVEL = LOW;
constexpr uint8_t BUZZER_OFF_LEVEL = HIGH;
```

Ở trạng thái vừa khởi động, GPIO4 được đặt `HIGH` để buzzer không kêu.
