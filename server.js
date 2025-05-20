const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});