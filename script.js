const API_BASE = "http://localhost:3000";
let currentTasks = [];
let currentReport = { summary: "", reportDate: "" };
let historyData = [];
let kpiChart = null;

// Theme Toggle
const toggle = document.getElementById("theme-toggle");
toggle.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  toggle.textContent = document.documentElement.classList.contains("dark")
    ? "☀️"
    : "🌙";
});

// แจ้งเตือน
function showMessage(text, isError = false) {
  const msg = document.createElement("div");
  msg.textContent = text;
  msg.className = `fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-2xl z-50 text-white font-medium text-sm ${
    isError ? "bg-red-600" : "bg-green-600"
  } animate-fade-in-out`;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 3000);
}

// โหลดข้อมูลทั้งหมด
async function loadAllData() {
  try {
    const [tasksRes, reportRes, historyRes] = await Promise.all([
      fetch(`${API_BASE}/tasks`),
      fetch(`${API_BASE}/report`),
      fetch(`${API_BASE}/history`),
    ]);

    if (!tasksRes.ok || !reportRes.ok || !historyRes.ok) {
      throw new Error("โหลดข้อมูลบางส่วนล้มเหลว");
    }

    currentTasks = await tasksRes.json();
    currentReport = await reportRes.json();
    historyData = await historyRes.json();

    renderTasks();
    loadReport();
    renderHistory();
    updateKpiChart();
  } catch (err) {
    console.error("Load data error:", err);
    showMessage("ไม่สามารถโหลดข้อมูลได้: " + err.message, true);
  }
}

// Render Tasks
function renderTasks() {
  const list = document.getElementById("taskList");
  if (!list) return;
  list.innerHTML = "";
  let completed = 0;

  // Sort: ใช้ order ถ้ามี, ถ้าไม่มีใช้ priority + due
  currentTasks.sort((a, b) => {
    const orderA = a.order !== undefined ? a.order : Infinity;
    const orderB = b.order !== undefined ? b.order : Infinity;
    if (orderA !== orderB) return orderA - orderB;

    const prioOrder = { high: 0, medium: 1, low: 2 };
    const prioA = prioOrder[a.priority || "medium"];
    const prioB = prioOrder[b.priority || "medium"];
    if (prioA !== prioB) return prioA - prioB;

    if (!a.due) return 1;
    if (!b.due) return -1;
    return new Date(a.due) - new Date(b.due);
  });

  currentTasks.forEach((task) => {
    const li = document.createElement("li");
    li.className =
      "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 cursor-move";

    const prioColor =
      task.priority === "high"
        ? "bg-red-500"
        : task.priority === "low"
          ? "bg-green-500"
          : "bg-yellow-500";
    const prioBadge = `<span class="inline-block w-3 h-3 rounded-full ${prioColor}"></span>`;

    let dueDisplay = "";
    if (task.due) {
      const dueDT = new Date(task.due);
      const now = new Date();
      const overdue = !task.done && dueDT < now;
      const soon = !task.done && dueDT - now < 24 * 60 * 60 * 1000;
      dueDisplay = `<div class="text-sm mt-1 ${overdue ? "text-red-600 font-medium" : soon ? "text-amber-600" : "text-gray-500 dark:text-gray-400"}">
                ครบกำหนด: ${dueDT.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                ${overdue ? " (เลยกำหนด!)" : ""}
            </div>`;
    }

    let duration = "";
    if (task.done && task.completed_at && task.created_at) {
      const diff = new Date(task.completed_at) - new Date(task.created_at);
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      duration = `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ใช้เวลา: ${hours > 0 ? hours + " ชม. " : ""}${remainingMins} นาที
            </div>`;
    }

    li.innerHTML = `
            <div class="flex items-center gap-3 flex-1">
                ${prioBadge}
                <input type="checkbox" ${task.done ? "checked" : ""} class="w-5 h-5 text-indigo-600 rounded" onchange="toggleTask(${task.id})">
                <span class="flex-1 ${task.done ? "line-through text-gray-500 dark:text-gray-400" : ""}">${task.text}</span>
            </div>
            <div class="flex flex-col items-end">
                ${dueDisplay}
                ${duration}
            </div>
            <button onclick="deleteTask(${task.id})" class="text-red-500 hover:text-red-700 text-sm">ลบ</button>
        `;
    list.appendChild(li);

    if (task.done) completed++;
  });

  // Drag & Drop จัดลำดับ
  new Sortable(list, {
    animation: 150,
    onEnd: async () => {
      const newOrder = Array.from(list.children)
        .map((li) => {
          const text = li.querySelector("span.flex-1").textContent;
          return currentTasks.find((t) => t.text === text)?.id;
        })
        .filter((id) => id !== undefined);

      try {
        const res = await fetch(`${API_BASE}/tasks/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newOrder }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "จัดลำดับไม่สำเร็จ");
        }

        showMessage("จัดลำดับใหม่สำเร็จ!");
        loadAllData();
      } catch (err) {
        console.error("Reorder error:", err);
        showMessage("จัดลำดับไม่สำเร็จ: " + err.message, true);
      }
    },
  });

  // อัปเดต stats
  const total = currentTasks.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  document.getElementById("totalCount").textContent = total;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("completedStat").textContent = completed;
  document.getElementById("pendingStat").textContent = total - completed;
  document.getElementById("kpiPercent").textContent = percent + "%";
  document.getElementById("progressBar").style.width = percent + "%";
}

// Add Task
async function addTask() {
  const text = document.getElementById("taskInput").value.trim();
  if (!text) return;

  const date = document.getElementById("dueDate").value;
  const time = document.getElementById("dueTime").value;
  const priority = document.getElementById("priority").value;

  const due = date ? `${date}${time ? "T" + time : ""}` : null;

  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, due, priority }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "เพิ่มงานไม่สำเร็จ");
    }

    document.getElementById("taskInput").value = "";
    document.getElementById("dueDate").value = "";
    document.getElementById("dueTime").value = "";

    await loadAllData();
    showMessage("เพิ่มงานสำเร็จ!");
  } catch (err) {
    showMessage("เกิดข้อผิดพลาด: " + err.message, true);
  }
}

// Toggle Done
async function toggleTask(id) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}/toggle`, {
      method: "PUT",
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "อัปเดตไม่สำเร็จ");
    }
    await loadAllData();
  } catch (err) {
    showMessage("เกิดข้อผิดพลาด: " + err.message, true);
  }
}

// Delete Task
async function deleteTask(id) {
  if (!confirm("แน่ใจที่จะลบ?")) return;
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "ลบไม่สำเร็จ");
    }
    await loadAllData();
    showMessage("ลบงานสำเร็จ!");
  } catch (err) {
    showMessage("เกิดข้อผิดพลาด: " + err.message, true);
  }
}

// Report Functions
function loadReport() {
  document.getElementById("report").value = currentReport.summary || "";
  if (currentReport.summary) {
    document.getElementById("reportPreview").textContent =
      currentReport.summary;
    document.getElementById("reportDate").textContent =
      currentReport.reportDate || new Date().toLocaleDateString("th-TH");
    document.getElementById("reportPreviewMode").classList.remove("hidden");
    document.getElementById("reportEditMode").classList.add("hidden");
  } else {
    document.getElementById("reportEditMode").classList.remove("hidden");
    document.getElementById("reportPreviewMode").classList.add("hidden");
  }
}

async function saveReport() {
  const text = document.getElementById("report").value.trim();
  if (!text) return;

  try {
    const res = await fetch(`${API_BASE}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: text }),
    });
    if (!res.ok) throw new Error("บันทึกไม่สำเร็จ");
    await loadAllData();
    showMessage("บันทึกรายงานสำเร็จ!");
  } catch (err) {
    showMessage("เกิดข้อผิดพลาด: " + err.message, true);
  }
}

function editReport() {
  document.getElementById("reportEditMode").classList.remove("hidden");
  document.getElementById("reportPreviewMode").classList.add("hidden");
  document.getElementById("report").focus();
}

function cancelEdit() {
  document.getElementById("report").value = currentReport.summary || "";
  document.getElementById("reportEditMode").classList.add("hidden");
  if (currentReport.summary)
    document.getElementById("reportPreviewMode").classList.remove("hidden");
}

// Render History
function renderHistory() {
  const container = document.getElementById("historyList");
  if (!container) return;
  container.innerHTML = "";

  const noHistory = document.getElementById("noHistory");
  if (historyData.length === 0) {
    noHistory?.classList.remove("hidden");
    return;
  }
  noHistory?.classList.add("hidden");

  historyData
    .slice()
    .reverse()
    .forEach((entry, hIndex) => {
      const div = document.createElement("div");
      div.className =
        "border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mb-4";

      const btn = document.createElement("button");
      btn.className =
        "w-full px-5 py-4 bg-gray-100 dark:bg-gray-700 text-left font-medium flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-600 transition";
      btn.innerHTML = `
            <div>
                <span class="text-lg">${new Date(entry.date).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400 block">
                    ${entry.tasks.filter((t) => t.done).length} เสร็จ / ${entry.tasks.length} ทั้งหมด
                </span>
            </div>
            <span class="text-gray-500 dark:text-gray-400">คลิกเพื่อดูรายละเอียด</span>
        `;

      const content = document.createElement("div");
      content.className = "hidden px-5 py-4 bg-white dark:bg-gray-800";

      if (entry.tasks.length > 0) {
        const ul = document.createElement("ul");
        ul.className = "space-y-4";

        entry.tasks.forEach((t, tIndex) => {
          const li = document.createElement("li");
          li.className =
            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600";

          const prioColor =
            t.priority === "high"
              ? "bg-red-500"
              : t.priority === "low"
                ? "bg-green-500"
                : "bg-yellow-500";
          const prioBadge = `<span class="inline-block w-3 h-3 rounded-full ${prioColor}"></span>`;

          let dueDisplay = "";
          if (t.due) {
            const dueDT = new Date(t.due);
            const overdue = !t.done && dueDT < new Date();
            dueDisplay = `<span class="text-sm ${overdue ? "text-red-600 font-medium" : "text-gray-500 dark:text-gray-400"}">
                        ครบกำหนด: ${dueDT.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                        ${overdue ? " (เลยกำหนด!)" : ""}
                    </span>`;
          }

          let durationDisplay = "";
          if (t.done && t.created_at && t.completed_at) {
            const diff = new Date(t.completed_at) - new Date(t.created_at);
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(mins / 60);
            const remainingMins = mins % 60;
            durationDisplay = `<span class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ใช้เวลา: ${hours > 0 ? hours + " ชม. " : ""}${remainingMins} นาที
                    </span>`;
          }

          li.innerHTML = `
                    <div class="flex items-center gap-3 flex-1">
                        <input type="checkbox" ${t.done ? "checked" : ""} class="w-5 h-5 text-indigo-600 rounded" 
                               onchange="toggleHistoryTask(${hIndex}, ${tIndex})">
                        ${prioBadge}
                        <span class="flex-1 ${t.done ? "line-through text-gray-500 dark:text-gray-400" : ""}">${t.text}</span>
                    </div>
                    <div class="flex flex-col items-end text-right">
                        ${dueDisplay}
                        ${durationDisplay}
                    </div>
                `;
          ul.appendChild(li);
        });
        content.appendChild(ul);
      } else {
        content.innerHTML +=
          '<p class="text-gray-500 dark:text-gray-400 text-center py-4">ไม่มีงานในวันนั้น</p>';
      }

      if (entry.report) {
        content.innerHTML += `
                <hr class="my-5 border-gray-200 dark:border-gray-700">
                <p class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">Daily Report:</p>
                <p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">${entry.report}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">บันทึกเมื่อ: ${entry.reportDate}</p>
            `;
      }

      btn.onclick = () => content.classList.toggle("hidden");
      div.appendChild(btn);
      div.appendChild(content);
      container.appendChild(div);
    });
}

// Toggle task ใน history (แค่เปลี่ยนใน frontend ถ้าต้องการบันทึกจริงให้เพิ่ม fetch)
function toggleHistoryTask(hIndex, tIndex) {
  const task = historyData[hIndex].tasks[tIndex];
  task.done = !task.done;
  if (task.done) task.completed_at = new Date().toISOString();
  else task.completed_at = null;
  renderHistory();
}

// Update KPI Chart
function updateKpiChart() {
  const ctx = document.getElementById("kpiChart")?.getContext("2d");
  if (!ctx) return;

  const labels = historyData.slice(-7).map((e) => e.date);
  const data = historyData.slice(-7).map((e) => {
    const completed = e.tasks.filter((t) => t.done).length;
    return e.tasks.length ? Math.round((completed / e.tasks.length) * 100) : 0;
  });

  if (kpiChart) kpiChart.destroy();
  kpiChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "KPI % เสร็จ",
          data,
          borderColor: "#4f46e5",
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });
}

// Reset Day
async function resetDay() {
  if (!confirm("เริ่มวันใหม่? งานทั้งหมดวันนี้จะถูกย้ายไปประวัติ")) return;

  try {
    const res = await fetch(`${API_BASE}/reset-day`, { method: "POST" });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "เริ่มวันใหม่ไม่สำเร็จ");
    }
    showMessage("เริ่มวันใหม่สำเร็จ!");
    loadAllData();
  } catch (err) {
    showMessage("เกิดข้อผิดพลาด: " + err.message, true);
  }
}

// Initial Load
loadAllData();
