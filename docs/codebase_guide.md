# TÀI LIỆU KHẢO SÁT & BẢO TRÌ HỆ THỐNG YARN TRACKER

Tài liệu này được biên soạn dưới vai trò **Senior Software Engineer & Technical Mentor** nhằm mục đích bàn giao, phục vụ hoạt động bảo trì, gỡ lỗi (debugging) và mở rộng hệ thống Yarn Tracker. Tài liệu tập trung hoàn toàn vào logic nghiệp vụ (business logic), các cấu trúc thực tế đang tồn tại trong mã nguồn, và phân tích tác động (impact analysis).

---

## QUICK NAVIGATION (LIÊN KẾT NHANH TỚI CÁC TỆP MÃ NGUỒN)

Nhấp vào các liên kết bên dưới để truy cập trực tiếp vào các file mã nguồn tương ứng trong dự án:

*   **Cấu hình hệ thống & Định nghĩa dữ liệu:**
    *   [lib/supabase.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/lib/supabase.ts) - Cấu hình kết nối cơ sở dữ liệu Supabase.
    *   [types/index.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/types/index.ts) - Định nghĩa kiểu dữ liệu tĩnh TypeScript.
*   **Bộ lọc định tuyến & Màn hình đăng nhập:**
    *   [app/_layout.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/_layout.tsx) - Root Layout và Auth Route Guard.
    *   [app/login.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/login.tsx) - Giao diện Đăng nhập và Đăng ký.
*   **Thanh điều hướng & Màn hình chính (Tabs):**
    *   [app/(tabs)/_layout.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/_layout.tsx) - Cấu hình thanh Tab dưới.
    *   [app/(tabs)/index.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/index.tsx) - Màn hình chính Bảng điều khiển (Board Screen).
    *   [app/(tabs)/search.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/search.tsx) - Màn hình Tra cứu cuộn sợi.
    *   [app/(tabs)/add.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/add.tsx) - Màn hình Đăng ký sợi mới.
*   **Các màn hình nghiệp vụ chi tiết:**
    *   [app/area/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/area/[id].tsx) - Màn hình Danh sách cuộn sợi tại kệ chỉ định.
    *   [app/yarn/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/yarn/[id].tsx) - Màn hình Nhật ký hành trình di chuyển của cuộn sợi.
    *   [app/move/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/move/[id].tsx) - Màn hình Thao tác di dời vị trí cuộn sợi.
*   **Dịch vụ API & Custom Hooks (Lắng nghe dữ liệu):**
    *   [hooks/useBoard.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/hooks/useBoard.ts) - Hook đồng bộ dữ liệu Whiteboard thời gian thực.
    *   [hooks/useArea.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/hooks/useArea.ts) - Hook tải danh sách sợi theo khu vực kệ.
    *   [hooks/useYarn.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/hooks/useYarn.ts) - Hook truy vấn lịch sử di dời của cuộn sợi.

---

## 1. PHÂN CHIA MODULE HỆ THỐNG (SYSTEM MODULES)

Hệ thống quản lý cuộn sợi Yarn Tracker được module hóa thành 3 phân hệ cốt lõi:

1.  **Module Xác thực & Định tuyến (Auth & Routing Module)**:
    *   Chịu trách nhiệm bảo vệ các khu vực chức năng trong ứng dụng, kiểm soát vòng đời phiên đăng nhập (`Session`) và thực hiện điều hướng an toàn (`app/_layout.tsx`, `app/login.tsx`).
2.  **Module Quản lý & Giám sát Vị trí Kho (Inventory Board & Tracking Module)**:
    *   Cung cấp giao diện trực quan hóa dạng Whiteboard số (`app/(tabs)/index.tsx`, `app/area/[id].tsx`, `app/yarn/[id].tsx`), giúp theo dõi tức thời vị trí thực tế của từng cuộn sợi, dòng lịch sử di chuyển phục vụ công tác kiểm toán chất lượng.
3.  **Module Tác nghiệp & Vận hành (Warehouse Operations Module)**:
    *   Cung cấp các công cụ tương tác trực tiếp của công nhân như Đăng ký mới cuộn sợi (`app/(tabs)/add.tsx`), Tìm kiếm nhanh vị trí (`app/(tabs)/search.tsx`), và Thao tác dịch chuyển kệ chứa hàng (`app/move/[id].tsx`).

---

## 2. PHÂN TÍCH FILE CHI TIẾT (FILE-BY-FILE ANALYSIS)

Dưới đây là bảng phân tích kỹ thuật của toàn bộ các file mã nguồn quan trọng trong hệ thống:

### [lib/supabase.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/lib/supabase.ts)
*   **Mục đích**: Khởi tạo kết nối mạng trực tiếp tới Supabase Backend.
*   **Chức năng nghiệp vụ**: Giao tiếp cơ sở dữ liệu quan hệ PostgreSQL và duy trì phiên đăng nhập ngoại tuyến của thiết bị di động.
*   **Hàm chính**: Không có hàm tự định nghĩa, chỉ thực thi lệnh khởi tạo client qua hàm `createClient`.
*   **Bảng dữ liệu tác động**: Không trực tiếp tác động, làm cầu nối trung gian cho mọi câu lệnh truy vấn.
*   **File phụ thuộc**: Tất cả các màn hình và Custom Hooks.

### [types/index.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/types/index.ts)
*   **Mục đích**: Định nghĩa cấu trúc dữ liệu tĩnh cho hệ thống.
*   **Chức năng nghiệp vụ**: Đồng bộ cấu trúc đối tượng JS/TS với các trường dữ liệu thực tế của database.
*   **Hàm chính**: Không có hàm xử lý, chỉ chứa định nghĩa kiểu dữ liệu.
*   **File phụ thuộc**: `hooks/useBoard.ts`, `hooks/useArea.ts`, `hooks/useYarn.ts`, `app/move/[id].tsx`, `app/(tabs)/add.tsx`.

### [app/_layout.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/_layout.tsx)
*   **Mục đích**: Điểm chạy gốc điều phối định tuyến.
*   **Chức năng nghiệp vụ**: Nhận diện biến động đăng nhập/đăng xuất của công nhân và thực thi tự động chuyển hướng màn hình.
*   **Hàm chính**: `RootLayout()` component chứa logic định tuyến trong hook `useEffect`.
*   **API Supabase gọi**: `supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()`.
*   **File phụ thuộc**: Màn hình `login.tsx` và nhóm thư mục `(tabs)`.

### [app/login.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/login.tsx)
*   **Mục đích**: Cung cấp giao diện truy cập hệ thống.
*   **Chức năng nghiệp vụ**: Đăng nhập tài khoản bằng email/mật khẩu và đăng ký tài khoản vận hành mới.
*   **Hàm chính**: `handleAuth()`, `isValidEmail()`.
*   **API Supabase gọi**: `supabase.auth.signInWithPassword()`, `supabase.auth.signUp()`.
*   **File phụ thuộc**: Bị giám sát bởi `app/_layout.tsx`.

### [app/(tabs)/index.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/index.tsx)
*   **Mục đích**: Trang chính hiển thị số lượng sợi trên kệ.
*   **Chức năng nghiệp vụ**: Trực quan hóa mức độ chứa của từng kệ và nút Đăng xuất an toàn.
*   **Hàm chính**: `handleLogout()`, `renderArea()`, `getAreaColor()`.
*   **API Supabase gọi**: `supabase.auth.signOut()`.
*   **File phụ thuộc**: `hooks/useBoard.ts`.

### [app/(tabs)/search.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/search.tsx)
*   **Mục đích**: Giao diện tra cứu cuộn sợi.
*   **Chức năng nghiệp vụ**: Tìm kiếm tương đối cuộn sợi theo mã code và hiển thị vị trí kệ hiện thời của nó.
*   **Hàm chính**: `handleSearch()`, `renderResult()`.
*   **API Supabase gọi**: `supabase.from('yarn_rolls').select('*, areas(...)').ilike(...)`.
*   **File phụ thuộc**: Dẫn hướng tới `/yarn/[id]`.

### [app/(tabs)/add.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/add.tsx)
*   **Mục đích**: Màn hình đăng ký cuộn sợi mới nhập kho.
*   **Chức năng nghiệp vụ**: Tạo mới bản ghi cuộn sợi và chèn dòng nhật ký định vị ban đầu.
*   **Hàm chính**: `handleSave()`.
*   **API Supabase gọi**: `supabase.from('areas').select('*')`, `supabase.from('yarn_rolls').select('id')`, `supabase.from('yarn_rolls').insert()`, `supabase.from('move_logs').insert()`.
*   **File phụ thuộc**: Đọc danh sách kệ từ Supabase `areas`.

### [app/area/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/area/[id].tsx)
*   **Mục đích**: Chi tiết các cuộn sợi đang xếp trên một kệ cụ thể.
*   **Chức năng nghiệp vụ**: Hiển thị danh sách cuộn sợi của kệ đã chọn, phím chuyển hướng di dời.
*   **Hàm chính**: `renderYarn()`.
*   **File phụ thuộc**: `hooks/useArea.ts`, dẫn hướng tới `/move/[id]` và `/yarn/[id]`.

### [app/yarn/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/yarn/[id].tsx)
*   **Mục đích**: Trang hiển thị lý lịch hành trình cuộn sợi.
*   **Chức năng nghiệp vụ**: Liệt kê thông tin thông số và dòng thời gian lịch sử dịch chuyển.
*   **Hàm chính**: `renderLog()`, `formatDate()`.
*   **File phụ thuộc**: `hooks/useYarn.ts`.

### [app/move/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/move/[id].tsx)
*   **Mục đích**: Trang thao tác chuyển kệ hàng cho cuộn sợi.
*   **Chức năng nghiệp vụ**: Chọn kệ đích, lưu nhật ký hành trình di chuyển và đổi tọa độ thực tế của sợi.
*   **Hàm chính**: `handleMove()`.
*   **API Supabase gọi**: `supabase.from('yarn_rolls').select()`, `supabase.from('areas').select()`, `supabase.from('move_logs').insert()`, `supabase.from('yarn_rolls').update()`.
*   **File phụ thuộc**: Dẫn hướng quay lại bảng Board chính sau khi hoàn thành.

---

## 3. SƠ ĐỒ LUỒNG HOẠT ĐỘNG (SYSTEM FLOW DIAGRAMS)

### Luồng Xác thực (Authentication Flow)
```text
Trạng thái ban đầu: Chưa đăng nhập (Session: null)
                      │
                      ▼
            Nhập Email & Password (app/login.tsx)
                      │
                      ▼
         Nhấn "SECURE SIGN IN" -> handleAuth()
                      │
                      ▼
        Gửi yêu cầu xác thực sang Supabase Auth API
                      │
                      ▼
   Hợp lệ -> Supabase trả về Session (JWT Token)
                      │
                      ▼
    onAuthStateChange() nhận tín hiệu (app/_layout.tsx)
                      │
                      ▼
 Lưu Session vào AsyncStorage -> Chuyển hướng tới /(tabs)
```

### Luồng Khai báo cuộn sợi mới (Add Yarn Flow)
```text
Nhập thông số sợi & Chọn kệ ban đầu (app/(tabs)/add.tsx)
                      │
                      ▼
          Nhấn "Save Yarn Roll" -> handleSave()
                      │
                      ▼
Kiểm tra trùng lặp mã sợi trên Supabase bảng yarn_rolls
                      │
                      ▼
 Không trùng -> Thêm bản ghi mới vào bảng yarn_rolls
                      │
                      ▼
 Thêm dòng định vị ban đầu vào bảng move_logs (Initial placement)
                      │
                      ▼
            Hiển thị thông báo thành công
```

### Luồng Tìm kiếm cuộn sợi (Search Yarn Flow)
```text
Nhập ký tự tìm kiếm (ví dụ: YRN-00) (app/(tabs)/search.tsx)
                      │
                      ▼
            Nhấn "Search" -> handleSearch()
                      │
                      ▼
 Gọi API Supabase truy vấn bảng yarn_rolls nối với bảng areas (ilike)
                      │
                      ▼
    Nhận kết quả và cập nhật hiển thị danh sách trên UI
                      │
                      ▼
       Chạm vào một kết quả -> Điều hướng tới /yarn/[id]
```

### Luồng Di chuyển cuộn sợi (Move Yarn Flow)
```text
Bấm "Move →" tại kệ hàng đang chứa (app/area/[id].tsx)
                      │
                      ▼
 Tải thông tin sợi & Danh sách kệ đích khả dụng (app/move/[id].tsx)
                      │
                      ▼
        Chọn kệ hàng đích mới & Nhấn nút di dời
                      │
                      ▼
   Hàm handleMove() chạy -> Đọc tài khoản thực hiện di chuyển
                      │
                      ▼
Giao dịch 1: Thêm dòng nhật ký vết di dời vào bảng move_logs
                      │
                      ▼
Giao dịch 2: Cập nhật trường area_id của sợi trong bảng yarn_rolls
                      │
                      ▼
   Thành công -> Hiển thị Alert báo và quay lại trang Board
```

### Luồng Cập nhật Realtime (Realtime Update Flow)
```text
Cơ sở dữ liệu bảng yarn_rolls có biến động (UPDATE / INSERT)
                      │
                      ▼
 Supabase Realtime Service phát hiện thay đổi qua WAL log
                      │
                      ▼
 Phát tín hiệu cập nhật qua kênh WebSocket 'board-realtime'
                      │
                      ▼
   useBoard.ts hook bắt được sự kiện biến động dữ liệu
                      │
                      ▼
 Tự động chạy lại hàm fetchBoard() để truy vấn số liệu mới
                      │
                      ▼
Cập nhật state 'areas' -> UI tự động vẽ lại thông số mà không cần tải trang
```

---

## 4. PHÂN TÍCH CHI TIẾT MÀN HÌNH (SCREEN-BY-SCREEN BREAKDOWN)

### Màn hình 1: Đăng nhập & Đăng ký (`app/login.tsx`)
*   **Thao tác của người dùng**: Nhập email, mật khẩu, họ tên (nếu là chế độ Đăng ký) và bấm nút xác nhận. Có nút chuyển đổi chế độ "Sign In" / "Register".
*   **Nguồn gốc lấy dữ liệu**: Không lấy dữ liệu từ DB trước khi đăng nhập, chỉ nhận thông tin từ form nhập liệu thủ công.
*   **Nơi ghi dữ liệu**: Ghi tài khoản mới vào phân hệ xác thực nội bộ của Supabase Auth.
*   **Điều hướng sau khi thành công**: `RootLayout` tự động phát hiện session hợp lệ và chuyển hướng đến trang chính `/(tabs)`.

### Màn hình 2: Bảng điều khiển chính (`app/(tabs)/index.tsx`)
*   **Thao tác của người dùng**: Quan sát lưới tổng quan số lượng sợi của từng kệ hàng, nhấp vào một kệ cụ thể để đi sâu chi tiết, bấm phím Đăng xuất ở góc phải trên cùng.
*   **Nguồn gốc lấy dữ liệu**: Lấy dữ liệu danh sách khu vực và số lượng cuộn sợi từ bảng `areas` kết nối với `yarn_rolls` thông qua Custom Hook `useBoard`.
*   **Nơi ghi dữ liệu**: Xóa session xác thực trên bộ nhớ điện thoại khi đăng xuất.
*   **Điều hướng sau khi thành công**: Bấm vào một kệ hàng sẽ điều hướng tới kệ tương ứng `/area/[id]`. Đăng xuất thành công sẽ điều hướng về `/login`.

### Màn hình 3: Chi tiết khu vực kệ chứa (`app/area/[id].tsx`)
*   **Thao tác của người dùng**: Xem danh sách các cuộn sợi đang chứa tại kệ hiện tại, bấm phím "Move →" để di chuyển cuộn sợi hoặc bấm vào thẻ cuộn sợi để xem lịch sử hành trình của nó.
*   **Nguồn gốc lấy dữ liệu**: Lấy thông tin các cuộn sợi có trạng thái `in_stock` thuộc ID khu vực hiện tại từ bảng `yarn_rolls` qua Custom Hook `useArea`.
*   **Nơi ghi dữ liệu**: Không trực tiếp ghi dữ liệu.
*   **Điều hướng sau khi thành công**: Bấm xem chi tiết chuyển sang `/yarn/[id]`, bấm di chuyển kệ chuyển sang `/move/[id]`.

### Màn hình 4: Thao tác dịch chuyển kệ (`app/move/[id].tsx`)
*   **Thao tác của người dùng**: Chọn kệ hàng đích mới trên màn hình lưới và bấm xác nhận di dời cuộn sợi.
*   **Nguồn gốc lấy dữ liệu**: Tải thông số cuộn sợi hiện hành từ bảng `yarn_rolls` và toàn bộ các kệ hàng có trạng thái `is_active` từ bảng `areas`.
*   **Nơi ghi dữ liệu**: Ghi đè tọa độ kệ mới (`area_id`) vào bảng `yarn_rolls` và chèn một bản ghi mới ghi nhận hành vi di chuyển vào bảng `move_logs`.
*   **Điều hướng sau khi thành công**: Quay lại màn hình chính của ứng dụng bằng `router.push('/')`.

### Màn hình 5: Tra cứu cuộn sợi (`app/(tabs)/search.tsx`)
*   **Thao tác của người dùng**: Nhập mã số cuộn sợi (một phần hoặc toàn bộ mã) và bấm nút "Search". Chọn xem một kết quả trong danh sách tìm kiếm.
*   **Nguồn gốc lấy dữ liệu**: Gọi API Supabase tìm kiếm tương đối không phân biệt chữ hoa thường trên bảng `yarn_rolls`.
*   **Nơi ghi dữ liệu**: Không ghi dữ liệu.
*   **Điều hướng sau khi thành công**: Nhấn chọn vào một kết quả để mở trang lịch sử của cuộn sợi `/yarn/[id]`.

### Màn hình 6: Đăng ký sợi mới (`app/(tabs)/add.tsx`)
*   **Thao tác của người dùng**: Nhập mã sợi, màu sắc, chủng loại, chạm chọn kệ hàng ban đầu và bấm xác nhận lưu cuộn sợi mới.
*   **Nguồn gốc lấy dữ liệu**: Tải danh sách tất cả các kệ hàng hoạt động từ bảng `areas`.
*   **Nơi ghi dữ liệu**: Tạo bản ghi mới trong bảng `yarn_rolls` và lưu vết xuất phát ban đầu vào bảng `move_logs` (với thuộc tính `from_area_id` là `null`).
*   **Điều hướng sau khi thành công**: Cho phép chọn "Add Another" để ở lại trang tiếp tục khai báo, hoặc "Go to Board" để quay về `/`.

---

## 5. PHÂN TÍCH CHI TIẾT CUSTOM HOOKS (CUSTOM HOOKS ANALYSIS)

### Hook 1: `useBoard` (`hooks/useBoard.ts`)
*   **Trách nhiệm chính**: Truy vấn tất cả khu vực kệ hoạt động (`is_active = true`), nối với danh sách cuộn sợi thuộc mỗi kệ, định dạng số đếm hiển thị và duy trì lắng nghe sự kiện thay đổi dữ liệu thời gian thực.
*   **Dữ liệu trả về**: Mảng các khu vực chứa kèm biến đếm (`areas`), trạng thái tải mạng (`loading`), thông báo lỗi (`error`) và hàm yêu cầu tải lại dữ liệu thủ công (`refetch`).
*   **API sử dụng**: `supabase.from('areas').select('*, yarn_rolls(...)')`.
*   **Cơ chế realtime**: Sử dụng kênh WebSockets để phát hiện bất kỳ sự kiện INSERT, UPDATE, hoặc DELETE nào trên bảng `yarn_rolls` để tự động kích hoạt gọi hàm `fetchBoard()` cập nhật lại giao diện.
*   **Cleanup cần thiết**: Khi Hook bị hủy (component unmount), gọi hàm `supabase.removeChannel` để thu hồi kết nối WebSocket tránh rò rỉ bộ nhớ.

### Hook 2: `useArea` (`hooks/useArea.ts`)
*   **Trách nhiệm chính**: Truy vấn danh sách các cuộn sợi đang xếp trên một kệ chỉ định có trạng thái hoạt động là `in_stock`.
*   **Dữ liệu trả về**: Mảng các cuộn sợi (`yarns`), trạng thái tải mạng (`loading`), lỗi (`error`) và hàm cập nhật dữ liệu (`refetch`).
*   **API sử dụng**: `supabase.from('yarn_rolls').select('*').eq('area_id', areaId).eq('status', 'in_stock')`.
*   **Cơ chế realtime**: **Không xác định từ source hiện có**. Hook này hoàn toàn dựa vào cơ chế kích hoạt tải lại thủ công hoặc reload dữ liệu lúc mount.
*   **Cleanup cần thiết**: Không có listener kết nối mạng nào được đăng ký trong hook này.

### Hook 3: `useYarn` (`hooks/useYarn.ts`)
*   **Trách nhiệm chính**: Truy vấn thông số chi tiết của cuộn sợi và toàn bộ dòng nhật ký dịch chuyển trong quá khứ sắp xếp theo thời gian mới nhất.
*   **Dữ liệu trả về**: Đối tượng cuộn sợi (`yarn`), mảng lịch sử hành trình (`history`), trạng thái tải (`loading`), lỗi (`error`) và hàm cập nhật dữ liệu (`refetch`).
*   **API sử dụng**:
    *   `supabase.from('yarn_rolls').select('*, areas(...)').eq('id', yarnId).single()`
    *   `supabase.from('move_logs').select('*, from_area(...), to_area(...)').eq('yarn_roll_id', yarnId).order('moved_at', { ascending: false })`
*   **Cơ chế realtime**: **Không xác định từ source hiện có**.
*   **Cleanup cần thiết**: Không có listener cần thu hồi dọn dẹp.

---

## 6. PHÂN TÍCH TẬP TIN MÃ NGUỒN CỐT LÕI (CORE FUNCTIONS SOURCE & METADATA)

Dưới đây là phần trích xuất nguyên bản mã nguồn không cắt xén và phân tích chi tiết của các hàm nghiệp vụ quan trọng nhất trong hệ thống:

### Hàm: `handleAuth` (Đăng nhập và Đăng ký)
*   **File path đầy đủ**: `f:\FPT\OJT\Delta_galil\yarn-tracker\app\login.tsx`
*   **Component chứa**: `LoginScreen`
*   **Called By**: `<TouchableOpacity onPress={handleAuth} ... />` tại dòng 210.
*   **Khoảng dòng code thực tế**: 37-108

```typescript
  async function handleAuth() {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter both your email address and password to continue.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid work email address (e.g., name@deltagalil.com).');
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        Alert.alert('Missing Name', 'Please enter your full name for registration.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Weak Password', 'For security, your password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Password Mismatch', 'The passwords you entered do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          Alert.alert('Registration Failed', error.message);
        } else {
          Alert.alert(
            'Registration Successful',
            'Your account has been created! You can now sign in using your credentials.'
          );
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          Alert.alert(
            'Sign In Failed',
            error.message === 'Invalid login credentials' 
              ? 'The email or password you entered is incorrect.' 
              : error.message
          );
        }
      }
    } catch (err: any) {
      Alert.alert('System Error', 'An unexpected network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }
```

*   **Chức năng nghiệp vụ**: Đăng nhập tài khoản công nhân nếu biến trạng thái `isSignUp` là `false`, hoặc Đăng ký tài khoản công nhân mới kèm thuộc tính tên đầy đủ (`full_name`) lưu trong metadata nếu `isSignUp` là `true`.
*   **Khi nào được gọi**: Khi người dùng nhấn nút xác nhận gửi thông tin Form trên màn hình Đăng nhập.
*   **Dữ liệu đầu vào**: Lấy trực tiếp từ các biến State cục bộ: `email`, `password`, `confirmPassword`, `fullName`, `isSignUp`.
*   **Dữ liệu đầu ra**: Không trả về dữ liệu trực tiếp (trả về Promise kiểu `void`).
*   **API được gọi**: `supabase.auth.signInWithPassword` (nếu đăng nhập) hoặc `supabase.auth.signUp` (nếu đăng ký).
*   **State bị thay đổi**: `loading` (chuyển sang `true` khi gửi request và quay lại `false` khi hoàn tất), `isSignUp` (chuyển về `false` để quay lại chế độ đăng nhập sau khi đăng ký thành công), `password` & `confirmPassword` (được reset về chuỗi rỗng sau khi đăng ký thành công).
*   **Điều hướng xảy ra**: Không điều hướng trực tiếp bên trong hàm. Việc chuyển hướng màn hình sang `(tabs)` được kích hoạt một cách tự động bởi sự kiện thay đổi session mà Root Layout `app/_layout.tsx` lắng nghe được.
*   **Các màn hình bị ảnh hưởng**: Màn hình `login.tsx` (hiển thị trạng thái xoay tải dữ liệu) và `app/_layout.tsx` (thay đổi trạng thái render).

---

### Hàm: `handleMove` (Di chuyển vị trí kệ chứa sợi)
*   **File path đầy đủ**: `f:\FPT\OJT\Delta_galil\yarn-tracker\app\move\[id].tsx`
*   **Component chứa**: `MoveYarnScreen`
*   **Called By**: Phím bấm xác nhận di chuyển ở footer giao diện: `<TouchableOpacity onPress={handleMove} ... />` tại dòng 166.
*   **Khoảng dòng code thực tế**: 55-105

```typescript
  async function handleMove() {
    if (!selectedAreaId || !yarn) return;

    Alert.alert(
      'Confirm Move',
      `Move ${yarn.yarn_code} to area ${areas.find(a => a.id === selectedAreaId)?.code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSaving(true);

            const { data: { user } } = await supabase.auth.getUser();

            // Step 1: Log the move FIRST (for data integrity)
            const { error: logError } = await supabase.from('move_logs').insert({
              yarn_roll_id: yarn.id,
              from_area_id: yarn.area_id,
              to_area_id: selectedAreaId,
              moved_by: user?.id,
            });

            if (logError) {
              Alert.alert('Error', 'Failed to log the move. Please try again.');
              setSaving(false);
              return;
            }

            // Step 2: Update the yarn's current position
            const { error: updateError } = await supabase
              .from('yarn_rolls')
              .update({ area_id: selectedAreaId, updated_at: new Date().toISOString() })
              .eq('id', yarn.id);

            setSaving(false);

            if (updateError) {
              Alert.alert('Error', 'Move logged but position update failed. Contact admin.');
              return;
            }

            // Success — go back to the board
            Alert.alert('✅ Moved!', `${yarn.yarn_code} is now in the new area.`, [
              { text: 'OK', onPress: () => router.push('/') },
            ]);
          },
        },
      ]
    );
  }
```

*   **Chức năng nghiệp vụ**: Ghi chép nhật ký hành trình di dời cuộn sợi và thay đổi thuộc tính định vị khu vực của cuộn sợi trên hệ thống số.
*   **Khi nào được gọi**: Khi công nhân bấm nút xác nhận trên giao diện và bấm tiếp "Confirm" trên hộp thoại thông báo hỏi ý kiến.
*   **Dữ liệu đầu vào**: Lấy dữ liệu ID kệ cũ từ đối tượng `yarn` và ID kệ đích từ biến State `selectedAreaId`.
*   **Dữ liệu đầu ra**: Trả về Promise kiểu `void`.
*   **API được gọi**:
    *   `supabase.auth.getUser()`: Lấy ID tài khoản công nhân hiện hành để ghi nhận người thực thi hành động di dời.
    *   `supabase.from('move_logs').insert()`: Lưu vết hành trình di chuyển kệ.
    *   `supabase.from('yarn_rolls').update()`: Cập nhật kệ hàng đích mới cho cuộn sợi.
*   **State bị thay đổi**: `saving` (chuyển sang `true` khi bắt đầu ghi và quay lại `false` khi kết thúc giao dịch).
*   **Điều hướng xảy ra**: Gọi lệnh `router.push('/')` để quay về trang bảng Whiteboard chính sau khi thành công.
*   **Các màn hình bị ảnh hưởng**: Màn hình `app/move/[id].tsx` (vô hiệu hóa nút và hiện spinner xoay) và trang Board chính `app/(tabs)/index.tsx` (cập nhật lại số liệu kệ hàng do sự kiện Real-time được kích hoạt).

---

### Hàm: `handleSave` (Khai báo sợi mới nhập kho)
*   **File path đầy đủ**: `f:\FPT\OJT\Delta_galil\yarn-tracker\app\(tabs)\add.tsx`
*   **Component chứa**: `AddYarnScreen`
*   **Called By**: Phím bấm lưu dữ liệu: `<TouchableOpacity onPress={handleSave} ... />` tại dòng 168.
*   **Khoảng dòng code thực tế**: 47-106

```typescript
  async function handleSave() {
    if (!yarnCode.trim()) {
      Alert.alert('Required', 'Please enter a yarn code.');
      return;
    }
    if (!selectedAreaId) {
      Alert.alert('Required', 'Please select a storage area.');
      return;
    }

    setSaving(true);

    // Check if this yarn code already exists
    const { data: existing } = await supabase
      .from('yarn_rolls')
      .select('id')
      .eq('yarn_code', yarnCode.trim().toUpperCase())
      .single();

    if (existing) {
      Alert.alert('Duplicate', `Yarn code "${yarnCode.toUpperCase()}" already exists in the system.`);
      setSaving(false);
      return;
    }

    // Insert the new yarn roll
    const { data: newYarn, error } = await supabase
      .from('yarn_rolls')
      .insert({
        yarn_code: yarnCode.trim().toUpperCase(),
        color: color.trim() || null,
        type: type.trim() || null,
        area_id: selectedAreaId,
        status: 'in_stock',
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
      setSaving(false);
      return;
    }

    // Log the initial placement
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('move_logs').insert({
      yarn_roll_id: newYarn.id,
      from_area_id: null,       // null = came from outside
      to_area_id: selectedAreaId,
      moved_by: user?.id,
      note: 'Initial placement',
    });

    setSaving(false);
    Alert.alert('✅ Success', `Yarn ${newYarn.yarn_code} added successfully!`, [
      { text: 'Add Another', onPress: () => { setYarnCode(''); setColor(''); setType(''); setSelectedAreaId(null); } },
      { text: 'Go to Board', onPress: () => router.push('/') },
    ]);
  }
```

*   **Chức năng nghiệp vụ**: Kiểm tra tính duy nhất của mã số cuộn sợi định đăng ký, chèn dữ liệu cuộn sợi mới vào danh mục và tạo vết định vị ban đầu trong lịch sử di chuyển.
*   **Khi nào được gọi**: Khi công nhân hoàn thành điền form khai báo sợi mới và bấm nút "Save Yarn Roll".
*   **Dữ liệu đầu vào**: Các trường nhập liệu lưu trong state: `yarnCode`, `color`, `type`, `selectedAreaId`.
*   **API được gọi**:
    *   `supabase.from('yarn_rolls').select('id').eq(...)`: Kiểm tra mã trùng lặp.
    *   `supabase.from('yarn_rolls').insert()`: Lưu thông số cuộn sợi.
    *   `supabase.auth.getUser()`: Nhận dạng tài khoản khai báo.
    *   `supabase.from('move_logs').insert()`: Lưu lịch sử định vị ban đầu (`from_area_id: null`, note: `'Initial placement'`).
*   **State bị thay đổi**: `saving` (bật/tắt trạng thái ghi dữ liệu), và reset các state `yarnCode`, `color`, `type`, `selectedAreaId` về rỗng/null nếu người dùng chọn tùy chọn "Add Another".
*   **Điều hướng xảy ra**: Dẫn hướng tới `/` (trang Board) nếu chọn tùy chọn "Go to Board".

---

### Hàm: `handleLogout` (Đăng xuất khỏi thiết bị)
*   **File path đầy đủ**: `f:\FPT\OJT\Delta_galil\yarn-tracker\app\(tabs)\index.tsx`
*   **Component chứa**: `BoardScreen`
*   **Called By**: Nút bấm trên thanh header: `<TouchableOpacity onPress={handleLogout} ... />` tại dòng 78.
*   **Khoảng dòng code thực tế**: 31-47

```typescript
  async function handleLogout() {
    const performSignOut = async () => {
      try {
        await supabase.auth.signOut();
        // Force redirect to login screen to prevent any web routing freeze
        router.replace('/login');
      } catch (error: any) {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm('Are you sure you want to sign out?');
      if (confirmLogout) {
        await performSignOut();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: performSignOut,
        },
      ]);
    }
  }
```

*   **Chức năng nghiệp vụ**: Hủy bỏ phiên làm việc hiện tại, xóa sạch token xác thực lưu trên thiết bị di động để tránh người ngoài truy cập trái phép vào kho dữ liệu.
*   **Khi nào được gọi**: Khi công nhân chạm vào nút biểu tượng "Logout" trên thanh tiêu đề của bảng Whiteboard chính.
*   **API được gọi**: `supabase.auth.signOut()`.
*   **Điều hướng xảy ra**: Thực hiện chuyển hướng cứng cưỡng chế thiết bị quay ra màn hình đăng nhập `/login` bằng `router.replace('/login')`.

---

## 7. CẤU TRÚC LOGIC CỦA TỪNG FILE MÃ NGUỒN (LOGIC BLOCK EXTRACIONS)

Dưới đây là phần trích lục các khối lệnh xử lý trọng tâm trong các tệp tin để phục vụ công tác gỡ lỗi và hiểu luồng hoạt động:

### [app/_layout.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/_layout.tsx)

```typescript
  useEffect(() => {
    // Check if there's an existing session on app start
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for login / logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);
```
*   **Mục đích**: Nhận diện trạng thái xác thực lúc khởi chạy ứng dụng di động và đăng ký listener thu thập biến động đăng nhập/đăng xuất.
*   **Luồng dữ liệu**: Đọc session từ AsyncStorage cục bộ -> cập nhật state `session`. Lắng nghe tín hiệu Auth từ Supabase Server -> cập nhật state `session` khi đăng nhập hoặc đăng xuất.
*   **Tác động tới hệ thống**: Đóng vai trò là cầu dao chính quyết định hiển thị màn hình ngoài (Login) hay màn hình trong (Tabs).

```typescript
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'area' || segments[0] === 'yarn' || segments[0] === 'move';
    const isLoginScreen = segments[0] === 'login';

    if (!session && !isLoginScreen) {
      // Redirect to the login screen
      router.replace('/login');
    } else if (session && (isLoginScreen || !segments[0])) {
      // Redirect to the home screen
      router.replace('/(tabs)');
    }
  }, [session, segments, loading]);
```
*   **Mục đích**: Thiết lập bộ lọc định tuyến Route Guard bảo vệ dữ liệu.
*   **Luồng dữ liệu**: So sánh đường dẫn hiện hành lưu trong mảng `segments` với thông tin của state `session`.
*   **Tác động tới hệ thống**: Ngăn chặn người dùng nặc danh truy cập hoặc cố tình can thiệp vào các màn hình tác nghiệp bên trong kho.

---

### [hooks/useBoard.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/hooks/useBoard.ts)

```typescript
  async function fetchBoard() {
    const { data, error } = await supabase
      .from('areas')
      .select(`
        *,
        yarn_rolls (
          id,
          yarn_code,
          color,
          type
        )
      `)
      .eq('is_active', true)
      .order('code');
      console.log(data)
      console.log(error)

    if (error) {
      setError(error.message);
    } else {
      // Flatten the count from Supabase's nested format
      const formatted: AreaWithCount[] = (data || []).map((area: any) => ({
        ...area,
        yarn_count: area.yarn_rolls?.length ?? 0,
      }));
      setAreas(formatted);
    }
    setLoading(false);
  }
```
*   **Mục đích**: Tải dữ liệu các kệ hàng và tính toán số lượng cuộn sợi có trên từng kệ để hiển thị.
*   **Luồng dữ liệu**: Gọi API Supabase truy vấn bảng `areas` kết hợp nhúng mảng `yarn_rolls` -> Tính toán độ dài mảng nhúng của từng kệ -> Đưa vào state `areas` để cập nhật hiển thị giao diện.
*   **Tác động tới hệ thống**: Cung cấp số liệu hiển thị trực quan cho toàn bộ bảng Whiteboard chính.

```typescript
  useEffect(() => {
    fetchBoard();

    // Real-time: listen for any change in yarn_rolls table
    // When a worker moves a yarn on another device, this screen auto-updates
    const subscription = supabase
      .channel('board-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'yarn_rolls' },
        () => {
          fetchBoard(); // re-fetch on any change
        }
      )
      .subscribe();

    // Clean up the subscription when the component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);
```
*   **Mục đích**: Thiết lập và dọn dẹp kênh lắng nghe biến động cơ sở dữ liệu thời gian thực.
*   **Luồng dữ liệu**: Kết nối mạng WebSockets lắng nghe bảng `yarn_rolls` -> Kích hoạt chạy lại hàm `fetchBoard()` khi nhận sự kiện.
*   **Tác động tới hệ thống**: Đảm bảo số liệu trên bảng Whiteboard luôn đồng bộ tức thời giữa tất cả điện thoại của công nhân trong nhà máy mà không cần thao tác tải lại trang thủ công.

---

### [app/move/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/move/[id].tsx)

```typescript
  useEffect(() => {
    async function loadData() {
      // Load the yarn roll with its current area
      const { data: yarnData } = await supabase
        .from('yarn_rolls')
        .select('*, areas(id, code)')
        .eq('id', id)
        .single();

      // Load all active areas except the current one
      const { data: areaData } = await supabase
        .from('areas')
        .select('*')
        .eq('is_active', true)
        .order('code');

      setYarn(yarnData);
      // Filter out the area the yarn is already in
      setAreas((areaData || []).filter((a: Area) => a.id !== yarnData?.area_id));
      setLoading(false);
    }
    loadData();
  }, [id]);
```
*   **Mục đích**: Tải dữ liệu ban đầu cho màn hình thao tác dịch chuyển kệ.
*   **Luồng dữ liệu**: Đọc ID cuộn sợi từ URL -> Truy vấn thông số cuộn sợi hiện hành -> Truy vấn toàn bộ các kệ hàng có thuộc tính `is_active` là `true` -> Lọc bỏ kệ hàng hiện tại đang chứa cuộn sợi đó khỏi danh sách chọn -> Lưu vào state `yarn` và `areas`.
*   **Tác động tới hệ thống**: Đảm bảo công nhân chỉ chọn di chuyển cuộn sợi tới những kệ hàng hợp lệ và khác với kệ hiện hành.

---

## 8. PHÂN TÍCH QUAN HỆ & LUỒNG CỦA CƠ SỞ DỮ LIỆU (DATABASE SCHEMA & INTEGRATION)

Ứng dụng kết nối trực tiếp và tương tác với 3 bảng quan hệ PostgreSQL sau trên Supabase:

### Bảng 1: `areas` (Danh mục kệ hàng)
*   **Vai trò**: Lưu trữ thông tin tọa độ các khu vực kệ trong kho (ví dụ: kệ A1.1, A1.2...).
*   **Trường dữ liệu**: `id` (Khóa chính), `code` (Mã kệ), `label` (Mô tả vị trí kệ), `is_active` (Trạng thái kệ có hoạt động hay không).
*   **Quan hệ**: Một kệ hàng chứa nhiều cuộn sợi (Quan hệ 1 - Nhiều với bảng `yarn_rolls`).

### Bảng 2: `yarn_rolls` (Danh mục cuộn sợi)
*   **Vai trò**: Lưu danh sách và tọa độ hiện thời của từng cuộn sợi đang theo dõi.
*   **Trường dữ liệu**: `id` (Khóa chính), `yarn_code` (Mã định danh), `color` (Màu), `type` (Chủng loại), `area_id` (Khóa ngoại liên kết tới cột `id` của bảng `areas`), `status` (Trạng thái cuộn sợi: `in_stock`, `retrieved`, `consumed`), `updated_at` (Thời điểm di dời cuối cùng).
*   **Quan hệ**: Trường `area_id` liên kết khóa ngoại với bảng `areas`. Quan hệ Một - Nhiều với bảng `move_logs`.

### Bảng 3: `move_logs` (Nhật ký hành trình di dời)
*   **Vai trò**: Lưu trữ vết dịch chuyển lịch sử của từng cuộn sợi phục vụ mục đích kiểm toán chất lượng.
*   **Trường dữ liệu**: `id` (Khóa chính), `yarn_roll_id` (Khóa ngoại liên kết tới cột `id` bảng `yarn_rolls`), `from_area_id` (Khóa ngoại liên kết tới kệ xuất phát - có thể null), `to_area_id` (Khóa ngoại liên kết tới kệ đích - có thể null), `moved_by` (ID tài khoản công nhân thực thi di dời lấy từ auth), `moved_at` (Ngày giờ thao tác), `note` (Ghi chú).

### Vai trò của Auth & Realtime:
*   **Supabase Auth**: Dùng để quản lý tài khoản công nhân, cấp Token JWT xác minh danh tính người thao tác di chuyển lưu vào trường `moved_by` của bảng `move_logs`.
*   **Supabase Realtime**: Lắng nghe mọi biến động của bảng `yarn_rolls` để tự động đẩy sự kiện cập nhật số liệu hiển thị về tất cả thiết bị di động đang mở màn hình Board chính.

---

## 9. PHÂN TÍCH TÁC ĐỘNG KHI SỬA ĐỔI FILE (IMPACT ANALYSIS MATRIX)

Nếu lập trình viên thực hiện thay đổi cấu trúc mã nguồn ở các vị trí dưới đây, các tính năng liên quan sẽ bị ảnh hưởng trực tiếp:

| File bị chỉnh sửa | Chức năng bị ảnh hưởng trực tiếp | Mức độ rủi ro | Chi tiết tác động & Phương án xử lý |
| :--- | :--- | :--- | :--- |
| [app/_layout.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/_layout.tsx) | Toàn bộ phân hệ Xác thực (Auth Guard) và định tuyến chuyển màn hình. | **CAO** | Có thể làm mất hiệu lực bảo vệ màn hình trong, khiến người dùng chưa đăng nhập vẫn mở được hệ thống, hoặc ngược lại gây lỗi lặp chuyển hướng vô hạn (redirect loop) khiến công nhân không thể vào được màn hình chính sau khi đăng nhập thành công. |
| [lib/supabase.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/lib/supabase.ts) | Toàn bộ các kết nối mạng tới Supabase Backend (Auth, Database, Realtime). | **RẤT CAO** | Có thể làm sập toàn bộ ứng dụng, gây lỗi không tải được dữ liệu, không thể đăng nhập hoặc làm mất khả năng duy trì phiên đăng nhập ngoại tuyến của thiết bị di động. |
| [hooks/useBoard.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/hooks/useBoard.ts) | Màn hình chính Board View (`app/(tabs)/index.tsx`). | **TRUNG BÌNH** | Có thể làm lỗi việc tính toán hiển thị số lượng sợi thực tế trên các kệ hàng, hoặc làm hỏng chức năng tự động cập nhật số liệu thời gian thực khi các thiết bị khác thao tác. |
| [app/move/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/move/[id].tsx) | Hoạt động đổi vị trí kệ hàng cho cuộn sợi. | **TRUNG BÌNH** | Chỉnh sửa không chuẩn xác có thể dẫn đến hiện tượng cuộn sợi đã đổi kệ vật lý nhưng hệ thống không lưu vết, hoặc dữ liệu kệ cũ/kệ mới bị cập nhật sai lệch gây mất kiểm soát vị trí tồn kho. |
| [types/index.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/types/index.ts) | Toàn bộ cấu trúc định nghĩa dữ liệu tĩnh của hệ thống. | **TRUNG BÌNH** | Trình biên dịch TypeScript sẽ báo lỗi biên dịch ở hầu hết các file tương tác dữ liệu, đòi hỏi lập trình viên phải đồng bộ sửa đổi toàn bộ các trường dữ liệu tương thích ở tất cả các file liên quan. |

---

## 10. ĐỀ XUẤT CẢI TIẾN KỸ THUẬT (TECHNICAL RECOMMENDATIONS)

### 1. Nâng cao Hiệu năng (Performance)
*   **Vấn đề hiện tại**: Khi màn hình Board chính `index.tsx` nhận tín hiệu realtime từ Supabase, nó gọi lại toàn bộ hàm `fetchBoard()` để kéo lại toàn bộ danh sách kệ hàng kèm mảng sợi nhúng của tất cả các kệ.
*   **Đề xuất**: Tách bộ đếm số lượng sợi ra thành một bảng thống kê riêng hoặc cập nhật state cục bộ của chỉ duy nhất kệ hàng bị biến động dựa trên dữ liệu payload trả về trong sự kiện cập nhật của realtime channel (`payload.new` và `payload.old`), tránh việc tải lại toàn bộ cơ sở dữ liệu.

### 2. Tối ưu hóa Realtime
*   **Vấn đề hiện tại**: Chỉ có màn hình chính Board (`index.tsx`) được tích hợp cơ chế tự động đồng bộ realtime qua hook `useBoard.ts`. Màn hình danh sách cuộn sợi tại kệ hàng (`area/[id].tsx`) và màn hình xem dòng lịch sử (`yarn/[id].tsx`) không có cơ chế realtime.
*   **Đề xuất**: Đăng ký listener lắng nghe realtime tương tự trên `useArea.ts` và `useYarn.ts` để đồng bộ giao diện tức thời cho công nhân khi họ đang mở xem chi tiết một kệ hàng hoặc xem lý lịch một cuộn sợi cụ thể.

### 3. Kiểm soát lỗi nâng cao (Error Handling)
*   **Vấn đề hiện tại**: Các giao dịch cập nhật di chuyển vị trí kệ hàng trong `app/move/[id].tsx` đang được thực thi dưới dạng hai lệnh gọi API tuần tự từ client. Nếu lệnh 1 thành công nhưng lệnh 2 thất bại do lỗi kết nối mạng, dữ liệu lịch sử sẽ bị lỗi bất nhất.
*   **Đề xuất**: Viết một Database Trigger hoặc hàm RPC trên Supabase để di chuyển logic ghi log vào tầng cơ sở dữ liệu. Client chỉ cần gửi một request cập nhật duy nhất, database sẽ tự thực thi ghi nhật ký dưới dạng giao dịch nguyên tử (Atomic Transaction), đảm bảo cả 2 hành động cùng thành công hoặc cùng thất bại.

### 4. Hỗ trợ hoạt động ngoại tuyến (Offline Support)
*   **Vấn đề hiện tại**: Hệ thống phụ thuộc hoàn toàn vào mạng Internet. Nếu sóng wifi nhà xưởng chập chờn, công nhân sẽ không thể thực hiện lệnh di chuyển.
*   **Đề xuất**: Sử dụng SQLite hoặc WatermelonDB làm cơ sở dữ liệu ngoại tuyến cục bộ trên điện thoại. Khi mất mạng, công nhân vẫn thực hiện quét và di chuyển kệ bình thường, dữ liệu được ghi vào hàng đợi ngoại tuyến (Offline Queue) và tự động đồng bộ lên Supabase khi thiết bị có kết nối mạng trở lại.

### 5. Tích hợp quét mã QR Code (QR Code Integration)
*   **Vấn đề hiện tại**: Công nhân đang phải gõ thủ công mã cuộn sợi gây chậm trễ và dễ nhầm lẫn.
*   **Đề xuất**: Cài đặt thư viện `expo-camera` và tạo modal quét mã tích hợp trực tiếp vào ô TextInput tìm kiếm của `search.tsx` và khai báo mới của `add.tsx` để tối ưu hóa năng suất vận hành.
