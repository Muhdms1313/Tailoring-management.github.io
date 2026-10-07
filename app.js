/* TailorPro Manager - Orders Edition */
const KEY = "tailorpro_v2";
const STATUSES = [
  "Received",
  "Cutting",
  "Sewing",
  "Finishing",
  "Ready for Collection",
  "Delivered"
];
const PRIORITIES = ["Normal","Urgent"];

function emptyDB(){
  return {
    customers:[],
    measurements:[],
    orders:[],
    payments:[]
  };
}

function loadDB(){
  try{
    const raw = JSON.parse(
      localStorage.getItem(KEY) || "null"
    );

    const d =
      raw && typeof raw === "object"
        ? raw
        : emptyDB();

    d.customers =
      Array.isArray(d.customers)
        ? d.customers
        : [];

    d.measurements =
      Array.isArray(d.measurements)
        ? d.measurements
        : [];

    d.orders =
      Array.isArray(d.orders)
        ? d.orders
        : [];

    d.payments =
      Array.isArray(d.payments)
        ? d.payments
        : [];

    d.orders.forEach(o=>{
      o.status =
        STATUSES.includes(o.status)
          ? o.status
          : "Received";

      o.priority =
        PRIORITIES.includes(o.priority)
          ? o.priority
          : "Normal";

      o.total = Number(o.total || 0);
      o.paid = Number(o.paid || 0);
      o.quantity = Number(o.quantity || 1);

      o.notes = o.notes || "";

      /* New: remember the measurement used */
      o.measurementId =
        o.measurementId || "";
    });

    return d;

  }catch(e){
    return emptyDB();
  }
}

let db = loadDB();

const $ = id =>
  document.getElementById(id);

const money = n =>
  "₦" +
  Number(n || 0).toLocaleString(
    "en-NG",
    {
      maximumFractionDigits:2
    }
  );

const localDate = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();

  return new Date(
    d.getTime() - off * 60000
  ).toISOString().slice(0,10);
};

const today = localDate;

const esc = s =>
  String(s ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    }[c])
  );

const generateId = prefix =>
  prefix +
  "-" +
  Date.now()
    .toString(36)
    .toUpperCase() +
  Math.random()
    .toString(36)
    .slice(2,5)
    .toUpperCase();

const customer = id =>
  db.customers.find(x=>x.id===id);

const order = id =>
  db.orders.find(x=>x.id===id);

const balance = o =>
  Math.max(
    0,
    Number(o?.total || 0) -
    Number(o?.paid || 0)
  );

function save(){
  localStorage.setItem(
    KEY,
    JSON.stringify(db)
  );

  refresh();
}

function statusBadge(s){
  const c =
    s === "Delivered"
      ? "ok"
      : s === "Ready for Collection"
      ? "warn"
      : s === "Finishing"
      ? "warn"
      : "";

  return `
    <span class="badge ${c}">
      ${esc(s)}
    </span>
  `;
}

function priorityBadge(p){
  return p === "Urgent"
    ? `<span class="badge danger">Urgent</span>`
    : `<span class="badge">Normal</span>`;
}

function isOverdue(o){
  return (
    o.status !== "Delivered" &&
    o.collectionDate &&
    o.collectionDate < today()
  );
}

function daysUntil(date){

  if(!date)
    return null;

  const a =
    new Date(
      today()+"T00:00:00"
    );

  const b =
    new Date(
      date+"T00:00:00"
    );

  return Math.round(
    (b-a)/86400000
  );
}

function collectionLabel(o){

  const d =
    daysUntil(o.collectionDate);

  if(isOverdue(o))
    return `
      <span class="date-overdue">
        Overdue · ${esc(o.collectionDate)}
      </span>
    `;

  if(d===0)
    return `
      <span class="date-today">
        Today
      </span>
      <br>
      <small>
        ${esc(o.collectionDate)}
      </small>
    `;

  if(d===1)
    return `
      <span class="date-soon">
        Tomorrow
      </span>
      <br>
      <small>
        ${esc(o.collectionDate)}
      </small>
    `;

  return esc(
    o.collectionDate || "—"
  );
}

function nav(page){

  document
    .querySelectorAll(".page")
    .forEach(x =>
      x.classList.toggle(
        "active",
        x.id === page
      )
    );

  document
    .querySelectorAll("[data-page]")
    .forEach(x =>
      x.classList.toggle(
        "active",
        x.dataset.page === page
      )
    );

  if($("pageTitle"))
    $("pageTitle").textContent =
      page[0].toUpperCase() +
      page.slice(1);
}

document
  .querySelectorAll("[data-page]")
  .forEach(b =>
    b.addEventListener(
      "click",
      () => nav(b.dataset.page)
    )
  );

function refresh(){

  renderDashboard();
  renderCustomers();
  renderMeasurements();
  renderOrders();
  renderPayments();
  renderReports();
  fillCustomerSelects();
}

function renderDashboard(){

  $("mCustomers").textContent =
    db.customers.length;

  $("mActive").textContent =
    db.orders.filter(
      o => o.status !== "Delivered"
    ).length;

  $("mDue").textContent =
    db.orders.filter(
      o =>
        o.collectionDate === today() &&
        o.status !== "Delivered"
    ).length;

  $("mBalance").textContent =
    money(
      db.orders.reduce(
        (a,o) => a + balance(o),
        0
      )
    );

  $("mOverdue").textContent =
    db.orders.filter(
      isOverdue
    ).length;

  const rows =
    db.orders
      .slice()
      .sort(
        (a,b) =>
          (b.created||"")
            .localeCompare(
              a.created||""
            )
      )
      .slice(0,8);

  $("recentOrders").innerHTML =
    rows.map(o=>`
      <tr>
        <td>
          <b>${esc(o.number)}</b>
        </td>

        <td>
          ${esc(
            customer(o.customerId)?.name ||
            "Unknown"
          )}
        </td>

        <td>
          ${esc(o.outfit)}
        </td>

        <td>
          ${collectionLabel(o)}
        </td>

        <td>
          ${statusBadge(o.status)}
        </td>

        <td>
          ${money(balance(o))}
        </td>
      </tr>
    `).join("")
    ||
    `
      <tr>
        <td colspan="6" class="empty">
          No orders yet.
        </td>
      </tr>
    `;
}

function renderCustomers(){

  const q =
    ($("customerSearch")?.value || "")
      .toLowerCase();

  const rows =
    db.customers.filter(
      c =>
        (`${c.name} ${c.phone}`)
          .toLowerCase()
          .includes(q)
    );

  $("customerRows").innerHTML =
    rows.map(c=>{

      const ms =
        db.measurements
          .filter(
            m => m.customerId === c.id
          )
          .sort(
            (a,b) =>
              (b.date||"")
                .localeCompare(
                  a.date||""
                )
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

          <td>
            ${esc(c.phone)}
          </td>

          <td>
            ${
              db.orders.filter(
                o => o.customerId === c.id
              ).length
            }
          </td>

          <td>
            ${ms ? esc(ms.date) : "—"}
          </td>

          <td>

            <button
              class="btn secondary"
              onclick="openCustomer('${esc(c.id)}')">
              View/Edit
            </button>

            <button
              class="btn secondary"
              onclick="customerProfile('${esc(c.id)}')">
              Profile
            </button>

          </td>

        </tr>
      `;

    }).join("")
    ||
    `
      <tr>
        <td colspan="5" class="empty">
          No customers found.
        </td>
      </tr>
    `;
}

function fillCustomerSelects(){

  const opts =
    `<option value="">
      Select customer
    </option>` +

    db.customers.map(c=>`
      <option value="${esc(c.id)}">
        ${esc(c.name)} —
        ${esc(c.phone)}
      </option>
    `).join("");

  if($("measurementCustomer")){

    const old =
      $("measurementCustomer").value;

    $("measurementCustomer").innerHTML =
      opts;

    $("measurementCustomer").value =
      old;
  }
}

function renderMeasurements(){

  const id =
    $("measurementCustomer")
      ?.value || "";

  const rows =
    db.measurements
      .filter(
        m => !id ||
        m.customerId === id
      )
      .sort(
        (a,b) =>
          (b.date||"")
            .localeCompare(
              a.date||""
            )
      );

  if($("measurementRows")){

    $("measurementRows").innerHTML =
      rows.map(m=>`
        <tr>

          <td>
            ${esc(
              customer(
                m.customerId
              )?.name ||
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
      `).join("")
      ||
      `
        <tr>
          <td colspan="8" class="empty">
            No measurements found.
          </td>
        </tr>
      `;
  }
}

/* =====================================================
   CUSTOMER + MEASUREMENTS INTEGRATION
   ===================================================== */

function getCustomerMeasurements(
  customerId
){

  return db.measurements
    .filter(
      m => m.customerId === customerId
    )
    .sort(
      (a,b) =>
        (b.date||"")
          .localeCompare(
            a.date||""
          )
    );
}

function measurementOptionLabel(m){

  const parts = [];

  if(m.chest)
    parts.push(
      `Chest ${m.chest}`
    );

  if(m.waist)
    parts.push(
      `Waist ${m.waist}`
    );

  if(m.length)
    parts.push(
      `Length ${m.length}`
    );

  return `
    ${m.date || "Undated"}
    ${
      parts.length
        ? " — " + parts.join(", ")
        : ""
    }
  `;
}

function measurementPreviewHTML(m){

  if(!m){

    return `
      <div class="measurement-empty">
        No measurement record selected.
      </div>
    `;
  }

  const fields = [

    ["Shoulder",m.shoulder],
    ["Chest",m.chest],
    ["Waist",m.waist],
    ["Hip",m.hip],
    ["Sleeve",m.sleeve],
    ["Length",m.length],
    ["Neck",m.neck],
    ["Trouser Length",m.trouserLength],
    ["Thigh",m.thigh],
    ["Knee",m.knee],
    ["Wrist",m.wrist],
    ["Inseam",m.inseam]

  ];

  const values =
    fields.filter(
      x =>
        x[1] !== undefined &&
        x[1] !== ""
    );

  return `

    <div class="measurement-preview-head">

      <strong>
        Selected measurement
      </strong>

      <span>
        ${esc(m.date || "Undated")}
      </span>

    </div>

    <div class="measurement-preview-grid">

      ${
        values.map(x=>`

          <div>

            <span>
              ${x[0]}
            </span>

            <b>
              ${esc(x[1])}
            </b>

          </div>

        `).join("")
        ||
        `
          <div class="measurement-empty">
            This record has no values.
          </div>
        `
      }

    </div>
  `;
}

function updateOrderMeasurementOptions(){

  const select =
    $("fo_measurement");

  const preview =
    $("fo_measurement_preview");

  const customerId =
    $("fo_customer")?.value;

  if(!select || !preview)
    return;

  const measurements =
    getCustomerMeasurements(
      customerId
    );

  const current =
    select.dataset.current ||
    select.value ||
    "";

  select.innerHTML =
    `
      <option value="">
        No measurement selected
      </option>
    ` +

    measurements.map(m=>`
      <option value="${esc(m.id)}">
        ${esc(
          measurementOptionLabel(m)
        )}
      </option>
    `).join("");

  const chosen =
    measurements.find(
      m => m.id === current
    ) ||
    measurements[0];

  select.value =
    chosen?.id || "";

  preview.innerHTML =
    measurementPreviewHTML(
      chosen
    );
}

function updateOrderMeasurementPreview(){

  const select =
    $("fo_measurement");

  const preview =
    $("fo_measurement_preview");

  if(!select || !preview)
    return;

  preview.innerHTML =
    measurementPreviewHTML(
      db.measurements.find(
        m => m.id === select.value
      )
    );
}

function openMeasurementForCustomerFromOrder(){

  const customerId =
    $("fo_customer")?.value || "";

  if(!customerId){

    alert(
      "Please select a customer first."
    );

    return;
  }

  openMeasurement(
    customerId
  );
}

/* =====================================================
   ORDERS
   ===================================================== */

function renderOrders(){

  const q =
    ($("orderSearch")?.value || "")
      .toLowerCase()
      .trim();

  const f =
    $("orderStatusFilter")
      ?.value || "";

  const p =
    $("orderPriorityFilter")
      ?.value || "";

  const due =
    $("orderDueFilter")
      ?.value || "";

  const rows =
    db.orders
      .filter(o=>{

        const text =
          `
            ${o.number}
            ${customer(o.customerId)?.name || ""}
            ${o.outfit || ""}
            ${o.phone || ""}
          `.toLowerCase();

        if(q && !text.includes(q))
          return false;

        if(f && o.status !== f)
          return false;

        if(p && o.priority !== p)
          return false;

        if(
          due === "overdue" &&
          !isOverdue(o)
        )
          return false;

        if(
          due === "today" &&
          (
            o.collectionDate !== today() ||
            o.status === "Delivered"
          )
        )
          return false;

        if(
          due === "upcoming" &&
          (
            !o.collectionDate ||
            o.collectionDate < today() ||
            o.status === "Delivered"
          )
        )
          return false;

        return true;

      })
      .sort((a,b)=>{

        if(
          isOverdue(a) !==
          isOverdue(b)
        )
          return isOverdue(a)
            ? -1
            : 1;

        return (
          b.created || ""
        ).localeCompare(
          a.created || ""
        );
      });

  $("orderCount").textContent =
    `${rows.length} order${
      rows.length === 1
        ? ""
        : "s"
    }`;

  $("orderRows").innerHTML =
    rows.map(o=>`

      <tr
        class="${
          isOverdue(o)
            ? "row-overdue"
            : ""
        }">

        <td>

          <b>
            ${esc(o.number)}
          </b>

          <br>

          ${priorityBadge(
            o.priority
          )}

        </td>

        <td>

          <b>
            ${esc(
              customer(
                o.customerId
              )?.name ||
              "Unknown"
            )}
          </b>

          <br>

          <small>
            ${esc(
              customer(
                o.customerId
              )?.phone || ""
            )}
          </small>

        </td>

        <td>

          ${esc(o.outfit)}

          <br>

          <small>
            Qty: ${esc(o.quantity)}
          </small>

        </td>

        <td>
          ${esc(
            o.receivedDate || "—"
          )}
        </td>

        <td>
          ${collectionLabel(o)}
        </td>

        <td>

          <div>
            ${statusBadge(o.status)}
          </div>

          <select
            class="inline-status"
            onchange="
              setStatus(
                '${esc(o.id)}',
                this.value
              )
            ">

            ${
              STATUSES.map(s=>`

                <option
                  value="${esc(s)}"
                  ${
                    s === o.status
                      ? "selected"
                      : ""
                  }>

                  ${esc(s)}

                </option>

              `).join("")
            }

          </select>

        </td>

        <td>
          ${money(o.total)}
        </td>

        <td>
          <b>
            ${money(balance(o))}
          </b>
        </td>

        <td class="order-actions">

          <button
            class="btn secondary"
            onclick="
              viewOrder(
                '${esc(o.id)}'
              )
            ">
            View
          </button>

          <button
            class="btn secondary"
            onclick="
              editOrder(
                '${esc(o.id)}'
              )
            ">
            Edit
          </button>

          <button
            class="btn secondary"
            onclick="
              openPayment(
                '${esc(o.id)}'
              )
            ">
            Pay
          </button>

          <button
            class="btn secondary"
            onclick="
              printReceipt(
                '${esc(o.id)}'
              )
            ">
            Receipt
          </button>

        </td>

      </tr>

    `).join("")
    ||
    `
      <tr>
        <td colspan="9" class="empty">
          No orders match your filters.
        </td>
      </tr>
    `;
}

function renderPayments(){

  if(!$("paymentRows"))
    return;

  $("paymentRows").innerHTML =
    db.payments
      .slice()
      .sort(
        (a,b) =>
          (b.date||"")
            .localeCompare(
              a.date||""
            )
      )
      .map(p=>`

        <tr>

          <td>
            ${esc(p.date)}
          </td>

          <td>
            ${esc(
              order(
                p.orderId
              )?.number || "—"
            )}
          </td>

          <td>
            ${esc(
              customer(
                order(
                  p.orderId
                )?.customerId
              )?.name ||
              "Unknown"
            )}
          </td>

          <td>
            ${money(p.amount)}
          </td>

          <td>
            ${esc(
              p.method || "—"
            )}
          </td>

        </tr>

      `).join("")
      ||
      `
        <tr>
          <td colspan="5" class="empty">
            No payments recorded.
          </td>
        </tr>
      `;
}

function renderReports(){

  if(!$("rRevenue"))
    return;

  $("rRevenue").textContent =
    money(
      db.payments.reduce(
        (a,p) =>
          a + Number(
            p.amount || 0
          ),
        0
      )
    );

  $("rOrders").textContent =
    db.orders.length;

  $("rDelivered").textContent =
    db.orders.filter(
      o => o.status === "Delivered"
    ).length;

  $("rUnpaid").textContent =
    db.orders.filter(
      o => balance(o) > 0
    ).length;
}

/* =====================================================
   CUSTOMERS
   ===================================================== */

function openCustomer(id=""){

  const c =
    customer(id) ||
    {
      name:"",
      phone:"",
      address:"",
      notes:""
    };

  $("modalTitle").textContent =
    id
      ? "Edit Customer"
      : "New Customer";

  $("modalBody").innerHTML = `

    <form
      onsubmit="
        event.preventDefault();
        saveCustomer('${esc(id)}')
      ">

      <div class="formgrid">

        <div class="field">

          <label>
            Full Name *
          </label>

          <input
            id="f_name"
            required
            value="${esc(c.name)}"
          >

        </div>

        <div class="field">

          <label>
            Phone Number *
          </label>

          <input
            id="f_phone"
            required
            value="${esc(c.phone)}"
          >

        </div>

        <div class="field full">

          <label>
            Address
          </label>

          <input
            id="f_address"
            value="${esc(c.address)}"
          >

        </div>

        <div class="field full">

          <label>
            Notes
          </label>

          <textarea
            id="f_notes"
          >${esc(c.notes)}</textarea>

        </div>

      </div>

      <div class="actions">

        <button
          type="button"
          class="btn secondary"
          onclick="closeModal()">
          Cancel
        </button>

        <button class="btn">
          Save Customer
        </button>

      </div>

    </form>
  `;

  $("modal").classList.remove(
    "hidden"
  );
}

function saveCustomer(id){

  const c = {

    id:
      id ||
      "CUS-" +
      Date.now()
        .toString()
        .slice(-6),

    name:
      $("f_name")
        .value
        .trim(),

    phone:
      $("f_phone")
        .value
        .trim(),

    address:
      $("f_address")
        .value
        .trim(),

    notes:
      $("f_notes")
        .value
        .trim()
  };

  if(id){

    const i =
      db.customers.findIndex(
        x => x.id === id
      );

    if(i >= 0)
      db.customers[i] = c;

  }else{

    db.customers.push(c);

  }

  closeModal();
  save();
}

/* =====================================================
   MEASUREMENTS
   ===================================================== */

function openMeasurement(
  preselectedCustomer=""
){

  if(!db.customers.length){

    alert(
      "Please add a customer first."
    );

    return;
  }

  $("modalTitle").textContent =
    "Add Measurement";

  $("modalBody").innerHTML = `

    <form
      onsubmit="
        event.preventDefault();
        saveMeasurement()
      ">

      <div class="formgrid">

        <div class="field">

          <label>
            Customer *
          </label>

          <select
            id="fm_customer"
            required>

            ${
              db.customers.map(c=>`

                <option
                  value="${esc(c.id)}"
                  ${
                    c.id ===
                    preselectedCustomer
                      ? "selected"
                      : ""
                  }>

                  ${esc(c.name)}

                </option>

              `).join("")
            }

          </select>

        </div>

        <div class="field">

          <label>
            Date
          </label>

          <input
            id="fm_date"
            type="date"
            value="${today()}"
          >

        </div>

        ${
          [
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
          ].map(x=>`

            <div class="field">

              <label>

                ${
                  x
                    .replace(
                      /([A-Z])/g,
                      " $1"
                    )
                    .replace(
                      /^./,
                      s =>
                        s.toUpperCase()
                    )
                }

              </label>

              <input
                id="fm_${x}"
                placeholder="e.g. 18"
              >

            </div>

          `).join("")
        }

      </div>

      <div class="actions">

        <button
          type="button"
          class="btn secondary"
          onclick="closeModal()">
          Cancel
        </button>

        <button class="btn">
          Save Measurement
        </button>

      </div>

    </form>
  `;

  $("modal").classList.remove(
    "hidden"
  );
}

function saveMeasurement(){

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

    id:
      generateId("MS"),

    customerId:
      $("fm_customer").value,

    date:
      $("fm_date").value ||
      today()

  };

  fields.forEach(
    x =>
      m[x] =
        $("fm_"+x)
          .value
          .trim()
  );

  db.measurements.push(m);

  closeModal();
  save();
}

/* =====================================================
   ORDER FORM
   ===================================================== */

function orderFormHTML(o={}){

  const edit =
    !!o.id;

  const selectedCustomer =
    o.customerId ||
    db.customers[0]?.id ||
    "";

  return `

    <form
      onsubmit="
        event.preventDefault();
        ${
          edit
            ? `updateOrder('${esc(o.id)}')`
            : `saveOrder()`
        }
      ">

      <div class="order-form-title">

        ${
          edit
            ? "Edit Order"
            : "Create New Order"
        }

      </div>

      <div
        class="formgrid order-form-grid">

        <!-- CUSTOMER -->

        <div class="field full">

          <label>
            Customer *
          </label>

          <select
            id="fo_customer"
            required
            onchange="
              updateOrderMeasurementOptions()
            ">

            ${
              db.customers.map(c=>`

                <option
                  value="${esc(c.id)}"
                  ${
                    c.id === selectedCustomer
                      ? "selected"
                      : ""
                  }>

                  ${esc(c.name)}
                  —
                  ${esc(c.phone)}

                </option>

              `).join("")
            }

          </select>

        </div>

        <!-- MEASUREMENT -->

        <div
          class="field full measurement-selector-block">

          <label>
            Measurement Record
          </label>

          <div
            class="measurement-selector-row">

            <select
              id="fo_measurement"
              data-current="${esc(
                o.measurementId || ""
              )}"
              onchange="
                updateOrderMeasurementPreview()
              ">

              <option value="">
                No measurement selected
              </option>

            </select>

            <button
              type="button"
              class="btn secondary"
              onclick="
                openMeasurementForCustomerFromOrder()
              ">

              + New Measurement

            </button>

          </div>

          <div
            id="fo_measurement_preview"
            class="measurement-preview">

            No measurement record selected.

          </div>

        </div>

        <!-- OUTFIT -->

        <div class="field">

          <label>
            Outfit Type *
          </label>

          <input
            id="fo_outfit"
            required
            value="${esc(o.outfit || "")}"
            placeholder="
              Kaftan, Shirt, Trouser...
            "
          >

        </div>

        <!-- QUANTITY -->

        <div class="field">

          <label>
            Quantity
          </label>

          <input
            id="fo_quantity"
            type="number"
            min="1"
            step="1"
            value="${Number(
              o.quantity || 1
            )}"
          >

        </div>

        <!-- MATERIAL RECEIVED -->

        <div class="field">

          <label>
            Material/Fabric Received
          </label>

          <input
            id="fo_received"
            type="date"
            value="${esc(
              o.receivedDate || today()
            )}"
          >

        </div>

        <!-- COLLECTION -->

        <div class="field">

          <label>
            Collection Date *
          </label>

          <input
            id="fo_collection"
            type="date"
            required
            value="${esc(
              o.collectionDate || ""
            )}"
          >

        </div>

        <!-- PRIORITY -->

        <div class="field">

          <label>
            Priority
          </label>

          <select
            id="fo_priority">

            ${
              PRIORITIES.map(p=>`

                <option
                  ${
                    p ===
                    (o.priority || "Normal")
                      ? "selected"
                      : ""
                  }>

                  ${p}

                </option>

              `).join("")
            }

          </select>

        </div>

        <!-- STATUS -->

        <div class="field">

          <label>
            Order Status
          </label>

          <select
            id="fo_status">

            ${
              STATUSES.map(s=>`

                <option
                  ${
                    s ===
                    (o.status || "Received")
                      ? "selected"
                      : ""
                  }>

                  ${s}

                </option>

              `).join("")
            }

          </select>

        </div>

        <!-- TOTAL -->

        <div class="field">

          <label>
            Total Price (₦) *
          </label>

          <input
            id="fo_total"
            type="number"
            min="0"
            step="0.01"
            required
            value="${Number(
              o.total || 0
            )}"
          >

        </div>

        <!-- PAYMENT -->

        <div class="field">

          <label>
            Deposit / Initial Payment (₦)
          </label>

          <input
            id="fo_paid"
            type="number"
            min="0"
            step="0.01"
            value="${Number(
              o.paid || 0
            )}"
          >

        </div>

        <!-- FABRIC -->

        <div class="field">

          <label>
            Fabric / Colour
          </label>

          <input
            id="fo_fabric"
            value="${esc(
              o.fabric || ""
            )}"
            placeholder="
              e.g. Navy blue brocade
            "
          >

        </div>

        <!-- NOTES -->

        <div class="field full">

          <label>
            Design / Special Instructions
          </label>

          <textarea
            id="fo_notes"
            placeholder="
              Style, embroidery, pockets,
              buttons, fitting notes, etc.
            "
          >${esc(
            o.notes || ""
          )}</textarea>

        </div>

      </div>

      ${
        edit
          ? `
            <div class="order-edit-warning">

              Changing the initial payment
              changes the recorded paid amount.

              For additional payments, use
              <b>Record Payment</b>
              from the Orders page.

            </div>
          `
          : ""
      }

      <div class="actions">

        <button
          type="button"
          class="btn secondary"
          onclick="closeModal()">

          Cancel

        </button>

        <button class="btn">

          ${
            edit
              ? "Save Changes"
              : "Create Order"
          }

        </button>

      </div>

    </form>
  `;
}

function openOrder(){

  if(!db.customers.length){

    alert(
      "Please add a customer first."
    );

    return;
  }

  $("modalTitle").textContent =
    "New Order";

  $("modalBody").innerHTML =
    orderFormHTML();

  $("modal").classList.remove(
    "hidden"
  );

  updateOrderMeasurementOptions();
}

function collectOrderForm(){

  const total =
    Number(
      $("fo_total").value || 0
    );

  const paid =
    Number(
      $("fo_paid").value || 0
    );

  if(paid > total){

    alert(
      "Initial payment cannot be greater than the total price."
    );

    return null;
  }

  return {

    customerId:
      $("fo_customer").value,

    measurementId:
      $("fo_measurement")?.value ||
      "",

    outfit:
      $("fo_outfit")
        .value
        .trim(),

    quantity:
      Math.max(
        1,
        Number(
          $("fo_quantity")
            .value || 1
        )
      ),

    receivedDate:
      $("fo_received").value ||
      today(),

    collectionDate:
      $("fo_collection").value,

    priority:
      $("fo_priority").value,

    status:
      $("fo_status").value,

    total,

    paid,

    fabric:
      $("fo_fabric")
        .value
        .trim(),

    notes:
      $("fo_notes")
        .value
        .trim()
  };
}

function saveOrder(){

  const data =
    collectOrderForm();

  if(
    !data ||
    !data.collectionDate
  ){

    if(data)
      alert(
        "Please select a collection date."
      );

    return;
  }

  const id =
    generateId("ORD");

  const o = {

    id,

    number:id,

    ...data,

    created:
      new Date().toISOString(),

    updated:
      new Date().toISOString()
  };

  db.orders.push(o);

  if(data.paid > 0){

    db.payments.push({

      id:
        generateId("PAY"),

      orderId:id,

      amount:
        data.paid,

      date:
        today(),

      method:
        "Initial payment",

      note:
        "Initial payment recorded when order was created."

    });

  }

  closeModal();
  save();
}

function editOrder(id){

  const o =
    order(id);

  if(!o)
    return;

  $("modalTitle").textContent =
    `Edit Order ${o.number}`;

  $("modalBody").innerHTML =
    orderFormHTML(o);

  $("modal").classList.remove(
    "hidden"
  );

  updateOrderMeasurementOptions();
}

function updateOrder(id){

  const o =
    order(id);

  const data =
    collectOrderForm();

  if(
    !o ||
    !data ||
    !data.collectionDate
  )
    return;

  const oldPaid =
    Number(o.paid || 0);

  const newPaid =
    data.paid;

  if(newPaid < oldPaid){

    alert(
      "To reduce a customer's recorded payment, use the payment records rather than editing the order total paid amount."
    );

    $("fo_paid").value =
      oldPaid;

    return;
  }

  if(newPaid > oldPaid){

    db.payments.push({

      id:
        generateId("PAY"),

      orderId:id,

      amount:
        newPaid - oldPaid,

      date:
        today(),

      method:
        "Adjustment",

      note:
        "Additional payment added while editing order."

    });

  }

  Object.assign(
    o,
    data,
    {
      updated:
        new Date().toISOString()
    }
  );

  closeModal();
  save();
}

function setStatus(id,s){

  const o =
    order(id);

  if(
    o &&
    STATUSES.includes(s)
  ){

    o.status = s;

    o.updated =
      new Date().toISOString();

    save();
  }
}

/* =====================================================
   VIEW ORDER
   ===================================================== */

function viewOrder(id){

  const o =
    order(id);

  const c =
    customer(
      o?.customerId
    );

  if(!o || !c)
    return;

  const payments =
    db.payments
      .filter(
        p => p.orderId === id
      )
      .sort(
        (a,b) =>
          (b.date||"")
            .localeCompare(
              a.date||""
            )
      );

  const measurement =
    db.measurements.find(
      m =>
        m.id ===
        o.measurementId
    );

  $("modalTitle").textContent =
    `Order ${o.number}`;

  $("modalBody").innerHTML = `

    <div class="order-detail">

      <div class="order-detail-head">

        <div>

          <h3>
            ${esc(o.outfit)}
          </h3>

          <p>
            ${esc(c.name)}
            ·
            ${esc(c.phone)}
          </p>

        </div>

        <div>

          ${priorityBadge(
            o.priority
          )}

          ${statusBadge(
            o.status
          )}

        </div>

      </div>

      <div class="order-detail-grid">

        <div>
          <span>
            Customer
          </span>

          <b>
            ${esc(c.name)}
          </b>
        </div>

        <div>
          <span>
            Order Number
          </span>

          <b>
            ${esc(o.number)}
          </b>
        </div>

        <div>
          <span>
            Material Received
          </span>

          <b>
            ${esc(
              o.receivedDate || "—"
            )}
          </b>
        </div>

        <div>
          <span>
            Collection Date
          </span>

          <b>
            ${collectionLabel(o)}
          </b>
        </div>

        <div>
          <span>
            Quantity
          </span>

          <b>
            ${esc(o.quantity)}
          </b>
        </div>

        <div>
          <span>
            Measurement Record
          </span>

          <b>
            ${
              measurement
                ? esc(
                    measurement.date ||
                    "Undated"
                  )
                : "Not selected"
            }
          </b>
        </div>

        <div>
          <span>
            Fabric / Colour
          </span>

          <b>
            ${esc(
              o.fabric || "—"
            )}
          </b>
        </div>

        <div>
          <span>
            Total Price
          </span>

          <b>
            ${money(o.total)}
          </b>
        </div>

        <div>
          <span>
            Paid
          </span>

          <b>
            ${money(o.paid)}
          </b>
        </div>

        <div class="balance-box">

          <span>
            Outstanding Balance
          </span>

          <b>
            ${money(
              balance(o)
            )}
          </b>

        </div>

      </div>

      ${
        measurement
          ? `
            <div class="detail-block">

              <h4>
                Measurements Used
              </h4>

              ${measurementPreviewHTML(
                measurement
              )}

            </div>
          `
          : ""
      }

      <div class="detail-block">

        <h4>
          Design / Special Instructions
        </h4>

        <p>
          ${esc(
            o.notes ||
            "No special instructions recorded."
          )}
        </p>

      </div>

      <div class="detail-block">

        <h4>
          Payment History
        </h4>

        ${
          payments.length
            ? `
              <div class="tablewrap">

                <table class="table">

                  <thead>

                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Note</th>
                    </tr>

                  </thead>

                  <tbody>

                    ${
                      payments.map(p=>`

                        <tr>

                          <td>
                            ${esc(p.date)}
                          </td>

                          <td>
                            ${money(
                              p.amount
                            )}
                          </td>

                          <td>
                            ${esc(
                              p.method ||
                              "—"
                            )}
                          </td>

                          <td>
                            ${esc(
                              p.note || ""
                            )}
                          </td>

                        </tr>

                      `).join("")
                    }

                  </tbody>

                </table>

              </div>
            `
            : `
              <p class="muted">
                No payments recorded.
              </p>
            `
        }

      </div>

      <div class="actions">

        <button
          class="btn secondary"
          onclick="
            editOrder(
              '${esc(id)}'
            )
          ">
          Edit Order
        </button>

        <button
          class="btn secondary"
          onclick="
            openPayment(
              '${esc(id)}'
            )
          ">
          Record Payment
        </button>

        <button
          class="btn secondary"
          onclick="
            printReceipt(
              '${esc(id)}'
            )
          ">
          Print Receipt
        </button>

        <button
          class="btn"
          onclick="closeModal()">
          Close
        </button>

      </div>

    </div>
  `;

  $("modal").classList.remove(
    "hidden"
  );
}

/* =====================================================
   PAYMENTS
   ===================================================== */

function openPayment(
  orderId=""
){

  const candidates =
    db.orders.filter(
      o => balance(o) > 0
    );

  if(!candidates.length){

    alert(
      "There are no orders with an outstanding balance."
    );

    return;
  }

  $("modalTitle").textContent =
    "Record Payment";

  $("modalBody").innerHTML = `

    <form
      onsubmit="
        event.preventDefault();
        savePayment()
      ">

      <div class="formgrid">

        <div class="field full">

          <label>
            Order *
          </label>

          <select
            id="fp_order"
            required>

            ${
              candidates.map(o=>`

                <option
                  value="${esc(o.id)}"
                  ${
                    o.id === orderId
                      ? "selected"
                      : ""
                  }>

                  ${esc(o.number)}
                  —
                  ${esc(
                    customer(
                      o.customerId
                    )?.name ||
                    "Unknown"
                  )}

                  —
                  Balance
                  ${money(
                    balance(o)
                  )}

                </option>

              `).join("")
            }

          </select>

        </div>

        <div class="field">

          <label>
            Amount (₦) *
          </label>

          <input
            id="fp_amount"
            type="number"
            min="0.01"
            step="0.01"
            required
          >

        </div>

        <div class="field">

          <label>
            Payment Date
          </label>

          <input
            id="fp_date"
            type="date"
            value="${today()}"
          >

        </div>

        <div class="field">

          <label>
            Payment Method
          </label>

          <select id="fp_method">

            <option>
              Cash
            </option>

            <option>
              Bank Transfer
            </option>

            <option>
              POS
            </option>

            <option>
              Mobile Money
            </option>

            <option>
              Other
            </option>

          </select>

        </div>

        <div class="field full">

          <label>
            Note
          </label>

          <input
            id="fp_note"
            placeholder="
              Optional payment note
            "
          >

        </div>

      </div>

      <div class="actions">

        <button
          type="button"
          class="btn secondary"
          onclick="closeModal()">
          Cancel
        </button>

        <button class="btn">
          Save Payment
        </button>

      </div>

    </form>
  `;

  $("modal").classList.remove(
    "hidden"
  );
}

function savePayment(){

  const o =
    order(
      $("fp_order").value
    );

  const amount =
    Number(
      $("fp_amount").value || 0
    );

  if(!o || amount <= 0)
    return;

  if(
    amount >
    balance(o)
  ){

    alert(
      `Payment exceeds the current balance of ${money(
        balance(o)
      )}.`
    );

    return;
  }

  o.paid =
    Number(o.paid || 0) +
    amount;

  db.payments.push({

    id:
      generateId("PAY"),

    orderId:
      o.id,

    amount,

    date:
      $("fp_date").value ||
      today(),

    method:
      $("fp_method").value,

    note:
      $("fp_note")
        .value
        .trim()

  });

  closeModal();
  save();
}

/* =====================================================
   CUSTOMER PROFILE
   ===================================================== */

function customerProfile(id){

  const c =
    customer(id);

  if(!c)
    return;

  const ms =
    db.measurements
      .filter(
        m => m.customerId === id
      )
      .sort(
        (a,b) =>
          (b.date||"")
            .localeCompare(
              a.date||""
            )
      );

  const os =
    db.orders
      .filter(
        o => o.customerId === id
      )
      .sort(
        (a,b) =>
          (b.created||"")
            .localeCompare(
              a.created||""
            )
      );

  $("modalTitle").textContent =
    `Customer Profile — ${c.name}`;

  $("modalBody").innerHTML = `

    <div class="profile">

      <div class="card">

        <h3>
          Contact
        </h3>

        <p>
          <b>Phone:</b>
          ${esc(c.phone || "—")}
        </p>

        <p>
          <b>Address:</b>
          ${esc(c.address || "—")}
        </p>

        <p>
          <b>Notes:</b>
          ${esc(c.notes || "—")}
        </p>

      </div>

      <div class="card">

        <h3>
          Measurements
        </h3>

        <p>

          ${
            ms.length
              ? `Latest recorded: ${esc(
                  ms[0].date
                )}`
              : "No measurements yet."
          }

        </p>

        <button
          class="btn secondary"
          onclick="
            closeModal();
            nav('measurements');
            $(
              'measurementCustomer'
            ).value='${esc(id)}';
            renderMeasurements()
          ">

          View Measurements

        </button>

      </div>

      <div class="card full">

        <h3>
          Order History
        </h3>

        ${
          os.length
            ? `
              <div class="tablewrap">

                <table class="table">

                  <tr>

                    <th>
                      Order
                    </th>

                    <th>
                      Outfit
                    </th>

                    <th>
                      Collection
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Balance
                    </th>

                  </tr>

                  ${
                    os.map(o=>`

                      <tr>

                        <td>
                          ${esc(o.number)}
                        </td>

                        <td>
                          ${esc(o.outfit)}
                        </td>

                        <td>
                          ${esc(
                            o.collectionDate
                          )}
                        </td>

                        <td>
                          ${statusBadge(
                            o.status
                          )}
                        </td>

                        <td>
                          ${money(
                            balance(o)
                          )}
                        </td>

                      </tr>

                    `).join("")
                  }

                </table>

              </div>
            `
            : `
              <p class="muted">
                No orders yet.
              </p>
            `
        }

      </div>

    </div>

    <div class="actions">

      <button
        class="btn"
        onclick="closeModal()">
        Close
      </button>

    </div>
  `;

  $("modal").classList.remove(
    "hidden"
  );
}

/* =====================================================
   BACKUP / RESTORE
   ===================================================== */

function backupData(){

  const payload = {

    app:
      "TailorPro Manager",

    version:
      "Orders Edition 3.0",

    exportedAt:
      new Date().toISOString(),

    data:db

  };

  const blob =
    new Blob(
      [
        JSON.stringify(
          payload,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    `tailorpro-backup-${today()}.json`;

  a.click();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        a.href
      ),
    1000
  );
}

function restoreData(e){

  const file =
    e.target.files?.[0];

  if(!file)
    return;

  const reader =
    new FileReader();

  reader.onload = () => {

    try{

      const p =
        JSON.parse(
          reader.result
        );

      if(
        !p.data ||
        !Array.isArray(
          p.data.customers
        ) ||
        !Array.isArray(
          p.data.orders
        )
      )
        throw new Error();

      if(
        !confirm(
          "Restore this backup? Existing local data will be replaced."
        )
      )
        return;

      db = p.data;

      save();

      alert(
        "Backup restored successfully."
      );

    }catch(err){

      alert(
        "Could not restore this file. Please select a valid TailorPro JSON backup."
      );

    }

  };

  reader.readAsText(file);

  e.target.value = "";
}

/* =====================================================
   RECEIPT
   ===================================================== */

function printReceipt(id){

  const o =
    order(id);

  const c =
    customer(
      o?.customerId
    );

  if(!o || !c)
    return;

  const payments =
    db.payments
      .filter(
        p => p.orderId === id
      )
      .sort(
        (a,b) =>
          (a.date||"")
            .localeCompare(
              b.date||""
            )
      );

  const w =
    window.open(
      "",
      "_blank",
      "width=700,height=900"
    );

  if(!w){

    alert(
      "Please allow pop-ups to print receipts."
    );

    return;
  }

  const paymentRows =
    payments.map(p=>`

      <tr>

        <td>
          ${esc(p.date)}
        </td>

        <td>
          ${esc(
            p.method || "—"
          )}
        </td>

        <td>
          ${money(p.amount)}
        </td>

      </tr>

    `).join("");

  w.document.write(`

    <!doctype html>

    <html>

    <head>

      <title>
        Receipt ${esc(o.number)}
      </title>

      <style>

        body{
          font-family:Arial,sans-serif;
          padding:35px;
          color:#172033;
          max-width:700px;
          margin:auto
        }

        h1{
          color:#123f72;
          margin-bottom:4px
        }

        .gold{
          color:#b58a1d
        }

        .line{
          border-top:1px solid #ddd;
          margin:18px 0
        }

        .row{
          display:flex;
          justify-content:space-between;
          margin:9px 0;
          gap:20px
        }

        .balance{
          font-size:22px;
          color:#b58a1d;
          font-weight:800
        }

        table{
          width:100%;
          border-collapse:collapse;
          margin-top:10px
        }

        th,td{
          text-align:left;
          padding:8px;
          border-bottom:1px solid #ddd
        }

        @media print{
          button{
            display:none
          }
        }

      </style>

    </head>

    <body>

      <h1>
        TailorPro
      </h1>

      <div class="gold">
        Tailoring Management System
      </div>

      <div class="line"></div>

      <h2>
        Order Receipt
      </h2>

      <div class="row">
        <b>Order:</b>
        <span>
          ${esc(o.number)}
        </span>
      </div>

      <div class="row">
        <b>Customer:</b>
        <span>
          ${esc(c.name)}
        </span>
      </div>

      <div class="row">
        <b>Phone:</b>
        <span>
          ${esc(c.phone)}
        </span>
      </div>

      <div class="row">
        <b>Outfit:</b>
        <span>
          ${esc(o.outfit)}
          ×
          ${esc(o.quantity)}
        </span>
      </div>

      <div class="row">
        <b>Collection Date:</b>
        <span>
          ${esc(o.collectionDate)}
        </span>
      </div>

      <div class="row">
        <b>Status:</b>
        <span>
          ${esc(o.status)}
        </span>
      </div>

      <div class="line"></div>

      <div class="row">
        <b>Total:</b>
        <span>
          ${money(o.total)}
        </span>
      </div>

      <div class="row">
        <b>Paid:</b>
        <span>
          ${money(o.paid)}
        </span>
      </div>

      <div class="row balance">
        <b>Balance:</b>
        <span>
          ${money(balance(o))}
        </span>
      </div>

      <h3>
        Payment History
      </h3>

      <table>

        <thead>

          <tr>

            <th>
              Date
            </th>

            <th>
              Method
            </th>

            <th>
              Amount
            </th>

          </tr>

        </thead>

        <tbody>

          ${
            paymentRows ||
            `
              <tr>
                <td colspan="3">
                  No payments recorded.
                </td>
              </tr>
            `
          }

        </tbody>

      </table>

      <div class="line"></div>

      <p>
        ${esc(
          o.notes ||
          "Thank you for your patronage."
        )}
      </p>

      <script>
        window.onload=()=>window.print()
      <\/script>

    </body>

    </html>
  `);

  w.document.close();
}

/* =====================================================
   MODAL
   ===================================================== */

function closeModal(){

  $("modal")
    .classList
    .add("hidden");
}

$("modal")?.addEventListener(
  "click",
  e => {

    if(
      e.target ===
      $("modal")
    )
      closeModal();

  }
);

window.addEventListener(
  "keydown",
  e => {

    if(e.key === "Escape")
      closeModal();

  }
);

refresh();
