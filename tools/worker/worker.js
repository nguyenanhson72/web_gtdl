/**
 * Trạm trung gian "Trợ lý Hồn Quê" chạy trên Cloudflare Workers (miễn phí).
 * Web (GitHub Pages) -> Worker này -> Gemini API. API key nằm ở Worker, người xem web không thấy.
 *
 * Biến cần khai báo trong Cloudflare (Settings > Variables and Secrets):
 *   GEMINI_API_KEY  (Secret)  : key lấy ở Google AI Studio
 *   ALLOWED_ORIGIN  (Text)    : https://nguyenanhson72.github.io  (nhiều web thì cách nhau dấu phẩy)
 *   MODEL           (Text, tùy chọn): mặc định gemini-3.5-flash-lite
 */

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const MAX_TURNS = 10;        // chỉ gửi 10 lượt hỏi đáp gần nhất
const MAX_CHARS = 500;       // mỗi câu hỏi tối đa 500 ký tự

const PERSONA = `Bạn là "Trợ lý Hồn Quê" – người già làng am hiểu lịch sử Vĩnh Cửu, Đồng Nai.
Hãy trả lời học sinh THCS bằng giọng điệu ấm áp, tự hào và chính xác, xưng "ông" và gọi người hỏi là "cháu".
Chỉ dựa trên DỮ LIỆU bên dưới về 5 phân khu của mô hình "Hồn Quê Số – Chạm vào di sản":
Chiến khu Đ, Thủy điện Trị An, rừng Vĩnh Cửu (Khu Bảo tồn Thiên nhiên – Văn hóa Đồng Nai), văn hóa Chơ Ro Phú Lý và Trạm khám phá số.
Quy tắc:
- Trả lời ngắn gọn, tối đa khoảng 120 chữ, dễ hiểu với học sinh.
- Không bịa số liệu. Nếu DỮ LIỆU không có thông tin, nói thật là ông chưa có tư liệu về điều đó.
- Câu hỏi nằm ngoài các chủ đề trên thì lịch sự từ chối và gợi ý 1–2 câu hỏi liên quan đến các phân khu.
- Không dùng bảng, không dùng tiêu đề markdown; có thể in đậm bằng **chữ**.`;

const KNOWLEDGE = "## Phân khu A – Dấu Chân Chiến Khu Đ (Căn cứ địa cách mạng)\nCăn cứ địa cách mạng của miền Đông Nam Bộ, ẩn mình dưới tán rừng Mã Đà, nơi ghi dấu những năm tháng kháng chiến kiên cường của quân và dân.\n- Căn cứ Trung ương Cục miền Nam: Căn cứ ẩn dưới tán rừng Mã Đà, được tái hiện trên sa bàn với lều lán quân y, hầm chông và lối đi quanh co.\n  + Thành lập: Ngày 23/01/1961, Hội nghị Trung ương 3 khóa III quyết định thành lập Trung ương Cục miền Nam, thay cho Xứ ủy Nam Bộ.\n  + Lễ giỗ chung liệt sĩ: Nhiều năm nay, cứ đến ngày 21/4, Khu bảo tồn lại tổ chức lễ giỗ chung cho các liệt sĩ đã hy sinh tại khu di tích.\n- Ba di tích trong rừng: Khu bảo tồn đang quản lý ba di tích cấp quốc gia: Căn cứ Trung ương Cục miền Nam, Căn cứ Khu ủy miền Đông Nam Bộ và Địa đạo Suối Linh.\n  + Căn cứ Khu ủy miền Đông Nam Bộ: Được thành lập tháng 2 năm 1961 tại Suối Linh.\n  + Địa đạo Suối Linh: Hệ thống địa đạo trong rừng Chiến khu Đ, nay do Khu bảo tồn quản lý cùng hai căn cứ.\n  + Nghĩa trang liệt sĩ Mã Đà: Nằm trong Khu di tích lịch sử Chiến khu Đ, rộng khoảng 2,5 ha, là nơi các đoàn về thắp hương tưởng niệm.\n- Huyền thoại rừng Mã Đà: Tư liệu lịch sử và bài nghe kể chuyện đưa người xem về những năm tháng kháng chiến dưới tán rừng Mã Đà.\n  + Trên sa bàn: Góc trái phía trên sa bàn tái hiện căn cứ ẩn mình dưới tán rừng, lều lán quân y, hầm chông, chiến sĩ bộ đội và lối đi quanh co.\n  + Bài học kiên cường: Chiến khu Đ là căn cứ địa cách mạng của quân dân miền Đông Nam Bộ trong hai cuộc kháng chiến chống Pháp và chống Mỹ.\n## Phân khu B – Thủy Điện Trị An (Trạm thủy điện & lòng hồ Trị An)\nCông trình thủy điện lớn trên dòng sông Đồng Nai, biểu tượng năng lượng của tình hữu nghị Việt Nam – Liên Xô, cùng lòng hồ Trị An mênh mông.\n- Lịch sử xây dựng: Công trình được xây dựng với sự hỗ trợ toàn diện của Liên Xô trước đây.\n  + Các mốc chính: Khởi công năm 1984, bắt đầu phát điện ngày 30/4/1988 và hoàn thành năm 1991.\n  + Mở rộng nhà máy: Ngày 19/8/2025, Nhà máy Thủy điện Trị An mở rộng được khởi công, xây thêm hai tổ máy để nâng tổng công suất lên 600 MW, dự kiến hoàn thành năm 2027.\n- Thông số nhà máy: 4 tổ máy với tổng công suất 400 MW, cung cấp khoảng 1,7 tỷ kWh điện mỗi năm.\n  + Công suất: Nhà máy có 4 tổ máy với tổng công suất 400 MW.\n  + Sản lượng điện: Mỗi năm cung cấp khoảng 1,7 tỷ kWh điện cho hệ thống điện quốc gia.\n- Vai trò của thủy điện: Phát điện, cắt lũ và cấp nước cho vùng hạ du sông Đồng Nai.\n  + Bậc thang cuối cùng: Thủy điện Trị An là bậc thang thủy điện cuối cùng trên hệ thống sông Đồng Nai.\n  + Phát điện, cắt lũ, cấp nước: Ngoài phát điện, hồ chứa còn góp phần điều tiết lũ và cấp nước cho vùng hạ du.\n- Lòng hồ Trị An: Hồ chứa rộng lớn tạo nên cảnh quan mặt nước mênh mông giữa núi rừng.\n  + Mặt nước mênh mông: Khu Bảo tồn Thiên nhiên – Văn hóa Đồng Nai quản lý hơn 32.500 ha mặt nước hồ Trị An.\n  + Trên sa bàn: Góc trái phía dưới sa bàn mô phỏng đập xả nước bê tông, nhà máy phát điện, dòng sông Đồng Nai và lòng hồ Trị An.\n## Phân khu C – Rừng Xanh Vĩnh Cửu (Hệ sinh thái đa dạng)\nRừng nguyên sinh của Khu Bảo tồn Thiên nhiên – Văn hóa Đồng Nai rộng hơn 100.000 ha, nơi sinh sống của nhiều loài động vật và thực vật quý hiếm.\n- Khu Bảo tồn Đồng Nai: Vùng lõi xanh của Vĩnh Cửu với rừng nguyên sinh, suối nước trong lành và cầu gỗ bắc qua suối.\n  + Lịch sử thành lập: Tiền thân là Khu Dự trữ thiên nhiên Vĩnh Cửu thành lập năm 2003; năm 2004 chính thức trở thành Khu Bảo tồn Thiên nhiên – Văn hóa Đồng Nai.\n  + Danh hiệu quốc tế: Ngày 29/6/2011, Khu Dự trữ sinh quyển Đồng Nai được UNESCO công nhận.\n- Động vật quý hiếm: Voi châu Á, bò tót, voọc chà vá chân đen, gà lôi hồng tía cùng nhiều loài thú nguy cấp khác.\n  + Đàn voi hoang dã: Khu bảo tồn có một quần thể voi châu Á hoang dã hơn 20 cá thể.\n  + Những loài cần bảo vệ: Bò tót, voọc chà vá chân đen, khỉ đuôi lợn, gà lôi hồng tía và tê tê là những loài nguy cấp, quý hiếm sống trong rừng.\n  + Con số ấn tượng: Khu bảo tồn ghi nhận hơn 1.800 loài động vật, trong đó có 141 loài nguy cấp, quý hiếm.\n- Thực vật & cây gỗ quý: Thảm thực vật rừng nguyên sinh với nhiều cây gỗ quý.\n  + Cây gỗ quý: Cẩm lai và gỗ trắc là những cây gỗ quý hiếm của rừng Đồng Nai.\n  + Trên sa bàn: Trung tâm sa bàn mô phỏng thảm thực vật rừng nguyên sinh, suối nước và cầu gỗ bắc qua suối.\n- Thư viện cây con & bảo vệ rừng: Hồ sơ đa dạng sinh học và bài học bảo vệ môi trường cho học sinh.\n  + Hồ sơ đa dạng sinh học: Mỗi loài có thẻ thông tin: tên gọi, đặc điểm nhận dạng, nơi sống và mức độ cần bảo tồn.\n  + Giữ rừng từ sớm: Đồng Nai có chủ trương đóng cửa rừng từ năm 1997, sớm nhất cả nước.\n  + Em làm gì để bảo vệ rừng?: Không săn bắt, không mua bán động vật hoang dã, không xả rác và không đốt lửa khi vào rừng.\n## Phân khu D – Hồn Quê Phú Lý (Văn hóa dân tộc Chơ Ro)\nKhông gian văn hóa của đồng bào Chơ Ro (Chauro) ở xã Phú Lý: nhà sàn gỗ, tiếng cồng chiêng, lễ cúng thần lúa và nghề đan lát mây tre.\n- Nhà sàn Chơ Ro: Kiến trúc nhà sàn gỗ truyền thống của người Chơ Ro, gắn với nếp sống bên rừng.\n  + Người Chơ Ro: Người Chơ Ro là một trong những cư dân bản địa của vùng đất Đồng Nai.\n  + Trên sa bàn: Vị trí trung tâm phía dưới sa bàn tái hiện nhà sàn gỗ, cồng chiêng, hũ rượu cần, gùi đan lát và nông cụ sản xuất.\n- Cồng chiêng & rượu cần: Âm thanh cồng chiêng thực tế cùng hũ gốm rượu cần trong các dịp lễ.\n  + Tiếng cồng chiêng: Quét mã QR của phân khu để nghe âm thanh cồng chiêng của đồng bào Chơ Ro.\n  + Hũ rượu cần: Hũ gốm rượu cần là vật dụng quen thuộc trong lễ hội và khi đón khách quý.\n- Lễ cúng thần lúa Say Yang Va: Lễ hội truyền thống quan trọng của người Chơ Ro, thể hiện lòng biết ơn thần lúa.\n  + Ý nghĩa: Lễ cúng thần lúa thể hiện lòng biết ơn và mong ước mùa màng bội thu.\n  + Xem video: Mã QR của phân khu kết nối video tư liệu về Lễ cúng thần lúa Say Yang Va.\n- Đan lát mây tre & cây thuốc nam: Gùi, giỏ đan bằng mây tre và kinh nghiệm dùng cây thuốc nam được truyền qua nhiều thế hệ.\n  + Nghề đan lát: Mây, tre được chẻ, vót rồi đan thành gùi, giỏ, nia phục vụ sinh hoạt và lao động.\n  + Cây thuốc nam: Đồng bào Chơ Ro có nhiều kinh nghiệm dùng cây thuốc nam từ rừng để chăm sóc sức khỏe.\n## Phân khu E – Trạm Khám Phá Số (QR · Trợ lý AI · Trò chơi)\nGóc công nghệ của mô hình: quét mã QR, nghe quê hương kể chuyện, trò chuyện với Trợ lý AI và chơi đố vui để củng cố kiến thức.\n- Quét mã QR các phân khu: Điện thoại quét mã QR trên sa bàn hoặc cẩm nang số, máy tính vào thẳng trang web.\n  + Cách quét: Mở camera điện thoại, đưa vào mã QR của phân khu muốn tìm hiểu rồi bấm vào đường dẫn hiện ra.\n  + Mã của từng phân khu: Mỗi phân khu A, B, C, D có mã QR riêng dẫn thẳng tới nội dung của khu đó.\n- Nghe quê hương kể chuyện: Bấm vào tiêu đề hoặc đoạn chữ bất kỳ trên trang để nghe giọng đọc; bấm lần nữa để dừng.\n  + Bấm đâu nghe đó: Tiêu đề và nội dung được tách riêng, bấm vào phần nào sẽ nghe đọc phần đó.\n  + Giọng đọc: Ưu tiên giọng nữ miền Nam thu sẵn; nếu chưa có sẽ dùng giọng đọc tiếng Việt của trình duyệt.\n- Trợ lý AI Hồn Quê: Trợ lý trong vai già làng am hiểu Vĩnh Cửu, trả lời câu hỏi của học sinh dựa trên dữ liệu đã thu thập.\n  + Hỏi gì cũng được: Hỏi về Chiến khu Đ, Thủy điện Trị An, Khu bảo tồn Đồng Nai và văn hóa Chơ Ro Phú Lý.\n  + Trả lời đúng nguồn: Câu hỏi nằm ngoài dữ liệu, trợ lý sẽ lịch sự từ chối và gợi ý câu hỏi liên quan.\n- Đố vui Đồng Nai: Trò chơi trắc nghiệm về di tích, động vật quý hiếm và khu bảo tồn, có tính điểm và xếp hạng.\n  + Cách chơi: Chọn chủ đề, trả lời 10 câu, mỗi câu 20 giây. Trả lời nhanh và đúng liên tiếp được thưởng điểm.\n- Hành trình 4 bước: Chạm – Quét – Nghe và xem – Tương tác AI: trải nghiệm di sản bằng nhiều giác quan.\n  + Bước 1: Chạm: Quan sát mô hình 3D để hình dung không gian địa lý, các phân khu di tích và công trình thủy điện.\n  + Bước 2: Quét: Dùng điện thoại hoặc máy tính bảng quét mã QR tại phân khu muốn khám phá.\n  + Bước 3: Nghe và xem: Xem video, hình ảnh tư liệu và nghe quê hương kể chuyện.\n  + Bước 4: Tương tác: Trò chuyện với Trợ lý AI và chơi đố vui để củng cố kiến thức.\n## Kiến thức bổ sung (từ phần Đố vui)\n- Khu bảo tồn từng là Chiến khu Đ, căn cứ cách mạng thời kháng chiến.\n- Ba di tích trong Khu bảo tồn là Căn cứ Trung ương Cục miền Nam, Căn cứ Khu ủy miền Đông và Địa đạo Suối Linh. Địa đạo Củ Chi ở TP.HCM.\n- Căn cứ Khu ủy miền Đông Nam Bộ thành lập tháng 2/1961 tại Suối Linh (Vĩnh Cửu, Đồng Nai).\n- Khu di tích Trung ương Cục miền Nam trong Chiến khu Đ được xếp hạng di tích quốc gia năm 2001.\n- Nhiều năm nay, cứ ngày 21/4 Khu bảo tồn lại tổ chức lễ giỗ chung cho các liệt sĩ tại đây.\n- Ngày 23/01/1961, Hội nghị Trung ương 3 (khóa III) quyết định thành lập Trung ương Cục miền Nam thay cho Xứ ủy Nam Bộ.\n- Đồng Nai là vùng đất của cư dân bản địa người Mạ, Chơ Ro và một phần người Stiêng.\n- Khu bảo tồn đã ghi nhận quần thể voi châu Á hoang dã hơn 20 con, thuộc danh mục loài nguy cấp.\n- Voọc chà vá chân đen là một trong những loài nguy cấp, quý hiếm được ghi nhận ở đây.\n- Bò tót là loài nguy cấp, quý hiếm có trong Khu bảo tồn.\n- Gà lôi hồng tía nằm trong nhóm loài nguy cấp, quý hiếm của Khu bảo tồn.\n- Khỉ đuôi lợn là một trong các loài nguy cấp, quý hiếm sống trong rừng Khu bảo tồn.\n- Tê tê nằm trong nhóm loài bị đe dọa, thường bị săn bắt trái phép.\n- Cẩm lai và gỗ trắc là những cây gỗ quý hiếm trong rừng Đồng Nai. Bạch đàn, keo lai là cây trồng phổ biến.\n- Khu bảo tồn có hơn 1.800 loài động vật, trong đó 141 loài nguy cấp, quý hiếm.\n- Ngày 29/6/2011, Khu Dự trữ sinh quyển Đồng Nai được UNESCO công nhận.\n- Tiền thân là Khu Dự trữ thiên nhiên Vĩnh Cửu, thành lập năm 2003.\n- Khu bảo tồn quản lý hơn 100 nghìn ha, gồm cả hơn 32.500 ha mặt nước hồ Trị An.\n- Năm 2004, tỉnh Đồng Nai chính thức thành lập Khu bảo tồn.\n- Khu bảo tồn được giao quản lý tổng diện tích hơn 100.000 ha.\n- Đồng Nai đóng cửa rừng từ năm 1997, nhờ đó công tác bảo vệ rừng được tăng cường sớm.\n- Văn phòng Chính phủ đã đồng ý chủ trương đề cử Khu bảo tồn là Vườn di sản ASEAN (AHP).";

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : (allowed[0] || ''),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin'
    };
    const reply = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply({ error: 'Chỉ nhận yêu cầu POST.' }, 405);
    if (!okOrigin) return reply({ error: 'Trang web này chưa được phép dùng trợ lý.' }, 403);
    if (!env.GEMINI_API_KEY) return reply({ error: 'Trạm chưa có GEMINI_API_KEY.' }, 500);

    // Kiểm tra dữ liệu gửi lên
    let body;
    try { body = await request.json(); } catch { return reply({ error: 'Dữ liệu gửi lên không hợp lệ.' }, 400); }
    const messages = Array.isArray(body?.messages) ? body.messages.slice(-MAX_TURNS * 2) : [];
    const contents = messages
      .filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
      .map(m => ({ role: m.role, parts: [{ text: m.text.trim().slice(0, MAX_CHARS) }] }));
    if (!contents.length || contents[contents.length - 1].role !== 'user') {
      return reply({ error: 'Cháu hãy nhập câu hỏi nhé.' }, 400);
    }

    const model = env.MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `${PERSONA}\n\nDỮ LIỆU:\n${KNOWLEDGE}` }] },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 700 }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.log('Gemini error', res.status, JSON.stringify(data).slice(0, 500));
        if (res.status === 429) return reply({ error: 'Hôm nay nhiều bạn hỏi quá, cháu đợi một lát rồi hỏi lại nhé.' }, 429);
        return reply({ error: 'Trợ lý đang bận, cháu thử lại sau nhé.' }, 502);
      }
      const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
      return reply({ text: text || 'Ông chưa nghĩ ra câu trả lời, cháu hỏi cách khác giúp ông nhé.' });
    } catch (err) {
      console.log('Worker error', String(err));
      return reply({ error: 'Không kết nối được tới Gemini, cháu thử lại sau nhé.' }, 502);
    }
  }
};
