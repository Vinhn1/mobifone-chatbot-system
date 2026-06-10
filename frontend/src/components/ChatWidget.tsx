import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, Send, X, Bot, User, HelpCircle, FileText } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'bot';
  message: string;
  sources?: { title: string; url: string }[];
}

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Khởi tạo sessionId khi component mount
  useEffect(() => {
    let storedSessionId = localStorage.getItem('mobifone_chat_session_id');
    if (!storedSessionId) {
      storedSessionId = 'session_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('mobifone_chat_session_id', storedSessionId);
    }
    setSessionId(storedSessionId);

    // Gửi tin nhắn chào mừng mặc định
    setMessages([
      {
        id: 'welcome',
        role: 'bot',
        message: 'Xin chào! Tôi là trợ lý AI của MobiFone. Tôi có thể hỗ trợ gì cho bạn hôm nay? (Ví dụ: thông tin gói cước TK135, đăng ký eSIM, chuyển mạng giữ số...)',
      },
    ]);
  }, []);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      message: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/chat', {
        message: text,
        sessionId: sessionId,
      });

      const data = response.data;

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        message: data.answer || 'Tôi không nhận được câu trả lời từ hệ thống.',
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error('Lỗi khi chat:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        message: 'Rất tiếc, hiện tại hệ thống đang bận hoặc mất kết nối. Vui lòng thử lại sau giây lát!',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const quickQuestions = [
    'Tư vấn gói cước TK135',
    'Hướng dẫn đăng ký eSIM',
    'Chuyển mạng giữ số MobiFone',
  ];

  return (
    <div className="mbf-chat-container">
      {/* Nút Bong Bóng Chat Floating */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="mbf-chat-trigger">
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Cửa Sổ Chat */}
      {isOpen && (
        <div className="mbf-chat-window">
          {/* Header */}
          <div className="mbf-chat-header">
            <div className="mbf-chat-header-info">
              <div className="mbf-chat-bot-avatar">
                <Bot className="h-5 w-5" />
              </div>
              <div className="mbf-chat-bot-title">
                <h3>MobiFone AI Assistant</h3>
                <span className="mbf-chat-bot-status">
                  <span className="mbf-chat-bot-status-dot"></span> Trực tuyến
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="mbf-chat-close-btn">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Danh Sách Tin Nhắn */}
          <div className="mbf-chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`mbf-msg-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}
              >
                {msg.role === 'bot' && (
                  <div className="mbf-msg-avatar bot">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                )}

                <div className="mbf-msg-bubble-container">
                  <div className="mbf-msg-bubble">
                    <p style={{ margin: 0 }}>{msg.message}</p>
                  </div>

                  {/* Nguồn tài liệu tham khảo (Sources) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mbf-sources-section">
                      <span className="mbf-sources-label">
                        <FileText style={{ width: '12px', height: '12px' }} /> Nguồn tham khảo chính thống:
                      </span>
                      <div className="mbf-sources-links">
                        {msg.sources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mbf-source-link"
                          >
                            {src.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="mbf-msg-avatar user">
                    <User className="h-4.5 w-4.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="mbf-msg-row bot-row">
                <div className="mbf-msg-avatar bot">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="mbf-typing-bubble">
                  <span className="mbf-typing-dot"></span>
                  <span className="mbf-typing-dot"></span>
                  <span className="mbf-typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Gợi Ý Câu Hỏi Nhanh (chỉ hiển thị khi không load) */}
          {!isLoading && (
            <div className="mbf-chat-suggestions">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="mbf-suggestion-btn"
                >
                  <HelpCircle style={{ width: '14px', height: '14px', color: '#0054a6' }} />
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="mbf-chat-input-bar">
            <textarea
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Nhập câu hỏi của bạn..."
              className="mbf-chat-textarea"
            />
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="mbf-chat-send-btn"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
