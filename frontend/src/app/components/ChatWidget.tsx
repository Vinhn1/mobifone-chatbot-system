import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, ExternalLink, ChevronDown, Minimize2, Maximize2, User, Phone, CheckCircle2, Star, Sparkles, MessageCircle } from "lucide-react";
import { RobotAvatar } from "./RobotAvatar";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

type Source = {
  title: string;
  url: string;
};

type Message = {
  id: number;
  type: "user" | "bot";
  text: string;
  sources?: (string | Source)[];
  quickReplies?: string[];
  leadCapture?: { field: string; label: string };
};

type RobotState = "idle" | "talking" | "thinking" | "happy";

type LeadData = {
  name?: string;
  phone?: string;
  currentPackage?: string;
  interest?: string;
  budget?: string;
};

function getAxiosErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Lỗi không xác định.";
  const responseData = error.response?.data as { message?: string; detail?: string } | undefined;
  return responseData?.message || responseData?.detail || error.message;
}

const SUGGESTIONS = [
  "Gói TK135 có gì?", "Đăng ký 5G?", "Xem ưu đãi hot", "Tư vấn gói phù hợp", "Hỗ trợ kỹ thuật",
];

// Fallback sales-psychology bot responses
function getSalesResponse(text: string, lead: LeadData, user: any): {
  text: string; sources?: string[]; quickReplies?: string[]; leadCapture?: { field: string; label: string }; robotState?: RobotState;
} {
  const lower = text.toLowerCase();
  const name = user?.name?.split(" ").pop() || lead.name || "bạn";

  if (lower.includes("tên") || lower.includes("là ")) {
    const match = text.match(/(?:tên|là)\s+(.+)/i);
    if (match) return {
      text: `Chào **${match[1]}**! 🎉 Rất vui được gặp bạn!\n\nTôi là **Mia** — Chuyên viên chăm sóc khách hàng của MobiFone 📞✨\n\nBạn đang sử dụng mạng di động nào? Để tôi tìm gói cước **tiết kiệm & phù hợp nhất** cho bạn nhé!`,
      quickReplies: ["Đang dùng Viettel", "Đang dùng Vinaphone", "Đang dùng MobiFone"],
      robotState: "happy",
    };
  }

  if (lower.includes("tk135") || lower.includes("135")) return {
    text: `🔥 **TK135 — GÓI CƯỚC BÁN CHẠY NHẤT MOBIFONE!**\n\n📶 **4GB data tốc độ cao/ngày** (120GB/tháng)\n📞 **Miễn phí hoàn toàn** cuộc gọi nội mạng dưới 10 phút\n📲 **Tặng thêm 20 phút** gọi ngoại mạng mỗi tháng\n🌐 Tự động kết nối mạng **5G siêu tốc**\n💰 Chỉ **135.000đ/tháng**\n\n⚡ Đặc biệt: Hôm nay chỉ còn **12 suất** đăng ký nhận thêm **+10GB data bonus**!\n\nBạn có muốn đăng ký ngay gói cước này để nhận khuyến mại không? 🎁`,
    sources: ["mobifone.vn/tk135"],
    quickReplies: ["Đăng ký ngay!", "Xem gói khác", "So sánh với TK99"],
    robotState: "talking",
  };

  if (lower.includes("5g") || lower.includes("tốc độ")) return {
    text: `⚡ **Mạng 5G MobiFone — Trải nghiệm tốc độ ánh sáng!**\n\n🚀 Tốc độ tải thực tế lên tới **1.5 Gbps**\n📡 Phủ sóng diện rộng tại các thành phố lớn\n📶 Không giới hạn data tốc độ cao\n💰 Đa dạng gói cước chỉ từ **99.000đ/tháng**\n\n🎁 Nhận ngay eSIM 5G **miễn phí** khi đăng ký hôm nay!\n\nĐể kích hoạt nhanh, hãy cung cấp số điện thoại của bạn nhé! 📱`,
    quickReplies: ["Đăng ký eSIM 5G", "Xem vùng phủ sóng", "Gửi số điện thoại"],
    leadCapture: { field: "phone", label: "Số điện thoại nhận tư vấn" },
    robotState: "happy",
  };

  if (lower.includes("khuyến mãi") || lower.includes("ưu đãi") || lower.includes("giảm")) return {
    text: `🎊 **Cơ hội vàng duy nhất hôm nay!**\n\n🔥 Gói cước TK199 giảm trực tiếp **30%** → chỉ còn **139k/tháng**\n🎁 Đổi eSIM **miễn phí hoàn toàn** trực tuyến\n⭐ Hoàn tiền **20%** khi nạp thẻ qua ứng dụng\n\n💡 Ưu đãi độc quyền: Đăng ký qua Mia được tặng thêm **+5GB data** tốc độ cao!\n\nBạn quan tâm đến ưu đãi nào dưới đây? 🎯`,
    quickReplies: ["Gói TK199 giảm 30%", "Đổi eSIM miễn phí", "Nạp thẻ nhận hoàn tiền"],
    robotState: "happy",
  };

  if (lower.includes("so sánh") || lower.includes("gói nào") || lower.includes("tư vấn")) return {
    text: `Tuyệt vời! Để tôi gợi ý gói cước tối ưu nhất, bạn vui lòng cho biết **nhu cầu sử dụng chính** của mình nhé:`,
    quickReplies: ["Xem YouTube/TikTok/Data khủng", "Gọi điện thoại liên lạc", "Cần cả hai cân bằng", "Sử dụng cho công việc/học tập"],
    robotState: "thinking",
  };

  if (lower.includes("youtube") || lower.includes("tiktok") || lower.includes("data")) return {
    text: `📱 Tuyệt vời! Đối với nhu cầu giải trí và xem video liên tục, bạn cần gói cước có **dung lượng lớn & tốc độ ổn định**.\n\n🏆 **Đề xuất tốt nhất dành cho bạn:**\n\n**Gói TK135** — 4GB/ngày, miễn phí data truy cập ứng dụng giải trí chỉ với **4.500đ/ngày**!\n\nBạn có muốn Mia hỗ trợ đăng ký dùng thử 7 ngày miễn phí không? 🎁`,
    quickReplies: ["Đăng ký ngay", "Tìm hiểu thêm", "Tư vấn gói nhỏ hơn"],
    robotState: "happy",
  };

  if (lower.includes("số điện thoại") || lower.includes("đăng ký") || lower.includes("gửi số")) {
    return {
      text: `Để hoàn tất thủ tục đăng ký và nhận ưu đãi riêng biệt, vui lòng để lại số điện thoại để chuyên viên hỗ trợ bạn trong 15 phút:`,
      leadCapture: { field: "phone", label: "Số điện thoại của bạn" },
      robotState: "talking",
    };
  }

  if (lower.match(/^0\d{9}$/)) return {
    text: `✅ **Mia đã ghi nhận số điện thoại của bạn!**\n\n📞 Chuyên viên tư vấn MobiFone sẽ liên hệ lại với bạn qua số **${text}** trong vòng **15 phút**.\n\n🎁 Quà tặng ưu tiên đi kèm:\n• **Tặng thêm 10GB** data tốc độ cao\n• **Miễn phí** cước phát hành eSIM mới\n\nCảm ơn bạn đã tin tưởng dịch vụ MobiFone! 💙`,
    quickReplies: ["Xem các gói cước khác", "Trở lại trang chủ"],
    robotState: "happy",
  };

  if (lower.includes("hỗ trợ") || lower.includes("kỹ thuật") || lower.includes("sự cố")) return {
    text: `🔧 Mia rất tiếc vì sự bất tiện bạn đang gặp phải!\n\nĐể được xử lý kỹ thuật lập tức:\n📞 **Tổng đài chăm sóc khách hàng:** 18001090 (Miễn phí)\n🏪 Hoặc ghé cửa hàng MobiFone gần nhất.\n\nBạn có thể mô tả cụ thể sự cố để tôi chuyển thông tin tới đội kỹ thuật nhé!`,
    quickReplies: ["Mất kết nối Internet", "Không nhận được cuộc gọi", "Lỗi thẻ nạp"],
    robotState: "thinking",
  };

  return {
    text: `Tôi đã nhận được thông tin: "${text}".\n\nTôi là chuyên viên chăm sóc khách hàng của MobiFone, tôi luôn sẵn sàng tư vấn gói cước, đăng ký sim 5G và xử lý sự cố. Bạn cần hỗ trợ gì thêm không? 😊`,
    quickReplies: ["Tư vấn gói cước", "Các gói khuyến mãi hot", "Hỗ trợ sự cố"],
    robotState: "idle",
  };
}

function TypingBubble() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RobotAvatar size={28} state="talking" />
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "2px 14px 14px 14px", padding: "12px 16px", display: "flex", gap: 5 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#30B0EB", animation: "bdot 1.2s ease-in-out infinite", animationDelay: `${i*0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

function renderText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ fontWeight: 700, color: "white" }}>{p.slice(2,-2)}</strong>
      : p.split("\n").map((l, j, a) => <span key={`${i}-${j}`}>{l}{j<a.length-1&&<br/>}</span>)
  );
}

const FACEBOOK_MESSENGER_URL = "https://m.me/1215670604956653";
const ZALO_OA_URL = "https://zalo.me/1192122707863776201";

export function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [robotState, setRobotState] = useState<RobotState>("idle");
  const [leadData, setLeadData] = useState<LeadData>({});
  const [unread, setUnread] = useState(1);
  const [sessionId] = useState(() => `widget_${Math.random().toString(36).substring(2, 11)}`);
  const endRef = useRef<HTMLDivElement>(null);

  // Trạng thái hiển thị danh sách các kênh liên hệ
  const [showChannels, setShowChannels] = useState(false);

  // Lead capture values
  const [captureValue, setCaptureValue] = useState("");

  // Initial greeting after opening
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const name = user?.name?.split(" ").pop() || "";
    setTyping(true);
    setRobotState("talking");
    setTimeout(() => {
      setTyping(false);
      setRobotState("happy");
      setMessages([{
        id: 1,
        type: "bot",
        text: name
          ? `Chào mừng **${name}** quay lại với MobiFone! 🎉\n\nHôm nay, bạn có **ưu đãi đặc biệt** dành riêng cho thành viên **${user?.tier}**:\n📶 Gia hạn gói **TK135** → tặng thêm **15GB data**\n⭐ Nhân đôi điểm tích lũy thành viên đến hết tuần này.\n\nBạn cần chuyên viên hỗ trợ tư vấn dịch vụ nào không? 😊`
          : `Xin chào! Tôi là **Mia** — Chuyên viên chăm sóc khách hàng của MobiFone! 📞✨\n\n🎁 **Ưu đãi độc quyền hôm nay:** Tặng thêm **10GB** data tốc độ cao khi đăng ký gói cước di động trực tuyến!\n\nBạn tên là gì để tôi dễ dàng xưng hô và tư vấn tốt nhất nhé?`,
        quickReplies: name
          ? ["Gia hạn gói cước", "Kiểm tra ưu đãi", "Cần tư vấn thêm"]
          : ["Tôi tên Nam", "Gọi tôi là Vy", "Không cần giới thiệu"],
      }]);
    }, 1200);
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, open]);

  const send = async (text: string) => {
    const textToSend = text.trim();
    if (!textToSend) return;

    setMessages(prev => [...prev, { id: Date.now(), type: "user", text: textToSend }]);
    setInput("");
    setTyping(true);
    setRobotState("thinking");

    // Update local lead data
    if (textToSend.match(/^0\d{9}$/)) setLeadData(p => ({ ...p, phone: textToSend }));
    if (textToSend.toLowerCase().includes("tên") || textToSend.toLowerCase().includes("là ")) {
      const m = textToSend.match(/(?:tên|là)\s+(.+)/i);
      if (m) setLeadData(p => ({ ...p, name: m[1] }));
    }

    try {
      // Try to get live response from backend
      const response = await axios.post("http://localhost:3000/chat", {
        message: textToSend,
        sessionId,
      });

      const botAnswer = response.data?.answer || "";
      const botSources = response.data?.sources || [];

      setTyping(false);
      setRobotState("talking");
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: "bot",
        text: botAnswer,
        sources: botSources,
      }]);
      setTimeout(() => setRobotState("idle"), 3000);
    } catch (error) {
      const errorMessage = getAxiosErrorMessage(error);
      console.warn("Backend chat unavailable, using sales fallback logic:", errorMessage);
      setTimeout(() => {
        const resp = getSalesResponse(textToSend, leadData, user);
        setTyping(false);
        setRobotState(resp.robotState || "idle");
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: "bot",
          text: `⚠️ MobiFone đang tạm dùng phản hồi dự phòng vì dịch vụ AI chưa sẵn sàng.\n\n${resp.text}`,
          sources: resp.sources,
          quickReplies: resp.quickReplies,
          leadCapture: resp.leadCapture,
        }]);
        setTimeout(() => setRobotState("idle"), 3000);
      }, 1000);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
    setMinimized(false);
  };

  return (
    <>
      <style>{`
        @keyframes robot-float {
          0%,100%{transform:translateY(0) rotate(-1deg)}
          50%{transform:translateY(-8px) rotate(1deg)}
        }
        @keyframes radar-ring {
          0%{transform:scale(1);opacity:0.8}
          100%{transform:scale(2.2);opacity:0}
        }
        @keyframes bdot {
          0%,80%,100%{transform:translateY(0)}
          40%{transform:translateY(-6px)}
        }
        @keyframes slide-up {
          from{opacity:0;transform:translateY(20px) scale(0.95)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes neon-pulse-blue {
          0%,100%{box-shadow:0 0 12px rgba(48,176,235,0.4),0 0 24px rgba(29,57,122,0.2)}
          50%{box-shadow:0 0 20px rgba(48,176,235,0.7),0 0 40px rgba(29,57,122,0.4)}
        }
        .chat-msg-scroll::-webkit-scrollbar{width:4px}
        .chat-msg-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}
        .suggest-pills::-webkit-scrollbar{display:none}
      `}</style>

      {/* Floating robot trigger */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000 }}>
        {/* Contact Channels Stack (Messenger, Zalo, Web Chat) */}
        <AnimatePresence>
          {showChannels && !open && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0, scale: 0.8 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.05,
                  }
                }
              }}
              style={{
                position: "absolute",
                bottom: 96,
                right: 13,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                zIndex: 1001,
              }}
            >
              {/* Live Chat Channel */}
              <motion.div
                variants={{
                  hidden: { y: 20, opacity: 0, scale: 0.8 },
                  visible: { y: 0, opacity: 1, scale: 1 }
                }}
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}
              >
                <div style={{
                  background: "rgba(9,21,44,0.96)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(48,176,235,0.3)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  pointerEvents: "none",
                }}>
                  Chat trực tuyến với Mia
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpen();
                    setShowChannels(false);
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    border: "none",
                    background: "linear-gradient(135deg, #1D397A, #30B0EB)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(48, 176, 235, 0.4)",
                  }}
                >
                  <MessageCircle size={22} />
                </motion.button>
              </motion.div>

              {/* Zalo OA Channel */}
              <motion.div
                variants={{
                  hidden: { y: 20, opacity: 0, scale: 0.8 },
                  visible: { y: 0, opacity: 1, scale: 1 }
                }}
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}
              >
                <div style={{
                  background: "rgba(9,21,44,0.96)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(48,176,235,0.3)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  pointerEvents: "none",
                }}>
                  Kết nối qua Zalo
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(ZALO_OA_URL, "_blank");
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    border: "none",
                    background: "#0068FF",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(0, 104, 255, 0.4)",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.477 2 2 5.92 2 10.77c0 2.82 1.54 5.31 3.93 6.91-.23.96-.83 2.87-.83 2.87a.4.4 0 00.56.44c.06-.03 2.65-1.58 3.66-2.18.86.22 1.76.33 2.68.33 5.523 0 10-3.92 10-8.77C22 5.92 17.523 2 12 2z" fill="white" />
                    <g transform="translate(4.8, 4.3) scale(0.6)" fill="#0068FF">
                      <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
                    </g>
                  </svg>
                </motion.button>
              </motion.div>

              {/* Facebook Messenger Channel */}
              <motion.div
                variants={{
                  hidden: { y: 20, opacity: 0, scale: 0.8 },
                  visible: { y: 0, opacity: 1, scale: 1 }
                }}
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}
              >
                <div style={{
                  background: "rgba(9,21,44,0.96)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(48,176,235,0.3)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  pointerEvents: "none",
                }}>
                  Nhắn tin qua Messenger
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(FACEBOOK_MESSENGER_URL, "_blank");
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    border: "none",
                    background: "linear-gradient(135deg, #00C6FF 0%, #0072FF 50%, #F355DA 100%)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(0, 114, 255, 0.4)",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.36 2 2 6.13 2 11.5C2 14.54 3.4 17.21 5.6 18.97V22L8.5 20.41C9.6 20.72 10.78 20.9 12 20.9C17.64 20.9 22 16.77 22 11.5C22 6.13 17.64 2 12 2ZM12.93 14.52L10.36 11.77L5.36 14.52L10.86 8.68L13.5 11.43L18.43 8.68L12.93 14.52Z" fill="white"/>
                  </svg>
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!open && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => setShowChannels(prev => !prev)}
            >
              {/* Radar rings */}
              {[1,2,3].map(n => (
                <div key={n} style={{
                  position: "absolute", inset: -(n*12), borderRadius: "50%",
                  border: `1.5px solid rgba(48,176,235,${0.5-n*0.12})`,
                  animation: `radar-ring 2.5s ease-out infinite`,
                  animationDelay: `${n*0.6}s`, pointerEvents: "none",
                }} />
              ))}

              {/* Robot trigger button */}
              <div
                style={{
                  width: 78, height: 78,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "robot-float 3s ease-in-out infinite",
                  position: "relative",
                }}
              >
                <div style={{ zIndex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RobotAvatar size={78} state={robotState} />
                  {showChannels && (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: -90 }}
                      style={{
                        position: "absolute",
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#E4002B",
                        border: "2px solid white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        boxShadow: "0 4px 10px rgba(228,0,43,0.5)",
                        bottom: 0,
                        right: 0,
                        zIndex: 2,
                      }}
                    >
                      <X size={14} strokeWidth={3} />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Unread badge */}
              {unread > 0 && !showChannels && (
                <div style={{ position: "absolute", top: -2, right: -2, width: 22, height: 22, borderRadius: "50%", background: "#E4002B", border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 11, fontWeight: 900, boxShadow: "0 4px 10px rgba(228,0,43,0.5)" }}>
                  {unread}
                </div>
              )}

              {/* Tooltip */}
              {!showChannels && (
                <div style={{ position: "absolute", right: 88, top: "50%", transform: "translateY(-50%)", background: "rgba(9,21,44,0.96)", backdropFilter: "blur(16px)", border: "1px solid rgba(48,176,235,0.3)", borderRadius: 14, padding: "10px 16px", whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
                  <div style={{ color: "white", fontSize: 13.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}>
                    <Sparkles size={13} style={{ color: "#30B0EB" }} />
                    Mia — Chăm sóc khách hàng MobiFone
                  </div>
                  <div style={{ color: "#87D5F8", fontSize: 11, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", display: "inline-block", boxShadow: "0 0 6px #22C55E" }} />
                    Online · Đang có quà tặng 🎁
                  </div>
                  <div style={{ position: "absolute", right: -6, top: "50%", transform: "translateY(-50%)", width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "6px solid rgba(9,21,44,0.96)" }} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat window */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 32, scale: 0.92 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                width: 385,
                height: minimized ? "auto" : 630,
                position: "absolute", bottom: 0, right: 0,
                borderRadius: "24px 24px 20px 20px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                background: "rgba(0,10,25,0.94)",
                backdropFilter: "blur(28px)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(48,176,235,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {/* Header */}
              <div style={{
                background: "linear-gradient(135deg, #0D2137 0%, #1D397A 100%)",
                borderBottom: "1.5px solid #30B0EB",
                padding: "14px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    animation: robotState === "talking" ? "robot-float 0.5s ease-in-out infinite alternate" : "robot-float 3s ease-in-out infinite",
                    flexShrink: 0,
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.25))",
                  }}>
                    <RobotAvatar size={44} state={robotState} />
                  </div>
                  <div>
                    <div style={{ color: "white", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 5 }}>
                      Mia
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", display: "inline-block", boxShadow: "0 0 8px #22C55E", flexShrink: 0 }} />
                      <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                        {typing ? "Đang trả lời..." : "Chăm sóc khách hàng MobiFone"}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setMinimized(p => !p)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)", transition: "all 0.2s" }}
                  >
                    {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)", transition: "all 0.2s" }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {!minimized && (
                <>
                  {/* Messages container */}
                  <div
                    className="chat-msg-scroll flex-1 overflow-y-auto"
                    style={{
                      padding: "20px 16px 8px",
                      background: "linear-gradient(180deg, rgba(0,20,50,0.15) 0%, transparent 100%)",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%230055A5' fill-opacity='0.02'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  >
                    {messages.map(msg => (
                      <div key={msg.id} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: msg.type === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 10 }}>
                          {msg.type === "bot" && (
                            <div style={{ width: 28, height: 28, flexShrink: 0, marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <RobotAvatar size={28} state="idle" />
                            </div>
                          )}
                          <div style={{ maxWidth: "80%" }}>
                            <div style={msg.type === "user"
                              ? { background: "linear-gradient(135deg,#1D397A,#30B0EB)", color: "white", borderRadius: "16px 4px 16px 16px", padding: "11px 15px", fontSize: 13.5, lineHeight: 1.6, boxShadow: "0 4px 14px rgba(29,57,122,0.3)" }
                              : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "#E2E8F0", borderRadius: "4px 16px 16px 16px", padding: "11px 15px", fontSize: 13.5, lineHeight: 1.6, backdropFilter: "blur(12px)" }
                            }>
                              {renderText(msg.text)}

                              {/* Custom Interactive Lead Capture inside Chat Bubble */}
                              {msg.type === "bot" && msg.leadCapture && (
                                <div style={{
                                  marginTop: 12,
                                  background: "rgba(48,176,235,0.08)",
                                  border: "1.5px solid rgba(48,176,235,0.25)",
                                  borderRadius: 12,
                                  padding: 12,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 8,
                                }}>
                                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                                    <Phone size={10} style={{ color: "#30B0EB" }} /> {msg.leadCapture.label}
                                  </div>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <input
                                      placeholder="Nhập tại đây..."
                                      value={captureValue}
                                      onChange={e => setCaptureValue(e.target.value)}
                                      onKeyDown={e => { if (e.key === "Enter" && captureValue.trim()) { send(captureValue); setCaptureValue(""); } }}
                                      style={{
                                        flex: 1,
                                        height: 32,
                                        padding: "0 10px",
                                        borderRadius: 8,
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        background: "rgba(0,0,0,0.2)",
                                        color: "white",
                                        fontSize: 12,
                                        outline: "none",
                                        fontFamily: "'Outfit',sans-serif"
                                      }}
                                    />
                                    <button
                                      onClick={() => { if (captureValue.trim()) { send(captureValue); setCaptureValue(""); } }}
                                      style={{
                                        height: 32,
                                        padding: "0 14px",
                                        background: "linear-gradient(135deg, #1D397A, #30B0EB)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 8,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        fontFamily: "'Outfit',sans-serif",
                                        transition: "all 0.2s"
                                      }}
                                    >
                                      Gửi
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Sources citation */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                                {msg.sources.map((s, idx) => {
                                  const title = typeof s === "string" ? s : s.title || s.url;
                                  const url = typeof s === "string" 
                                    ? (s.startsWith("http") ? s : `https://${s}`)
                                    : s.url;
                                  return (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3,
                                        background: "rgba(48,176,235,0.12)",
                                        color: "#87D5F8",
                                        border: "1px solid rgba(48,176,235,0.15)",
                                        borderRadius: 20,
                                        padding: "2px 8px",
                                        fontSize: 10.5,
                                        fontWeight: 500,
                                        textDecoration: "none",
                                        transition: "all 0.2s"
                                      }}
                                      onMouseEnter={e => {
                                        e.currentTarget.style.background = "rgba(48,176,235,0.24)";
                                        e.currentTarget.style.borderColor = "rgba(48,176,235,0.4)";
                                      }}
                                      onMouseLeave={e => {
                                        e.currentTarget.style.background = "rgba(48,176,235,0.12)";
                                        e.currentTarget.style.borderColor = "rgba(48,176,235,0.15)";
                                      }}
                                    >
                                      <ExternalLink size={8} />
                                      {title}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Quick reply buttons */}
                        {msg.type === "bot" && msg.quickReplies && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingLeft: 38 }}>
                            {msg.quickReplies.map(qr => (
                              <button
                                key={qr}
                                onClick={() => send(qr)}
                                style={{
                                  background: "rgba(48,176,235,0.08)",
                                  color: "#30B0EB",
                                  border: "1.5px solid rgba(48,176,235,0.25)",
                                  borderRadius: 20,
                                  padding: "6px 14px",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "'Outfit',sans-serif",
                                  transition: "all 0.2s",
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                }}
                                onMouseEnter={e => {
                                  const el = e.currentTarget as HTMLButtonElement;
                                  el.style.background = "linear-gradient(135deg, #1D397A, #30B0EB)";
                                  el.style.color = "white";
                                  el.style.borderColor = "transparent";
                                }}
                                onMouseLeave={e => {
                                  const el = e.currentTarget as HTMLButtonElement;
                                  el.style.background = "rgba(48,176,235,0.08)";
                                  el.style.color = "#30B0EB";
                                  el.style.borderColor = "rgba(48,176,235,0.25)";
                                }}
                              >
                                {qr}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {typing && <TypingBubble />}
                    <div ref={endRef} />
                  </div>

                  {/* Suggestions list */}
                  <div style={{ background: "rgba(0,5,15,0.7)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "10px 16px 6px" }}>
                    <div className="suggest-pills" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
                      {SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          style={{
                            flexShrink: 0,
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.6)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 20,
                            padding: "5px 12px",
                            fontSize: 11.5,
                            fontWeight: 500,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all 0.2s",
                            fontFamily: "'Outfit',sans-serif"
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLButtonElement;
                            el.style.background = "rgba(48,176,235,0.15)";
                            el.style.borderColor = "#30B0EB";
                            el.style.color = "white";
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLButtonElement;
                            el.style.background = "rgba(255,255,255,0.05)";
                            el.style.borderColor = "rgba(255,255,255,0.08)";
                            el.style.color = "rgba(255,255,255,0.6)";
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Input form */}
                  <div style={{ background: "rgba(0,5,15,0.85)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "12px 16px 16px", display: "flex", gap: 8, borderRadius: "0 0 20px 20px" }}>
                    <input
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && send(input)}
                      placeholder="Nhập tin nhắn hoặc số điện thoại..."
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.06)",
                        border: "1.5px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontSize: 13.5,
                        outline: "none",
                        color: "white",
                        fontFamily: "'Outfit',sans-serif",
                        transition: "all 0.2s"
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = "#30B0EB";
                        e.target.style.background = "rgba(255,255,255,0.08)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(48,176,235,0.15)";
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = "rgba(255,255,255,0.08)";
                        e.target.style.background = "rgba(255,255,255,0.06)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    <motion.button
                      onClick={() => send(input)}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        border: "none",
                        background: input.trim() ? "linear-gradient(135deg,#1D397A,#30B0EB)" : "rgba(255,255,255,0.06)",
                        color: input.trim() ? "white" : "rgba(255,255,255,0.25)",
                        cursor: input.trim() ? "pointer" : "default",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        boxShadow: input.trim() ? "0 4px 16px rgba(48,176,235,0.35)" : "none",
                        transition: "all 0.25s"
                      }}
                    >
                      <Send size={16} />
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
