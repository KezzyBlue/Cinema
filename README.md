# Cinema Backend

Express API + Supabase JS. Base URL mặc định: `http://localhost:3000`; JSON; các route không có auth middleware.

## Chạy

```powershell
cd .\backend
npm install
```

Tạo `backend/.env` (không commit key):

```env
SUPA_URL=http://127.0.0.1:54321
SUPA_KEY=<key-cua-Supabase>
PORT=3000
FRONTEND_URL=http://localhost:5173
```

`SUPA_URL`/`SUPA_KEY` bắt buộc. Dùng URL/key của project đang chạy; giá trị trên là URL mặc định ở Supabase local. `PORT` mặc định `3000`; CORS chỉ cho `FRONTEND_URL` (mặc định `http://localhost:5173`).

```powershell
npm run dev   # nodemon
npm start     # production-style: node
```

## Database hiện có

Tên cột trong migrations không đặt dấu ngoặc kép nên PostgreSQL lưu lowercase (`eventId` thành `eventid`). Các trạng thái bên dưới không có CHECK/default trong migrations: database chỉ ràng buộc `TEXT NOT NULL`, không giới hạn enum.

| Bảng | Cột quan trọng và ràng buộc |
|---|---|
| `areas` | `areaid` PK identity, `areaname` NOT NULL |
| `cinemas` | `cinemaid` PK, `cinemaname`, `areaid` NOT NULL FK → `areas.areaid`, `locate` NOT NULL |
| `rooms` | `roomid` PK, `roomname`, `areaid` NOT NULL FK → `cinemas.cinemaid` (tên cột là `areaid`, FK lại trỏ cinema) |
| `events` | `eventid` PK, `eventname` NOT NULL, `directors`/`types`/`languages` TEXT[], `poster` NOT NULL, `duration`, `startat`/`endat` DATE |
| `seats` | `seatid` PK, `rowlabel` CHAR, `seatnumber` INT, `seattype` TEXT; đều NOT NULL trừ PK |
| `showtimes` | `showtimeid` PK, `eventid` NOT NULL FK → `events.eventid`, `startat`/`endat` TIMESTAMPTZ, `status` NOT NULL |
| `bookings` | `bookingid` PK, `bookingtoken` TEXT UNIQUE NOT NULL, `status`, `price` BIGINT, `username`, `userphone`, `useremail` đều NOT NULL |
| `showtime_seats` | `showtimeid` FK → `showtimes`, `seatid` FK → `seats`, `roomid` FK → `rooms`, `bookingid` FK → `bookings`; các cột trên cùng `status`, `holdtoken` UNIQUE, `holdexpiresat` đều NOT NULL. Không khai báo PK hoặc unique `(showtimeid, seatid)`. |
| `payments` | `paymentid` PK, `bookingid` FK → `bookings`, `method`, `createdat` đều NOT NULL |

**Trạng thái được code sử dụng:** ghế `available`/`holding`/`booked`; mock payment nhận `success`/`failed`. `showtimes.status` và `bookings.status` không có tập giá trị được xác định trong schema.

**Mismatches cần biết:** `showtimes` migration không khai báo `roomid`, nhưng code truy vấn/ghi trường này; `events` không khai báo `actors`, nhưng admin service luôn ghi trường này; `poster` là NOT NULL nhưng create-event có thể gửi null. Create-showtime cũng không ghi `status` dù cột NOT NULL. Route lấy phòng lọc `rooms.cinemaid`, trong khi migration tạo `rooms.areaid`. Do đó một số API admin/đọc suất chiếu/phòng sẽ lỗi với schema migrations hiện tại. Không có migration tạo RPC hay trigger; `hold_seats`, `cancel_hold`, `process_mock_payment` chỉ được gọi trong code. Cần có các function tương ứng ở database để hold/cancel/payment hoạt động; định nghĩa và response của chúng không có trong repo. `supabase/config.toml` còn bật seed với `./seed.sql`, nhưng file này không tồn tại trong workspace.

## API

`<id>` là path parameter; body dùng JSON. DB rows trả về qua PostgREST thường có key lowercase như `eventid`. Success/error envelope theo controller. Các response RPC được trả nguyên trạng.

| Method + path | Mục đích / request body | Response thành công |
|---|---|---|
| `GET /api/events` | Liệt kê event | `200 {success:true,data:[...]}` |
| `GET /api/events/:eventId` | Chi tiết event | `200 {success:true,data:<row>}`; `404` nếu không có |
| `GET /api/events/:eventId/showtimes` | Suất của event | `200 {success:true,data:{eventId,showtimes:[...]}}` |
| `GET /api/areas` | Liệt kê khu vực | `200 {success:true,data:[...]}` |
| `GET /api/areas/:areaId/cinemas` | Rạp theo khu vực | `200 {success:true,data:{areaId,cinemas:[...]}}` |
| `GET /api/cinemas/:cinemaId` | Chi tiết rạp | `200 {success:true,data:<row>}`; `404` nếu không có |
| `GET /api/cinemas/:cinemaId/rooms` | Phòng của rạp | `200 {success:true,data:{cinemaId,rooms:[...]}}` |
| `GET /api/showtimes/:showtimeId` | Chi tiết suất | `200 {success:true,data:<row>}`; `404` nếu không có |
| `GET /api/showtimes/:showtimeId/seats` | Ghế và trạng thái; holding quá hạn được hiển thị `available` | `200 {success:true,data:{eventId,showtimeId,roomId,seats:[{seatId,rowLabel,seatNumber,seatType,status}]}}` |
| `POST /api/holds` | Giữ ghế. Body: `{ "showtimeId": 1, "seatIds": [1, 2] }` (số nguyên dương, không trùng) | `201 {success:true,message:"Seats held successfully",data:<RPC result>}` |
| `POST /api/holds/cancel` | Hủy hold. Body: `{ "holdToken": "..." }` | Kết quả RPC được trả nguyên trạng; status `200` nếu `success`, nếu không `409` |
| `POST /api/payments/mock` | Mock payment. Body: `{ "holdToken":"...", "userName":"A", "userPhone":"090...", "userEmail":"a@example.com", "price":100000, "result":"success" }`; `result`: `success`/`failed`, `price`: số nguyên không âm | `200`, kết quả RPC nguyên trạng; shape phụ thuộc function chưa có trong repo |
| `GET /api/payments/:paymentId` | Chi tiết payment/booking/ghế | `200 {success:true,data:{paymentId,userName,userEmail,method,createdAt,seats,price,eventId,startAt,endAt}}`; `404` nếu không có |
| `POST /api/admin/events` | Tạo event. Bắt buộc `eventName` (string), `duration` (số nguyên dương); nhận thêm `directors`, `actors`, `types`, `poster`, `languages` | `201 {success:true,data:<inserted row>}` |
| `PATCH /api/admin/events/:eventId` | Cập nhật một hay nhiều trường `eventName`, `directors`, `actors`, `types`, `poster`, `duration`, `languages` | `200 {success:true,data:<updated row>}`; `404` không có; `400` body không có field hợp lệ |
| `POST /api/admin/showtimes` | Tạo suất. Body: `{ "eventId":1, "roomId":1, "startAt":"2026-10-25T19:00:00+07:00", "endAt":"2026-10-25T21:15:00+07:00" }` | `201 {success:true,data:<inserted row>}` |
| `PATCH /api/admin/showtimes/:showtimeId` | Cập nhật `eventId`, `roomId`, `startAt`, `endAt`, `status` | `200 {success:true,data:<updated row>}`; `404` không có; `400` ID/body không hợp lệ |

Lỗi chung: JSON `{success:false,message}`. Các validation thường trả `400`, không tìm thấy `404`, ghế không khả dụng `409`, lỗi truy vấn `500`. `GET /api/showtimes/:id/seats` đang đọc toàn bộ `seats` thay vì lọc theo phòng; đây là behavior trong code hiện tại.

## PowerShell nhanh

Dùng ID có sẵn trong database. Các lệnh GET có thể chạy ngay khi backend và Supabase hoạt động:

```powershell
$base = "http://localhost:3000/api"
Invoke-RestMethod "$base/events"
Invoke-RestMethod "$base/areas"
Invoke-RestMethod "$base/events/1/showtimes"
```

Tạo event (schema hiện tại thiếu cột `actors` mà service insert, nên endpoint cần schema được đồng bộ trước khi chạy thành công):

```powershell
$body = @{
    eventName = "Example"
    duration = 120
    poster = "https://example.com/poster.jpg"
    directors = @("Director")
    types = @("Drama")
    languages = @("Vietnamese")
} | ConvertTo-Json
Invoke-RestMethod "$base/admin/events" -Method POST -ContentType "application/json" -Body $body
```

Giữ ghế rồi dùng `holdToken` do RPC trả về cho payment/cancel (response RPC chưa xác định trong repo):

```powershell
$body = @{ showtimeId = 1; seatIds = @(1, 2) } | ConvertTo-Json
Invoke-RestMethod "$base/holds" -Method POST -ContentType "application/json" -Body $body

$body = @{ holdToken = "<hold-token>"; userName = "A"; userPhone = "0900000000"; userEmail = "a@example.com"; price = 100000; result = "success" } | ConvertTo-Json
Invoke-RestMethod "$base/payments/mock" -Method POST -ContentType "application/json" -Body $body

$body = @{ holdToken = "<hold-token>" } | ConvertTo-Json
Invoke-RestMethod "$base/holds/cancel" -Method POST -ContentType "application/json" -Body $body
```
