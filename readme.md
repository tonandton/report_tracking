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

## 🗄️ Database Schema

ถ้าต้องการยกระดับโปรเจกต์จาก LocalStorage ไปเป็นฐานข้อมูลจริง  
สามารถใช้ PostgreSQL ได้ตาม schema ด้านล่างนี้

```sql
-- สร้างฐานข้อมูล (ทำครั้งเดียว)
CREATE DATABASE db_flow
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'Thai_Thailand.1252'
    LC_CTYPE = 'Thai_Thailand.1252'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- เชื่อมต่อฐานข้อมูลก่อน
-- \c db_flow

-- ตาราง Tasks (รายการงาน Todo)
CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    text            TEXT NOT NULL,
    done            BOOLEAN DEFAULT FALSE,
    due             TIMESTAMP,                    -- วันเวลาครบกำหนด
    priority        VARCHAR(20) DEFAULT 'medium', -- high, medium, low
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at    TIMESTAMP,
    "order"         INTEGER DEFAULT 0,            -- ลำดับสำหรับ drag & drop
    task_date       DATE DEFAULT CURRENT_DATE     -- วันที่ของงาน (แยกตามวัน)
);

-- ตาราง Daily Reports (สรุปงานประจำวัน)
CREATE TABLE IF NOT EXISTS daily_reports (
    id              SERIAL PRIMARY KEY,
    report_date     DATE NOT NULL UNIQUE,         -- 1 วัน = 1 รายงาน
    summary         TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง History (เก็บ snapshot ข้อมูลย้อนหลังแบบ JSON - ใช้เมื่อต้องการย้อนดูแบบสมบูรณ์)
CREATE TABLE IF NOT EXISTS history (
    id              SERIAL PRIMARY KEY,
    date            DATE NOT NULL UNIQUE,
    data            JSONB,                        -- { tasks: [...], report: string, stats: {...} }
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตัวอย่าง Index เพื่อให้ query เร็วขึ้น
CREATE INDEX idx_tasks_task_date ON tasks(task_date);
CREATE INDEX idx_tasks_done ON tasks(done);
CREATE INDEX idx_daily_reports_report_date ON daily_reports(report_date);
```
