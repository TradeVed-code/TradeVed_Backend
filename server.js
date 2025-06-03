const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 5000; // Changed port to 5000

app.use(cors());
app.use(express.json());

// Setup SQLite database
const db = new sqlite3.Database('./waitlist.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS waitlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT UNIQUE,
          experience TEXT
        )`);
    }
});

// POST API to add to waitlist
app.post('/api/waitlist', (req, res) => {
    console.log('POST /api/waitlist called with:', req.body); // Debug log

    const { name, email, phone, experience } = req.body;

    if (!name || !email) {
        return res.status(400).json({ message: 'Name and email are required.' });
    }

    // Insert data into SQLite with UNIQUE constraints on email and phone
    const query = `INSERT INTO waitlist (name, email, phone, experience) VALUES (?, ?, ?, ?)`;

    db.run(query, [name, email, phone, experience], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'User with this email or phone already exists in waitlist' });
            }
            return res.status(500).json({ message: 'Database error: ' + err.message });
        }
        res.status(200).json({ message: 'Successfully added to waitlist', id: this.lastID });
    });
});

// GET API to export waitlist as Excel file
app.get('/api/waitlist/export', (req, res) => {
    const query = `SELECT * FROM waitlist`;

    db.all(query, [], async(err, rows) => {
        if (err) {
            return res.status(500).json({ message: 'Database error: ' + err.message });
        }

        // Create a new Excel workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Waitlist');

        // Define columns headers
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Experience', key: 'experience', width: 30 },
        ];

        // Add rows from DB to worksheet
        rows.forEach(row => {
            worksheet.addRow(row);
        });

        // Set HTTP headers for file download
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="waitlist.xlsx"'
        );

        // Write workbook to response stream
        await workbook.xlsx.write(res);

        res.end();
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
