import React, { useState } from "react";
import { Form, Input, Button, Typography, message, Card, Select } from "antd";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await fetch("https://devswissapi.alleshealth.com/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Email: values.email,
          Password: values.password,
          LoginType: "0",
        }),
      });
      const data = await res.json();
      if (res.status === 200 && data.AccessToken) {
        const role = String(data.user?.UserType) === "1" ? "Admin" : "Basic";
        localStorage.setItem("access_token", data.AccessToken);
        localStorage.setItem("user", JSON.stringify({
          email: data.user.Email,
          name: data.user.Name,
          role,
        }));
        message.success("Login successful!");
        window.location.href = "/";
      } else {
        message.error("Invalid credentials. Please try again.");
      }
    } catch (e) {
      message.error("Login failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa" }}>
      <Card style={{ width: 350, boxShadow: "0 2px 8px #f0f1f2" }}>
        <Typography.Title level={3} style={{ textAlign: "center" }}>ResQ AI Login</Typography.Title>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, message: "Email required" }]}> 
            <Input placeholder="Email" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: "Password required" }]}> 
            <Input.Password placeholder="Password" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>Login</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}