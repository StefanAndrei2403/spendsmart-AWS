const express = require('express');
const { Pool } = require('pg'); // Importă driverul pentru PostgreSQL
const cors = require('cors');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library'); // Adaugă clientul Google
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const path = require('path');
const auth = require('./middleware/auth');


// Încarcă variabilele din fișierul .env
dotenv.config({ path: './.env' });

const app = express();
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', 'https://white-hill-07c276010.6.azurestaticapps.net', 'https://spendsmart-fubpc6d9cagyaya9.westeurope-01.azurewebsites.net', 'http://localhost:8080'],
  methods: 'GET,POST,PUT,DELETE, OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
  exposedHeaders: ['Authorization', 'Set-Cookie'],
  sameSite: 'None',
  secure: false,
}));


// Crează conexiunea la baza de date PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Verifică conexiunea la baza de date
pool.connect((err, client, release) => {
  if (err) {
    console.error('Eroare la conexiune: ' + err.stack);
    return;
  }
  console.log('Conexiune reușită la baza de date PostgreSQL');
  release();
});

// Configurează clientul Google
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Endpoint de login tradițional
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username și parola sunt necesare' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilizator inexistent' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Parolă incorectă' });
    }

    // Generează token JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log("✅ Token generat:", token);  // 🔍 Log pentru debugging
    console.log("🔑 JWT_SECRET folosit:", process.env.JWT_SECRET); // 🔎 Verificare secret

    // Salvează token-ul în baza de date
    await pool.query(
      'INSERT INTO user_tokens (user_id, token) VALUES ($1, $2)',
      [user.id, token]
    );

    // Configurează răspunsul
    const responseData = {
      message: 'Autentificare reușită',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };

    // Setează cookie-ul doar pentru browser
    res
      .cookie('auth_token', token, {
        httpOnly: true,
        sameSite: 'None',
        maxAge: 3600000, // 1 oră
      })
      .header('Authorization', `Bearer ${token}`)
      .status(200)
      .json(responseData);

  } catch (err) {
    console.error('Eroare la login:', err);
    res.status(500).json({ message: 'Eroare la server' });
  }
});


// Endpoint de înregistrare 
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  console.log('📤 Cerere primită pentru înregistrare:', req.body); // Debugging

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Toate câmpurile sunt necesare' });
  }

  try {
    // Verifică dacă există deja un utilizator cu același username sau email
    const existingUser = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Username sau email deja utilizat' });
    }

    // Criptează parola
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Adaugă utilizatorul în baza de date
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    console.log('✅ Utilizator înregistrat cu succes:', result.rows[0]); // Debugging

    res.status(201).json({
      message: 'Utilizator înregistrat cu succes',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('🔥 Eroare la înregistrare:', err);
    res.status(500).json({ message: 'Eroare la server' });
  }
});

// Endpoint pentru autentificarea cu Google
app.post('/google-login', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Token Google este necesar' });
  }

  try {
    // Verifică token-ul Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,  // Adaugă GOOGLE_CLIENT_ID în fișierul .env
    });
    const payload = ticket.getPayload();
    console.log('Google User:', payload);

    // Aici poți să creezi un utilizator nou sau să îl loghezi pe cel existent
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [payload.email]);
    let user = result.rows[0];
    if (!user) {
      // Crează un nou utilizator fără parolă
      const insertResult = await pool.query('INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, username, email', [payload.name, payload.email]);
      user = insertResult.rows[0];
    }

    // Generare parolă temporară
    const generateRandomPassword = () => {
      return crypto.randomBytes(8).toString('hex'); // Generează o parolă de 16 caractere
    };

    const randomPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Actualizează parola utilizatorului cu parola temporară
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Generare token JWT
    const tokenJWT = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Setează token-ul JWT în cookie
    res.cookie('auth_token', tokenJWT, {
      httpOnly: true,
      sameSite: 'None',  // Pentru a permite cookie-urile cross-site (dacă aplicația ta are frontend pe un domeniu diferit)
      secure: false,      // Asigură-te că folosești HTTPS
      maxAge: 3600000,   // Valabilitatea cookie-ului (1 oră)
    });

    // Trimite token-ul JWT și în răspuns
    res.status(200).json({ token: tokenJWT });

    // Trimite parola generată pe email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: payload.email,
      subject: 'Bine ai venit! Parola ta temporară',
      text: `Parola ta temporară este: ${randomPassword}. Te rugăm să o schimbi din setările contului.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Eroare la trimiterea emailului:', error);
        return res.status(500).json({ message: 'Eroare la trimiterea emailului' });
      }
      console.log("Trimit email la:", payload.email, "cu parola:", randomPassword);
    });

  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(500).json({ message: 'Eroare la autentificare Google' });
  }
});


// Middleware pentru verificarea autentificării
const verifyToken = (req, res, next) => {
  // Extrage token-ul din Authorization header
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: 'Nu ai un token valid' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token invalid sau expirat' });
    }

    req.user = decoded;
    next();
  });
};

// Endpoint protejat - exemplu
app.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.userId;  // `auth` middleware-ul adaugă `userId` în req

    if (!userId) {
      return res.status(400).json({ message: 'ID-ul utilizatorului nu este valid' });
    }

    // Interoghează baza de date pentru a obține informațiile utilizatorului
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (user) {
      // Dacă utilizatorul există în baza de date, returnează informațiile
      res.status(200).json({
        message: 'Acces permis',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } else {
      // Dacă utilizatorul nu a fost găsit
      res.status(404).json({ message: 'Utilizatorul nu a fost găsit' });
    }
  } catch (error) {
    console.error('Eroare la obținerea profilului:', error);
    res.status(500).json({ message: 'Eroare server' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Serverul rulează pe portul ${PORT}`);
});

// Configurare Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // Sau ce serviciu SMTP folosești
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Eroare Nodemailer:', error); // Detalii despre eroare de conexiune
  } else {
    console.log('Conexiune Nodemailer reușită');
  }
});

// Endpoint pentru recuperarea parolei după username
app.post('/recover-password-username', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username-ul este necesar' });
  }

  try {
    // Căutăm utilizatorul în baza de date
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilizator inexistent' });
    }

    const user = result.rows[0];
    console.log('Utilizator găsit:', user);

    // Generează un token unic pentru resetarea parolei
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = Math.floor(Date.now() / 1000) + 3600; // Expiră după 1 oră (în secunde)

    // Salvează token-ul în baza de date cu expirarea sa
    await pool.query('UPDATE users SET reset_token = $1, reset_token_expiration = $2 WHERE username = $3', [resetToken, tokenExpiration, username]);

    // Trimite email cu link-ul de resetare a parolei
    const resetLink = `http://localhost:8080/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Recuperare Parola',
      text: `Am primit cererea ta de resetare a parolei. Poți să-ți resetezi parola accesând următorul link: ${resetLink}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Eroare la trimiterea emailului:', error);
        return res.status(500).json({ message: 'Eroare la trimiterea emailului' });
      }
      res.status(200).json({ message: 'Email trimis cu succes!' });
    });

  } catch (error) {
    console.error('Eroare server:', error);
    res.status(500).json({ message: 'Eroare la server' });
  }
});

app.post('/recover-password-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email-ul este necesar' });
  }

  try {
    // Căutăm utilizatorul în baza de date după email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilizator inexistent' });
    }

    const user = result.rows[0];
    console.log('Utilizator găsit:', user);

    // Generează un token unic pentru resetarea parolei
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiration = Math.floor(Date.now() / 1000) + 3600; // Expiră după 1 oră (în secunde)

    // Salvează token-ul în baza de date cu expirarea sa
    await pool.query('UPDATE users SET reset_token = $1, reset_token_expiration = $2 WHERE email = $3', [resetToken, tokenExpiration, email]);

    // Trimite email cu link-ul de resetare a parolei
    const resetLink = `http://localhost:8080/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Recuperare Parola',
      text: `Am primit cererea ta de resetare a parolei. Poți să-ți resetezi parola accesând următorul link: ${resetLink}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Eroare la trimiterea emailului:', error);
        return res.status(500).json({ message: 'Eroare la trimiterea emailului' });
      }
      res.status(200).json({ message: 'Email trimis cu succes!' });
    });

  } catch (error) {
    console.error('Eroare server:', error);
    res.status(500).json({ message: 'Eroare la server' });
  }
});

// Endpoint pentru resetarea parolei cu token-ul generat
app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token-ul și parola nouă sunt necesare' });
  }

  try {
    // Verificăm dacă token-ul există și dacă nu a expirat
    const result = await pool.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiration > $2', [token, Math.floor(Date.now() / 1000)]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Token invalid sau expirat' });
    }

    const user = result.rows[0];

    // Criptează noua parolă
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizează parola în baza de date
    await pool.query('UPDATE users SET password = $1, reset_token = NULL, reset_token_expiration = NULL WHERE id = $2', [hashedPassword, user.id]);

    res.status(200).json({ message: 'Parola a fost resetată cu succes' });

  } catch (error) {
    console.error('Eroare la resetarea parolei:', error);
    res.status(500).json({ message: 'Eroare la server' });
  }
});

const handleGoogleLoginSuccess = async (req, res) => {
  const token = req.body.token; // Token-ul Google primit din frontend
  try {
    const ticket = await google.auth.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // Căutăm utilizatorul în baza de date
    let user = await User.findOne({ where: { google_id: googleId } });

    // Dacă utilizatorul nu există, îl adăugăm
    if (!user) {
      user = await User.create({
        google_id: googleId,
        email,
        name,
        profile_picture: picture,
      });
    }

    // Trimite un răspuns cu datele utilizatorului (sau un token de autentificare)
    res.status(200).json({ token: 'some-jwt-token-here' });

  } catch (error) {
    res.status(500).json({ error: 'Eroare la autentificare cu Google.' });
  }

};
// Endpoint pentru adăugarea veniturilor, economiilor și bugetului lunar
app.post('/add-income', verifyToken, async (req, res) => {
  const { income, savings, monthlyBudget } = req.body;
  const userId = req.user.id;

  if (!income || !savings || !monthlyBudget) {
    return res.status(400).json({ message: 'Toate câmpurile sunt necesare' });
  }

  try {
    // Adăugăm datele în baza de date
    await pool.query(
      'INSERT INTO finances (user_id, income, savings, monthly_budget) VALUES ($1, $2, $3, $4)',
      [userId, income, savings, monthlyBudget]
    );
    res.status(201).json({ message: 'Datele au fost adăugate cu succes' });
  } catch (err) {
    console.error('Eroare la adăugarea veniturilor:', err);
    res.status(500).json({ message: 'Eroare la server' });
  }
});
// Endpoint pentru obținerea veniturilor, economiilor și bugetului lunar
app.get('/get-financials', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Căutăm datele financiare în baza de date
    const result = await pool.query(
      'SELECT * FROM finances WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nu există date financiare pentru acest utilizator' });
    }

    res.status(200).json({ financials: result.rows[0] });
  } catch (err) {
    console.error('Eroare la recuperarea datelor financiare:', err);
    res.status(500).json({ message: 'Eroare la server' });
  }
});


app.post('/logout', verifyToken, async (req, res) => {
  const token = req.cookies['auth_token'];

  // Șterge token-ul din baza de date
  await pool.query('DELETE FROM user_tokens WHERE token = $1', [token]);

  // Șterge cookie-ul
  res.clearCookie('auth_token');

  res.status(200).send('Logged out successfully');
});

app.get('/verify-token', (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Nu ești autentificat' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token invalid sau expirat' });
    }
    return res.status(200).json({ message: 'Autentificat cu succes' });
  });
});

app.post('/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  console.log("🔍 Headers primite:", req.headers); // 🟢 Debug

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log("❌ Token lipsă sau format invalid");
    return res.status(401).json({ message: 'Token missing or invalid' });
  }

  const token = authHeader.split(' ')[1]; // Extrage token-ul din header
  console.log("📜 Token extras:", token); // 🟢 Debug

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("❌ Eroare la verificare:", err.message); // 🟢 Debug
      return res.status(401).json({ message: 'Invalid token' });
    }

    console.log("✅ Token valid, utilizator:", decoded); // 🟢 Debug
    res.json({ isValid: true, user: decoded });

    console.log("🔑 JWT_SECRET folosit la verificare:", process.env.JWT_SECRET);
  });
});


const deleteExpiredTokens = async () => {
  try {
    const expirationTime = Math.floor(Date.now() / 1000) - 3600; // Cu 1 oră în urmă
    await pool.query('DELETE FROM user_tokens WHERE created_at < TO_TIMESTAMP($1)', [expirationTime]);
    console.log('✔ Token-urile expirate au fost șterse.');
  } catch (error) {
    console.error('❌ Eroare la ștergerea token-urilor expirate:', error);
  }
};
setInterval(deleteExpiredTokens, 10 * 60 * 1000); // Rulează la fiecare 10 minute

app.get('/api/protected-route', (req, res) => {
  try {
    console.log("Headers received:", req.headers);
    const token = req.headers.authorization?.split(" ")[1]; // Extrage doar token-ul
    console.log("Token primit:", token);

    if (!token) {
      return res.status(401).json({ message: "Token lipsă" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token decodat:", decoded);

    res.json({ message: "Acces permis", user: decoded });
  } catch (error) {
    console.error("❌ Token invalid:", error.message);
    res.status(401).json({ message: "Token invalid" });
  }
});

// Aplicarea middleware-ului pe rutele care necesită autentificare
app.use('/protected', auth, (req, res) => {
  res.status(200).json({
    message: 'Acces permis',
    user: req.user, // Poți accesa obiectul user din middleware
  });
});

// Endpoint pentru adăugarea unei categorii
app.post('/categories', verifyToken, async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;

  if (!name || !description) {
    return res.status(400).json({ message: 'Numele și descrierea sunt necesare' });
  }

  try {
    // Adaugă categoria în baza de date
    const result = await pool.query(
      'INSERT INTO expenses_categories (user_id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description',
      [userId, name, description]
    );

    res.status(201).json({
      message: 'Categorie adăugată cu succes',
      category: result.rows[0]
    });
  } catch (err) {
    console.error('Eroare la adăugarea categoriei:', err);
    res.status(500).json({ message: 'Eroare la server' });
  }
});

// Endpoint pentru obținerea categoriilor unui utilizator
app.get('/categories', verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Obține categoriile din baza de date
    const result = await pool.query(
      'SELECT id, name, description FROM expenses_categories WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nu există categorii pentru acest utilizator' });
    }

    res.status(200).json({ categories: result.rows });
  } catch (err) {
    console.error('Eroare la obținerea categoriilor:', err);
    res.status(500).json({ message: 'Eroare la server' });
  }
});

// Endpoint pentru ștergerea unei categorii
app.delete('/categories/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    // Verifică dacă categoria există
    const result = await pool.query(
      'SELECT * FROM expenses_categories WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Categorie inexistentă' });
    }

    // Șterge categoria
    await pool.query('DELETE FROM expenses_categories WHERE id = $1', [id]);

    res.status(200).json({ message: 'Categorie ștearsă cu succes' });
  } catch (err) {
    console.error('Eroare la ștergerea categoriei:', err);
    res.status(500).json({ message: 'Eroare la server' });
  }
});

app.get('/api/categories', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses_categories');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Eroare la preluarea categoriilor' });
  }
});

app.post('/api/expenses', verifyToken, async (req, res) => {
  try {
    const { name, amount, date, category_id, user_id, planned_impulsive } = req.body;

    if (!name || !amount || !date || !category_id || !user_id) {
      return res.status(400).json({ message: 'Toate câmpurile sunt necesare!' });
    }

    // Obține numele categoriei bazat pe category_id
    const categoryQuery = `SELECT name FROM expenses_categories WHERE id = $1;`;
    const categoryResult = await pool.query(categoryQuery, [category_id]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Categoria nu există!' });
    }

    const category_name = categoryResult.rows[0].name;

    // Inserează cheltuiala cu numele categoriei
    const insertQuery = `
      INSERT INTO expenses (name, amount, date, category_id, category_name, user_id, planned_impulsive)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const insertValues = [name, amount, date, category_id, category_name, user_id, planned_impulsive];
    const insertResult = await pool.query(insertQuery, insertValues);

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error('Eroare la adăugarea cheltuielii:', error);
    res.status(500).json({ message: 'Eroare la adăugarea cheltuielii' });
  }
});

app.get('/api/get-financial-data', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();   // YYYY

    // 1️⃣ Venituri din luna curentă
    const incomeQuery = `
      SELECT COALESCE(SUM(amount), 0) AS total_income
      FROM incomes
      WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3;
    `;
    const incomeResult = await pool.query(incomeQuery, [user_id, currentMonth, currentYear]);
    const income = incomeResult.rows[0].total_income;

    // 2️⃣ Cheltuieli din luna curentă
    const expensesQuery = `
      SELECT e.name, e.amount, e.date
      FROM expenses e
      WHERE e.user_id = $1
        AND EXTRACT(MONTH FROM e.date) = $2
        AND EXTRACT(YEAR FROM e.date) = $3;
    `;
    const expensesResult = await pool.query(expensesQuery, [user_id, currentMonth, currentYear]);
    const expenses = expensesResult.rows;

    // 3️⃣ Buget lunar (deja filtrat corect)
    const budgetQuery = `
      SELECT COALESCE(amount, 0) AS monthly_budget
      FROM monthly_budget
      WHERE user_id = $1 AND month = $2 AND year = $3;
    `;
    const budgetResult = await pool.query(budgetQuery, [user_id, currentMonth, currentYear]);
    const monthly_budget = budgetResult.rows.length > 0 ? budgetResult.rows[0].monthly_budget : 0;

    res.json({
      income,
      expenses,
      monthly_budget
    });
  } catch (error) {
    console.error('Eroare la obținerea datelor financiare:', error);
    res.status(500).json({ message: 'Eroare la obținerea datelor financiare' });
  }
});

app.get('/api/expenses', verifyToken, async (req, res) => {
  try {
    let { user_id, month, year } = req.query;

    // Asigură-te că user_id este valid
    if (!user_id) {
      return res.status(400).json({ message: 'User ID este necesar' });
    }

    // Log pentru a vedea valorile parametrilor
    console.log('Parametri de intrare:', { user_id, month, year });

    // Convertește month și year în numere
    month = month ? parseInt(month) : null;
    year = year ? parseInt(year) : null;

    // Pregătește interogarea
    let query = `SELECT * FROM expenses WHERE user_id = $1`;
    const queryParams = [user_id];

    if (month) {
      // Validăm și adăugăm parametrii pentru lună
      if (isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: 'Luna trebuie să fie între 1 și 12' });
      }
      query += ` AND EXTRACT(MONTH FROM date) = $2`;
      queryParams.push(month);
    }

    if (year) {
      // Validăm și adăugăm parametrii pentru anul
      if (isNaN(year) || year.toString().length !== 4) {
        return res.status(400).json({ message: 'Anul trebuie să fie valid' });
      }
      query += ` AND EXTRACT(YEAR FROM date) = $3`;
      queryParams.push(year);
    }

    console.log('Interogare finală:', query);
    console.log('Parametri interogare:', queryParams);

    // Execută interogarea
    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nu există cheltuieli în luna și anul selectat' });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Eroare la obținerea cheltuielilor:', error);
    res.status(500).json({ message: 'Eroare la obținerea cheltuielilor' });
  }
});

app.put('/api/expenses/:id', verifyToken, async (req, res) => {
  try {
    const expenseId = req.params.id;
    const user_id = req.user.id;

    const { name, amount, date, category_id, planned_impulsive } = req.body;

    const updateQuery = `
      UPDATE expenses
      SET name = $1, amount = $2, date = $3, category_id = $4, planned_impulsive = $5
      WHERE id = $6 AND user_id = $7
      RETURNING *;
    `;
    const values = [name, amount, date, category_id, planned_impulsive, expenseId, user_id];
    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cheltuiala nu a fost găsită sau nu aparține utilizatorului.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Eroare la actualizarea cheltuielii:', error);
    res.status(500).json({ message: 'Eroare la actualizarea cheltuielii.' });
  }
});

app.delete('/api/expenses/:id', verifyToken, async (req, res) => {
  try {
    const expenseId = req.params.id;
    const userId = req.user.id;

    const deleteQuery = `DELETE FROM expenses WHERE id = $1 AND user_id = $2`;
    await pool.query(deleteQuery, [expenseId, userId]);

    res.status(200).json({ message: 'Cheltuiala a fost ștearsă.' });
  } catch (error) {
    console.error('Eroare la ștergerea cheltuielii:', error);
    res.status(500).json({ message: 'Eroare la ștergerea cheltuielii' });
  }
});

// Adaugă venit
app.post('/api/incomes', async (req, res) => {
  const { name, amount, date, user_id } = req.body;
  try {
    const newIncome = await pool.query(
      'INSERT INTO incomes (name, amount, date, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, amount, date, user_id]
    );
    res.json(newIncome.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Eroare la adăugarea venitului');
  }
});

// Obține venituri filtrate după lună/an
app.get('/api/incomes', async (req, res) => {
  const { user_id, month, year } = req.query;
  try {
    const incomes = await pool.query(
      `SELECT * FROM incomes 
       WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3 
       ORDER BY date DESC`,
      [user_id, month, year]
    );
    res.json(incomes.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Eroare la obținerea veniturilor');
  }
});

// Editează venit
app.put('/api/incomes/:id', async (req, res) => {
  const { id } = req.params;
  const { name, amount, date } = req.body;
  try {
    await pool.query(
      'UPDATE incomes SET name = $1, amount = $2, date = $3 WHERE id = $4',
      [name, amount, date, id]
    );
    res.send('Venitul a fost actualizat');
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Eroare la actualizarea venitului');
  }
});

// ------------------ BUGET LUNAR ------------------

// Salvează / actualizează bugetul lunar
app.post('/api/monthly_budget', async (req, res) => {
  const { user_id, month, year, amount } = req.body;

  // Validare pentru amount (dacă este pozitiv)
  if (amount <= 0) {
    return res.status(400).send('Bugetul trebuie să fie o valoare pozitivă');
  }

  try {
    const existing = await pool.query(
      'SELECT * FROM monthly_budget WHERE user_id = $1 AND month = $2 AND year = $3',
      [user_id, month, year]
    );

    if (existing.rows.length > 0) {
      // Actualizează bugetul
      await pool.query(
        'UPDATE monthly_budget SET amount = $1 WHERE user_id = $2 AND month = $3 AND year = $4',
        [amount, user_id, month, year]
      );
      res.send('Bugetul a fost actualizat');
    } else {
      // Adaugă bugetul
      await pool.query(
        'INSERT INTO monthly_budget (user_id, month, year, amount) VALUES ($1, $2, $3, $4)',
        [user_id, month, year, amount]
      );
      res.send('Bugetul a fost adăugat');
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Eroare la salvarea bugetului');
  }
});

// Obține bugetul lunar
app.get('/api/monthly_budget', async (req, res) => {
  const { user_id, month, year } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM monthly_budget WHERE user_id = $1 AND month = $2 AND year = $3',
      [user_id, month, year]
    );
    res.json(result.rows[0] || {}); // Dacă nu există niciun rezultat, returnează un obiect gol
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Eroare la obținerea bugetului');
  }
});

app.get('/api/statistics', async (req, res) => {
  const { user_id, type, year, month, week, day, category } = req.query;

  // Logăm valorile primite în request
  console.log('Received request with params:', req.query);

  let query = '';
  let queryParams = [user_id];

  // Definirea interogărilor pentru fiecare tip de statistică
  switch (type) {
    case 'general':
      query = `
        WITH months AS (
          SELECT generate_series(
            (SELECT DATE_TRUNC('month', MIN(date)) FROM expenses WHERE user_id = $1),
            (SELECT DATE_TRUNC('month', MAX(date)) FROM expenses WHERE user_id = $1),
            interval '1 month'
          ) AS period
        )
        SELECT 
          TO_CHAR(m.period, 'YYYY-MM') AS period,
          COALESCE(SUM(DISTINCT e.amount), 0) AS expenses_sum,
          COALESCE(SUM(DISTINCT i.amount), 0) AS incomes_sum,
          COALESCE(SUM(DISTINCT b.amount), 0) AS budget_sum
        FROM months m
        LEFT JOIN expenses e ON DATE_TRUNC('month', e.date) = m.period AND e.user_id = $1
        LEFT JOIN incomes i ON DATE_TRUNC('month', i.date) = m.period AND i.user_id = $1
        LEFT JOIN monthly_budget b ON b.month = EXTRACT(MONTH FROM m.period) AND b.year = EXTRACT(YEAR FROM m.period) AND b.user_id = $1
        GROUP BY m.period
        ORDER BY m.period;
      `;
      break;

    case 'trend':
      query = `
        SELECT
          TO_CHAR(e.date, 'YYYY-MM') AS period,
          SUM(e.amount) AS expenses_sum,
          SUM(i.amount) AS incomes_sum,
          SUM(i.amount) - SUM(e.amount) AS savings
        FROM
          expenses e
          LEFT JOIN incomes i ON TO_CHAR(e.date, 'YYYY-MM') = TO_CHAR(i.date, 'YYYY-MM')
        WHERE e.user_id = $1
        GROUP BY
          TO_CHAR(e.date, 'YYYY-MM')
        ORDER BY
          period;
      `;
      break;

    case 'annual':
      query = `
          SELECT
            EXTRACT(YEAR FROM e.date) AS year,
            COALESCE(SUM(e.amount), 0) AS expenses_sum,
            COALESCE(SUM(i.amount), 0) AS incomes_sum,
            COALESCE(SUM(b.amount), 0) AS budget_sum
          FROM
            expenses e
            LEFT JOIN incomes i ON EXTRACT(YEAR FROM e.date) = EXTRACT(YEAR FROM i.date)
            LEFT JOIN monthly_budget b ON b.year = EXTRACT(YEAR FROM e.date)
          WHERE e.user_id = $1
          GROUP BY
            EXTRACT(YEAR FROM e.date)
          ORDER BY
            year;
        `;
      break;

    case 'monthly':
      query = `
        SELECT
          TO_CHAR(e.date, 'YYYY-MM') AS period,
          SUM(e.amount) AS expenses_sum,
          SUM(i.amount) AS incomes_sum,
          SUM(b.amount) AS budget_sum
        FROM
          expenses e
          LEFT JOIN incomes i ON TO_CHAR(e.date, 'YYYY-MM') = TO_CHAR(i.date, 'YYYY-MM')
          LEFT JOIN monthly_budget b ON b.month = EXTRACT(MONTH FROM e.date) AND b.year = EXTRACT(YEAR FROM e.date)
        WHERE e.user_id = $1 AND EXTRACT(YEAR FROM e.date) = $2
        GROUP BY
          TO_CHAR(e.date, 'YYYY-MM')
        ORDER BY
          period;
      `;
      queryParams.push(year); // Only filter by the selected year
      break;

    case 'budgetComparison':
      if (year && month && day) {
        query = `
            SELECT
              TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') AS period,
              SUM(e.amount) AS expenses_sum,
              COALESCE(b.budget_sum, 0) AS budget_sum
            FROM expenses e
            LEFT JOIN (
              SELECT year, month, SUM(amount) AS budget_sum
              FROM monthly_budget
              WHERE user_id = $1
              GROUP BY year, month
            ) b ON b.year = EXTRACT(YEAR FROM e.date)
                 AND b.month = EXTRACT(MONTH FROM e.date)
            WHERE e.user_id = $1
              AND EXTRACT(YEAR FROM e.date) = $2
              AND EXTRACT(MONTH FROM e.date) = $3
              AND EXTRACT(DAY FROM e.date) <= $4
            GROUP BY period, b.budget_sum
            ORDER BY period;
          `;
        queryParams.push(year, month, day);
      } else if (year && month) {
        query = `
            SELECT
              TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') AS period,
              SUM(e.amount) AS expenses_sum,
              COALESCE(b.budget_sum, 0) AS budget_sum
            FROM expenses e
            LEFT JOIN (
              SELECT year, month, SUM(amount) AS budget_sum
              FROM monthly_budget
              WHERE user_id = $1
              GROUP BY year, month
            ) b ON b.year = EXTRACT(YEAR FROM e.date)
                 AND b.month = EXTRACT(MONTH FROM e.date)
            WHERE e.user_id = $1
              AND EXTRACT(YEAR FROM e.date) = $2
              AND EXTRACT(MONTH FROM e.date) = $3
            GROUP BY period, b.budget_sum
            ORDER BY period;
          `;
        queryParams.push(year, month);
      } else if (year && !isNaN(year)) {
        query = `
            SELECT
              TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') AS period,
              SUM(e.amount) AS expenses_sum,
              COALESCE(b.budget_sum, 0) AS budget_sum
            FROM expenses e
            LEFT JOIN (
              SELECT year, month, SUM(amount) AS budget_sum
              FROM monthly_budget
              WHERE user_id = $1
              GROUP BY year, month
            ) b ON b.year = EXTRACT(YEAR FROM e.date)
                 AND b.month = EXTRACT(MONTH FROM e.date)
            WHERE e.user_id = $1
              AND EXTRACT(YEAR FROM e.date) = $2
            GROUP BY period, b.budget_sum
            ORDER BY period;
          `;
        queryParams.push(year);
      } else {
        query = `
            SELECT
              TO_CHAR(DATE_TRUNC('month', e.date), 'YYYY-MM') AS period,
              SUM(e.amount) AS expenses_sum,
              COALESCE(b.budget_sum, 0) AS budget_sum
            FROM expenses e
            LEFT JOIN (
              SELECT year, month, SUM(amount) AS budget_sum
              FROM monthly_budget
              WHERE user_id = $1
              GROUP BY year, month
            ) b ON b.year = EXTRACT(YEAR FROM e.date)
                 AND b.month = EXTRACT(MONTH FROM e.date)
            WHERE e.user_id = $1
            GROUP BY period, b.budget_sum
            ORDER BY period;
          `;
      }
      break;


    case 'expensesByPeriod':
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({ error: 'Trebuie să selectezi un interval de date.' });
      }

      query = `
          SELECT
            TO_CHAR(date, 'YYYY-MM-DD') AS period,
            name,
            category_name,
            amount AS expenses_sum,
            planned_impulsive
            FROM expenses
            WHERE user_id = $1
            AND date BETWEEN $2 AND $3
            ORDER BY date;
        `;
      queryParams.push(start_date, end_date);

      break;

    case 'unplannedExpenses':
      if (day && month && year) {
        query = `
            SELECT
              TO_CHAR(date, 'YYYY-MM-DD') AS period,
              SUM(CASE WHEN planned_impulsive = true THEN amount ELSE 0 END) AS impulsive_expenses,
              SUM(CASE WHEN planned_impulsive = false THEN amount ELSE 0 END) AS planned_expenses,
              (
                SELECT SUM(amount) FROM incomes
                WHERE user_id = $1
                AND EXTRACT(YEAR FROM date) = $2
                AND EXTRACT(MONTH FROM date) = $3
                AND EXTRACT(DAY FROM date) = $4
              ) AS incomes_sum
            FROM expenses
            WHERE user_id = $1
            AND EXTRACT(YEAR FROM date) = $2
            AND EXTRACT(MONTH FROM date) = $3
            AND EXTRACT(DAY FROM date) = $4
            GROUP BY TO_CHAR(date, 'YYYY-MM-DD')
            ORDER BY period;
          `;
        queryParams.push(year, month, day);
      } else {
        let paramIndex = 2;
        const filtersExpenses = [];
        const filtersIncomes = [];

        queryParams = [user_id]; // resetăm doar pt siguranță

        if (year) {
          filtersExpenses.push(`EXTRACT(YEAR FROM date) = $${paramIndex}`);
          filtersIncomes.push(`EXTRACT(YEAR FROM date) = $${paramIndex}`);
          queryParams.push(year);
          paramIndex++;
        }

        if (month) {
          filtersExpenses.push(`EXTRACT(MONTH FROM date) = $${paramIndex}`);
          filtersIncomes.push(`EXTRACT(MONTH FROM date) = $${paramIndex}`);
          queryParams.push(month);
          paramIndex++;
        }

        const filterExpensesStr = filtersExpenses.length ? `AND ${filtersExpenses.join(' AND ')}` : '';
        const filterIncomesStr = filtersIncomes.length ? `AND ${filtersIncomes.join(' AND ')}` : '';

        query = `
            SELECT
              e_data.period,
              COALESCE(e_data.impulsive_expenses, 0) AS impulsive_expenses,
              COALESCE(e_data.planned_expenses, 0) AS planned_expenses,
              COALESCE(i_data.incomes_sum, 0) AS incomes_sum
            FROM (
              SELECT
                TO_CHAR(date, 'YYYY-MM') AS period,
                SUM(CASE WHEN planned_impulsive = true THEN amount ELSE 0 END) AS impulsive_expenses,
                SUM(CASE WHEN planned_impulsive = false THEN amount ELSE 0 END) AS planned_expenses
              FROM expenses
              WHERE user_id = $1
              ${filterExpensesStr}
              GROUP BY TO_CHAR(date, 'YYYY-MM')
            ) e_data
            LEFT JOIN (
              SELECT
                TO_CHAR(date, 'YYYY-MM') AS period,
                SUM(amount) AS incomes_sum
              FROM incomes
              WHERE user_id = $1
              ${filterIncomesStr}
              GROUP BY TO_CHAR(date, 'YYYY-MM')
            ) i_data ON e_data.period = i_data.period
            ORDER BY e_data.period;
          `;
      }
      break;

    case 'daily':
      query = `
          SELECT
            TO_CHAR(e.date, 'YYYY-MM-DD') AS period,
            SUM(e.amount) AS expenses_sum,
            SUM(i.amount) AS incomes_sum,
            0 AS budget_sum
          FROM
            expenses e
            LEFT JOIN incomes i ON TO_CHAR(e.date, 'YYYY-MM-DD') = TO_CHAR(i.date, 'YYYY-MM-DD') AND i.user_id = $1
          WHERE e.user_id = $1
            AND EXTRACT(YEAR FROM e.date) = $2
            AND EXTRACT(MONTH FROM e.date) = $3
            ${day ? `AND EXTRACT(DAY FROM e.date) = $4` : ''}
          GROUP BY
            TO_CHAR(e.date, 'YYYY-MM-DD')
          ORDER BY
            period;
        `;
      queryParams.push(year, month);
      if (day) queryParams.push(day);
      break;

    default:
      console.log('Invalid type:', type);  // Log error if the type is invalid
      return res.status(400).json({ error: 'Tip de statistică invalid.' });
  }

  // Logăm interogarea și parametrii
  console.log('Running query:', query);
  console.log('With parameters:', queryParams);

  try {
    // Executăm interogarea
    const result = await pool.query(query, queryParams);
    let totalImpulsive = 0;
    let totalPlanned = 0;

    if (type === 'unplannedExpenses') {
      totalImpulsive = result.rows.reduce((acc, row) => acc + parseFloat(row.impulsive_expenses || 0), 0);
      totalPlanned = result.rows.reduce((acc, row) => acc + parseFloat(row.planned_expenses || 0), 0);
    }
    const statisticsData = {
      labels: result.rows.map(row => row.period),
      expenses: result.rows.map(row => parseFloat(row.expenses_sum || 0)),
      incomes: result.rows.map(row => parseFloat(row.incomes_sum || 0)),
      budget: result.rows.map(row => parseFloat(row.budget_sum || 0)),
      expensesSum: result.rows.reduce((acc, row) => acc + parseFloat(row.expenses_sum || 0), 0),
      incomesSum: result.rows.reduce((acc, row) => acc + parseFloat(row.incomes_sum || 0), 0),
      budgetSum: result.rows.reduce((acc, row) => acc + parseFloat(row.budget_sum || 0), 0),
      details: result.rows,
      savings: result.rows.map(row => parseFloat(row.savings || 0)),
      unplannedExpenses: totalImpulsive,
      plannedExpenses: totalPlanned,
    };

    res.json(statisticsData);
  } catch (err) {
    // Logăm eroarea
    console.error('Error executing query:', err);
    res.status(500).json({ error: 'A apărut o eroare la obținerea datelor.' });
  }
});

// Servește fișierele statice construite de React
app.use(express.static(path.join(__dirname, 'build')));

// Rutele pentru frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});