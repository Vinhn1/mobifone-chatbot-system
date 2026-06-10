import { useState, useEffect } from 'react';
import { Button, Space, Card, Typography, Row, Col } from 'antd';
import { DashboardOutlined, GlobalOutlined, StarOutlined, ThunderboltOutlined, SafetyOutlined } from '@ant-design/icons';
import { ChatWidget } from './components/ChatWidget';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

const { Title, Paragraph, Text } = Typography;

function App() {
  const [view, setView] = useState<'portal' | 'admin'>('portal');
  const [token, setToken] = useState<string | null>(null);

  // Check if admin is already logged in on reload
  useEffect(() => {
    const storedToken = localStorage.getItem('mobifone_admin_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleLoginSuccess = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem('mobifone_admin_token', newToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('mobifone_admin_token');
  };

  // Switch between Portal and Admin panel
  if (view === 'admin') {
    if (!token) {
      return (
        <div>
          {/* Header to quickly return to client portal */}
          <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
            <Button 
              type="default" 
              icon={<GlobalOutlined />} 
              onClick={() => setView('portal')}
            >
              Quay lại Portal
            </Button>
          </div>
          <Login onLoginSuccess={handleLoginSuccess} />
        </div>
      );
    }

    return (
      <div>
        {/* Floating back button on dashboard header, handled by state */}
        <div style={{ position: 'absolute', top: '16px', right: '180px', zIndex: 1000 }}>
          <Button 
            type="default" 
            ghost
            icon={<GlobalOutlined />} 
            onClick={() => setView('portal')}
            style={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}
          >
            Quay lại Portal
          </Button>
        </div>
        <Dashboard token={token} onLogout={handleLogout} />
      </div>
    );
  }

  // Client view - MobiFone Portal
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Bar */}
      <nav className="mbf-landing-nav">
        <div className="mbf-landing-logo">
          Mobi<span>Fone</span> Portal
        </div>
        <div className="mbf-landing-menu">
          <a href="#" className="mbf-landing-menu-item">Trang Chủ</a>
          <a href="#" className="mbf-landing-menu-item">Gói Cước Di Động</a>
          <a href="#" className="mbf-landing-menu-item">Dịch Vụ eSIM</a>
          <a href="#" className="mbf-landing-menu-item">Khuyến Mại</a>
        </div>
        <Space>
          <Button 
            type="primary" 
            icon={<DashboardOutlined />} 
            onClick={() => setView('admin')}
            style={{ backgroundColor: '#0054a6', border: 'none' }}
          >
            Dashboard Quản Trị
          </Button>
        </Space>
      </nav>

      {/* Hero Section */}
      <header className="mbf-landing-hero">
        <h1>
          Trải Nghiệm Dịch Vụ Số <span>MobiFone Thế Hệ Mới</span>
        </h1>
        <p>
          Tìm kiếm thông tin gói cước, hỗ trợ đăng ký thông tin eSIM, và chuyển mạng giữ số cực kỳ nhanh chóng cùng Trợ lý Chatbot AI thông minh hoạt động 24/7.
        </p>
        <Space size="middle">
          <Button 
            type="primary" 
            size="large"
            style={{ backgroundColor: '#0054a6', border: 'none', height: '48px', padding: '0 24px', borderRadius: '8px' }}
          >
            Tìm Hiểu Gói Cước
          </Button>
          <Button 
            type="default" 
            size="large"
            style={{ height: '48px', padding: '0 24px', borderRadius: '8px' }}
          >
            Đăng Ký eSIM
          </Button>
        </Space>
      </header>

      {/* Features Showcase */}
      <main style={{ flex: 1, padding: '40px 60px', backgroundColor: '#ffffff' }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '40px', color: '#0f172a' }}>
          Tại sao chọn dịch vụ số MobiFone?
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card hoverable style={{ height: '100%', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', color: '#0054a6', marginBottom: '16px' }}>
                <ThunderboltOutlined />
              </div>
              <Title level={4}>Tốc Độ Siêu Vượt Trội</Title>
              <Paragraph type="secondary">
                Đường truyền mạng 4G/5G chất lượng cao, phục vụ làm việc giải trí mọi lúc mọi nơi ổn định mượt mà.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card hoverable style={{ height: '100%', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', color: '#f7941d', marginBottom: '16px' }}>
                <StarOutlined />
              </div>
              <Title level={4}>Gói Cước Đa Dạng</Title>
              <Paragraph type="secondary">
                Từ các gói cước ngày siêu tốc cho tới gói cước năm dung lượng khủng (TK135, KC120...) được cá nhân hoá theo nhu cầu.
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card hoverable style={{ height: '100%', borderRadius: '12px' }}>
              <div style={{ fontSize: '32px', color: '#22c55e', marginBottom: '16px' }}>
                <SafetyOutlined />
              </div>
              <Title level={4}>Bảo Mật Thông Tin</Title>
              <Paragraph type="secondary">
                Hệ thống xác thực sinh trắc học và quản lý thông tin chủ thuê bao an toàn, tuân thủ Nghị định bảo vệ dữ liệu.
              </Paragraph>
            </Card>
          </Col>
        </Row>
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '30px 40px', textAlign: 'center', fontSize: '14px', borderTop: '1px solid #1e293b' }}>
        <Text style={{ color: '#64748b' }}>
          © 2026 Tổng Công ty Viễn thông MobiFone. Bản quyền đã được bảo lưu.
        </Text>
      </footer>

      {/* Floating Chat Widget Client */}
      <ChatWidget />
    </div>
  );
}

export default App;
