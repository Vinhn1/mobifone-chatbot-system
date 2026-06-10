import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

interface LoginProps {
  onLoginSuccess: (token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await axios.post('http://localhost:3000/auth/login', {
        username: values.username,
        password: values.password,
      });

      const token = response.data.access_token;
      if (token) {
        onLoginSuccess(token);
      } else {
        setErrorMsg('Không nhận được token xác thực.');
      }
    } catch (error: any) {
      console.error('Đăng nhập thất bại:', error);
      setErrorMsg(
        error.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl border-none backdrop-blur-md bg-white/95">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 mb-4">
            <LockOutlined style={{ fontSize: '24px' }} />
          </div>
          <Title level={2} style={{ margin: 0, color: '#1e3a8a' }}>
            MobiFone Admin
          </Title>
          <Text type="secondary" className="text-sm">
            Đăng nhập để vào trang quản trị hệ thống
          </Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            className="mb-6 rounded-lg"
          />
        )}

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên tài khoản!' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Tên đăng nhập (ví dụ: admin)"
              className="rounded-lg hover:border-blue-500 focus:border-blue-500"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Mật khẩu (ví dụ: admin123)"
              className="rounded-lg hover:border-blue-500 focus:border-blue-500"
            />
          </Form.Item>

          <Form.Item className="mt-8 mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg h-11 text-sm font-semibold border-none"
            >
              Đăng Nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
