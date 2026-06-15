# GIẢI THÍCH CHI TIẾT CÚ PHÁP & MÃ NGUỒN TỪNG FILE (LINE-BY-LINE DOCUMENTATION)
### DỰ ÁN: YARN TRACKER SYSTEM
**Vai trò:** Technical Mentor & Senior React Native Developer
**Đường dẫn file:** `f:\FPT\OJT\Delta_galil\yarn-tracker\docs\codebase_detail_explanation.md`

---

Tài liệu này giải thích chi tiết toàn bộ cú pháp code, vai trò của từng dòng import, biến state, hiệu ứng `useEffect`, các hàm xử lý dữ liệu và cấu trúc giao diện của từng file trong dự án **Yarn Tracker**. Dành cho lập trình viên muốn hiểu cặn kẽ từng dòng code để tự ửa chữa và nâng cấp ứng dụng.

---

## 1. PHÂN TÍCH TỆP: [lib/supabase.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/lib/supabase.ts)
Chiquita is a big banana company from the US.

It wants to stop working in Panama and will let go of all its workers. In May, it already let go of 5,000 workers. The workers were unhappy about new pension laws and started a strike. The court said the strike was illegal, but it still went on.

Panama’s president says this is very bad for the country. Many people work on banana farms, and if the farms close, 7,000 people will lose their jobs. This will cause problems like less food and fuel, and many schools may close.

The government hopes to find a solution. They want to talk with the workers and the company, but the workers don’t want to talk. If they don’t find a way, life will be harder for many people.
Tệp này đảm nhận vai trò thiết lập kết nối mạng và lưu trữ phiên làm việc của người dùng với cơ sở dữ liệu Supabase.

### Giải thích mã nguồn chi tiết:
Chiquita í a big bânna company fromm the US. It wants to stop working in Panama and will let go of all its workers. In May, it already let go of 5,000 workers. The workers were unhappy about new pension laws and started a strike. The court said the strike was illegal, but it still went on.
Panama's president say this is very bad for the country. Many people work on banama farms, and if the farms close, 7,000 people will lose their jobs. This will cause problems like less food and fuel, and many school may
```typescript close.
 The goverment hopes to find a solution. They want to talk with the workers and the company, but the workers don't want to talk. If they don't find a way, life will be harder for many people.  

Dawa Sherpa is a mountain guide in Nepal. He gets lost on Mount Everest for a week. It is very cold. His family thinks that he is dead. His wife and daughter start a funeral at home and cry for him.

But Dawa is not dead. He crawls in the white snow for six days to find help. A team of men finds him near the base camp. His hands are hurt by the ice, but he is safe. A helicopter takes him to a hospital to see his family. His daughter is very happy. It is like a dream for her.

People say that Dawa does not die because he is very strong. He loves the mountains.

import { createClient } from '@supabase/supabase-js';
Chiquite is not quite
import AsyncStorage from '@react-native-async-storage/async-storage';

Dawa Sherpa is a mountain guide in Nepal. He gets lost on Mount Everest for a week. It is very cold. His family thinks that he is dead. His wife and daughter start a funeral at home and cry for him. But Dawa is not dead. He crawls in the white snow for six days to find help. A team of men finds him near the base camp. His hands are hurt by the ice, but he is safe. A helicopter takes him to a hospital to see his family. His daughter is very happy. It is like a dream for her. People say that Dawa does not die because he is very strong. He loves the mountains
```
*   `import { createClient } from '@supabase/supabase-js'`: Khai báo sử dụng hàm `createClient` từ thư viện chính thức của Supabase để khởi tạo kết nối.
*   `import AsyncStorage from '@react-native-async-storage/async-storage'`: Nạp thư viện lưu trữ Key-Value trên điện thoại. Supabase Auth sẽ dùng bộ nhớ này để ghi nhớ thông t.in tài khoản đăng nhập của công nhân (không bắt họ đăng nhập lại mỗi khi mở app).

```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```
*   `process.env.EXPO_PUBLIC_...`: Đọc các biến môi trường cấu hình kết nối từ tệp `.env`. Tiền tố `EXPO_PUBLIC_` bắt buộc phải có để hệ thống bundler của Expo cho phép mã nguồn JavaScript phía client đọc được giá trị này. Dấu chấm than `!` ở cuối báo hiệu cho trình biên dịch TypeScript biết rằng biến này chắc chắn có giá trị, không bị null.

```typescript


A 52-year-old mountain guide named Dawa Sherpa went missing on Mount Everest for a week. He was high up on the world’s tallest mountain, where it is very cold and there is not enough air to breathe.

His family thought he was dead, so his wife and young daughter started a traditional funeral at home. But then, a miracle happened. A rescue team saw Dawa crawling in the snow near the base camp. He couldn’t walk, and his hands were hurt by the extreme cold, but he was alive. The team gave him food and water, and a helicopter took him to a hospital. His daughter said they were very happy but shocked when they saw photos of their father in the local news.

People say he survived because mountain guides in Nepal are very strong and know how to live in bad weather.

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,

A 52-year-old mountain guide named Dawa Sherpa went missing on Mount Everest for a week. He was high up on the world's tallest mountain, where it is very cold and there is not enough air to breathe. His family thought he was dead, so his wife and young daughter started a traditional funeral at home
  },
});
```
*   `export const supabase = createClient(...)`: Khởi tạo và xuất ra thực thể kết nối.
*   `storage: AsyncStorage`: Ép Supabase sử dụng ổ cứng điện thoại làm nơi lưu Token.
*   `autoRefreshToken: true`: Tự động làm mới mã bảo mật (Access Token) khi hết hạn 1 tiếng mà không làm ngắt quãng phiên làm việc của công nhân.
*   `persistSession: true`: Lưu lại trạng thái đăng nhập vĩnh viễn trên máy cho đến khi nhấn nút Logout.
*   `detectSessionInUrl: false`: Vô hiệu hóa tính năng tự bắt link đăng nhập trên URL vì đây là ứng dụng di động, không sử dụng luồng đăng nhập qua trang web chuyển hướng.

---

## 2. PHÂN TÍCH TỆP: [types/index.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/types/index.ts)

Tệp này định nghĩa các kiểu dữ liệu (TypeScript Interfaces) đại diện cho các thực thể lưu trữ trên PostgreSQL.

### Giải thích mã nguồn chi tiết:

```typescript
export type Area = {
  id: string;
  code: string;       // ví dụ: "A1.1"
  label: string | null; // ví dụ: "Rack A, Row 1, Slot 1"
  is_active: boolean;
};
```
*   `export type Area`: Định nghĩa cấu trúc khu vực kệ chứa. Trường `code` là mã viết tắt dùng để vẽ lên lưới chính, `is_active` để quản lý kệ đó còn sử dụng được không.

```typescript
export type YarnRoll = {
  id: string;
  yarn_code: string;  // ví dụ: "YRN-0042"
  color: string | null;
  type: string | null;
  area_id: string | null;   // null = cuộn sợi không nằm trên sàn kệ
  status: 'in_stock' | 'retrieved' | 'consumed';
  updated_at: string;
  areas?: Area; // Dữ liệu kệ hàng tương ứng khi thực hiện join query
};
```
*   `status`: Chỉ nhận 1 trong 3 trạng thái cố định: `in_stock` (trong kho), `retrieved` (đang trung chuyển), `consumed` (đã sử dụng hết).

```typescript
export type MoveLog = {
  id: string;
  yarn_roll_id: string;
  from_area_id: string | null;
  to_area_id: string | null;
  moved_by: string;     // ID tài khoản auth.users thực hiện di chuyển
  moved_at: string;
  note: string | null;
  from_area?: Area;
  to_area?: Area;
};
```
*   `MoveLog`: Ghi nhận nhật ký di dời kệ. Lưu vết kệ đi (`from_area_id`) và kệ đến (`to_area_id`). Nếu `from_area_id` là `null`, có nghĩa là cuộn sợi vừa được nhập kho lần đầu tiên.

---

## 3. PHÂN TÍCH TỆP: [hooks/useBoard.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/hooks/useBoard.ts)

Đây là Custom Hook quản lý dữ liệu hiển thị toàn cảnh các kệ hàng trên màn hình chính và tự động làm mới khi có thay đổi.

### Giải thích mã nguồn chi tiết:

```typescript
export function useBoard() {
  const [areas, setAreas] = useState<AreaWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
```
*   `areas`: Lưu trữ danh sách kệ hàng kèm số lượng sợi thực tế sau khi tính toán.
*   `loading`: Trạng thái xoay tải dữ liệu của màn hình. Mặc định khởi tạo là `true` (đang tải).

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
```
*   `select('*, yarn_rolls(...)')`: Câu lệnh truy vấn quan hệ (Join Query) lấy tất cả thông tin kệ hàng từ bảng `areas` và nhúng kèm tất cả cuộn sợi thuộc kệ đó từ bảng `yarn_rolls`.
*   `eq('is_active', true)`: Chỉ lấy các kệ hàng đang hoạt động.
*   `order('code')`: Sắp xếp các kệ hàng theo thứ tự bảng chữ cái của mã kệ (ví dụ: A1.1 trước, A1.2 sau).

```typescript
    if (error) {
      setError(error.message);
    } else {
      const formatted: AreaWithCount[] = (data || []).map((area: any) => ({
        ...area,
        yarn_count: area.yarn_rolls?.length ?? 0,
      }));
      setAreas(formatted);
    }
    setLoading(false);
  }
```
*   `.map(...)`: Duyệt qua từng kệ hàng trong mảng dữ liệu trả về từ Supabase.
*   `yarn_count: area.yarn_rolls?.length ?? 0`: Đếm độ dài của mảng cuộn sợi nhúng kèm để tính ra số lượng sợi hiện tại của kệ đó, đưa vào thuộc tính `yarn_count`.
*   `setAreas(formatted)`: Cập nhật dữ liệu đã xử lý vào state để giao diện vẽ lại.

```typescript
  useEffect(() => {
    fetchBoard();

    const subscription = supabase
      .channel('board-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'yarn_rolls' },
        () => {
          fetchBoard(); // Tải lại toàn bộ bảng khi có bất kỳ dòng sợi nào bị sửa đổi
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription); // Ngắt kết nối WebSocket khi tắt màn hình
    };
  }, []);
```
*   `supabase.channel('board-realtime')`: Đăng ký một kênh WebSockets riêng với Supabase Realtime Server.
*   `on('postgres_changes', ...)`: Lắng nghe biến động của bảng `yarn_rolls`. Khi có bất kỳ ai di chuyển sợi hoặc thêm sợi, Supabase sẽ báo về điện thoại qua WebSocket, kích hoạt hàm callback chạy lại `fetchBoard()`.

---

## 4. PHÂN TÍCH TỆP: [app/_layout.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/_layout.tsx)

Root Layout điều phối trạng thái đăng nhập hệ thống và cấu hình chuyển trang tự động.

### Giải thích mã nguồn chi tiết:

```typescript
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();
```
*   `segments`: Nhận mảng các phần của URL hiện hành. Ví dụ nếu URL là `/yarn/12`, segments là `['yarn', '12']`.

```typescript
  useEffect(() => {
    // 1. Kiểm tra session đăng nhập cũ khi khởi chạy ứng dụng
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Đăng ký listener nhận sự kiện Đăng nhập / Đăng xuất tức thời
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe(); // Hủy đăng ký listener khi tắt app
  }, []);
```
*   `onAuthStateChange()`: Tự động chạy callback cập nhật state `session` mỗi khi người dùng hoàn tất đăng nhập hoặc nhấn đăng xuất.

```typescript
  useEffect(() => {
    if (loading) return; // Đợi kiểm tra xong session ban đầu mới xử lý chuyển hướng

    const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'area' || segments[0] === 'yarn' || segments[0] === 'move';
    const isLoginScreen = segments[0] === 'login';

    if (!session && !isLoginScreen) {
      router.replace('/login'); // Chưa đăng nhập -> Buộc quay ra màn hình Login
    } else if (session && (isLoginScreen || !segments[0])) {
      router.replace('/(tabs)'); // Đã đăng nhập -> Đẩy vào màn hình chính Board
    }
  }, [session, segments, loading]);
```
*   `router.replace(...)`: Chuyển trang cứng, xóa màn hình trước đó ra khỏi ngăn xếp điều hướng để ngăn người dùng nhấn phím Back quay lại trang cũ.

```typescript
  return (
    <View style={{ flex: 1, backgroundColor: '#e2e8f0', alignItems: 'center' }}>
      <View style={{ 
        flex: 1, 
        width: '100%', 
        maxWidth: 500, // Khóa độ rộng tối đa 500px để giao diện hiển thị đẹp như điện thoại khi chạy trên web máy tính
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        overflow: 'hidden'
      }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="area/[id]" options={{ title: 'Area Detail' }} />
          <Stack.Screen name="yarn/[id]" options={{ title: 'Yarn History' }} />
          <Stack.Screen name="move/[id]" options={{ title: 'Move Yarn' }} />
        </Stack>
      </View>
    </View>
  );
```
*   `<Stack>`: Khai báo bộ khung điều hướng trang dạng ngăn xếp. Chỉ có màn hình chính `(tabs)` và `login` được ẩn thanh tiêu đề gốc của Expo (`headerShown: false`) vì các màn hình này đã tự vẽ header tùy biến riêng.

---

## 5. PHÂN TÍCH TỆP: [app/login.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/login.tsx)

Màn hình Đăng nhập & Đăng ký tài khoản.

### Giải thích mã nguồn chi tiết:

```typescript
export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
```
*   `isSignUp`: Khống chế giao diện hiển thị. Nếu `false` hiện form Đăng nhập, nếu `true` hiển thị thêm ô nhập Họ tên và Nhắc lại mật khẩu để đăng ký.

```typescript
  const isValidEmail = (emailStr: string) => {
    const reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return reg.test(emailStr.trim());
  };
```
*   `isValidEmail`: Hàm kiểm tra cú pháp email đầu vào qua biểu thức chính quy Regex, đảm bảo người dùng nhập đúng định dạng hòm thư điện tử.

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
    // ... Kiểm tra xác thực họ tên, mật khẩu trùng khớp ở chế độ đăng ký ...
    setLoading(true);
```
*   `Alert.alert(...)`: Hiển thị hộp thoại cảnh báo của hệ điều hành Android/iOS khi biểu mẫu điền bị thiếu thông tin hoặc sai định dạng.

```typescript
    try {
      if (isSignUp) {
        // Luồng Đăng ký tài khoản mới
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(), // Lưu họ tên vào cột metadata tài khoản
            },
          },
        });
        if (error) {
          Alert.alert('Registration Failed', error.message);
        } else {
          Alert.alert('Registration Successful', 'Your account has been created! You can now sign in...');
          setIsSignUp(false); // Chuyển về chế độ đăng nhập
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        // Luồng Đăng nhập tài khoản hiện tại
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          Alert.alert('Sign In Failed', error.message === 'Invalid login credentials' ? ...);
        }
      }
    } catch (err: any) {
      Alert.alert('System Error', 'An unexpected network error occurred.');
    } finally {
      setLoading(false); // Tắt spinner tải
    }
  }
```
*   `supabase.auth.signUp(...)`: Gửi yêu cầu đăng ký lên máy chủ. Họ tên được truyền qua trường `options.data` để gán vào metadata của tài khoản trên database.
*   `supabase.auth.signInWithPassword(...)`: Kiểm tra thông tin tài khoản và mật khẩu để cấp session.

---

## 6. PHÂN TÍCH TỆP: [app/(tabs)/index.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/index.tsx)

Màn hình Whiteboard chính hiển thị sơ đồ các kệ hàng và số lượng cuộn sợi thực tế.

### Giải thích mã nguồn chi tiết:

```typescript
export default function BoardScreen() {
  const router = useRouter();
  const { areas, loading, refetch } = useBoard(); // Gọi custom hook lấy dữ liệu
```
*   `useBoard()`: Rút trích các trạng thái và hàm tải dữ liệu ra từ Custom Hook đã phân tích ở phần 3.

```typescript
  async function handleLogout() {
    const performSignOut = async () => {
      try {
        await supabase.auth.signOut();
        router.replace('/login'); // Ép buộc quay ra màn hình login sau khi signOut
      } catch (error: any) {
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    };
    // ... Xử lý xác nhận Logout riêng cho Web (window.confirm) và Mobile (Alert.alert) ...
  }
```
*   `supabase.auth.signOut()`: Gọi lệnh hủy session của tài khoản hiện tại trên máy chủ Supabase và bộ nhớ máy.

```typescript
  function getAreaColor(count: number) {
    if (count === 0) return '#f0fdf4'; // Trống -> Màu xanh lục nhạt
    if (count <= 3) return '#fefce8'; // Ít sợi (<=3) -> Màu vàng nhạt
    return '#fef2f2';                 // Nhiều sợi (>3) -> Màu đỏ nhạt
  }
```
*   `getAreaColor`: Hàm logic hỗ trợ phân biệt màu sắc kệ hàng dựa trên mật độ cuộn sợi đang chứa.

```typescript
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🧵 Yarn Board</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#ffffff" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* Lưới các kệ hàng */}
        <FlatList
          data={areas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.areaCard, { backgroundColor: getAreaColor(item.yarn_count) }]}
              onPress={() => router.push(`/area/${item.id}`)}
            >
              <Text style={styles.areaCode}>{item.code}</Text>
              <Text style={styles.yarnCount}>{item.yarn_count}</Text>
              <Text style={styles.yarnLabel}>{item.yarn_count === 1 ? 'yarn' : 'yarns'}</Text>
            </TouchableOpacity>
          )}
          numColumns={4} // Chia lưới thành 4 cột đều nhau
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        />
      </View>
    </SafeAreaView>
  );
```
*   `SafeAreaView`: Bảo vệ giao diện không bị chui vào phần tai thỏ (Notch) trên điện thoại iOS/Android. Màu nền của SafeAreaView được thiết lập trùng màu với Header (`#064e3b`) giúp thanh status bar hệ thống có màu xanh ngọc đồng bộ cực kỳ đẹp mắt.
*   `FlatList`: Component tối ưu hóa hiển thị danh sách dài trong React Native. Thuộc tính `numColumns={4}` chỉ định vẽ lưới chia làm 4 cột.
*   `RefreshControl`: Cho phép công nhân kéo màn hình từ trên xuống để chủ động tải lại dữ liệu mới nhất (Pull-to-refresh).

---

## 7. PHÂN TÍCH TỆP: [app/move/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/move/[id].tsx)

Màn hình xử lý đổi kệ hàng cho cuộn sợi.

### Giải thích mã nguồn chi tiết:

```typescript
export default function MoveYarnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // ID cuộn sợi cần di chuyển
  const router = useRouter();

  const [yarn, setYarn] = useState<YarnRoll | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
```
*   `yarn`: Lưu thông tin chi tiết cuộn sợi hiện tại.
*   `areas`: Danh sách các kệ hàng đích khả dụng để công nhân chọn di chuyển tới.
*   `selectedAreaId`: Kệ hàng đích đang được công nhân chọn trên màn hình.

```typescript
  useEffect(() => {
    async function loadData() {
      // 1. Tải thông tin cuộn sợi hiện tại kèm mã kệ hiện tại của nó
      const { data: yarnData } = await supabase
        .from('yarn_rolls')
        .select('*, areas(id, code)')
        .eq('id', id)
        .single();

      // 2. Tải toàn bộ danh sách kệ hàng đang hoạt động trong hệ thống
      const { data: areaData } = await supabase
        .from('areas')
        .select('*')
        .eq('is_active', true)
        .order('code');

      setYarn(yarnData);
      // Lọc bỏ kệ hiện tại khỏi danh sách kệ đích để tránh chọn nhầm di chuyển tới chính nó
      setAreas((areaData || []).filter((a: Area) => a.id !== yarnData?.area_id));
      setLoading(false);
    }
    loadData();
  }, [id]);
```
*   `select('*, areas(id, code)')`: Lấy thông tin chi tiết của sợi và nối bảng để hiển thị tên kệ hiện tại của nó lên UI.
*   `.filter(...)`: Phép lọc mảng phía Client để ẩn kệ hiện hành khỏi danh sách lựa chọn.

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

            // BƯỚC 1: Ghi log lịch sử di chuyển trước để đảm bảo tính toàn vẹn dữ liệu vết
            const { error: logError } = await supabase.from('move_logs').insert({
              yarn_roll_id: yarn.id,
              from_area_id: yarn.area_id,
              to_area_id: selectedAreaId,
              moved_by: user?.id,
            });

            if (logError) {
              Alert.alert('Error', 'Failed to log the move. Please try again.');
              setSaving(false);
              return; // Dừng lại không cập nhật tọa độ sợi nếu ghi log lỗi
            }

            // BƯỚC 2: Cập nhật tọa độ kệ mới cho cuộn sợi
            const { error: updateError } = await supabase
              .from('yarn_rolls')
              .update({ area_id: selectedAreaId, updated_at: new Date().toISOString() })
              .eq('id', yarn.id);

            setSaving(false);

            if (updateError) {
              Alert.alert('Error', 'Move logged but position update failed. Contact admin.');
              return;
            }

            Alert.alert('✅ Moved!', `${yarn.yarn_code} is now in the new area.`, [
              { text: 'OK', onPress: () => router.push('/') }, // Quay lại trang chính sau khi hoàn thành
            ]);
          },
        },
      ]
    );
  }
```
*   `supabase.auth.getUser()`: Lấy định danh tài khoản công nhân hiện hành từ phiên làm việc của hệ thống xác thực.
*   `supabase.from('move_logs').insert(...)`: Khởi tạo vết nhật ký di chuyển kệ mới.
*   `supabase.from('yarn_rolls').update(...)`: Thay đổi khóa ngoại `area_id` của cuộn sợi thành ID kệ mới chọn.

---

## 8. PHÂN TÍCH TỆP: [app/(tabs)/add.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/add.tsx)

Màn hình khai báo và đăng ký cuộn sợi mới khi nhập kho nhà xưởng.

### Giải thích mã nguồn chi tiết:

```typescript
export default function AddYarnScreen() {
  const router = useRouter();
  const [yarnCode, setYarnCode] = useState('');
  const [color, setColor] = useState('');
  const [type, setType] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
```
*   `yarnCode`, `color`, `type`: Các giá trị đầu vào của cuộn sợi mới.
*   `selectedAreaId`: Kệ hàng ban đầu được chọn để xếp cuộn sợi này lên.
*   `areas`: Danh sách toàn bộ các kệ hàng có sẵn để công nhân chọn.

```typescript
  useEffect(() => {
    async function loadAreas() {
      setLoading(true);
      const { data } = await supabase
        .from('areas')
        .select('*')
        .eq('is_active', true)
        .order('code');
      setAreas(data || []);
      setLoading(false);
    }
    loadAreas();
  }, []);
```
*   `useEffect`: Tải danh sách các kệ hàng hoạt động hiển thị ra lưới lựa chọn ngay khi màn hình Khai báo sợi được mở lên.

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

    // 1. Kiểm tra xem mã cuộn sợi định thêm đã tồn tại trong kho hay chưa
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

    // 2. Thêm cuộn sợi mới vào cơ sở dữ liệu
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

    // 3. Ghi vết nhật ký ban đầu vào bảng lịch sử di chuyển (from_area_id là null)
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('move_logs').insert({
      yarn_roll_id: newYarn.id,
      from_area_id: null,
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
*   `eq('yarn_code', yarnCode.trim().toUpperCase())`: Ép viết hoa toàn bộ mã sợi và loại bỏ khoảng trắng thừa hai đầu trước khi kiểm tra trùng lặp trên DB.
*   `from_area_id: null`: Quy ước kệ xuất phát là `null` biểu thị cuộn sợi được đưa vào hệ thống lần đầu từ thế giới bên ngoài, không phải di dời nội bộ giữa các kệ.

---

## 9. PHÂN TÍCH TỆP: [app/(tabs)/search.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/search.tsx)

Màn hình tìm kiếm nhanh vị trí cuộn sợi theo mã code.

### Giải thích mã nguồn chi tiết:

```typescript
export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YarnRoll[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
```
*   `query`: Chuỗi ký tự từ khóa gõ vào ô tìm kiếm.
*   `results`: Mảng chứa các cuộn sợi phù hợp tìm thấy từ Supabase.
*   `searched`: Đánh dấu đã bấm tìm kiếm ít nhất một lần để quyết định hiển thị gợi ý hướng dẫn hay thông báo "Không tìm thấy kết quả".

```typescript
  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from('yarn_rolls')
      .select('*, areas(id, code, label)')
      .ilike('yarn_code', `%${query.trim()}%`) // Tìm kiếm tương đối không phân biệt hoa thường
      .order('updated_at', { ascending: false })
      .limit(20); // Giới hạn tối đa 20 dòng trả về để tránh quá tải mạng

    setLoading(false);
    if (!error) {
      setResults(data || []);
    }
  }
```
*   `ilike(...)`: Cú pháp truy vấn SQL tìm kiếm tương đối (chứa chuỗi). Ký tự `%` biểu thị khớp với bất kỳ chuỗi ký tự nào đứng trước hoặc đứng sau từ khóa.
*   `limit(20)`: Giới hạn số lượng bản ghi trả về, cải thiện tốc độ phản hồi giao diện.

---

## 10. PHÂN TÍCH TỆP: [app/area/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/area/[id].tsx)

Màn hình danh sách cuộn sợi thuộc một kệ cụ thể.

### Giải thích mã nguồn chi tiết:

```typescript
export default function AreaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); // Lấy ID kệ hàng từ URL
  const router = useRouter();
  const { yarns, loading, refetch } = useArea(id); // Sử dụng custom hook lấy dữ liệu sợi
```
*   `useArea(id)`: Custom Hook thực hiện tải danh sách cuộn sợi của kệ đang xem.

```typescript
  function renderYarn({ item }: { item: YarnRoll }) {
    return (
      <TouchableOpacity
        style={styles.yarnCard}
        onPress={() => router.push(`/yarn/${item.id}`)}
      >
        <View style={styles.yarnLeft}>
          <Text style={styles.yarnCode}>{item.yarn_code}</Text>
          <Text style={styles.yarnMeta}>
            {[item.color, item.type].filter(Boolean).join(' · ') || 'No details'}
          </Text>
        </View>
        <View style={styles.yarnActions}>
          <TouchableOpacity
            style={styles.moveButton}
            onPress={() => router.push(`/move/${item.id}`)}
          >
            <Text style={styles.moveButtonText}>Move →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }
```
*   `[item.color, item.type].filter(Boolean).join(' · ')`: Phép nối chuỗi thông minh. Loại bỏ các giá trị null/undefined trước khi ghép nối bằng dấu chấm tròn ngăn cách, tránh hiển thị lỗi chữ `null` lên màn hình giao diện của công nhân.

---

## 11. PHÂN TÍCH TỆP: [app/yarn/[id].tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/yarn/[id].tsx)

Màn hình lịch sử dòng hành trình di chuyển của cuộn sợi.

### Giải thích mã nguồn chi tiết:

```typescript
export default function YarnHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { yarn, history, loading } = useYarn(id); // Gọi hook tải thông tin sợi và lịch sử di dời
```
*   `useYarn(id)`: custom hook tải thông tin chi tiết và lịch sử di dời tương ứng.

```typescript
  function formatDate(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
```
*   `formatDate`: Định dạng chuỗi thời gian ISO thành định dạng ngày tháng tiếng Việt thân thuộc với công nhân (Ví dụ: `31/05/2026 14:32`).

```typescript
  function renderLog({ item, index }: { item: MoveLog; index: number }) {
    const isFirst = index === 0;
    const fromCode = (item as any).from_area?.code ?? 'Outside'; // Nếu null hiển thị là Outside (nhập kho ban đầu)
    const toCode = (item as any).to_area?.code ?? 'Removed'; // Nếu null hiển thị là Removed (xuất kho)

    return (
      <View style={[styles.logItem, isFirst && styles.logItemFirst]}>
        <View style={styles.logDot} />
        <View style={styles.logContent}>
          <Text style={styles.logMove}>
            {fromCode} → {toCode}
          </Text>
          {item.note && <Text style={styles.logNote}>{item.note}</Text>}
          <Text style={styles.logTime}>{formatDate(item.moved_at)}</Text>
        </View>
      </View>
    );
  }
```
*   `isFirst && styles.logItemFirst`: Sử dụng toán tử logic ngắn để tô màu xanh lục đậm cho hành trình di chuyển mới nhất, giúp công nhân nhận diện nhanh vị trí vừa được cập nhật.
*   `?? 'Outside'`: Hiển thị nguồn xuất phát của sợi. Nếu `from_area_id` là null, báo hiệu sợi được mang vào từ bên ngoài nhà máy.

---

## 12. PHÂN TÍCH TỆP: [hooks/useArea.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/hooks/useArea.ts)

Custom Hook dùng để tải danh sách toàn bộ cuộn sợi đang ở vị trí kệ hàng tương ứng.

### Giải thích mã nguồn chi tiết:

```typescript
export function useArea(areaId: string) {
  const [yarns, setYarns] = useState<YarnRoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
```
*   `yarns`: State lưu trữ danh sách các cuộn sợi lấy từ DB.
*   `loading`: Trạng thái xoay tải mạng của màn hình Area Detail.

```typescript
  async function fetchYarns() {
    const { data, error } = await supabase
      .from('yarn_rolls')
      .select('*')
      .eq('area_id', areaId)
      .eq('status', 'in_stock')
      .order('updated_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setYarns(data || []);
    }
    setLoading(false);
  }
```
*   `eq('area_id', areaId)`: Chỉ lọc những cuộn sợi nằm tại kệ được truyền vào.
*   `eq('status', 'in_stock')`: Chỉ hiển thị cuộn sợi còn trong kho kệ hàng, không tải những cuộn sợi đã xuất kho hoặc đã sử dụng hết.
*   `order('updated_at', { ascending: false })`: Sắp xếp cuộn sợi vừa được cập nhật dịch dời lên trên đầu danh sách để công nhân dễ tìm thấy.

```typescript
  useEffect(() => {
    if (!areaId) return;
    fetchYarns();
  }, [areaId]);
```
*   `useEffect`: Tự động gọi lại hàm truy vấn dữ liệu `fetchYarns()` khi ID khu vực kệ trên URL thay đổi.

---

## 13. PHÂN TÍCH TỆP: [hooks/useYarn.ts](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/hooks/useYarn.ts)

Custom Hook chịu trách nhiệm tải thông tin thông số cuộn sợi và dòng thời gian lịch sử dịch chuyển kệ.

### Giải thích mã nguồn chi tiết:

```typescript
export function useYarn(yarnId: string) {
  const [yarn, setYarn] = useState<YarnRoll | null>(null);
  const [history, setHistory] = useState<MoveLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
```
*   `yarn`: State lưu trữ chi tiết cuộn sợi đang xem.
*   `history`: State lưu mảng danh sách lịch sử di dời.

```typescript
  async function fetchYarn() {
    // 1. Tải thông tin cuộn sợi
    const { data: yarnData, error: yarnError } = await supabase
      .from('yarn_rolls')
      .select('*, areas(id, code, label)')
      .eq('id', yarnId)
      .single();

    if (yarnError) {
      setError(yarnError.message);
      setLoading(false);
      return;
    }
    setYarn(yarnData);

    // 2. Tải toàn bộ nhật ký dịch chuyển kệ
    const { data: logData, error: logError } = await supabase
      .from('move_logs')
      .select(`
        *,
        from_area:from_area_id(id, code),
        to_area:to_area_id(id, code)
      `)
      .eq('yarn_roll_id', yarnId)
      .order('moved_at', { ascending: false });

    if (!logError) {
      setHistory(logData || []);
    }
    setLoading(false);
  }
```
*   `single()`: Ép kết quả trả về là một đối tượng đơn nhất thay vì mảng dữ liệu, vì ID khóa chính của sợi là duy nhất.
*   `order('moved_at', { ascending: false })`: Sắp xếp các hành vi dịch kệ từ mới nhất đến cũ nhất để vẽ dòng thời gian Timeline chuẩn xác.

---

## 14. PHÂN TÍCH TỆP: [app/(tabs)/_layout.tsx](file:///f:/FPT/OJT/Delta_galil/yarn-tracker/app/(tabs)/_layout.tsx)

Cấu hình menu và màu sắc biểu tượng dưới chân màn hình của nhóm Tab chính.

### Giải thích mã nguồn chi tiết:

```typescript
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2e5c3e', // Màu xanh lục khi tab được chọn
        tabBarInactiveTintColor: '#999',    // Màu xám nhạt khi tab không chọn
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          height: 60,
          paddingBottom: 8,
        },
        headerStyle: { backgroundColor: '#2e5c3e' }, // Nền xanh lá cây của Header
        headerTintColor: '#fff', // Màu chữ trắng trên Header
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
```
*   `tabBarActiveTintColor`: Quy định màu sắc biểu tượng và nhãn chữ của tab khi đang mở xem màn hình đó. Sử dụng màu xanh đặc trưng của Delta Galil.

```typescript
      <Tabs.Screen
        name="index"
        options={{
          title: 'Board',
          headerShown: false, // Ẩn thanh header gốc của tab chính
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
```
*   `headerShown: false`: Tắt tính năng tự hiển thị thanh header mặc định của Expo trên tab chính để tránh lặp hai thanh màu xanh xếp chồng lên nhau (vì trang index.tsx đã tự render một header đẹp hơn kèm phím Sign Out).

```typescript
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Yarn',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```
*   `<Tabs.Screen>`: Đăng ký một màn hình con vào hệ thống Tab. Thẻ icon sử dụng thư viện vector `Ionicons` có kích cỡ và màu sắc tự thay đổi động theo trạng thái chọn của tab.

