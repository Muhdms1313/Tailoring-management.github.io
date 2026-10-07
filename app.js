// TailorPro V2 - Main Application Logic

const STORAGE_KEY = "tailorpro_v2_data";

let data = JSON.parse(
  localStorage.getItem(STORAGE_KEY) ||
  '{"customers":[],"measurements":[],"orders":[],"payments":[],"expenses":[]}'
);

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

function money(amount) {
  return "₦" + Number(amount || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function generateId(prefix) {
  return prefix + "-" + Date.now().toString().slice(-8);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (char) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

/* =========================
   CUSTOMER FUNCTIONS
========================= */

function addCustomer(customer) {
  const newCustomer = {
    id: generateId("CUS"),
    name: customer.name,
    phone: customer.phone,
    address: customer.address || "",
    notes: customer.notes || "",
    createdAt: today()
  };

  data.customers.push(newCustomer);
  saveData();

  return newCustomer;
}

function updateCustomer(id, updates) {
  const customer = data.customers.find(c => c.id === id);

  if (!customer) return;

  Object.assign(customer, updates);
  saveData();
}

function deleteCustomer(id) {
  if (!confirm("Delete this customer?")) return;

  data.customers = data.customers.filter(c => c.id !== id);

  saveData();
}

function getCustomer(id) {
  return data.customers.find(c => c.id === id);
}

function searchCustomers(query) {
  query = query.toLowerCase();

  return data.customers.filter(customer =>
    customer.name.toLowerCase().includes(query) ||
    customer.phone.toLowerCase().includes(query)
  );
}

/* =========================
   MEASUREMENT FUNCTIONS
========================= */

function addMeasurement(measurement) {
  const record = {
    id: generateId("MS"),
    customerId: measurement.customerId,
    date: measurement.date || today(),

    shoulder: measurement.shoulder || "",
    chest: measurement.chest || "",
    waist: measurement.waist || "",
    hip: measurement.hip || "",
    sleeve: measurement.sleeve || "",
    length: measurement.length || "",
    neck: measurement.neck || "",
    trouserLength: measurement.trouserLength || "",
    thigh: measurement.thigh || "",
    knee: measurement.knee || "",
    wrist: measurement.wrist || "",
    inseam: measurement.inseam || "",

    notes: measurement.notes || ""
  };

  data.measurements.push(record);
  saveData();

  return record;
}

function getCustomerMeasurements(customerId) {
  return data.measurements
    .filter(m => m.customerId === customerId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getLatestMeasurement(customerId) {
  const measurements = getCustomerMeasurements(customerId);

  return measurements.length ? measurements[0] : null;
}

/* =========================
   ORDER FUNCTIONS
========================= */

function createOrder(order) {
  const total = Number(order.total || 0);
  const paid = Number(order.paid || 0);

  const newOrder = {
    id: generateId("ORD"),
    number: "ORD-" + Date.now().toString().slice(-7),

    customerId: order.customerId,
    outfit: order.outfit,
    description: order.description || "",

    receivedDate: order.receivedDate || today(),
    completionDate: order.completionDate || "",
    collectionDate: order.collectionDate || "",

    total: total,
    paid: paid,

    status: "Received",

    notes: order.notes || "",

    createdAt: today()
  };

  data.orders.push(newOrder);

  if (paid > 0) {
    addPayment({
      orderId: newOrder.id,
      amount: paid,
      method: order.paymentMethod || "Cash",
      date: today()
    }, false);
  }

  saveData();

  return newOrder;
}

function updateOrderStatus(orderId, status) {
  const order = data.orders.find(o => o.id === orderId);

  if (!order) return;

  order.status = status;

  saveData();
}

function getOrder(orderId) {
  return data.orders.find(o => o.id === orderId);
}

function getCustomerOrders(customerId) {
  return data.orders
    .filter(o => o.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function getOrderBalance(order) {
  return Math.max(
    0,
    Number(order.total || 0) - Number(order.paid || 0)
  );
}

function searchOrders(query) {
  query = query.toLowerCase();

  return data.orders.filter(order => {
    const customer = getCustomer(order.customerId);

    return (
      order.number.toLowerCase().includes(query) ||
      order.outfit.toLowerCase().includes(query) ||
      (customer &&
        customer.name.toLowerCase().includes(query))
    );
  });
}

/* =========================
   PAYMENT FUNCTIONS
========================= */

function addPayment(payment, shouldSave = true) {
  const amount = Number(payment.amount || 0);

  if (amount <= 0) {
    alert("Please enter a valid payment amount.");
    return;
  }

  const order = getOrder(payment.orderId);

  if (!order) {
    alert("Order not found.");
    return;
  }

  const balance = getOrderBalance(order);

  if (amount > balance) {
    alert(
      "Payment cannot be greater than the outstanding balance."
    );
    return;
  }

  const record = {
    id: generateId("PAY"),
    orderId: payment.orderId,
    amount: amount,
    method: payment.method || "Cash",
    date: payment.date || today(),
    notes: payment.notes || ""
  };

  data.payments.push(record);

  order.paid = Number(order.paid || 0) + amount;

  if (getOrderBalance(order) === 0) {
    order.status = "Ready for Collection";
  }

  if (shouldSave) {
    saveData();
  }

  return record;
}

function getOrderPayments(orderId) {
  return data.payments
    .filter(payment => payment.orderId === orderId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/* =========================
   EXPENSE FUNCTIONS
========================= */

function addExpense(expense) {
  const record = {
    id: generateId("EXP"),
    description: expense.description,
    category: expense.category || "Other",
    amount: Number(expense.amount || 0),
    date: expense.date || today()
  };

  data.expenses.push(record);

  saveData();

  return record;
}

/* =========================
   DASHBOARD
========================= */

function getDashboardStats() {
  const activeOrders = data.orders.filter(
    order => order.status !== "Delivered"
  );

  const deliveredOrders = data.orders.filter(
    order => order.status === "Delivered"
  );

  const dueToday = data.orders.filter(
    order =>
      order.collectionDate === today() &&
      order.status !== "Delivered"
  );

  const overdue = data.orders.filter(
    order =>
      order.collectionDate &&
      order.collectionDate < today() &&
      order.status !== "Delivered"
  );

  const revenue = data.payments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const outstanding = data.orders.reduce(
    (total, order) => total + getOrderBalance(order),
    0
  );

  const expenses = data.expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  return {
    customers: data.customers.length,
    totalOrders: data.orders.length,
    activeOrders: activeOrders.length,
    deliveredOrders: deliveredOrders.length,
    dueToday: dueToday.length,
    overdue: overdue.length,
    revenue,
    outstanding,
    expenses,
    profit: revenue - expenses
  };
}

/* =========================
   RECEIPT
========================= */

function printReceipt(orderId) {
  const order = getOrder(orderId);

  if (!order) {
    alert("Order not found.");
    return;
  }

  const customer = getCustomer(order.customerId);

  const receiptWindow = window.open(
    "",
    "_blank",
    "width=700,height=800"
  );

  receiptWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>TailorPro Receipt</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 30px;
          color: #111;
        }

        .receipt {
          max-width: 600px;
          margin: auto;
          border: 2px solid #222;
          padding: 25px;
        }

        h1 {
          margin: 0;
          text-align: center;
          color: #1e4f91;
        }

        .gold {
          color: #c69b2d;
        }

        .line {
          border-top: 1px solid #ccc;
          margin: 15px 0;
        }

        .row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
        }

        .total {
          font-size: 20px;
          font-weight: bold;
        }

        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>

    <body>

      <div class="receipt">

        <h1>TAILORPRO</h1>

        <p style="text-align:center">
          Tailoring Management System
        </p>

        <div class="line"></div>

        <div class="row">
          <strong>Receipt:</strong>
          <span>${escapeHTML(order.number)}</span>
        </div>

        <div class="row">
          <strong>Date:</strong>
          <span>${escapeHTML(today())}</span>
        </div>

        <div class="line"></div>

        <div class="row">
          <strong>Customer:</strong>
          <span>${escapeHTML(customer?.name || "")}</span>
        </div>

        <div class="row">
          <strong>Phone:</strong>
          <span>${escapeHTML(customer?.phone || "")}</span>
        </div>

        <div class="row">
          <strong>Outfit:</strong>
          <span>${escapeHTML(order.outfit)}</span>
        </div>

        <div class="row">
          <strong>Collection:</strong>
          <span>${escapeHTML(order.collectionDate)}</span>
        </div>

        <div class="line"></div>

        <div class="row">
          <strong>Total:</strong>
          <span>${money(order.total)}</span>
        </div>

        <div class="row">
          <strong>Paid:</strong>
          <span>${money(order.paid)}</span>
        </div>

        <div class="row total">
          <strong>Balance:</strong>
          <span class="gold">
            ${money(getOrderBalance(order))}
          </span>
        </div>

        <div class="line"></div>

        <p style="text-align:center">
          Thank you for your patronage.
        </p>

        <button onclick="window.print()">
          Print Receipt
        </button>

      </div>

    </body>
    </html>
  `);

  receiptWindow.document.close();
}

/* =========================
   BACKUP
========================= */

function backupData() {
  const backup = {
    application: "TailorPro",
    version: "2.0",
    exportedAt: new Date().toISOString(),
    data: data
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download =
    "tailorpro-backup-" +
    today() +
    ".json";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

/* =========================
   RESTORE BACKUP
========================= */

function restoreBackup(file) {
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const backup = JSON.parse(event.target.result);

      if (!backup.data) {
        throw new Error("Invalid backup file.");
      }

      if (
        !confirm(
          "Restoring this backup will replace your current data. Continue?"
        )
      ) {
        return;
      }

      data = backup.data;

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );

      alert("Backup restored successfully.");

      location.reload();

    } catch (error) {
      alert(
        "Could not restore the backup. Please select a valid TailorPro backup file."
      );
    }
  };

  reader.readAsText(file);
}

/* =========================
   CLEAR DATA
========================= */

function clearAllData() {
  const confirmation = prompt(
    'Type "DELETE" to permanently remove all TailorPro data.'
  );

  if (confirmation !== "DELETE") {
    return;
  }

  data = {
    customers: [],
    measurements: [],
    orders: [],
    payments: [],
    expenses: []
  };

  localStorage.removeItem(STORAGE_KEY);

  location.reload();
}

/* =========================
   RENDER HELPERS
========================= */

function renderCustomerOptions(selectElement) {
  if (!selectElement) return;

  selectElement.innerHTML =
    `<option value="">Select customer</option>` +
    data.customers
      .map(customer => `
        <option value="${customer.id}">
          ${escapeHTML(customer.name)}
        </option>
      `)
      .join("");
}

function renderAll() {
  if (typeof renderDashboard === "function") {
    renderDashboard();
  }

  if (typeof renderCustomers === "function") {
    renderCustomers();
  }

  if (typeof renderMeasurements === "function") {
    renderMeasurements();
  }

  if (typeof renderOrders === "function") {
    renderOrders();
  }

  if (typeof renderPayments === "function") {
    renderPayments();
  }

  if (typeof renderReports === "function") {
    renderReports();
  }
}

/* =========================
   START APPLICATION
========================= */

document.addEventListener("DOMContentLoaded", function () {
  renderAll();
});
