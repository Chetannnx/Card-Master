// app.js
const https = require('https');
const express = require('express');
const sql = require('mssql/msnodesqlv8');
const path = require('path');
const selfsigned = require('selfsigned');

const app = express();

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const config = {
    server: 'DESKTOP-EQ55Q8H\\SQLEXPRESS', // <--- your server
    database: 'OP',                        // <--- your database
    driver: 'msnodesqlv8',
    options: { trustedConnection: true }
};

// ====== Helper ======
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function escapeJs(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
// New helper to build redirect query preserving current state
function buildRedirectQuery(q) {
    const page = q.page || 1;
    const limit = q.limit || 10;
    const search = q.search ? String(q.search) : '';
    const sortBy = q.sortBy || 'CARD_NO';
    const order = q.order || 'ASC';
    const showAll = q.showAll || '';
    return `?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sortBy=${encodeURIComponent(sortBy)}&order=${encodeURIComponent(order)}&showAll=${encodeURIComponent(showAll)}`;
}

// ====== Routes ======

// Home
app.get('/', (req, res) => {
  const params = req.query;
  console.log(params);
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Home</title>
  <link rel="stylesheet" href="/Page.css">
  <link href='https://fonts.googleapis.com/css?family=DM Sans' rel='stylesheet'>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
</head>
<body>
  <nav style="font-family: 'DM Sans', sans-serif;">
    <ul>
      <li><a href="/"  class="active">HOME</a></li>
      <li><a href="/tees">CARD MASTER</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/contact">Contact</a></li>
    </ul>
  </nav>
  <h2 style="font-family: 'DM Sans', sans-serif;">Welcome to Home Page</h2>
</body>
</html>`;
    res.send(html);
});


// ====== DEBUG CONSOLE PAGE ======
app.get('/console', (req, res) => {
  const params = req.query;
  console.log(params);
  const paramList = Object.entries(params)
    .map(([key, value]) => `<li><b>${key}</b>: ${value}</li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Realtime Console</title>
  <style>
    body { font-family: monospace; background: #1e1e1e; color: #0f0; padding: 20px; }
    h2 { color: #0f0; }
    ul { list-style: none; padding-left: 0; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <h2>Query Parameters</h2>
  <ul>${paramList || '<li>No parameters passed</li>'}</ul>

  <script>
    console.clear();
    console.log("✅ Realtime Console");
    ${Object.entries(params)
      .map(([key, value]) => `console.log("${key}: ", "${value}");`)
      .join('\n')}
  </script>
</body>
</html>`;
  res.send(html);
});

// ====== NEW TRUCK MASTER PAGE ======
// ====== TRUCK MASTER PAGE ======
app.get('/truck-master', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const truckRegNo = req.query.truck?.trim();

        // Default empty values
        let truckData = {
            TRUCK_REG_NO: truckRegNo || '',
            OWNER_NAME: '',
            DRIVER_NAME: '',
            HELPER_NAME: '',
            CARRIER_COMPANY: '',
            TRUCK_SEALING_REQUIREMENT: '',
            BLACKLIST_STATUS: '',
            REASON_FOR_BLACKLIST: '',
            SAFETY_CERTIFICATION_NO: '',
            CALIBRATION_CERTIFICATION_NO: '',
            TARE_WEIGHT: '',
            MAX_WEIGHT: '',
            MAX_FUEL_CAPACITY: ''
        };

        let showInsertForm = false;

        if (truckRegNo) {
            const request = pool.request();
            request.input('truckRegNo', sql.VarChar, truckRegNo);
            const result = await request.query(`SELECT * FROM TRUCK_MASTER WHERE TRUCK_REG_NO = @truckRegNo`);

            if (result.recordset.length > 0) {
                truckData = result.recordset[0];
            } else {
                showInsertForm = true; // open popup if no data found
            }
        }

        const html = `<!DOCTYPE html>
<html>
<head>
  <title>Truck Master</title>
  <link rel="stylesheet" href="/TruckMaster.css">
  <link href='https://fonts.googleapis.com/css?family=DM Sans' rel='stylesheet'>
</head>
<body>
  <nav  style="font-family: 'DM Sans', sans-serif;">
    <ul>
      <li><a href="/">HOME</a></li>
      <li><a href="/tees">CARD MASTER</a></li>
      <li><a href="/truck-master" class="active">TRUCK MASTER</a></li>
      <li><a href="/about">FAN GENERATION</a></li>
      <li><a href="/contact">ENTRY BRIDGE</a></li>
    </ul>
  </nav>

  <h2 style="text-align:center;font-family: 'DM Sans', sans-serif;">TRUCK MASTER DATA</h2>

  <!-- Search Form -->
  <form method="GET" action="/truck-master" style="text-align:center; margin:20px;">
      <input style="font-family: 'DM Sans', sans-serif;" type="text" name="truck" placeholder="Enter Truck Reg No" value="${truckRegNo ?? ''}" required>
      <button style="font-family: 'DM Sans', sans-serif;" type="submit">Submit</button>
  </form>

  <div class="form-container">
    <div>
      <div class="form-group"><label>Truck Number :</label><input type="text" value="${truckData.TRUCK_REG_NO ?? ''}" readonly></div>
      <div class="form-group"><label>Owner Name :</label><input type="text" value="${truckData.OWNER_NAME ?? ''}" readonly></div>
      <div class="form-group"><label>Driver Name :</label><input type="text" value="${truckData.DRIVER_NAME ?? ''}" readonly></div>
      <div class="form-group"><label>Helper Name :</label><input type="text" value="${truckData.HELPER_NAME ?? ''}" readonly></div>
      <div class="form-group"><label>Carrier Company :</label><input type="text" value="${truckData.CARRIER_COMPANY ?? ''}" readonly></div>
      <div class="form-group"><label>TRUCK SEALING REQUIREMENT :</label><input type="text" value="${truckData.TRUCK_SEALING_REQUIREMENT ?? ''}" readonly></div>
    </div>

    <div>
      <div class="form-group"><label>Blacklist Status :</label><input type="text" value="${truckData.BLACKLIST_STATUS ?? ''}" readonly></div>
      <div class="form-group"><label>Reason For Blacklist :</label><input type="text" value="${truckData.REASON_FOR_BLACKLIST ?? ''}" readonly></div>
      <div class="form-group"><label>Safety Cer. Valid Upto :</label><input type="text" value="${truckData.SAFETY_CERTIFICATION_NO ?? ''}" readonly></div>
      <div class="form-group"><label>Calibration Cer. Valid Upto :</label><input type="text" value="${truckData.CALIBRATION_CERTIFICATION_NO ?? ''}" readonly></div>
      <div class="form-group"><label>Tare Weight :</label><input type="text" value="${truckData.TARE_WEIGHT ?? ''}" readonly></div>
      <div class="form-group"><label>Max Weight :</label><input type="text" value="${truckData.MAX_WEIGHT ?? ''}" readonly></div>
      <div class="form-group"><label>Max Fuel Capacity :</label><input type="text" value="${truckData.MAX_FUEL_CAPACITY ?? ''}" readonly></div>
    </div>
  </div>

  ${showInsertForm ? `
  <div class="popup" id="popup">
  <div class="popup-content">
    <button class="close-btn" onclick="document.getElementById('popup').remove()">✖</button>
    <h3>Add New Truck</h3>

    <form id="insertForm" class="popup-form">
      <div class="form-group">
        <label>Truck Number:</label>
        <input name="TRUCK_REG_NO" value="${truckRegNo}" readonly>
      </div>

      <div class="form-group">
        <label>Blacklist Status:</label>
        <input name="BLACKLIST_STATUS" placeholder="Blacklist Status" required>
      </div>

      <div class="form-group">
        <label>Owner Name:</label>
        <input name="OWNER_NAME" placeholder="Owner Name" required>
      </div>

      <div class="form-group">
        <label>Reason for Blacklist:</label>
        <input name="REASON_FOR_BLACKLIST" placeholder="Reason" required>
      </div>

      <div class="form-group">
        <label>Driver Name:</label>
        <input name="DRIVER_NAME" placeholder="Driver Name" required>
      </div>

      <div class="form-group">
        <label>Safety Cert. Valid Upto:</label>
        <input type="date" name="SAFETY_CERTIFICATION_NO" placeholder="Safety Cert No" required>
      </div>

      <div class="form-group">
        <label>Helper Name:</label>
        <input name="HELPER_NAME" placeholder="Helper Name" required>
      </div>

      <div class="form-group">
        <label>Calibration Cert. Valid Upto:</label>
        <input  type="date" name="CALIBRATION_CERTIFICATION_NO" placeholder="Calibration Cert No" required>
      </div>

      <div class="form-group">
        <label>Carrier Company:</label>
        <input name="CARRIER_COMPANY" placeholder="Carrier Company" required>
      </div>

      <div class="form-group">
        <label>Tare Weight:</label>
        <input name="TARE_WEIGHT" id="tareWeight" placeholder="Tare Weight" required>
      </div>

      <div class="form-group">
        <label>Truck Sealing Requirement:</label>
        <input name="TRUCK_SEALING_REQUIREMENT" placeholder="Sealing Requirement" required>
      </div>

      <div class="form-group">
        <label>Max Weight:</label>
        <input name="MAX_WEIGHT" id="maxWeight" placeholder="Max Weight" required>
      </div>

      <div class="form-group">
        <label>Max Fuel Capacity:</label>
        <input name="MAX_FUEL_CAPACITY" id="maxFuel" placeholder="Max Fuel" required>
      </div>

      <button style="font-family: 'DM Sans', sans-serif;" type="submit" class="submit-btn">Insert</button>
    </form>
  </div>
</div>

  ` : ''}

  <script>
    const form = document.getElementById('insertForm');
    if(form){
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        const res = await fetch('/insert-truck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if(res.ok){
          window.location.href = '/truck-master?truck=' + data.TRUCK_REG_NO;
        } else {
          alert('Error inserting data');
        }
      });
    }
  </script>

  <script>
   const tareInput = document.getElementById('tareWeight');
  const maxInput = document.getElementById('maxWeight');
  const fuelInput = document.getElementById('maxFuel');

  function calculateFuel() {
    const tare = parseFloat(tareInput.value) || 0;
    const max = parseFloat(maxInput.value) || 0;
    fuelInput.value = tare + max;
  }

  tareInput.addEventListener('input', calculateFuel);
  maxInput.addEventListener('input', calculateFuel);
  </script>


</body>
</html>`;

        res.send(html);
    } catch (err) {
        console.error('Error fetching truck data:', err);
        res.status(500).send('Error loading TRUCK MASTER DATA');
    }
});

// ====== INSERT TRUCK API ======
app.post('/insert-truck', express.json(), async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const data = req.body;

        await pool.request()
            .input('TRUCK_REG_NO', sql.VarChar, data.TRUCK_REG_NO)
            .input('OWNER_NAME', sql.VarChar, data.OWNER_NAME)
            .input('DRIVER_NAME', sql.VarChar, data.DRIVER_NAME)
            .input('HELPER_NAME', sql.VarChar, data.HELPER_NAME)
            .input('CARRIER_COMPANY', sql.VarChar, data.CARRIER_COMPANY)
            .input('TRUCK_SEALING_REQUIREMENT', sql.VarChar, data.TRUCK_SEALING_REQUIREMENT)
            .input('BLACKLIST_STATUS', sql.VarChar, data.BLACKLIST_STATUS)
            .input('REASON_FOR_BLACKLIST', sql.VarChar, data.REASON_FOR_BLACKLIST)
            .input('SAFETY_CERTIFICATION_NO', sql.VarChar, data.SAFETY_CERTIFICATION_NO)
            .input('CALIBRATION_CERTIFICATION_NO', sql.VarChar, data.CALIBRATION_CERTIFICATION_NO)
            .input('TARE_WEIGHT', sql.Decimal(10, 4), data.TARE_WEIGHT || 0)
            .input('MAX_WEIGHT', sql.Decimal(10, 4), data.MAX_WEIGHT || 0)
            .input('MAX_FUEL_CAPACITY', sql.Decimal(10, 4), data.MAX_FUEL_CAPACITY || 0)
            .query(`
                INSERT INTO TRUCK_MASTER (
                    TRUCK_REG_NO, OWNER_NAME, DRIVER_NAME, HELPER_NAME, CARRIER_COMPANY,
                    TRUCK_SEALING_REQUIREMENT, BLACKLIST_STATUS, REASON_FOR_BLACKLIST,
                    SAFETY_CERTIFICATION_NO, CALIBRATION_CERTIFICATION_NO,
                    TARE_WEIGHT, MAX_WEIGHT, MAX_FUEL_CAPACITY
                )
                VALUES (
                    @TRUCK_REG_NO, @OWNER_NAME, @DRIVER_NAME, @HELPER_NAME, @CARRIER_COMPANY,
                    @TRUCK_SEALING_REQUIREMENT, @BLACKLIST_STATUS, @REASON_FOR_BLACKLIST,
                    @SAFETY_CERTIFICATION_NO, @CALIBRATION_CERTIFICATION_NO,
                    @TARE_WEIGHT, @MAX_WEIGHT, @MAX_FUEL_CAPACITY
                )
            `);

        res.status(200).send('Inserted successfully');
    } catch (err) {
        console.error('Error inserting truck:', err);
        res.status(500).send('Error inserting data');
    }
});






// ====== TEES ======
app.get('/tees', async (req, res) => {
  const params = req.query;
  console.log(params);
    const msg = req.query.msg || '';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const rawSearch = req.query.search || '';
    const search = rawSearch.trim();
    const showAll = (req.query.showAll === 'on' || req.query.showAll === 'true');
    const rawSortBy = req.query.sortBy || 'CARD_NO';
    const rawOrder = (req.query.order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedSortMap = {
        'SRNO': 'CARD_NO',     // SRNO is derived; map to a real column if asked
        'CARD_NO': 'CARD_NO',
        'CARD_STATUS': 'CARD_STATUS'
    };
    const sortBy = allowedSortMap[rawSortBy] ? rawSortBy : 'CARD_NO';
    const sortColumn = allowedSortMap[sortBy];
    const order = rawOrder;

    try {
        await sql.connect(config);

        let whereClause = '';
        const requestForData = new sql.Request();
        const requestForCount = new sql.Request();
        if (search && !showAll) {
            whereClause = 'WHERE CARD_NO LIKE @search';
            const searchParam = `%${search}%`;
            requestForData.input('search', sql.VarChar, searchParam);
            requestForCount.input('search', sql.VarChar, searchParam);
        }

        let dataQuery = `
            WITH OrderedData AS (
                SELECT
                    CARD_NO,
                    CARD_STATUS,
                     ROW_NUMBER() OVER (ORDER BY TRY_CAST(CARD_NO AS INT) ${order}) AS SRNO
                FROM CARD_MASTER
                ${whereClause}
            )
            SELECT *
            FROM OrderedData
            ORDER BY SRNO
        `;
        if (!showAll) {
            dataQuery += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
        }

        const dataResult = await requestForData.query(dataQuery);
        const rows = dataResult.recordset || [];

        // Total, Active, and Block counts
const countQuery = `
    SELECT 
        COUNT(*) AS totalCount,
        SUM(CASE WHEN CARD_STATUS = 1 THEN 1 ELSE 0 END) AS activeCount,
        SUM(CASE WHEN CARD_STATUS = 0 THEN 1 ELSE 0 END) AS blockCount
    FROM CARD_MASTER
    ${whereClause}
`;
const countResult = await requestForCount.query(countQuery);

const totalRows = countResult.recordset[0].totalCount || 0;
const totalPages = showAll ? 1 : Math.max(1, Math.ceil(totalRows / limit));
const activeCount = countResult.recordset[0].activeCount || 0;
const blockCount = countResult.recordset[0].blockCount || 0;


        // Helpers for sorting links and arrows
        function nextOrderFor(colRaw) {
            if (colRaw === rawSortBy) return order === 'ASC' ? 'DESC' : 'ASC';
            return 'ASC';
        }
        function sortArrow(colRaw) {
            if (colRaw !== rawSortBy) return '';
            return order === 'ASC' ? ' ▲' : ' ▼';
        }

        const encodedSearch = encodeURIComponent(search);

        // Messages
        const msg = req.query.msg;
  let messageHTML = '';

  if (msg === 'added') messageHTML = `
<div class="Popup" id="msgPopup" style="display:flex;">
  <div class="popup-content" style="background:#d4edda; color:#155724;">
    ✅ Card added successfully!
  </div>
</div>`;

  if (msg === 'updated') messageHTML = `
<div class="Popup" id="msgPopup" style="display:flex;">
  <div class="popup-content" style="background:#fff3cd; color:#856404;">
    ✅ Card updated successfully!
  </div>
</div>`;

  if (msg === 'deleted') messageHTML = `
<div class="Popup" id="msgPopup" style="display:flex;">
  <div class="popup-content" style="background:#f8d7da; color:#721c24;">
    ✅ Selected card deleted!
  </div>
</div>`;

  if (msg === 'exists') messageHTML = `
<div class="Popup" id="msgPopup" style="display:flex;">
  <div class="popup-content" style="background:#f8d7da; color:#721c24;">
    ❌ Card already exists!
  </div>
</div>`;

const totalCardHTML = `
  <div style="margin: 10px 0; font-family:'DM Sans', sans-serif; font-weight:bold; font-size:16px;">
    Total Card No = ${totalRows} 
    <span style="color:green;">Active: ${activeCount}</span> | 
    <span style="color:red;">Block: ${blockCount}</span>
  </div>`;


        const topControls = `
<div style="width:1850px; max-width:1850px;  display:flex; justify-content:space-between; align-items:center;">
  <form method="GET" action="/tees" style="display:flex; align-items:center; gap:8px;">
  
    <input type="text" name="search" value="${escapeHtml(search)}" placeholder="Search Card No" style="padding:6px; font-family:'DM Sans', sans-serif; border-radius:10px; border:1px solid #ccc;">
    <button 
  type="submit" 
  class="btn btn-add" 
  style="font-size: 16px; font-family:'DM Sans', sans-serif; padding: 6px 12px; height: 37px; border-radius: 13px; border: none; background: #6571ff; color: #fff; font-weight: bold; cursor: pointer; width: 100px; display: flex; align-items: center; justify-content: center; gap: 6px;">
  
  <i class="fa-solid fa-magnifying-glass" style="font-size: 18px;"></i> Search
    </button>
 <a href="/tees" class="btn-reset">Refresh</a>

    <label style="display:flex; align-items:center; gap:6px; font-size:14px;">
      <input type="checkbox" name="showAll" ${showAll ? 'checked' : ''} onchange="this.form.submit()">
      Show All
    </label>
    <input type="hidden" name="sortBy" value="${escapeHtml(rawSortBy)}">
    <input type="hidden" name="order" value="${escapeHtml(order)}">
    <input type="hidden" name="limit" value="${limit}">
  </form>
  <div>
    Show
    <select onchange="window.location='/tees?page=1&limit='+this.value+'&search=${encodedSearch}&showAll=${showAll ? 'on' : ''}&sortBy=${rawSortBy}&order=${order}'" style="margin-left:6px; padding:4px; width:55px; border-radius:8px;">
      <option value="5" ${limit===5?'selected':''}>5</option>
      <option value="10" ${limit===10?'selected':''}>10</option>
      <option value="20" ${limit===20?'selected':''}>20</option>
      <option value="50" ${limit===50?'selected':''}>50</option>
    </select> rows
  </div>
</div>`;

        let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<nav>
    <ul>
    <li><a href="/">HOME</a></li>
      <li><a class="active">CARD MASTER</a></li>
      <li><a href="/truck-master">TRUCK MASTER</a></li>
      <li><a>FAN GENERATION</a></li>
      <li><a>ENTRY BRIDGE</a></li>
    </ul>
  </nav>
<title>Card Master</title>
<link href='https://fonts.googleapis.com/css?family=DM Sans' rel='stylesheet'>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/Page.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css">
</head>
<body>
<script>
function closeMsgPopup() {
  const popup = document.getElementById("msgPopup");
  if (popup) popup.style.display = "none";
}

// Auto-show popup if it exists
window.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById("msgPopup");
  if (popup) popup.style.display = "flex";

    // ✅ Auto close popup after 3 seconds
    setTimeout(closeMsgPopup, 3000);

});
</script>

<script>

setTimeout(() => {
  const msgBox = document.getElementById("msgBox");
  if(msgBox) msgBox.style.display = "none";
}, 3000);
</script>


<div class="top-bar" style="padding-top:10px;">
  <h2 style="margin:0;  text-align: center;">Card Master Data</h2>
  <button 
  style="width: 130px; font-family: 'DM Sans', sans-serif; border-radius: 13px; font-size: 16px; height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px;" 
  class="btn btn-add" 
  onclick="openAddPopup()">
  
  <i class="fa-solid fa-credit-card" style="font-size: 21px;"></i> Add New
</button>
  
</div>

${messageHTML}
${totalCardHTML}
${topControls}




<!-- Delete form: added hidden inputs & confirm onsubmit -->
<form id="deleteForm" method="POST" action="/delete">
<table id="cardTable">
  <thead>
    <tr>
      <th class="select-col">Select</th>
      <th class="srno-col">Sr. No</th>
      <th class="cardno-col">
        <a href="/tees?page=1&limit=${limit}&search=${encodedSearch}&showAll=${showAll ? 'on' : ''}&sortBy=CARD_NO&order=${nextOrderFor('CARD_NO')}">
          Card No${sortArrow('CARD_NO')}
        </a>
      </th>
      <th class="status-col">
        <a href="/tees?page=1&limit=${limit}&search=${encodedSearch}&showAll=${showAll ? 'on' : ''}&sortBy=CARD_STATUS&order=${nextOrderFor('CARD_STATUS')}">
          Card Status${sortArrow('CARD_STATUS')}
        </a>
      </th>
      <th class="edit-col">Edit</th>
    </tr>
  </thead>
  <tbody>`;

        // Insert hidden inputs for query state at top of the delete form
        html = html.replace('<tbody>', `<tbody>
<input type="hidden" name="page" value="${page}">
<input type="hidden" name="limit" value="${limit}">
<input type="hidden" name="search" value="${escapeHtml(search)}">
<input type="hidden" name="sortBy" value="${escapeHtml(rawSortBy)}">
<input type="hidden" name="order" value="${escapeHtml(order)}">
<input type="hidden" name="showAll" value="${showAll}">`);

        rows.forEach((row) => {
            const statusClass = row.CARD_STATUS == 1 ? 'active' : 'block';
            const statusText = row.CARD_STATUS == 1 ? 'Active' : 'Block';
            const cardNoHtml = escapeHtml(row.CARD_NO);
            const cardNoJs = escapeJs(row.CARD_NO);
            html += `
<tr>
  <td class="select-col"><input type="checkbox" name="CARD_NO" value="${cardNoHtml}"></td>
  <td class="srno-col">${row.SRNO}</td>
  <td class="cardno-col">${cardNoHtml}</td>
  <td class="status-col status ${statusClass}">${statusText}</td>
  <td class="edit-col">
    <button  
  type="button" 
  class="btn btn-edit" 
  style="background-color: #e5e8ed; margin-left: 50px; color: black; height: 35px; font-size: 16px; width: 110px; display: flex; align-items: center; justify-content: center; gap: 6px; border: none; border-radius: 8px; cursor: pointer;"
  onclick="openEditPopup('${cardNoJs}', '${row.CARD_STATUS}')">
  
  <i class="fa-solid fa-pencil"></i> Edit
</button>

  </td>
</tr>`;
        });
        // ✅ Add this check AFTER the loop
if (rows.length === 0) {
    html += `
<tr>
  <td colspan="5" style="text-align:center; padding:12px; font-weight:bold; font-family:'DM Sans', sans-serif;">
    ❌ No data found
  </td>
</tr>`;
}

        html += `
  </tbody>
</table>
<div class="delete-bottom">


 <button 
  type="button"
  onclick="openDeletePopup()"
  class="btn btn-delete"
  style="border-radius: 13px; font-family:'DM Sans', sans-serif;font-size: 16px; width: 100px; height: 37px; display: flex; align-items: center; justify-content: center; gap: 6px; background: #ff4d4d; color: #fff; border: none; cursor: pointer;">
  <i class="fa-solid fa-trash" style="font-size: 18px;"></i> Delete
</button>


</div>
</form>`;

        if (!showAll) {
            html += `<div style="width:100%; margin:12px 0; text-align:center;">`;
            if (page > 1) {
                html += `<a href="/tees?page=${page-1}&limit=${limit}&search=${encodedSearch}&showAll=${showAll ? 'on' : ''}&sortBy=${rawSortBy}&order=${order}" style="margin-right:10px;">◀ Previous</a>`;
            }
            html += ` Page ${page} of ${totalPages} `;
            if (page < totalPages) {
                html += `<a href="/tees?page=${page+1}&limit=${limit}&search=${encodedSearch}&showAll=${showAll ? 'on' : ''}&sortBy=${rawSortBy}&order=${order}" style="margin-left:10px;" >Next ▶</a>`;
            }
            html += `</div>`;
        }

        // Popups (Add/Edit) - added hidden inputs inside both forms to preserve state
        html += `

  

<div id="addPopup" class="popup" style="font-family: 'DM Sans', sans-serif;">
  <div class="popup-content">
    <h3>Add / Manage Card</h3>
    <form method="POST" action="/insert" id="addCardForm">
      <input type="hidden" name="page" value="${page}">
      <input type="hidden" name="limit" value="${limit}">
      <input type="hidden" name="search" value="${escapeHtml(search)}">
      <input type="hidden" name="sortBy" value="${escapeHtml(rawSortBy)}">
      <input type="hidden" name="order" value="${escapeHtml(order)}">
      <input type="hidden" name="showAll" value="${showAll}">

      <label>Card No:</label><br>
      <input id="CARD_NO" type="text" name="CARD_NO"
        style="width:80%; padding:8px; margin:8px 0;" required><br>

      <label>Card Status:</label><br>
      <select name="CARD_STATUS" class="status-dropdown"
        style="width:80%; padding:8px; margin:8px 0;" required>
        <option value="1">Active</option>
        <option value="0">Block</option>
      </select><br>

      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <!-- Submit button -->
        <button type="submit" style="font-family: 'DM Sans', sans-serif;" class="btn btn-add">Submit</button>

        <!-- Delete button -->
        <button type="button" class="btn btn-delete"
          style="background:#ff4d4d; font-family: 'DM Sans', sans-serif; color:#fff; border:none; border-radius:13px; padding:8px 16px; cursor:pointer;"
          onclick="deleteCardFromPopup()">
          <i class="fa-solid fa-trash" style="margin-right:6px;"></i> Delete
        </button>

         <!-- Edit button -->
        <button type="button" class="btn btn-edit"
          style="background:#ffc107; font-family: 'DM Sans', sans-serif; color:#fff; border:none; border-radius:13px; padding:8px 16px; cursor:pointer;"
          onclick="editCardFromPopup()">
          <i class="fa-solid fa-pen-to-square" style="margin-right:6px;"></i> Edit
        </button>

        <!-- Cancel button -->
        <button type="button" class="btn" style="font-family: 'DM Sans', sans-serif;" onclick="closeAddPopup()">Cancel</button>
      </div>
    </form>
  </div>
</div>


<div id="editPopup" class="popup">
  <div class="popup-content">
    <h3>Edit Card</h3>
    <form method="POST" action="/update">
      <input type="hidden" name="page" value="${page}">
      <input type="hidden" name="limit" value="${limit}">
      <input type="hidden" name="search" value="${escapeHtml(search)}">
      <input type="hidden" name="sortBy" value="${escapeHtml(rawSortBy)}">
      <input type="hidden" name="order" value="${escapeHtml(order)}">
      <input type="hidden" name="showAll" value="${showAll}">
      <input type="hidden" name="CARD_NO" id="edit_CARD_NO">
      <label>Card No:</label><br>
      <input type="text" name="NEW_CARD_NO" id="edit_NEW_CARD_NO" style="width:80%; padding:8px; margin:8px 0;" readonly><br>
      <label>Card Status:</label><br>
      <select name="CARD_STATUS" id="edit_CARD_STATUS" style="width:80%; padding:8px; margin:8px 0;" required>
        <option value="1">Active</option>
        <option value="0">Block</option>
      </select><br>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button style="font-family: 'DM Sans', sans-serif;" type="submit" class="btn btn-edit">Update</button>
        <button style="font-family: 'DM Sans', sans-serif;" type="button" class="btn" onclick="closeEditPopup()">Cancel</button>
      </div>
    </form>
  </div>
</div>

<!-- Delete Popup -->
<div id="deletePopup" class="popup" style="display: none;">
  <div class="popup-content">
    <h3>⚠️ Confirm Deletion</h3>
    <p>Are you sure you want to delete the selected card(s)?</p>
    <div style="margin-top: 15px; display: flex; justify-content: center; gap: 10px;">
      <button onclick="submitDelete()" style="background: red;font-family: 'DM Sans', sans-serif; color: white; padding: 8px 16px; border-radius: 6px;">Yes, Delete</button>
      <button onclick="closeDeletePopup()" style="background: gray;font-family: 'DM Sans', sans-serif; color: white; padding: 8px 16px; border-radius: 6px;">Cancel</button>
    </div>
  </div>
</div>
<div id="no-selection-popup" class="popup-modal" style="display:none;">
  <div class="popup-content">
    <p>Please select at least one card to delete.</p>
    <button style="font-family: 'DM Sans', sans-serif;" onclick="closeNoSelectionPopup()">OK</button>
  </div>
</div>

<!-- Add this CONFIRM DELETE POPUP anywhere inside <body> -->
<div id="confirmDeletePopup" class="popup" style="display:none;">
  <div class="popup-content" style="max-width: 350px; text-align:center;">
    <div style="font-size:24px; color:#ff9800;">⚠️</div>
    <h3 style="margin:8px 0; color:#1e3a8a;">Confirm Deletion</h3>
    <p id="confirmMessage" style="margin:10px 0;">Are you sure you want to delete the selected card(s)?</p>
    <div style="display:flex; justify-content:center; gap:10px; margin-top:12px;">
      <button id="confirmYes" style="background:#ff4d4d; font-family: 'DM Sans', sans-serif; color:#fff; border:none; border-radius:10px; padding:8px 16px; cursor:pointer;">
        Yes, Delete
      </button>
      <button id="confirmNo" style="background:#ccc;font-family: 'DM Sans', sans-serif; color:#333; border:none; border-radius:10px; padding:8px 16px; cursor:pointer;">
        Cancel
      </button>
    </div>
  </div>
</div>



<script>
 // Delete Popup
function openDeletePopup() {
  const checkboxes = document.querySelectorAll('input[name="CARD_NO"]:checked');
  if (checkboxes.length === 0) {
  // Show your modal popup instead of alert
  const popup = document.getElementById("no-selection-popup");
  if (popup) {
    popup.style.display = "block";
  }
  return;
}

  document.getElementById('deletePopup').style.display = 'flex';
}

function closeDeletePopup() {
  document.getElementById('deletePopup').style.display = 'none';
}
function closeNoSelectionPopup() {
  document.getElementById("no-selection-popup").style.display = "none";
}


function submitDelete() {
  document.getElementById('deleteForm').submit();
}
function openAddPopup() { document.getElementById('addPopup').style.display = 'flex'; }
function closeAddPopup() { document.getElementById('addPopup').style.display = 'none'; }
function openEditPopup(cardNo, status) {
  document.getElementById('editPopup').style.display = 'flex';
  document.getElementById('edit_CARD_NO').value = cardNo;
  document.getElementById('edit_NEW_CARD_NO').value = cardNo;
  document.getElementById('edit_CARD_STATUS').value = status;
}
function closeEditPopup() { document.getElementById('editPopup').style.display = 'none'; }


(function () {
    // Get query parameters
    const params = new URLSearchParams(window.location.search);

    // Read CARD_NO from query string
    const cardNo = params.get('CARD_NO');

    // If CARD_NO exists, set it in input field
    if (cardNo) {
      const cardInput = document.getElementById('CARD_NO');
      if (cardInput) {
        cardInput.value = cardNo;
      } else {
        console.warn('Input with id="CARD_NO" not found.');
      }
    }
  })();
  
</script>

<script>
function openConfirmPopup(message, onConfirm) {
  var popup = document.getElementById("confirmDeletePopup");
  var msg = document.getElementById("confirmMessage");
  var yesBtn = document.getElementById("confirmYes");
  var noBtn = document.getElementById("confirmNo");

  msg.textContent = message;
  popup.style.display = "flex";

  // Remove old listeners (avoid multiple triggers)
  var newYesBtn = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);

  var newNoBtn = noBtn.cloneNode(true);
  noBtn.parentNode.replaceChild(newNoBtn, noBtn);

  // Add fresh listeners
  newYesBtn.addEventListener("click", function () {
    popup.style.display = "none";
    onConfirm();
  });

  newNoBtn.addEventListener("click", function () {
    popup.style.display = "none";
  });
}


//Delete Card on AddPopup
function deleteCardFromPopup() {
  var input = document.getElementById('CARD_NO');
  if (!input) {
    alert("CARD_NO field not found!");
    return;
  }

  var cardNo = input.value.trim();
  if (!cardNo) {
    alert("Please enter a Card No to delete.");
    return;
  }

  openConfirmPopup("Are you sure you want to delete Card No: " + cardNo + "?", function () {
    fetch('/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: "CARD_NO=" + encodeURIComponent(cardNo)
    })
    .then(function (response) {
      if (!response.ok) return response.text().then(function (err) { throw new Error(err); });
      window.location.reload();
    })
    .catch(function (err) {
      console.error('Error deleting card:', err);
      alert("Failed to delete card: " + err.message);
    });
  });
}


//Update Card in AddPopup
async function editCardFromPopup() {
  const cardNoInput = document.getElementById('CARD_NO');
  const statusSelect = document.querySelector('select[name="CARD_STATUS"]');

  if (!cardNoInput || !statusSelect) {
    alert("❌ Required fields not found.");
    return;
  }

  const cardNo = cardNoInput.value.trim();
  const cardStatus = statusSelect.value;

  if (!cardNo) {
    alert("Please enter a Card No to edit.");
    return;
  }

  try {
    const body = new URLSearchParams({
      CARD_NO: cardNo,
      NEW_CARD_NO: cardNo,     // send new value expected by server
      CARD_STATUS: cardStatus
    }).toString();

    const response = await fetch('/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    if (response.redirected) {
      window.location.href = response.url;
    } else {
      const result = await response.text();
      alert(result);
      if (response.ok) {
        closeAddPopup();
        window.location.reload();
      }
    }
  } catch (err) {
    console.error('Edit Error:', err);
    alert('❌ Error updating card.');
  }
}



</script>






</body>
</html>`;

        res.send(html);
    } catch (err) {
        console.error(err);
        res.status(500).send('❌ Error: ' + err.message);
    } finally {
        try { await sql.close(); } catch (e) {}
    }
});

// ====== Insert (duplicate check) ======
app.post('/insert', async (req, res) => {
    const { CARD_NO, CARD_STATUS } = req.body;
    const redirectParams = buildRedirectQuery(req.body);
    if (!CARD_NO) return res.redirect('/tees' + redirectParams);
    try {
        await sql.connect(config);
        const reqDB = new sql.Request();

        reqDB.input('card', sql.VarChar, CARD_NO);
        const checkResult = await reqDB.query('SELECT COUNT(*) AS cnt FROM CARD_MASTER WHERE CARD_NO = @card');
        const exists = checkResult.recordset[0].cnt > 0;

        if (exists) {
            return res.redirect('/tees' + redirectParams + '&msg=exists');
        }

        reqDB.input('status', sql.Int, parseInt(CARD_STATUS || 0));
        await reqDB.query('INSERT INTO CARD_MASTER (CARD_NO, CARD_STATUS) VALUES (@card, @status)');
        res.redirect('/tees' + redirectParams + '&msg=added');
    } catch (err) {
        console.error(err);
        res.status(500).send('❌ Insert Error: ' + err.message);
    } finally {
        try { await sql.close(); } catch (e) {}
    }
});

// ====== Update ======
app.post('/update', async (req, res) => {
    const { CARD_NO, NEW_CARD_NO, CARD_STATUS } = req.body;
    const redirectParams = buildRedirectQuery(req.body);
    if (!CARD_NO || !NEW_CARD_NO) return res.redirect('/tees' + redirectParams);
    try {
        await sql.connect(config);
        const reqDB = new sql.Request();
        reqDB.input('newCard', sql.VarChar, NEW_CARD_NO);
        reqDB.input('status', sql.Int, parseInt(CARD_STATUS || 0));
        reqDB.input('oldCard', sql.VarChar, CARD_NO);
        await reqDB.query('UPDATE CARD_MASTER SET CARD_NO = @newCard, CARD_STATUS = @status WHERE CARD_NO = @oldCard');
        res.redirect('/tees' + redirectParams + '&msg=updated');
    } catch (err) {
        console.error(err);
        res.status(500).send('❌ Update Error: ' + err.message);
    } finally {
        try { await sql.close(); } catch (e) {}
    }
});

// ====== Delete ======
app.post('/delete', async (req, res) => {
    const redirectParams = buildRedirectQuery(req.body);
    try {
        let cardNos = req.body.CARD_NO;
        if (!cardNos) return res.redirect('/tees' + redirectParams);
        if (!Array.isArray(cardNos)) cardNos = [cardNos];

        await sql.connect(config);
        const reqDB = new sql.Request();

        for (const cn of cardNos) {
            reqDB.input('cn', sql.VarChar, cn);
            await reqDB.query('DELETE FROM CARD_MASTER WHERE CARD_NO = @cn');
            reqDB.parameters = {};
        }
        res.redirect('/tees' + redirectParams + '&msg=deleted');
    } catch (err) {
        console.error(err);
        res.status(500).send('❌ Delete Error: ' + err.message);
    } finally {
        try { await sql.close(); } catch (e) {}
    }
});
const PORT = 3000; // use a different port for HTTPS
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

const httpsOptions = {
  key: pems.private,
  cert: pems.cert
};



// ====== Start Server ======
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`✅ HTTPS Server running at https://localhost:${PORT}`);
});

