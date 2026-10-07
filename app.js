/* =====================================================
   TAILORPRO ACCOUNT AUTHENTICATION
   Browser-only prototype authentication.
   Accounts are stored in localStorage; for production use a
   real backend/database with server-side authentication.
   ===================================================== */

const AUTH_USERS_KEY = "tailorpro_accounts_v1";
const AUTH_SESSION_KEY = "tailorpro_session_v1";
const LEGACY_DATA_KEY = "tailorpro_v2";

function authUsers(){
  try{
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
    return Array.isArray(users) ? users : [];
  }catch(e){
    return [];
  }
}

function currentUser(){
  try{
    const id = localStorage.getItem(AUTH_SESSION_KEY);
    if(!id) return null;

    return authUsers().find(u => u.id === id) || null;
  }catch(e){
    return null;
  }
}

async function hashPassword(password){
  if(window.crypto?.subtle){
    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2,"0"))
      .join("");
  }

  /* Fallback for very old browsers. */
  let h = 2166136261;

  for(let i = 0; i < password.length; i++){
    h = Math.imul(
      h ^ password.charCodeAt(i),
      16777619
    );
  }

  return (h >>> 0).toString(16);
}


function showAuth(mode = "login", message = ""){
  const screen = document.getElementById("authScreen");

  if(!screen) return;

  screen.classList.remove("hidden");

  document
    .getElementById("appShell")
    ?.classList.add("auth-locked");

  const login = document.getElementById("loginForm");
  const signup = document.getElementById("signupForm");

  if(login){
    login.classList.toggle(
      "hidden",
      mode !== "login"
    );
  }

  if(signup){
    signup.classList.toggle(
      "hidden",
      mode !== "signup"
    );
  }

  const title = document.getElementById("authTitle");
  const sub = document.getElementById("authSubtitle");

  if(title){
    title.textContent =
      mode === "signup"
        ? "Create your TailorPro account"
        : "Welcome back";
  }

  if(sub){
    sub.textContent =
      mode === "signup"
        ? "Create an account to protect access to your tailoring records."
        : "Login to continue to your tailoring business.";
  }

  const msg = document.getElementById("authMessage");

  if(msg){
    msg.textContent = message;
    msg.classList.toggle(
      "hidden",
      !message
    );
  }
}


function hideAuth(){
  document
    .getElementById("authScreen")
    ?.classList.add("hidden");

  document
    .getElementById("appShell")
    ?.classList.remove("auth-locked");

  const u = currentUser();

  const el = document.getElementById("accountName");

  if(el && u){
    el.textContent = `${u.name} · ${u.shop}`;
  }
}


function setAuthMessage(message){
  const msg = document.getElementById("authMessage");

  if(msg){
    msg.textContent = message;
    msg.classList.remove("hidden");
  }
}


async function signUp(event){
  event.preventDefault();

  try{
    const name =
      document.getElementById("signupName")
      ?.value.trim() || "";

    const shop =
      document.getElementById("signupShop")
      ?.value.trim() || "";

    const email =
      document.getElementById("signupEmail")
      ?.value.trim()
      .toLowerCase() || "";

    const password =
      document.getElementById("signupPassword")
      ?.value || "";

    const confirm =
      document.getElementById("signupConfirm")
      ?.value || "";


    if(name.length < 2){
      setAuthMessage(
        "Please enter your full name."
      );
      return;
    }


    if(shop.length < 2){
      setAuthMessage(
        "Please enter your shop name."
      );
      return;
    }


    /*
       FIXED EMAIL VALIDATION
    */
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      setAuthMessage(
        "Please enter a valid email address."
      );
      return;
    }


    if(password.length < 6){
      setAuthMessage(
        "Password must be at least 6 characters."
      );
      return;
    }


    if(password !== confirm){
      setAuthMessage(
        "Passwords do not match."
      );
      return;
    }


    const users = authUsers();


    const existingUser = users.some(
      u =>
        String(u.email || "")
          .trim()
          .toLowerCase() === email
    );


    if(existingUser){
      showAuth(
        "login",
        "An account with this email already exists. Please login."
      );
      return;
    }


    const id = generateId("USR");

    const passwordHash =
      await hashPassword(password);


    users.push({
      id,
      name,
      shop,
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    });


    localStorage.setItem(
      AUTH_USERS_KEY,
      JSON.stringify(users)
    );


    localStorage.setItem(
      AUTH_SESSION_KEY,
      id
    );


    /*
       Give the new account its own data storage.
    */
    const userKey =
      "tailorpro_v2_user_" + id;


    /*
       If old TailorPro data exists,
       preserve it for the first account.
    */
    if(
      !localStorage.getItem(userKey) &&
      localStorage.getItem(LEGACY_DATA_KEY)
    ){
      localStorage.setItem(
        userKey,
        localStorage.getItem(LEGACY_DATA_KEY)
      );
    }


    /*
       Reload so the dashboard starts
       with the new logged-in account.
    */
    window.location.reload();

  }catch(error){

    console.error(
      "TailorPro sign-up error",
      error
    );

    setAuthMessage(
      "Could not create the account. Please try again."
    );
  }
}


async function login(event){
  event.preventDefault();

  try{

    const email =
      document.getElementById("loginEmail")
      ?.value.trim()
      .toLowerCase() || "";

    const password =
      document.getElementById("loginPassword")
      ?.value || "";


    if(!email || !password){
      setAuthMessage(
        "Please enter your email and password."
      );
      return;
    }


    const user = authUsers().find(
      u =>
        String(u.email || "")
          .trim()
          .toLowerCase() === email
    );


    if(!user){
      setAuthMessage(
        "Account not found. Please check your email or sign up."
      );
      return;
    }


    const hash =
      await hashPassword(password);


    if(hash !== user.passwordHash){

      const passwordInput =
        document.getElementById("loginPassword");

      if(passwordInput){
        passwordInput.value = "";
      }

      setAuthMessage(
        "Incorrect password. Please try again."
      );

      return;
    }


    /*
       Save the active account.
    */
    localStorage.setItem(
      AUTH_SESSION_KEY,
      user.id
    );


    /*
       Reload into the user's account.
    */
    window.location.reload();

  }catch(error){

    console.error(
      "TailorPro login error",
      error
    );

    setAuthMessage(
      "Login could not be completed. Please refresh the page and try again."
    );
  }
}


function logout(){

  /*
     Remove only the current login session.
     Customer/order data is NOT deleted.
  */
  localStorage.removeItem(
    AUTH_SESSION_KEY
  );

  window.location.reload();
}


function switchAuth(mode){

  showAuth(mode);

  const first =
    mode === "signup"
      ? document.getElementById("signupName")
      : document.getElementById("loginEmail");

  setTimeout(
    () => first?.focus(),
    50
  );
}


/* =====================================================
   CURRENT USER
   ===================================================== */

const SESSION_USER = currentUser();


/*
   Every account gets its own TailorPro database.
*/
const KEY =
  SESSION_USER
    ? "tailorpro_v2_user_" + SESSION_USER.id
    : "tailorpro_v2_guest";


/* =====================================================
   TAILORPRO MANAGER
   ===================================================== */

const STATUSES = [
  "Received",
  "Cutting",
  "Sewing",
  "Finishing",
  "Ready for Collection",
  "Delivered"
];

const PRIORITIES = [
  "Normal",
  "Urgent"
];


function emptyDB(){
  return {
    customers: [],
    measurements: [],
    orders: [],
    payments: []
  };
}


function loadDB(){

  try{

    const raw =
      JSON.parse(
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


    d.orders.forEach(o => {

      o.status =
        STATUSES.includes(o.status)
          ? o.status
          : "Received";


      o.priority =
        PRIORITIES.includes(o.priority)
          ? o.priority
          : "Normal";


      o.total =
        Number(o.total || 0);


      o.paid =
        Number(o.paid || 0);


      o.quantity =
        Number(o.quantity || 1);


      o.notes =
        o.notes || "";


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
  Number(n || 0)
    .toLocaleString(
      "en-NG",
      {
        maximumFractionDigits: 2
      }
    );


const localDate = () => {

  const d = new Date();

  const off =
    d.getTimezoneOffset();

  return new Date(
    d.getTime() -
    off * 60000
  )
    .toISOString()
    .slice(0,10);
};


const today = localDate;


const esc = s =>
  String(s ?? "")
    .replace(
      /[&<>"']/g,
      c =>
        ({
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
  db.customers.find(
    x => x.id === id
  );


const order = id =>
  db.orders.find(
    x => x.id === id
  );


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
      : s === "Received"
      ? ""
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

  if(!date) return null;

  const a =
    new Date(
      today() + "T00:00:00"
    );

  const b =
    new Date(
      date + "T00:00:00"
    );

  return Math.round(
    (b - a) / 86400000
  );
}


function collectionLabel(o){

  const d =
    daysUntil(o.collectionDate);


  if(isOverdue(o)){

    return `
      <span class="date-overdue">
        Overdue · ${esc(o.collectionDate)}
      </span>
    `;
  }


  if(d === 0){

    return `
      <span class="date-today">
        Today
      </span>
      <br>
      <small>
        ${esc(o.collectionDate)}
      </small>
    `;
  }


  if(d === 1){

    return `
      <span class="date-soon">
        Tomorrow
      </span>
      <br>
      <small>
        ${esc(o.collectionDate)}
      </small>
    `;
  }


  return esc(
    o.collectionDate || "—"
  );
}


/* =====================================================
   NAVIGATION
   ===================================================== */

function nav(page){

  document
    .querySelectorAll(".page")
    .forEach(
      x =>
        x.classList.toggle(
          "active",
          x.id === page
        )
    );


  document
    .querySelectorAll("[data-page]")
    .forEach(
      x =>
        x.classList.toggle(
          "active",
          x.dataset.page === page
        )
    );


  if($("pageTitle")){

    $("pageTitle").textContent =
      page[0].toUpperCase() +
      page.slice(1);
  }
}


document
  .querySelectorAll("[data-page]")
  .forEach(
    b =>
      b.addEventListener(
        "click",
        () => nav(b.dataset.page)
      )
  );


/* =====================================================
   REFRESH
   ===================================================== */

function refresh(){

  renderDashboard();

  renderCustomers();

  renderMeasurements();

  renderOrders();

  renderPayments();

  renderReports();

  fillCustomerSelects();
}


/* =====================================================
   DASHBOARD
   ===================================================== */

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
        (a,o) =>
          a + balance(o),
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
          (b.created || "")
            .localeCompare(
              a.created || ""
            )
      )
      .slice(0,8);


  $("recentOrders").innerHTML =
    rows.map(
      o =>
        `<tr>
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

          <td>
            <button
              class="btn small"
              onclick="viewOrder('${esc(o.id)}')">
              View
            </button>
          </td>
        </tr>`
    )
    .join("");


  if(!rows.length){

    $("recentOrders").innerHTML =
      `<tr>
        <td
          colspan="7"
          class="muted">
          No orders yet.
        </td>
      </tr>`;
  }
}


/* =====================================================
   CUSTOMER HELPERS
   ===================================================== */

function fillCustomerSelects(){

  document
    .querySelectorAll(
      "select[data-customer-select]"
    )
    .forEach(select => {

      const selected =
        select.value;


      select.innerHTML =
        `<option value="">
          Select customer
        </option>` +
        db.customers
          .slice()
          .sort(
            (a,b) =>
              a.name.localeCompare(
                b.name
              )
          )
          .map(
            c =>
              `<option
                value="${esc(c.id)}">
                ${esc(c.name)}
                ${c.phone
                  ? " — " + esc(c.phone)
                  : ""}
              </option>`
          )
          .join("");


      if(
        db.customers.some(
          c => c.id === selected
        )
      ){
        select.value = selected;
      }
    });
}


/* =====================================================
   CUSTOMERS
   ===================================================== */

function renderCustomers(){

  const tbody =
    $("customersTable");

  if(!tbody) return;


  tbody.innerHTML =
    db.customers
      .slice()
      .sort(
        (a,b) =>
          a.name.localeCompare(
            b.name
          )
      )
      .map(
        c =>
          `<tr>
            <td>
              <b>${esc(c.name)}</b>
            </td>

            <td>
              ${esc(c.phone || "—")}
            </td>

            <td>
              ${esc(c.address || "—")}
            </td>

            <td>
              ${db.orders.filter(
                o => o.customerId === c.id
              ).length}
            </td>

            <td>
              <button
                class="btn small"
                onclick="customerProfile('${esc(c.id)}')">
                View
              </button>

              <button
                class="btn small secondary"
                onclick="editCustomer('${esc(c.id)}')">
                Edit
              </button>
            </td>
          </tr>`
      )
      .join("");


  if(!db.customers.length){

    tbody.innerHTML =
      `<tr>
        <td
          colspan="5"
          class="muted">
          No customers yet.
        </td>
      </tr>`;
  }
}


/* =====================================================
   MEASUREMENTS
   ===================================================== */

function renderMeasurements(){

  const tbody =
    $("measurementsTable");

  if(!tbody) return;


  const rows =
    db.measurements
      .slice()
      .sort(
        (a,b) =>
          (b.date || "")
            .localeCompare(
              a.date || ""
            )
      );


  tbody.innerHTML =
    rows.map(
      m =>
        `<tr>
          <td>
            ${esc(m.date)}
          </td>

          <td>
            ${esc(
              customer(m.customerId)?.name ||
              "Unknown"
            )}
          </td>

          <td>
            ${esc(m.type || "General")}
          </td>

          <td>
            ${esc(m.notes || "—")}
          </td>

          <td>
            <button
              class="btn small"
              onclick="viewMeasurement('${esc(m.id)}')">
              View
            </button>

            <button
              class="btn small secondary"
              onclick="editMeasurement('${esc(m.id)}')">
              Edit
            </button>
          </td>
        </tr>`
    )
    .join("");


  if(!rows.length){

    tbody.innerHTML =
      `<tr>
        <td
          colspan="5"
          class="muted">
          No measurements yet.
        </td>
      </tr>`;
  }
}


/* =====================================================
   ORDERS
   ===================================================== */

function renderOrders(){

  const tbody =
    $("ordersTable");

  if(!tbody) return;


  tbody.innerHTML =
    db.orders
      .slice()
      .sort(
        (a,b) =>
          (b.created || "")
            .localeCompare(
              a.created || ""
            )
      )
      .map(
        o => {

          const c =
            customer(o.customerId);


          return `
            <tr>

              <td>
                <b>
                  ${esc(o.number)}
                </b>
              </td>

              <td>
                ${esc(
                  c?.name ||
                  "Unknown"
                )}
              </td>

              <td>
                ${esc(o.outfit)}
              </td>

              <td>
                ${esc(
                  o.quantity
                )}
              </td>

              <td>
                ${money(o.total)}
              </td>

              <td>
                ${money(balance(o))}
              </td>

              <td>
                ${collectionLabel(o)}
              </td>

              <td>
                ${priorityBadge(
                  o.priority
                )}
              </td>

              <td>
                ${statusBadge(
                  o.status
                )}
              </td>

              <td>

                <button
                  class="btn small"
                  onclick="viewOrder('${esc(o.id)}')">
                  View
                </button>

                <button
                  class="btn small secondary"
                  onclick="editOrder('${esc(o.id)}')">
                  Edit
                </button>

              </td>

            </tr>
          `;
        }
      )
      .join("");


  if(!db.orders.length){

    tbody.innerHTML =
      `<tr>
        <td
          colspan="10"
          class="muted">
          No orders yet.
        </td>
      </tr>`;
  }
}


/* =====================================================
   PAYMENTS
   ===================================================== */

function renderPayments(){

  const tbody =
    $("paymentsTable");

  if(!tbody) return;


  tbody.innerHTML =
    db.payments
      .slice()
      .sort(
        (a,b) =>
          (b.date || "")
            .localeCompare(
              a.date || ""
            )
      )
      .map(
        p =>
          `<tr>

            <td>
              ${esc(p.date)}
            </td>

            <td>
              ${esc(
                order(p.orderId)?.number ||
                "Unknown"
              )}
            </td>

            <td>
              ${esc(
                customer(
                  order(p.orderId)?.customerId
                )?.name ||
                "Unknown"
              )}
            </td>

            <td>
              ${money(p.amount)}
            </td>

            <td>
              ${esc(
                p.method ||
                "—"
              )}
            </td>

            <td>
              ${esc(
                p.note ||
                "—"
              )}
            </td>

          </tr>`
      )
      .join("");


  if(!db.payments.length){

    tbody.innerHTML =
      `<tr>
        <td
          colspan="6"
          class="muted">
          No payments yet.
        </td>
      </tr>`;
  }
}


/* =====================================================
   REPORTS
   ===================================================== */

function renderReports(){

  const revenue =
    db.payments.reduce(
      (a,p) =>
        a + Number(p.amount || 0),
      0
    );


  const outstanding =
    db.orders.reduce(
      (a,o) =>
        a + balance(o),
      0
    );


  if($("reportRevenue"))
    $("reportRevenue").textContent =
      money(revenue);


  if($("reportOutstanding"))
    $("reportOutstanding").textContent =
      money(outstanding);


  if($("reportOrders"))
    $("reportOrders").textContent =
      db.orders.length;


  if($("reportCustomers"))
    $("reportCustomers").textContent =
      db.customers.length;
}


/* =====================================================
   CUSTOMER FORM
   ===================================================== */

function openCustomer(){

  $("modalTitle").textContent =
    "New Customer";


  $("modalBody").innerHTML =
    `
      <form
        onsubmit="event.preventDefault();saveCustomer()">

        <div class="formgrid">

          <div class="field">
            <label>
              Full Name *
            </label>

            <input
              id="fc_name"
              required>
          </div>


          <div class="field">
            <label>
              Phone
            </label>

            <input
              id="fc_phone">
          </div>


          <div class="field full">
            <label>
              Address
            </label>

            <input
              id="fc_address">
          </div>


          <div class="field full">
            <label>
              Notes
            </label>

            <textarea
              id="fc_notes"></textarea>
          </div>

        </div>


        <div class="actions">

          <button
            type="button"
            class="btn secondary"
            onclick="closeModal()">
            Cancel
          </button>

          <button
            class="btn">
            Save Customer
          </button>

        </div>

      </form>
    `;


  $("modal").classList.remove(
    "hidden"
  );
}


function saveCustomer(){

  const name =
    $("fc_name").value.trim();


  if(!name) return;


  db.customers.push({

    id:
      generateId("CUS"),

    name,

    phone:
      $("fc_phone").value.trim(),

    address:
      $("fc_address").value.trim(),

    notes:
      $("fc_notes").value.trim(),

    created:
      new Date().toISOString()

  });


  closeModal();

  save();
}


function editCustomer(id){

  const c =
    customer(id);

  if(!c) return;


  $("modalTitle").textContent =
    "Edit Customer";


  $("modalBody").innerHTML =
    `
      <form
        onsubmit="event.preventDefault();updateCustomer('${esc(id)}')">

        <div class="formgrid">

          <div class="field">
            <label>
              Full Name *
            </label>

            <input
              id="fc_name"
              value="${esc(c.name)}"
              required>
          </div>


          <div class="field">
            <label>
              Phone
            </label>

            <input
              id="fc_phone"
              value="${esc(c.phone || "")}">
          </div>


          <div class="field full">
            <label>
              Address
            </label>

            <input
              id="fc_address"
              value="${esc(c.address || "")}">
          </div>


          <div class="field full">
            <label>
              Notes
            </label>

            <textarea
              id="fc_notes">${esc(c.notes || "")}</textarea>
          </div>

        </div>


        <div class="actions">

          <button
            type="button"
            class="btn secondary"
            onclick="closeModal()">
            Cancel
          </button>

          <button
            class="btn">
            Save Changes
          </button>

        </div>

      </form>
    `;


  $("modal").classList.remove(
    "hidden"
  );
}


function updateCustomer(id){

  const c =
    customer(id);

  if(!c) return;


  c.name =
    $("fc_name").value.trim();


  c.phone =
    $("fc_phone").value.trim();


  c.address =
    $("fc_address").value.trim();


  c.notes =
    $("fc_notes").value.trim();


  closeModal();

  save();
}


/* =====================================================
   MEASUREMENT FORM
   ===================================================== */

function openMeasurement(){

  $("modalTitle").textContent =
    "New Measurement";


  $("modalBody").innerHTML =
    `
      <form
        onsubmit="event.preventDefault();saveMeasurement()">

        <div class="formgrid">

          <div class="field full">
            <label>
              Customer *
            </label>

            <select
              id="fm_customer"
              required
              data-customer-select>
            </select>
          </div>


          <div class="field">
            <label>
              Measurement Date
            </label>

            <input
              id="fm_date"
              type="date"
              value="${today()}">
          </div>


          <div class="field">
            <label>
              Type
            </label>

            <input
              id="fm_type"
              placeholder="Full body">
          </div>


          <div class="field">
            <label>
              Chest
            </label>

            <input
              id="fm_chest">
          </div>


          <div class="field">
            <label>
              Waist
            </label>

            <input
              id="fm_waist">
          </div>


          <div class="field">
            <label>
              Hip
            </label>

            <input
              id="fm_hip">
          </div>


          <div class="field">
            <label>
              Shoulder
            </label>

            <input
              id="fm_shoulder">
          </div>


          <div class="field">
            <label>
              Sleeve
            </label>

            <input
              id="fm_sleeve">
          </div>


          <div class="field">
            <label>
              Trouser Length
            </label>

            <input
              id="fm_trouser">
          </div>


          <div class="field">
            <label>
              Shirt Length
            </label>

            <input
              id="fm_shirt">
          </div>


          <div class="field full">
            <label>
              Notes
            </label>

            <textarea
              id="fm_notes"></textarea>
          </div>

        </div>


        <div class="actions">

          <button
            type="button"
            class="btn secondary"
            onclick="closeModal()">
            Cancel
          </button>

          <button
            class="btn">
            Save Measurement
          </button>

        </div>

      </form>
    `;


  $("modal").classList.remove(
    "hidden"
  );


  fillCustomerSelects();
}


function saveMeasurement(){

  const customerId =
    $("fm_customer").value;


  if(!customerId){

    alert(
      "Please select a customer."
    );

    return;
  }


  db.measurements.push({

    id:
      generateId("MEA"),

    customerId,

    date:
      $("fm_date").value ||
      today(),

    type:
      $("fm_type").value.trim(),

    chest:
      $("fm_chest").value.trim(),

    waist:
      $("fm_waist").value.trim(),

    hip:
      $("fm_hip").value.trim(),

    shoulder:
      $("fm_shoulder").value.trim(),

    sleeve:
      $("fm_sleeve").value.trim(),

    trouser:
      $("fm_trouser").value.trim(),

    shirt:
      $("fm_shirt").value.trim(),

    notes:
      $("fm_notes").value.trim()

  });


  closeModal();

  save();
}


function viewMeasurement(id){

  const m =
    db.measurements.find(
      x => x.id === id
    );

  if(!m) return;


  const c =
    customer(m.customerId);


  $("modalTitle").textContent =
    "Measurement Record";


  $("modalBody").innerHTML =
    `
      <div class="card">

        <h3>
          ${esc(c?.name || "Unknown")}
        </h3>

        <p>
          <b>Date:</b>
          ${esc(m.date)}
        </p>

        <p>
          <b>Type:</b>
          ${esc(m.type || "General")}
        </p>


        <div class="measurement-preview-grid">

          <div>
            <span>Chest</span>
            <b>${esc(m.chest || "—")}</b>
          </div>

          <div>
            <span>Waist</span>
            <b>${esc(m.waist || "—")}</b>
          </div>

          <div>
            <span>Hip</span>
            <b>${esc(m.hip || "—")}</b>
          </div>

          <div>
            <span>Shoulder</span>
            <b>${esc(m.shoulder || "—")}</b>
          </div>

          <div>
            <span>Sleeve</span>
            <b>${esc(m.sleeve || "—")}</b>
          </div>

          <div>
            <span>Trouser</span>
            <b>${esc(m.trouser || "—")}</b>
          </div>

          <div>
            <span>Shirt</span>
            <b>${esc(m.shirt || "—")}</b>
          </div>

        </div>


        <p>
          <b>Notes:</b>
          ${esc(m.notes || "—")}
        </p>

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


function editMeasurement(id){

  const m =
    db.measurements.find(
      x => x.id === id
    );

  if(!m) return;


  $("modalTitle").textContent =
    "Edit Measurement";


  $("modalBody").innerHTML =
    `
      <form
        onsubmit="event.preventDefault();updateMeasurement('${esc(id)}')">

        <div class="formgrid">

          <div class="field full">
            <label>
              Customer *
            </label>

            <select
              id="fm_customer"
              required
              data-customer-select>
            </select>
          </div>


          <div class="field">
            <label>
              Measurement Date
            </label>

            <input
              id="fm_date"
              type="date"
              value="${esc(m.date || today())}">
          </div>


          <div class="field">
            <label>
              Type
            </label>

            <input
              id="fm_type"
              value="${esc(m.type || "")}">
          </div>


          <div class="field">
            <label>
              Chest
            </label>

            <input
              id="fm_chest"
              value="${esc(m.chest || "")}">
          </div>


          <div class="field">
            <label>
              Waist
            </label>

            <input
              id="fm_waist"
              value="${esc(m.waist || "")}">
          </div>


          <div class="field">
            <label>
              Hip
            </label>

            <input
              id="fm_hip"
              value="${esc(m.hip || "")}">
          </div>


          <div class="field">
            <label>
              Shoulder
            </label>

            <input
              id="fm_shoulder"
              value="${esc(m.shoulder || "")}">
          </div>


          <div class="field">
            <label>
              Sleeve
            </label>

            <input
              id="fm_sleeve"
              value="${esc(m.sleeve || "")}">
          </div>


          <div class="field">
            <label>
              Trouser Length
            </label>

            <input
              id="fm_trouser"
              value="${esc(m.trouser || "")}">
          </div>


          <div class="field">
            <label>
              Shirt Length
            </label>

            <input
              id="fm_shirt"
              value="${esc(m.shirt || "")}">
          </div>


          <div class="field full">
            <label>
              Notes
            </label>

            <textarea
              id="fm_notes">${esc(m.notes || "")}</textarea>
          </div>

        </div>


        <div class="actions">

          <button
            type="button"
            class="btn secondary"
            onclick="closeModal()">
            Cancel
          </button>

          <button
            class="btn">
            Save Changes
          </button>

        </div>

      </form>
    `;


  $("modal").classList.remove(
    "hidden"
  );


  fillCustomerSelects();


  if($("fm_customer")){
    $("fm_customer").value =
      m.customerId;
  }
}


function updateMeasurement(id){

  const m =
    db.measurements.find(
      x => x.id === id
    );

  if(!m) return;


  m.customerId =
    $("fm_customer").value;


  m.date =
    $("fm_date").value ||
    today();


  m.type =
    $("fm_type").value.trim();


  m.chest =
    $("fm_chest").value.trim();


  m.waist =
    $("fm_waist").value.trim();


  m.hip =
    $("fm_hip").value.trim();


  m.shoulder =
    $("fm_shoulder").value.trim();


  m.sleeve =
    $("fm_sleeve").value.trim();


  m.trouser =
    $("fm_trouser").value.trim();


  m.shirt =
    $("fm_shirt").value.trim();


  m.notes =
    $("fm_notes").value.trim();


  closeModal();

  save();
}


/* =====================================================
   ORDER MEASUREMENT INTEGRATION
   ===================================================== */

function getCustomerMeasurements(customerId){

  if(!customerId) return [];

  return db.measurements
    .filter(
      m => m.customerId === customerId
    )
    .sort(
      (a,b) =>
        (b.date || "")
          .localeCompare(
            a.date || ""
          )
    );
}


function measurementOptionLabel(m){

  return `${m.date || "No date"} — ${m.type || "General"}`;
}


function measurementPreviewHTML(m){

  if(!m){

    return `
      <div class="measurement-empty">
        No measurement record selected.
      </div>
    `;
  }


  return `
    <div class="measurement-preview-head">

      <strong>
        Selected Measurement
      </strong>

      <span>
        ${esc(m.date || "")}
      </span>

    </div>


    <div class="measurement-preview-grid">

      <div>
        <span>Chest</span>
        <b>${esc(m.chest || "—")}</b>
      </div>

      <div>
        <span>Waist</span>
        <b>${esc(m.waist || "—")}</b>
      </div>

      <div>
        <span>Hip</span>
        <b>${esc(m.hip || "—")}</b>
      </div>

      <div>
        <span>Shoulder</span>
        <b>${esc(m.shoulder || "—")}</b>
      </div>

      <div>
        <span>Sleeve</span>
        <b>${esc(m.sleeve || "—")}</b>
      </div>

      <div>
        <span>Trouser</span>
        <b>${esc(m.trouser || "—")}</b>
      </div>

      <div>
        <span>Shirt</span>
        <b>${esc(m.shirt || "—")}</b>
      </div>

    </div>
  `;
}


function updateOrderMeasurementOptions(){

  const customerId =
    $("fo_customer")?.value || "";

  const select =
    $("fo_measurement");

  if(!select) return;


  const measurements =
    getCustomerMeasurements(
      customerId
    );


  const current =
    select.value;


  select.innerHTML =
    `<option value="">
      Select measurement record
    </option>` +
    measurements
      .map(
        m =>
          `<option value="${esc(m.id)}">
            ${esc(
              measurementOptionLabel(m)
            )}
          </option>`
      )
      .join("");


  if(
    measurements.some(
      m => m.id === current
    )
  ){
    select.value = current;
  }


  updateOrderMeasurementPreview();
}


function updateOrderMeasurementPreview(){

  const select =
    $("fo_measurement");

  const preview =
    $("orderMeasurementPreview");

  if(!select || !preview) return;


  const m =
    db.measurements.find(
      x => x.id === select.value
    );


  preview.innerHTML =
    measurementPreviewHTML(m);
}


function openMeasurementForCustomerFromOrder(){

  const customerId =
    $("fo_customer")?.value || "";


  openMeasurement();


  setTimeout(() => {

    if($("fm_customer")){
      $("fm_customer").value =
        customerId;
    }

  },50);
}


/* =====================================================
   ORDER FORM
   ===================================================== */

function orderFormHTML(o = null){

  const customerId =
    o?.customerId || "";


  const measurements =
    getCustomerMeasurements(
      customerId
    );


  return `
    <form
      onsubmit="event.preventDefault();${o ? `updateOrder('${esc(o.id)}')` : "saveOrder()"}">

      <div class="formgrid">

        <div class="field full">

          <label>
            Customer *
          </label>

          <select
            id="fo_customer"
            data-customer-select
            onchange="updateOrderMeasurementOptions()"
            required>
          </select>

        </div>


        <div class="field full measurement-selector-block">

          <label>
            Measurement Record
          </label>

          <div class="measurement-selector-row">

            <select
              id="fo_measurement"
              onchange="updateOrderMeasurementPreview()">

              <option value="">
                Select measurement record
              </option>

              ${measurements
                .map(
                  m =>
                    `<option
                      value="${esc(m.id)}"
                      ${m.id === o?.measurementId ? "selected" : ""}>

                      ${esc(
                        measurementOptionLabel(m)
                      )}

                    </option>`
                )
                .join("")}

            </select>


            <button
              type="button"
              class="btn secondary"
              onclick="openMeasurementForCustomerFromOrder()">

              + New Measurement

            </button>

          </div>


          <div
            id="orderMeasurementPreview"
            class="measurement-preview">

            ${
              measurementPreviewHTML(
                db.measurements.find(
                  m =>
                    m.id ===
                    o?.measurementId
                )
              )
            }

          </div>

        </div>


        <div class="field">

          <label>
            Outfit *
          </label>

          <input
            id="fo_outfit"
            value="${esc(o?.outfit || "")}"
            required>

        </div>


        <div class="field">

          <label>
            Quantity
          </label>

          <input
            id="fo_quantity"
            type="number"
            min="1"
            value="${esc(o?.quantity || 1)}">

        </div>


        <div class="field">

          <label>
            Material Received Date
          </label>

          <input
            id="fo_received"
            type="date"
            value="${esc(o?.receivedDate || today())}">

        </div>


        <div class="field">

          <label>
            Collection Date *
          </label>

          <input
            id="fo_collection"
            type="date"
            value="${esc(o?.collectionDate || "")}"
            required>

        </div>


        <div class="field">

          <label>
            Fabric / Colour
          </label>

          <input
            id="fo_fabric"
            value="${esc(o?.fabric || "")}"
            placeholder="e.g. Navy blue">

        </div>


        <div class="field">

          <label>
            Total Price (₦)
          </label>

          <input
            id="fo_total"
            type="number"
            min="0"
            step="0.01"
            value="${esc(o?.total || "")}">

        </div>


        <div class="field">

          <label>
            Initial Payment (₦)
          </label>

          <input
            id="fo_paid"
            type="number"
            min="0"
            step="0.01"
            value="${esc(o?.paid || "")}">

        </div>


        <div class="field">

          <label>
            Priority
          </label>

          <select id="fo_priority">

            ${PRIORITIES
              .map(
                p =>
                  `<option
                    ${p === (o?.priority || "Normal") ? "selected" : ""}>
                    ${p}
                  </option>`
              )
              .join("")}

          </select>

        </div>


        <div class="field full">

          <label>
            Design / Special Instructions
          </label>

          <textarea
            id="fo_notes"
            placeholder="Write special instructions, comments, fabric details, fitting notes, etc.">${esc(o?.notes || "")}</textarea>

        </div>

      </div>


      <div class="actions">

        <button
          type="button"
          class="btn secondary"
          onclick="closeModal()">

          Cancel

        </button>


        <button
          class="btn">

          ${o ? "Save Changes" : "Create Order"}

        </button>

      </div>

    </form>
  `;
}


function collectOrderForm(){

  const customerId =
    $("fo_customer")?.value;


  const collectionDate =
    $("fo_collection")?.value;


  if(!customerId){

    alert(
      "Please select a customer."
    );

    return null;
  }


  if(!collectionDate){

    alert(
      "Please select a collection date."
    );

    return null;
  }


  const total =
    Number(
      $("fo_total")?.value || 0
    );


  const paid =
    Number(
      $("fo_paid")?.value || 0
    );


  if(paid > total){

    alert(
      "Initial payment cannot be greater than the total price."
    );

    return null;
  }


  return {

    customerId,

    measurementId:
      $("fo_measurement")?.value || "",

    outfit:
      $("fo_outfit")?.value.trim() || "",

    quantity:
      Number(
        $("fo_quantity")?.value || 1
      ),

    receivedDate:
      $("fo_received")?.value ||
      today(),

    collectionDate,

    fabric:
      $("fo_fabric")?.value.trim() || "",

    total,

    paid,

    priority:
      $("fo_priority")?.value ||
      "Normal",

    notes:
      $("fo_notes")?.value.trim() ||
      ""

  };
}


function openOrder(){

  $("modalTitle").textContent =
    "New Order";


  $("modalBody").innerHTML =
    orderFormHTML();


  $("modal").classList.remove(
    "hidden"
  );


  fillCustomerSelects();

  updateOrderMeasurementOptions();
}


function saveOrder(){

  const data =
    collectOrderForm();

  if(!data) return;


  const number =
    "ORD-" +
    Date.now()
      .toString(36)
      .toUpperCase();


  const id =
    generateId("ORD");


  db.orders.push({

    id,

    number,

    created:
      new Date().toISOString(),

    status:
      "Received",

    ...data

  });


  if(data.paid > 0){

    db.payments.push({

      id:
        generateId("PAY"),

      orderId:
        id,

      amount:
        data.paid,

      date:
        today(),

      method:
        "Initial Payment",

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

  if(!o) return;


  $("modalTitle").textContent =
    `Edit Order ${o.number}`;


  $("modalBody").innerHTML =
    orderFormHTML(o);


  $("modal").classList.remove(
    "hidden"
  );


  fillCustomerSelects();


  if($("fo_customer")){
    $("fo_customer").value =
      o.customerId;
  }


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
  ){
    return;
  }


  const oldPaid =
    Number(o.paid || 0);


  const newPaid =
    data.paid;


  if(newPaid < oldPaid){

    alert(
      "To reduce a customer's recorded payment, use the payment records rather than editing the order total paid amount."
    );


    if($("fo_paid")){
      $("fo_paid").value =
        oldPaid;
    }

    return;
  }


  if(newPaid > oldPaid){

    db.payments.push({

      id:
        generateId("PAY"),

      orderId:
        id,

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


  if(!o || !c) return;


  const payments =
    db.payments
      .filter(
        p =>
          p.orderId === id
      )
      .sort(
        (a,b) =>
          (b.date || "")
            .localeCompare(
              a.date || ""
            )
      );


  $("modalTitle").textContent =
    `Order ${o.number}`;


  $("modalBody").innerHTML =
    `
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
            ${priorityBadge(o.priority)}
            ${statusBadge(o.status)}
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
                o.receivedDate ||
                "—"
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
              ${esc(
                db.measurements.find(
                  m =>
                    m.id ===
                    o.measurementId
                )?.date ||
                "Not selected"
              )}
            </b>
          </div>


          <div>
            <span>
              Fabric / Colour
            </span>

            <b>
              ${esc(
                o.fabric ||
                "—"
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

                  <table class="table compact">

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
                        payments
                          .map(
                            p =>
                              `<tr>

                                <td>
                                  ${esc(p.date)}
                                </td>

                                <td>
                                  ${money(p.amount)}
                                </td>

                                <td>
                                  ${esc(
                                    p.method ||
                                    "—"
                                  )}
                                </td>

                                <td>
                                  ${esc(
                                    p.note ||
                                    ""
                                  )}
                                </td>

                              </tr>`
                          )
                          .join("")
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
            onclick="editOrder('${esc(id)}')">
            Edit Order
          </button>


          <button
            class="btn secondary"
            onclick="openPayment('${esc(id)}')">
            Record Payment
          </button>


          <button
            class="btn secondary"
            onclick="printReceipt('${esc(id)}')">
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

function openPayment(orderId = ""){

  const candidates =
    db.orders.filter(
      o =>
        balance(o) > 0
    );


  if(!candidates.length){

    alert(
      "There are no orders with an outstanding balance."
    );

    return;
  }


  $("modalTitle").textContent =
    "Record Payment";


  $("modalBody").innerHTML =
    `
      <form
        onsubmit="event.preventDefault();savePayment()">

        <div class="formgrid">

          <div class="field full">

            <label>
              Order *
            </label>

            <select
              id="fp_order"
              required>

              ${
                candidates
                  .map(
                    o =>
                      `<option
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

                      </option>`
                  )
                  .join("")
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
              required>

          </div>


          <div class="field">

            <label>
              Payment Date
            </label>

            <input
              id="fp_date"
              type="date"
              value="${today()}">

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
              placeholder="Optional payment note">

          </div>

        </div>


        <div class="actions">

          <button
            type="button"
            class="btn secondary"
            onclick="closeModal()">

            Cancel

          </button>


          <button
            class="btn">

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


  if(amount > balance(o)){

    alert(
      `Payment exceeds the current balance of ${money(balance(o))}.`
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
      $("fp_note").value.trim()

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

  if(!c) return;


  const ms =
    db.measurements
      .filter(
        m =>
          m.customerId === id
      )
      .sort(
        (a,b) =>
          (b.date || "")
            .localeCompare(
              a.date || ""
            )
      );


  const os =
    db.orders
      .filter(
        o =>
          o.customerId === id
      )
      .sort(
        (a,b) =>
          (b.created || "")
            .localeCompare(
              a.created || ""
            )
      );


  $("modalTitle").textContent =
    `Customer Profile — ${c.name}`;


  $("modalBody").innerHTML =
    `
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
                ? `Latest recorded: ${esc(ms[0].date)}`
                : "No measurements yet."
            }

          </p>


          <button
            class="btn secondary"
            onclick="closeModal();nav('measurements');$('measurementCustomer').value='${esc(id)}';renderMeasurements()">

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
                      <th>Order</th>
                      <th>Outfit</th>
                      <th>Collection</th>
                      <th>Status</th>
                      <th>Balance</th>
                    </tr>

                    ${
                      os
                        .map(
                          o =>
                            `<tr>

                              <td>
                                ${esc(o.number)}
                              </td>

                              <td>
                                ${esc(o.outfit)}
                              </td>

                              <td>
                                ${esc(o.collectionDate)}
                              </td>

                              <td>
                                ${statusBadge(o.status)}
                              </td>

                              <td>
                                ${money(balance(o))}
                              </td>

                            </tr>`
                        )
                        .join("")
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

    data:
      db

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
    document.createElement(
      "a"
    );


  a.href =
    URL.createObjectURL(
      blob
    );


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


  if(!file) return;


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
      ){
        throw new Error();
      }


      if(
        !confirm(
          "Restore this backup? Existing local data will be replaced."
        )
      ){
        return;
      }


      db =
        p.data;


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
   PRINT RECEIPT
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
        p =>
          p.orderId === id
      )
      .sort(
        (a,b) =>
          (a.date || "")
            .localeCompare(
              b.date || ""
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
    payments
      .map(
        p =>
          `<tr>

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

          </tr>`
      )
      .join("");


  w.document.write(
    `<!doctype html>

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

        .total{
          font-size:20px;
          font-weight:700
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
        <span>${esc(o.number)}</span>
      </div>


      <div class="row">
        <b>Customer:</b>
        <span>${esc(c.name)}</span>
      </div>


      <div class="row">
        <b>Phone:</b>
        <span>${esc(c.phone)}</span>
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
            <th>Date</th>
            <th>Method</th>
            <th>Amount</th>
          </tr>

        </thead>


        <tbody>

          ${
            paymentRows ||
            `<tr>
              <td colspan="3">
                No payments recorded.
              </td>
            </tr>`
          }

        </tbody>

      </table>


      <div class="line"></div>


      <p>
        ${
          esc(
            o.notes ||
            "Thank you for your patronage."
          )
        }
      </p>


      <script>
        window.onload =
          () => window.print()
      <\/script>

    </body>

    </html>`
  );


  w.document.close();
}


/* =====================================================
   MODAL
   ===================================================== */

function closeModal(){

  $("modal")
    ?.classList.add(
      "hidden"
    );
}


$("modal")?.addEventListener(
  "click",
  e => {

    if(
      e.target ===
      $("modal")
    ){
      closeModal();
    }

  }
);


window.addEventListener(
  "keydown",
  e => {

    if(
      e.key === "Escape"
    ){
      closeModal();
    }

  }
);


/* =====================================================
   START APPLICATION
   ===================================================== */

if(SESSION_USER){

  hideAuth();

  refresh();

}else{

  showAuth("login");

}
