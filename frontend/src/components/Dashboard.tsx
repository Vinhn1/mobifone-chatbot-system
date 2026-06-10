import React, { useState, useEffect } from 'react';
import { Layout, Menu, Table, Card, Row, Col, Statistic, Space, Button, Input, Tag, Empty, Typography } from 'antd';
import { 
  DashboardOutlined, 
  ContactsOutlined, 
  HistoryOutlined, 
  LogoutOutlined, 
  ReloadOutlined,
  SearchOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

interface Lead {
  id: number;
  name: string | null;
  phone: string;
  interest: string;
  createdAt: string;
}

interface ChatLog {
  id: number;
  sessionId: string;
  role: 'user' | 'bot';
  message: string;
  createdAt: string;
}

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [leadsSearchText, setLeadsSearchText] = useState('');
  const [sessionSearchText, setSessionSearchText] = useState('');

  // Lấy dữ liệu từ Backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // 1. Gọi API Leads
      const leadsRes = await axios.get('http://localhost:3000/leads', config);
      setLeads(leadsRes.data || []);

      // 2. Gọi API Lịch sử chat
      const chatLogsRes = await axios.get('http://localhost:3000/chat/history', config);
      setChatLogs(chatLogsRes.data || []);

    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu dashboard:', error);
      // Nếu token hết hạn hoặc lỗi xác thực -> tự logout
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Bộ lọc Leads theo tìm kiếm SĐT hoặc Interest
  const filteredLeads = leads.filter(
    (lead) =>
      lead.phone?.toLowerCase().includes(leadsSearchText.toLowerCase()) ||
      lead.interest?.toLowerCase().includes(leadsSearchText.toLowerCase()) ||
      (lead.name && lead.name.toLowerCase().includes(leadsSearchText.toLowerCase()))
  );

  // Nhóm lịch sử chat theo sessionId
  const groupedSessions = chatLogs.reduce((acc, log) => {
    if (!acc[log.sessionId]) {
      acc[log.sessionId] = [];
    }
    acc[log.sessionId].push(log);
    return acc;
  }, {} as Record<string, ChatLog[]>);

  // Lọc Sessions theo sessionId tìm kiếm
  const sessionIds = Object.keys(groupedSessions).filter((id) =>
    id.toLowerCase().includes(sessionSearchText.toLowerCase())
  );

  // Định nghĩa các cột cho Bảng Leads
  const leadColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Họ và Tên',
      dataIndex: 'name',
      key: 'name',
      render: (name: string | null) => name || <Text type="secondary">Chưa cập nhật</Text>,
    },
    {
      title: 'Số Điện Thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Space>
          <PhoneOutlined className="text-blue-600" />
          <Text strong className="text-blue-700">{phone}</Text>
        </Space>
      ),
    },
    {
      title: 'Nội dung quan tâm (Context)',
      dataIndex: 'interest',
      key: 'interest',
      render: (interest: string) => <div className="max-w-md truncate" title={interest}>{interest}</div>,
    },
    {
      title: 'Thời gian đăng ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('vi-VN'),
    },
  ];

  return (
    <Layout className="min-h-screen">
      {/* Header chính */}
      <Header className="bg-gradient-to-r from-blue-900 to-indigo-950 px-6 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-lg">M</div>
          <Title level={4} style={{ color: 'white', margin: 0, fontSize: '18px' }}>
            MobiFone Chatbot Dashboard
          </Title>
        </div>
        <Space>
          <Button 
            type="text" 
            icon={<ReloadOutlined />} 
            onClick={fetchData} 
            loading={loading}
            className="text-white hover:bg-white/10"
          >
            Làm mới
          </Button>
          <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />} 
            onClick={onLogout}
            className="border-none"
          >
            Đăng xuất
          </Button>
        </Space>
      </Header>

      <Layout>
        {/* Sidebar điều hướng */}
        <Sider width={220} className="bg-white border-r border-gray-200">
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={({ key }) => setActiveTab(key)}
            className="h-full border-none pt-4"
            items={[
              {
                key: 'overview',
                icon: <DashboardOutlined />,
                label: 'Tổng quan',
              },
              {
                key: 'leads',
                icon: <ContactsOutlined />,
                label: 'Quản lý Leads',
              },
              {
                key: 'chatlogs',
                icon: <HistoryOutlined />,
                label: 'Lịch sử cuộc gọi/Chat',
              },
            ]}
          />
        </Sider>

        {/* Khu vực nội dung chính */}
        <Content className="p-6 bg-gray-50 overflow-y-auto">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <Space direction="vertical" size="large" className="w-full">
              <Row gutter={16}>
                <Col span={8}>
                  <Card bordered={false} className="shadow-sm hover:shadow-md transition">
                    <Statistic
                      title="Tổng số Khách hàng tiềm năng (Leads)"
                      value={leads.length}
                      valueStyle={{ color: '#1d4ed8', fontWeight: 'bold' }}
                      prefix={<ContactsOutlined />}
                      loading={loading}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card bordered={false} className="shadow-sm hover:shadow-md transition">
                    <Statistic
                      title="Tổng số lượt tương tác (Messages)"
                      value={chatLogs.length}
                      valueStyle={{ color: '#0f766e', fontWeight: 'bold' }}
                      prefix={<HistoryOutlined />}
                      loading={loading}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card bordered={false} className="shadow-sm hover:shadow-md transition">
                    <Statistic
                      title="Số lượng phiên hội thoại (Sessions)"
                      value={Object.keys(groupedSessions).length}
                      valueStyle={{ color: '#b45309', fontWeight: 'bold' }}
                      prefix={<DashboardOutlined />}
                      loading={loading}
                    />
                  </Card>
                </Col>
              </Row>

              <Card title="Hoạt động gần đây nhất" bordered={false} className="shadow-sm">
                {leads.length === 0 ? (
                  <Empty description="Không có hoạt động nào gần đây" />
                ) : (
                  <div className="space-y-4">
                    {leads.slice(0, 5).map((lead) => (
                      <div key={lead.id} className="flex justify-between items-center border-b border-gray-100 pb-3">
                        <Space direction="vertical" size={0}>
                          <Text strong className="text-gray-800">Khách hàng để lại SĐT: {lead.phone}</Text>
                          <Text type="secondary" className="text-xs">{lead.interest}</Text>
                        </Space>
                        <Tag color="blue">{new Date(lead.createdAt).toLocaleString('vi-VN')}</Tag>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Space>
          )}

          {/* TAB 2: LEADS MANAGEMENT */}
          {activeTab === 'leads' && (
            <Card 
              title="Quản lý thông tin Khách hàng tiềm năng (Leads)" 
              bordered={false} 
              className="shadow-sm"
              extra={
                <Input
                  placeholder="Tìm kiếm SĐT, Tên, Gói cước..."
                  prefix={<SearchOutlined />}
                  value={leadsSearchText}
                  onChange={(e) => setLeadsSearchText(e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
              }
            >
              <Table
                dataSource={filteredLeads}
                columns={leadColumns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 8 }}
                className="border border-gray-100 rounded-lg overflow-hidden"
              />
            </Card>
          )}

          {/* TAB 3: CHAT HISTORY LOGS */}
          {activeTab === 'chatlogs' && (
            <Card 
              title="Lịch sử chi tiết hội thoại của khách hàng" 
              bordered={false} 
              className="shadow-sm"
              extra={
                <Input
                  placeholder="Tìm kiếm Session ID..."
                  prefix={<SearchOutlined />}
                  value={sessionSearchText}
                  onChange={(e) => setSessionSearchText(e.target.value)}
                  style={{ width: 250 }}
                  allowClear
                />
              }
            >
              {sessionIds.length === 0 ? (
                <Empty description="Không có phiên chat nào được ghi nhận." />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Danh sách phiên chat bên trái */}
                  <div className="lg:col-span-1 border-r border-gray-100 pr-4 max-h-[600px] overflow-y-auto space-y-2">
                    <Text type="secondary" className="block mb-2 font-medium">Chọn phiên chat:</Text>
                    {sessionIds.map((sid) => (
                      <button
                        key={sid}
                        onClick={() => setSessionSearchText(sid)}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition ${
                          sessionSearchText === sid 
                            ? 'bg-blue-50 border-blue-300 text-blue-800' 
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="font-semibold truncate">{sid}</div>
                        <div className="text-[11px] text-gray-400 mt-1">
                          Số tin nhắn: {groupedSessions[sid].length}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Chi tiết nội dung cuộc hội thoại bên phải */}
                  <div className="lg:col-span-2 flex flex-col max-h-[600px] bg-white border border-gray-200 rounded-xl overflow-hidden shadow-inner">
                    {groupedSessions[sessionSearchText] ? (
                      <>
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                          <Text strong className="text-gray-800">Chi tiết phiên: {sessionSearchText}</Text>
                          <Tag color="cyan">Hoạt động</Tag>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
                          {groupedSessions[sessionSearchText].map((msg) => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] p-3 rounded-xl shadow-sm text-sm ${
                                msg.role === 'user'
                                  ? 'bg-blue-600 text-white rounded-tr-none'
                                  : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
                              }`}>
                                <div className="font-semibold text-[10px] mb-1 opacity-70">
                                  {msg.role === 'user' ? 'KHÁCH HÀNG' : 'CHATBOT BOT'}
                                </div>
                                <p className="whitespace-pre-wrap">{msg.message}</p>
                                <div className="text-[9px] text-right mt-1 opacity-60">
                                  {new Date(msg.createdAt).toLocaleTimeString('vi-VN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center min-h-[400px]">
                        <Empty description="Vui lòng chọn một phiên chat bên trái để xem lịch sử chi tiết." />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </Content>
      </Layout>
    </Layout>
  );
};
