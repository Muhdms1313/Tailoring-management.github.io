const KEY = "tailorpro_v1";

let db = JSON.parse(
  localStorage.getItem(KEY) ||
  '{"customers":[],"measurements":[],"orders":[],"payments":[]}'
);

const money = n =>
  "₦" + Number(n || 0).toLocaleString("en-NG", {
    maximumFractionDigits: 2
  });

const today = () => new Date().toISOString().slice(0, 10);

const esc = s =>
  String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
  refresh();
}

function customer(id) {
  return db.customers.find(x => x.id === id);
}

function order(id) {
  return db.orders.find(x => x.id === id);
}

function refresh() {
  renderDashboard();
  renderCustomers();
  renderMeasurements();
  renderOrders();
  renderPayments();
  renderReports();
  fillCustomerSelects();
}

function nav(page) {
  document.querySelectorAll(".page").forEach(x =>
    x.classList.toggle("active", x.id === page)
  );

  document.querySelectorAll("[data-page]").forEach(x =>
    x.classList.toggle("active", x.dataset.page === page)
  );

  const title = document.getElementById("pageTitle");

  if (title) {
    title.textContent =
      page[0].toUpperCase() + page.slice(1);
  }
}

document.querySelectorAll("[data-page]").forEach(b => {
  b.onclick = () => nav(b.dataset.page);
});

function statusBadge(s) {
  let c =
    s === "Delivered"
      ? "ok"
      : s === "Ready for Collection"
      ? "warn"
      : s === "Received"
      ? ""
      : s === "Finishing"
      ? "warn"
      : "";

  return `<span class="badge ${c}">${esc(s)}</span>`;
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  if (typeof mCustomers !== "undefined")
    mCustomers.textContent = db.customers.length;

  if (typeof mActive !== "undefined")
    mActive.textContent =
      db.orders.filter(o => o.status !== "Delivered").length;

  if (typeof mDue !== "undefined")
    mDue.textContent =
      db.orders.filter(
        o =>
          o.collectionDate === today() &&
          o.status !== "Delivered"
      ).length;

  if (typeof mBalance !== "undefined")
    mBalance.textContent = money(
      db.orders.reduce(
        (a, o) =>
          a +
          (Number(o.total) || 0) -
          (Number(o.paid) || 0),
        0
      )
    );

  if (typeof recentOrders !== "undefined") {
    recentOrders.innerHTML =
      db.orders
        .slice()
        .sort((a, b) =>
          b.created.localeCompare(a.created)
        )
        .slice(0, 8)
        .map(
          o => `
          <tr>
            <td>${esc(o.number)}</td>
            <td>${esc(
              customer(o.customerId)?.name || "Unknown"
            )}</td>
            <td>${esc(o.outfit)}</td>
            <td>${esc(o.collectionDate)}</td>
            <td>${statusBadge(o.status)}</td>
            <td>${money(
              Number(o.total || 0) -
              Number(o.paid || 0)
            )}</td>
          </tr>
        `
        )
        .join("") ||
      `<tr>
        <td colspan="6" class="empty">
          No orders yet.
        </td>
      </tr>`;
  }
}


/* =========================================================
   CUSTOMERS
========================================================= */

function renderCustomers() {
  const q =
    (typeof customerSearch !== "undefined"
      ? customerSearch?.value || ""
      : ""
    ).toLowerCase();

  const rows = db.customers.filter(c =>
    (c.name + " " + c.phone)
      .toLowerCase()
      .includes(q)
  );

  if (typeof customerRows === "undefined") return;

  customerRows.innerHTML =
    rows
      .map(c => {
        const ms = db.measurements
          .filter(m => m.customerId === c.id)
          .sort((a, b) =>
            b.date.localeCompare(a.date)
          )[0];

        return `
          <tr>
            <td>
              <b>${esc(c.name)}</b>
              <br>
              <span class="muted">
                ${esc(c.id)}
              </span>
            </td>

            <td>${esc(c.phone)}</td>

            <td>
              ${db.orders.filter(
                o => o.customerId === c.id
              ).length}
            </td>

            <td>
              ${ms ? esc(ms.date) : "—"}
            </td>

            <td>
              <button
                class="btn secondary"
                onclick="openCustomer('${c.id}')"
              >
                View/Edit
              </button>
            </td>
          </tr>
        `;
      })
      .join("") ||
    `
      <tr>
        <td colspan="5" class="empty">
          No customers found.
        </td>
      </tr>
    `;
}


/* =========================================================
   CUSTOMER SELECT
========================================================= */

function fillCustomerSelects() {
  if (typeof measurementCustomer === "undefined")
    return;

  let opts =
    `<option value="">Select customer</option>` +
    db.customers
      .map(
        c =>
          `<option value="${c.id}">
            ${esc(c.name)} — ${esc(c.phone)}
          </option>`
      )
      .join("");

  const old = measurementCustomer.value;

  measurementCustomer.innerHTML = opts;

  measurementCustomer.value = old;
}


/* =========================================================
   NEW / EDIT CUSTOMER
========================================================= */

function openCustomer(id = "") {
  const c =
    customer(id) || {
      name: "",
      phone: "",
      address: "",
      notes: ""
    };

  modalTitle.textContent = id
    ? "Edit Customer"
    : "New Customer";

  modalBody.innerHTML = `
    <form
      onsubmit="event.preventDefault();saveCustomer('${id}')"
    >

      <div class="formgrid">

        <div class="field">
          <label>Full Name *</label>

          <input
            id="f_name"
            required
            value="${esc(c.name)}"
            placeholder="Customer full name"
          >
        </div>


        <div class="field">
          <label>Phone Number *</label>

          <input
            id="f_phone"
            required
            value="${esc(c.phone)}"
            placeholder="08012345678"
          >
        </div>


        <div class="field full">
          <label>Address</label>

          <input
            id="f_address"
            value="${esc(c.address)}"
            placeholder="Customer address"
          >
        </div>


        <div class="field full">
          <label>Comment / Note</label>

          <textarea
            id="f_notes"
            placeholder="Additional comment or note"
          >${esc(c.notes)}</textarea>
        </div>

      </div>


      <div class="actions">

        <button
          type="button"
          class="btn secondary"
          onclick="closeModal()"
        >
          Cancel
        </button>

        <button
          class="btn"
          type="submit"
        >
          Save Customer
        </button>

      </div>

    </form>
  `;

  modal.classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("f_name")?.focus();
  }, 50);
}


/* =========================================================
   SAVE CUSTOMER
========================================================= */

function saveCustomer(id) {
  const name =
    document.getElementById("f_name")?.value.trim() || "";

  const phone =
    document.getElementById("f_phone")?.value.trim() || "";

  const address =
    document.getElementById("f_address")?.value.trim() || "";

  const notes =
    document.getElementById("f_notes")?.value.trim() || "";


  /* FULL NAME VALIDATION */

  if (name.length < 2) {
    alert(
      "Please enter the customer's full name."
    );

    document.getElementById("f_name")?.focus();

    return;
  }


  /* PHONE VALIDATION */

  if (phone.length < 3) {
    alert(
      "Please enter the customer's phone number."
    );

    document.getElementById("f_phone")?.focus();

    return;
  }


  /* CUSTOMER OBJECT */

  const c = {
    id:
      id ||
      "CUS-" +
        Date.now()
          .toString()
          .slice(-6),

    name: name,

    phone: phone,

    address: address,

    notes: notes
  };


  /* UPDATE CUSTOMER */

  if (id) {
    const index =
      db.customers.findIndex(
        x => x.id === id
      );

    if (index >= 0) {
      db.customers[index] = c;
    }

  }

  /* NEW CUSTOMER */

  else {
    db.customers.push(c);
  }


  closeModal();

  save();
}


/* =========================================================
   MEASUREMENTS
========================================================= */

function renderMeasurements() {
  if (typeof measurementCustomer === "undefined")
    return;

  const id = measurementCustomer.value;

  const rows = db.measurements
    .filter(
      m => !id || m.customerId === id
    )
    .sort((a, b) =>
      b.date.localeCompare(a.date)
    );

  if (typeof measurementRows === "undefined")
    return;

  measurementRows.innerHTML =
    rows
      .map(
        m => `
        <tr>

          <td>
            ${esc(
              customer(m.customerId)?.name ||
                "Unknown"
            )}
          </td>

          <td>${esc(m.shoulder)}</td>
          <td>${esc(m.chest)}</td>
          <td>${esc(m.waist)}</td>
          <td>${esc(m.hip)}</td>
          <td>${esc(m.sleeve)}</td>
          <td>${esc(m.length)}</td>
          <td>${esc(m.date)}</td>

        </tr>
      `
      )
      .join("") ||
    `
      <tr>
        <td colspan="8" class="empty">
          No measurements found.
        </td>
      </tr>
    `;
}


function openMeasurement() {
  if (!db.customers.length) {
    alert(
      "Please add a customer first."
    );
    return;
  }

  modalTitle.textContent =
    "Add Measurement";

  modalBody.innerHTML = `
    <form
      onsubmit="event.preventDefault();saveMeasurement()"
    >

      <div class="formgrid">

        <div class="field">

          <label>Customer *</label>

          <select
            id="fm_customer"
            required
          >

            ${db.customers
              .map(
                c => `
                  <option value="${c.id}">
                    ${esc(c.name)}
                  </option>
                `
              )
              .join("")}

          </select>

        </div>


        <div class="field">

          <label>Date</label>

          <input
            id="fm_date"
            type="date"
            value="${today()}"
          >

        </div>


        ${[
          "shoulder",
          "chest",
          "waist",
          "hip",
          "sleeve",
          "length",
          "neck",
          "trouserLength",
          "thigh",
          "knee",
          "wrist",
          "inseam"
        ]
          .map(
            x => `
              <div class="field">

                <label>
                  ${x
                    .replace(
                      /([A-Z])/g,
                      " $1"
                    )
                    .replace(
                      /^./,
                      s =>
                        s.toUpperCase()
                    )}
                </label>

                <input
                  id="fm_${x}"
                  placeholder="e.g. 18"
                >

              </div>
            `
          )
          .join("")}

      </div>


      <div class="actions">

        <button
          type="button"
          class="btn secondary"
          onclick="closeModal()"
        >
          Cancel
        </button>

        <button
          class="btn"
          type="submit"
        >
          Save Measurement
        </button>

      </div>

    </form>
  `;

  modal.classList.remove("hidden");
}


function saveMeasurement() {
  const fields = [
    "shoulder",
    "chest",
    "waist",
    "hip",
    "sleeve",
    "length",
    "neck",
    "trouserLength",
    "thigh",
    "knee",
    "wrist",
    "inseam"
  ];

  const m = {
    id: "MS-" + Date.now(),

    customerId:
      document.getElementById(
        "fm_customer"
      ).value,

    date:
      document.getElementById(
        "fm_date"
      ).value || today()
  };

  fields.forEach(x => {
    const el =
      document.getElementById(
        "fm_" + x
      );

    m[x] = el
      ? el.value.trim()
      : "";
  });

  db.measurements.push(m);

  closeModal();

  save();
}


/* =========================================================
   ORDERS
========================================================= */

function renderOrders() {
  if (
    typeof orderSearch === "undefined" ||
    typeof orderStatusFilter === "undefined" ||
    typeof orderRows === "undefined"
  ) {
    return;
  }

  const q =
    (orderSearch?.value || "")
      .toLowerCase();

  const f =
    orderStatusFilter.value;

  const rows = db.orders
    .filter(
      o =>
        (
          o.number +
          " " +
          (
            customer(
              o.customerId
            )?.name || ""
          )
        )
          .toLowerCase()
          .includes(q) &&
        (!f || o.status === f)
    )
    .sort((a, b) =>
      b.created.localeCompare(a.created)
    );

  orderRows.innerHTML =
    rows
      .map(
        o => `
          <tr>

            <td>
              <b>${esc(o.number)}</b>
            </td>

            <td>
              ${esc(
                customer(
                  o.customerId
                )?.name || "Unknown"
              )}
            </td>

            <td>
              ${esc(o.outfit)}
            </td>

            <td>
              ${esc(o.receivedDate)}
            </td>

            <td>
              ${esc(o.collectionDate)}
            </td>

            <td>

              ${statusBadge(o.status)}

              <br>

              <select
                style="
                  margin-top:5px;
                  padding:4px
                "
                onchange="
                  setStatus(
                    '${o.id}',
                    this.value
                  )
                "
              >

                ${[
                  "Received",
                  "Cutting",
                  "Sewing",
                  "Finishing",
                  "Ready for Collection",
                  "Delivered"
                ]
                  .map(
                    s => `
                      <option
                        ${
                          s === o.status
                            ? "selected"
                            : ""
                        }
                      >
                        ${s}
                      </option>
                    `
                  )
                  .join("")}

              </select>

            </td>

            <td>
              ${money(o.total)}
            </td>

            <td>
              ${money(
                Number(o.total || 0) -
                Number(o.paid || 0)
              )}
            </td>

          </tr>
        `
      )
      .join("") ||
    `
      <tr>
        <td colspan="8" class="empty">
          No orders found.
        </td>
      </tr>
    `;
}


function openOrder() {
  if (!db.customers.length) {
    alert(
      "Please add a customer first."
    );
    return;
  }

  modalTitle.textContent =
    "New Order";

  modalBody.innerHTML = `
    <form
      onsubmit="event.preventDefault();saveOrder()"
    >

      <div class="formgrid">

        <div class="field">

          <label>Customer *</label>

          <select
            id="fo_customer"
            required
          >

            ${db.customers
              .map(
                c => `
                  <option
                    value="${c.id}"
                  >
                    ${esc(c.name)}
                  </option>
                `
              )
              .join("")}

          </select>

        </div>


        <div class="field">

          <label>Outfit Type *</label>

          <input
            id="fo_outfit"
            required
            placeholder="e.g. Kaftan, Shirt, Trouser"
          >

        </div>


        <div class="field">

          <label>
            Material Received Date
          </label>

          <input
            id="fo_received"
            type="date"
            value="${today()}"
          >

        </div>


        <div class="field">

          <label>
            Collection Date *
          </label>

          <input
            id="fo_collection"
            type="date"
            required
          >

        </div>


        <div class="field">

          <label>
            Total Price (₦) *
          </label>

          <input
            id="fo_total"
            type="number"
            min="0"
            required
          >

        </div>


        <div class="field">

          <label>
            Deposit / Payment (₦)
          </label>

          <input
            id="fo_paid"
            type="number"
            min="0"
            value="0"
          >

        </div>


        <div class="field full">

          <label>
            Design / Special Instructions
          </label>

          <textarea
            id="fo_notes"
            placeholder="
              Describe style, fabric,
              embroidery, etc.
            "
          ></textarea>

        </div>

      </div>


      <div class="actions">

        <button
          type="button"
          class="btn secondary"
          onclick="closeModal()"
        >
          Cancel
        </button>

        <button
          class="btn"
          type="submit"
        >
          Create Order
        </button>

      </div>

    </form>
  `;

  modal.classList.remove("hidden");
}


function saveOrder() {
  const total =
    Number(
      document.getElementById(
        "fo_total"
      ).value || 0
    );

  const paid =
    Number(
      document.getElementById(
        "fo_paid"
      ).value || 0
    );

  const id =
    "ORD-" +
    Date.now()
      .toString()
      .slice(-7);

  const o = {
    id: id,

    number: id,

    customerId:
      document.getElementById(
        "fo_customer"
      ).value,

    outfit:
      document.getElementById(
        "fo_outfit"
      ).value.trim(),

    receivedDate:
      document.getElementById(
        "fo_received"
      ).value,

    collectionDate:
      document.getElementById(
        "fo_collection"
      ).value,

    total: total,

    paid: paid,

    status: "Received",

    notes:
      document.getElementById(
        "fo_notes"
      ).value.trim(),

    created:
      new Date().toISOString()
  };

  db.orders.push(o);

  if (paid > 0) {
    db.payments.push({
      id:
        "PAY-" + Date.now(),

      orderId: id,

      amount: paid,

      date: today(),

      method: "Initial payment"
    });
  }

  closeModal();

  save();
}


/* =========================================================
   ORDER STATUS
========================================================= */

function setStatus(id, s) {
  const o = order(id);

  if (o) {
    o.status = s;
    save();
  }
}


/* =========================================================
   PAYMENTS
========================================================= */

function renderPayments() {
  if (typeof paymentRows === "undefined")
    return;

  paymentRows.innerHTML =
    db.payments
      .slice()
      .sort((a, b) =>
        b.date.localeCompare(a.date)
      )
      .map(
        p => `
          <tr>

            <td>
              ${esc(p.date)}
            </td>

            <td>
              ${esc(
                order(p.orderId)?.number ||
                  "—"
              )}
            </td>

            <td>
              ${esc(
                customer(
                  order(p.orderId)
                    ?.customerId
                )?.name ||
                  "Unknown"
              )}
            </td>

            <td>
              ${money(p.amount)}
            </td>

            <td>
              ${esc(p.method)}
            </td>

          </tr>
        `
      )
      .join("") ||
    `
      <tr>
        <td colspan="5" class="empty">
          No payments recorded.
        </td>
      </tr>
    `;
}


/* =========================================================
   REPORTS
========================================================= */

function renderReports() {
  if (typeof rRevenue !== "undefined") {
    rRevenue.textContent = money(
      db.payments.reduce(
        (a, p) =>
          a + Number(p.amount || 0),
        0
      )
    );
  }

  if (typeof rOrders !== "undefined") {
    rOrders.textContent =
      db.orders.length;
  }

  if (typeof rDelivered !== "undefined") {
    rDelivered.textContent =
      db.orders.filter(
        o => o.status === "Delivered"
      ).length;
  }

  if (typeof rUnpaid !== "undefined") {
    rUnpaid.textContent =
      db.orders.filter(
        o =>
          (Number(o.total) || 0) >
          (Number(o.paid) || 0)
      ).length;
  }
}


/* =========================================================
   MODAL
========================================================= */

function closeModal() {
  if (typeof modal !== "undefined") {
    modal.classList.add("hidden");
  }
}


if (typeof modal !== "undefined") {
  modal.onclick = e => {
    if (e.target === modal) {
      closeModal();
    }
  };
}


/* =========================================================
   SEARCH / FILTER EVENTS
========================================================= */

if (typeof customerSearch !== "undefined") {
  customerSearch.addEventListener(
    "input",
    renderCustomers
  );
}

if (typeof measurementCustomer !== "undefined") {
  measurementCustomer.addEventListener(
    "change",
    renderMeasurements
  );
}

if (typeof orderSearch !== "undefined") {
  orderSearch.addEventListener(
    "input",
    renderOrders
  );
}

if (typeof orderStatusFilter !== "undefined") {
  orderStatusFilter.addEventListener(
    "change",
    renderOrders
  );
}


/* =========================================================
   START APP
========================================================= */

refresh();
