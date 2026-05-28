import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type LegalPageProps = {
  type: 'terms' | 'privacy';
};

const content = {
  terms: {
    title: 'Điều khoản dịch vụ',
    description: 'Các điều kiện sử dụng nền tảng PhoenixVision cho giám sát cháy, khói và rủi ro an toàn.',
    updatedAt: 'Cập nhật lần cuối: 28/05/2026',
    sections: [
      {
        title: '1. Phạm vi dịch vụ',
        body: 'PhoenixVision là hệ thống hỗ trợ giám sát camera, phân tích hình ảnh bằng AI và cảnh báo sớm các dấu hiệu cháy, khói hoặc con người trong vùng nguy hiểm. Hệ thống chỉ đóng vai trò hỗ trợ ra quyết định, không thay thế hoàn toàn quy trình an toàn, thiết bị báo cháy đạt chuẩn hoặc lực lượng ứng cứu chuyên nghiệp.'
      },
      {
        title: '2. Tài khoản người dùng',
        body: 'Người dùng cần cung cấp thông tin đăng ký chính xác, bảo mật tài khoản và chịu trách nhiệm với mọi hoạt động phát sinh từ tài khoản của mình. Camera, cấu hình stream và sự kiện giám sát được tách theo từng tài khoản.'
      },
      {
        title: '3. Dữ liệu camera',
        body: 'Người dùng chỉ được thêm camera mà mình có quyền quản lý hoặc được phép truy cập. Không sử dụng PhoenixVision để theo dõi khu vực riêng tư, dữ liệu cá nhân hoặc tài sản của bên thứ ba khi chưa có sự đồng ý hợp lệ.'
      },
      {
        title: '4. Cảnh báo và độ chính xác AI',
        body: 'Kết quả nhận diện cháy, khói, người và mức rủi ro phụ thuộc vào chất lượng camera, ánh sáng, góc nhìn, dữ liệu huấn luyện và điều kiện môi trường. Người dùng cần kiểm tra lại các cảnh báo quan trọng trước khi đưa ra quyết định ứng cứu.'
      },
      {
        title: '5. Trách nhiệm vận hành',
        body: 'Người dùng cần duy trì kết nối camera, kiểm tra định kỳ hệ thống, cấu hình ngưỡng cảnh báo phù hợp và xây dựng quy trình phản ứng khẩn cấp riêng cho tòa nhà hoặc khu vực giám sát.'
      },
      {
        title: '6. Giới hạn trách nhiệm',
        body: 'PhoenixVision không chịu trách nhiệm cho thiệt hại phát sinh do cấu hình sai, camera mất kết nối, dữ liệu đầu vào kém chất lượng, hành vi sử dụng sai mục đích hoặc việc bỏ qua quy trình phòng cháy chữa cháy bắt buộc.'
      }
    ]
  },
  privacy: {
    title: 'Chính sách bảo mật',
    description: 'Cách PhoenixVision thu thập, lưu trữ và bảo vệ dữ liệu tài khoản, camera và sự kiện cảnh báo.',
    updatedAt: 'Cập nhật lần cuối: 28/05/2026',
    sections: [
      {
        title: '1. Dữ liệu được lưu',
        body: 'PhoenixVision có thể lưu thông tin tài khoản như họ tên, email, số điện thoại, cấu hình camera, trạng thái camera, dữ liệu sự kiện, mức rủi ro, thời điểm cảnh báo và ảnh chụp sự kiện nếu tính năng snapshot được bật.'
      },
      {
        title: '2. Dữ liệu hình ảnh và AI',
        body: 'Luồng camera được xử lý để phát hiện cháy, khói, người và phân tích rủi ro. Dữ liệu hình ảnh chỉ nên được lưu khi cần phục vụ lịch sử sự kiện, kiểm tra cảnh báo hoặc điều tra sự cố.'
      },
      {
        title: '3. Phân tách dữ liệu theo người dùng',
        body: 'Cấu hình camera được lưu theo từng người dùng tại vùng dữ liệu riêng. Một tài khoản không được đọc hoặc chỉnh sửa camera của tài khoản khác nếu không có cơ chế chia sẻ được cấp quyền rõ ràng.'
      },
      {
        title: '4. Bảo vệ dữ liệu',
        body: 'Hệ thống sử dụng Firebase Authentication và Firestore Security Rules để xác thực người dùng và giới hạn quyền truy cập. Người dùng vẫn cần bảo vệ mật khẩu, không chia sẻ tài khoản và không công khai URL stream có thông tin nhạy cảm.'
      },
      {
        title: '5. Chia sẻ dữ liệu',
        body: 'Dữ liệu camera và sự kiện không được chia sẻ cho người dùng khác theo mặc định. Nếu sau này có tính năng chia sẻ, hệ thống cần yêu cầu quyền rõ ràng theo từng camera, từng người nhận hoặc từng nhóm quản lý.'
      },
      {
        title: '6. Xóa và cập nhật dữ liệu',
        body: 'Người dùng có thể cập nhật hoặc xóa cấu hình camera trong hệ thống. Với dữ liệu sự kiện hoặc snapshot, chính sách lưu trữ nên được cấu hình theo thời hạn phù hợp với yêu cầu vận hành và quy định bảo mật của đơn vị sử dụng.'
      }
    ]
  }
};

export function LegalPage({ type }: LegalPageProps) {
  const page = content[type];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-orange-600">
          <ArrowLeft size={16} />
          Quay lại đăng nhập
        </Link>

        <div className="mt-6 border-b border-slate-200 pb-6">
          <img src="/PhoenixLogoLandscape.png" alt="PhoenixVision" className="h-14 w-auto object-contain" />
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">PhoenixVision</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{page.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{page.description}</p>
          <p className="mt-3 text-xs font-medium text-slate-400">{page.updatedAt}</p>
        </div>

        <div className="mt-6 space-y-6">
          {page.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-slate-950">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
