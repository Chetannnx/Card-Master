const express = require('express');
const sql = require('mssql/msnodesqlv8');

const app = express(); // ✅ DON'T MISS THIS LINE!

const config = {
    server: 'DESKTOP-EQ55Q8H\\SQLEXPRESS',
    database: 'OP',
    driver: 'msnodesqlv8',
    options: {
        trustedConnection: true
    }
};

app.get('/', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT* FROM CARD_MASTER'); // Replace with real table name
        await sql.close();

        let data = result.recordset;

        // Start building HTML table
        //let html = "<h2>SQL Table Data</h2>";
        
        //html += "<table border='1' cellpadding='5' cellspacing='0'><thead><tr>";
       let html = `<!DOCTYPE html>
<html>
<head>
    <title>CARD MASTER</title>
    <style>
        table {
            width: 100%;
            border-collapse: collapse;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            background: #fff;
        }
        th, td {
            padding : 12px 15px;
            border: 1px solid  #ddd;
        }
        h2{
            color:red;
        }

    </style>
</head>
<body>
    <h2>SQL Table Data</h2>
    <table>
        <!-- table rows go here -->
    </table>
</body>
</html>`;




        // Create table headers dynamically from keys of first record
        if (data.length > 0) {
            Object.keys(data[0]).forEach(column => {
                html += `<th>${column}</th>`;
            });
            html += "</tr></thead><tbody>";

            // Add table rows
            data.forEach(row => {
                html += "<tr>";
                Object.values(row).forEach(value => {
                    html += `<td>${value}</td>`;
                });
                html += "</tr>";
            });
        } else {
            html += "<th>No Data Found</th></tr></thead><tbody>";
        }

        html += `
                </tbody>
            </table>
        </body>
        </html>`;

        // Send HTML response
        res.set('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        res.status(500).send('❌ Error: ' + err.message);
    }
});

app.listen(3000, () => {
    console.log('🌐 Server running at http://localhost:3000');
});
