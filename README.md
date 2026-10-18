import pypandoc

content = r"""# Cinema Booking API

Tài liệu mô tả cấu trúc dữ liệu và API cho hệ thống đặt vé xem phim.

## 1. Quy ước chung

- Base URL khi chạy local: `http://localhost:3000`
- Các endpoint dưới đây sử dụng tiền tố `/api`.
- Request/response sử dụng JSON khi có body.
- ID trong URL là route parameter, ví dụ `:eventId`.
- Response thành công có cấu trúc thống nhất:

```json
{
  "success": true,
  "data": {}
}
```

- Response lỗi có cấu trúc:

```json
{
  "success": false,
  "message": "Error message"
}
```

> **Lưu ý về tên cột:** PostgreSQL thường chuyển tên định danh không đặt trong dấu ngoặc kép thành chữ thường. Ví dụ, cột được tạo không đặt ngoặc kép với tên `eventId` thường được lưu thành `eventid`. Khi truy vấn Supabase, hãy dùng đúng tên cột thực tế trong database.

## 2. Cấu trúc dữ liệu

### 2.1. `areas` — Danh sách khu vực

| Cột | Ý nghĩa |
|---|---|
| `areaId` | ID khu vực |
| `areaName` | Tên khu vực |

### 2.2. `cinemas` — Danh sách rạp chiếu

| Cột | Ý nghĩa |
|---|---|
| `cinemaId` | ID rạp |
| `cinemaName` | Tên rạp |
| `areaId` | Khu vực mà rạp thuộc về |
| `locate` | Địa chỉ/vị trí rạp |

Quan hệ: `cinemas.areaId` tham chiếu đến `areas.areaId`.

### 2.3. `rooms` — Danh sách phòng chiếu

| Cột | Ý nghĩa |
|---|---|
| `roomId` | ID phòng |
| `roomName` | Tên phòng |
| `cinemaId` | Rạp sở hữu phòng |

Quan hệ: `rooms.cinemaId` tham chiếu đến `cinemas.cinemaId`.

### 2.4. `events` — Danh sách sự kiện/phim

| Cột | Ý nghĩa |
|---|---|
| `eventId` | ID sự kiện/phim |
| `eventName` | Tên sự kiện/phim |
| `directors` | Đạo diễn |
| `actors` | Diễn viên |
| `types` | Thể loại |
| `poster` | URL ảnh poster |
| `duration` | Thời lượng |
| `languages` | Ngôn ngữ |
| `startAt` | Ngày bắt đầu chiếu (`DATE`) |
| `endAt` | Ngày kết thúc chiếu (`DATE`) |

### 2.5. `seats` — Danh sách ghế vật lý

| Cột | Ý nghĩa |
|---|---|
| `seatId` | ID ghế |
| `rowLabel` | Nhãn hàng ghế, ví dụ `A` |
| `seatNumber` | Số ghế trong hàng |
| `seatType` | Loại ghế, ví dụ ghế thường/VIP |

Bảng này mô tả ghế vật lý. Trạng thái đặt ghế theo từng suất chiếu được lưu trong `showtime_seats`.

### 2.6. `showtimes` — Danh sách suất chiếu

| Cột | Ý nghĩa |
|---|---|
| `showtimeId` | ID suất chiếu |
| `eventId` | Sự kiện/phim được chiếu |
| `roomId` | Phòng chiếu |
| `startAt` | Thời điểm bắt đầu |
| `endAt` | Thời điểm kết thúc |
| `status` | Trạng thái suất chiếu |

Quan hệ: `showtimes.eventId` tham chiếu đến `events.eventId`.

### 2.7. `showtime_seats` — Trạng thái ghế theo suất chiếu

| Cột | Ý nghĩa |
|---|---|
| `showtimeId` | Suất chiếu |
| `seatId` | Ghế vật lý |
| `status` | `available`, `holding` hoặc `booked` |
| `holdToken` | Token giữ ghế |
| `holdExpiresAt` | Thời điểm hết hạn giữ ghế |
| `bookingId` | Đơn đặt vé liên quan, nếu có |

Bảng này liên kết một ghế với một suất chiếu và lưu trạng thái ghế trong chính suất chiếu đó. Nên có ràng buộc duy nhất trên cặp `(showtimeId, seatId)` để tránh tạo nhiều bản ghi cho cùng một ghế trong cùng suất chiếu.

### 2.8. `bookings` — Đơn đặt vé

| Cột | Ý nghĩa |
|---|---|
| `bookingId` | ID đơn đặt vé |
| `bookingToken` | Token tra cứu đơn |
| `status` | Trạng thái đơn: `pending`, `confirmed` hoặc `expired` |
| `price` | Tổng giá tiền |
| `createdAt` | Thời điểm tạo đơn |
| `userName` | Tên người đặt |
| `userPhone` | Số điện thoại |
| `userEmail` | Email |

> Tên trạng thái được chuẩn hóa thành `confirmed` (không phải `confirmmed`).

### 2.9. `payments` — Danh sách thanh toán

| Cột | Ý nghĩa |
|---|---|
| `paymentId` | ID thanh toán |
| `bookingId` | Đơn đặt vé được thanh toán |
| `method` | Phương thức thanh toán |
| `createdAt` | Thời điểm tạo bản ghi thanh toán |

Để theo dõi thanh toán thực tế, nên cân nhắc bổ sung cột `status` (ví dụ `pending`, `paid`, `failed`) và `paidAt` nếu nghiệp vụ cần.

---

## 3. API — Sự kiện/phim

### 3.1. Lấy danh sách sự kiện

`GET /api/events`

Lấy danh sách sự kiện/phim.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "eventList": [
      {
        "eventId": 1,
        "eventName": "Example Movie",
        "poster": "https://example.com/poster.jpg",
        "startAt": "2026-10-19",
        "endAt": "2026-11-19"
      }
    ]
  }
}
```

### 3.2. Lấy chi tiết sự kiện

`GET /api/events/:eventId`

**Ví dụ:** `GET /api/events/1`

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "eventId": 1,
    "eventName": "Example Movie",
    "directors": "Example Director",
    "actors": ["Actor A", "Actor B"],
    "types": ["Drama"],
    "poster": "https://example.com/poster.jpg",
    "duration": 120,
    "languages": ["Vietnamese"],
    "startAt": "2026-10-19",
    "endAt": "2026-11-19"
  }
}
```

`duration` là tên cột trong schema đã cung cấp. Nếu frontend yêu cầu tên `durationMinutes`, hãy thống nhất lại contract hoặc ánh xạ tên trường ở backend.

### 3.3. Lấy lịch chiếu của một sự kiện

`GET /api/events/:eventId/showtimes`

**Ví dụ:** `GET /api/events/1/showtimes`

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "eventId": 1,
    "showtimes": [
      {
        "showtimeId": 12,
        "startAt": "2026-10-19T09:00:00",
        "endAt": "2026-10-19T11:00:00",
        "status": "active"
      }
    ]
  }
}
```

---

## 4. API — Khu vực và rạp chiếu

### 4.1. Lấy danh sách khu vực

`GET /api/areas`

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "areas": [
      {
        "areaId": 1,
        "areaName": "Hà Nội"
      }
    ]
  }
}
```

### 4.2. Lấy danh sách rạp theo khu vực

`GET /api/areas/:areaId/cinemas`

**Ví dụ:** `GET /api/areas/1/cinemas`

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "areaId": 1,
    "cinemas": [
      {
        "cinemaId": 1,
        "cinemaName": "Cinema A"
      }
    ]
  }
}
```

### 4.3. Lấy chi tiết rạp

`GET /api/cinemas/:cinemaId`

**Ví dụ:** `GET /api/cinemas/1`

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "cinemaId": 1,
    "areaId": 1,
    "cinemaName": "Cinema A",
    "locate": "Địa chỉ rạp"
  }
}
```

### 4.4. Lấy danh sách phòng chiếu của rạp

`GET /api/cinemas/:cinemaId/rooms`

**Ví dụ:** `GET /api/cinemas/1/rooms`

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "cinemaId": 1,
    "rooms": [
      {
        "roomId": 1,
        "roomName": "Room 1"
      },
      {
        "roomId": 2,
        "roomName": "Room 2"
      }
    ]
  }
}
```

---

## 5. API — Suất chiếu và sơ đồ ghế

### 5.1. Lấy chi tiết suất chiếu

`GET /api/showtimes/:showtimeId`

**Ví dụ:** `GET /api/showtimes/12`

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "showtimeId": 12,
    "eventId": 1,
    "startAt": "2026-10-19T09:00:00",
    "endAt": "2026-10-19T11:00:00",
    "status": "active"
  }
}
```

### 5.2. Lấy sơ đồ ghế của suất chiếu

`GET /api/showtimes/:showtimeId/seats`

**Ví dụ:** `GET /api/showtimes/12/seats`

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "eventId": 1,
    "showtimeId": 12,
    "roomId": 5,
    "seats": [
      {
        "seatId": 1,
        "rowLabel": "A",
        "seatNumber": 1,
        "seatType": "standard",
        "status": "available"
      },
      {
        "seatId": 2,
        "rowLabel": "A",
        "seatNumber": 2,
        "seatType": "vip",
        "status": "booked"
      }
    ]
  }
}
```

`status` được lấy từ `showtime_seats`, còn `rowLabel`, `seatNumber` và `seatType` được lấy từ `seats`. Việc kết hợp hai bảng cần có khóa ngoại phù hợp.

Các trạng thái ghế:
- `available`: ghế có thể được yêu cầu giữ.
- `holding`: ghế đang được giữ tạm thời; cần xét `holdExpiresAt`.
- `booked`: ghế đã được đặt.

> API đọc sơ đồ ghế chỉ cung cấp trạng thái tại thời điểm truy vấn. Khi người dùng giữ ghế, backend vẫn phải kiểm tra và cập nhật trạng thái theo cách atomic trong database để tránh race condition.

---

## 6. Mã trạng thái HTTP

| Status | Ý nghĩa |
|---|---|
| `200 OK` | Request thành công |
| `400 Bad Request` | Dữ liệu đầu vào không hợp lệ |
| `404 Not Found` | Không tìm thấy tài nguyên |
| `409 Conflict` | Xung đột trạng thái, ví dụ ghế không còn khả dụng |
| `500 Internal Server Error` | Lỗi server hoặc truy vấn database |

## 7. Các điểm cần thống nhất trước khi tích hợp frontend

1. **Tên trường:** schema dùng `duration`, trong khi contract ban đầu có `durationMinutes`. Chọn một tên thống nhất.
2. **Tên trạng thái booking:** dùng `confirmed` thay cho lỗi chính tả `confirmmed`.
3. **Trạng thái ghế:** response của sơ đồ ghế nên bao gồm `status` từ `showtime_seats`, dù phần mô tả API ban đầu chưa liệt kê trường này.
4. **Quan hệ dữ liệu:** bảo đảm các khóa ngoại giữa `cinemas`–`areas`, `rooms`–`cinemas`, `showtimes`–`events`, và `showtime_seats`–`showtimes`/`seats`/`rooms` được định nghĩa chính xác.
5. **Giữ ghế và thanh toán:** không xem request từ frontend là bằng chứng thanh toán thành công. Với thanh toán thật, trạng thái cần được xác nhận qua cơ chế đáng tin cậy của nhà cung cấp thanh toán.
6. **Bảo mật:** không đưa Supabase service-role key vào frontend; chỉ lưu khóa đặc quyền trong môi trường backend và không commit file `.env`.

---

## 8. Các endpoint tiếp theo cho luồng đặt vé

Các API ghi dữ liệu chưa được mô tả chi tiết trong danh sách ban đầu, nhưng luồng đặt vé thường cần:

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/api/holds` | Giữ một hoặc nhiều ghế |
| `GET` | `/api/holds/:holdToken` | Kiểm tra thông tin giữ ghế |
| `DELETE` | `/api/holds/:holdToken` | Hủy giữ ghế |
| `POST` | `/api/bookings` | Tạo/xác nhận đơn đặt vé từ lượt giữ ghế |
| `POST` | `/api/payments` | Khởi tạo thanh toán |
| `GET` | `/api/payments/:paymentId` | Tra cứu thanh toán |

Các endpoint trên là phần đề xuất cho giai đoạn tiếp theo, chưa phải API đã được triển khai.
"""

output_path = "/mnt/data/README.md"
pypandoc.convert_text(content, "md", format="md", outputfile=output_path, extra_args=["--standalone"])
print(f"Created {output_path}")
