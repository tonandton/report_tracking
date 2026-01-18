const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "report_tracking",
  password: "postgres",
  port: 5432,
});

// Middleware เพื่อ log request (ช่วย debug)
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

// Get all tasks (for today or all - ปรับตามต้องการ)
app.get("/tasks", async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY "order", priority, due',
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add new task
app.post("/tasks", async (req, res) => {
  const { text, due, priority } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });

  try {
    const result = await pool.query(
      "INSERT INTO tasks (text, due, priority) VALUES ($1, $2, $3) RETURNING *",
      [text, due, priority],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Add task error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle done
app.put("/tasks/:id/toggle", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE tasks SET done = NOT done, completed_at = CASE WHEN done THEN NULL ELSE CURRENT_TIMESTAMP END WHERE id = $1 RETURNING *",
      [id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Toggle task error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete task
app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reorder tasks
app.post("/tasks/reorder", async (req, res) => {
  const { order } = req.body; // order เป็น array ของ id [id1, id2, ...]

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: "Invalid order array" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < order.length; i++) {
      await client.query('UPDATE tasks SET "order" = $1 WHERE id = $2', [
        i,
        order[i],
      ]);
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Reorder error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get report for today
app.get("/report", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM daily_reports WHERE report_date = CURRENT_DATE",
    );
    res.json(result.rows[0] || { summary: "", report_time: "" });
  } catch (err) {
    console.error("Get report error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Save/update report
app.post("/report", async (req, res) => {
  const { summary } = req.body;
  if (!summary) return res.status(400).json({ error: "Summary is required" });

  try {
    const result = await pool.query(
      `INSERT INTO daily_reports (report_date, summary) 
       VALUES (CURRENT_DATE, $1) 
       ON CONFLICT (report_date) DO UPDATE SET summary = $1, report_time = CURRENT_TIMESTAMP 
       RETURNING *`,
      [summary],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Save report error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get history
app.get("/history", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM history ORDER BY date DESC LIMIT 30",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Reset day (ย้ายข้อมูลวันนี้ไป history แล้วล้างวันนี้)
app.post("/reset-day", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ดึงงานวันนี้
    const tasksResult = await client.query(
      "SELECT * FROM tasks WHERE created_at::date = CURRENT_DATE",
    );
    const tasksToday = tasksResult.rows;

    // ดึง report วันนี้
    const reportResult = await client.query(
      "SELECT * FROM daily_reports WHERE report_date = CURRENT_DATE",
    );
    const reportToday = reportResult.rows[0] || {
      summary: "",
      report_time: "",
    };

    // บันทึกเข้า history เป็น JSON
    if (tasksToday.length > 0 || reportToday.summary) {
      const historyData = {
        tasks: tasksToday,
        report: reportToday.summary,
        reportDate: reportToday.report_time,
      };
      await client.query(
        "INSERT INTO history (date, data) VALUES (CURRENT_DATE, $1)",
        [JSON.stringify(historyData)],
      );
    }

    // ลบงานวันนี้
    await client.query(
      "DELETE FROM tasks WHERE created_at::date = CURRENT_DATE",
    );

    // ลบ report วันนี้
    await client.query(
      "DELETE FROM daily_reports WHERE report_date = CURRENT_DATE",
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "เริ่มวันใหม่สำเร็จ" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Reset day error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
