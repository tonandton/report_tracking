# 📊 Report Tracking – Daily KPI & Task Management

เว็บแอปสำหรับ **ติดตามงานประจำวัน (Todo)** พร้อม **วัด KPI ความสำเร็จของการทำงาน**  
เหมาะสำหรับทีม IT, Operations, Admin หรือผู้ที่ต้องการสรุปงานรายวันอย่างเป็นระบบ

สร้างด้วย **HTML + TailwindCSS + JavaScript (Vanilla)**  
ไม่ต้องใช้ Backend สามารถเปิดใช้งานได้ทันที

---

## ✨ Features

### 📝 Task Management

- เพิ่มงานประจำวัน พร้อม
  - วันที่ครบกำหนด
  - เวลา
  - ระดับความสำคัญ (High / Medium / Low)
- แสดงรายการงานทั้งหมดของวัน
- Drag & Drop จัดลำดับงาน (Sortable.js)
- แถบ Progress แสดงความคืบหน้าแบบ Real-time

### 🎯 KPI Tracking

- คำนวณ KPI ความสำเร็จ (%) อัตโนมัติ
- แสดงผลด้วยกราฟ (Chart.js)
- แยกสถิติ
  - งานที่เสร็จแล้ว
  - งานที่ยังค้าง

### 🗒 Daily Report

- เขียนสรุปงานประจำวัน
- บันทึก / แก้ไขรายงานย้อนหลัง
- แสดงวันที่บันทึกรายงาน

### 🌙 UX / UI

- รองรับ Dark Mode / Light Mode
- Responsive ใช้งานได้ทั้ง Desktop และ Mobile
- Font ภาษาไทย (Sarabun)

### 📜 History

- ดูประวัติงานย้อนหลัง
- แยกตามวันอย่างชัดเจน

---

## 🧰 Tech Stack

| Technology           | Description       |
| -------------------- | ----------------- |
| HTML5                | โครงสร้างหน้าเว็บ |
| TailwindCSS          | UI Framework      |
| JavaScript (Vanilla) | Logic และ State   |
| Sortable.js          | Drag & Drop งาน   |
| Chart.js             | KPI Chart         |
| Google Fonts         | Sarabun           |

---

## 📂 Project Structure

```text
/
├── index.html        # หน้าเว็บหลัก
├── script.js         # Logic ทั้งหมด (Todo, KPI, Report, History)
└── README.md         # เอกสารโปรเจกต์
```

## Create DB base

CREATE DATABASE db_flow;

-- ตาราง Tasks (todo list)
CREATE TABLE IF NOT EXISTS tasks (
id SERIAL PRIMARY KEY,
text TEXT NOT NULL,
done BOOLEAN DEFAULT FALSE,
due TIMESTAMP,
priority VARCHAR(20) DEFAULT 'medium', -- high, medium, low
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
completed_at TIMESTAMP,
"order" INTEGER DEFAULT 0 -- สำหรับลำดับ drag & drop
);

-- ตาราง Daily Reports
CREATE TABLE IF NOT EXISTS daily_reports (
id SERIAL PRIMARY KEY,
report_date DATE NOT NULL UNIQUE, -- วันที่รายงาน (primary key เพื่อ 1 วัน/1 report)
summary TEXT,
report_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง History (เก็บ snapshot วันเก่า ๆ เป็น JSON)
CREATE TABLE IF NOT EXISTS history (
id SERIAL PRIMARY KEY,
date DATE NOT NULL,
data JSONB, -- เก็บ {tasks: [...], report: '...', reportDate: '...'} เป็น JSON
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
