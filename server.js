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
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

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
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

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
    const { name, amount, date, category_id, user_id } = req.body;

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
      INSERT INTO expenses (name, amount, date, category_id, category_name, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const insertValues = [name, amount, date, category_id, category_name, user_id];
    const insertResult = await pool.query(insertQuery, insertValues);

    res.status(201).json(insertResult.rows[0]);
  } catch (error) {
    console.error('Eroare la adăugarea cheltuielii:', error);
    res.status(500).json({ message: 'Eroare la adăugarea cheltuielii' });
  }
});

app.get('/api/get-financial-data', verifyToken, async (req, res) => {
  try {
    const user_id = req.user.id; // Preia user_id din token
    const currentMonth = new Date().getMonth() + 1; // Obține luna curentă (1-12)
    const currentYear = new Date().getFullYear(); // Obține anul curent

    // 1️⃣ Preia venitul utilizatorului
    const incomeQuery = `SELECT COALESCE(SUM(amount), 0) AS total_income FROM incomes WHERE user_id = $1;`;
    const incomeResult = await pool.query(incomeQuery, [user_id]);
    const income = incomeResult.rows[0].total_income;


    // 2️⃣ Preia cheltuielile utilizatorului
    const expensesQuery = `
      SELECT e.amount, e.date, c.name AS category 
      FROM expenses e 
      JOIN expenses_categories c ON e.category_id = c.id
      WHERE e.user_id = $1;
    `;
    const expensesResult = await pool.query(expensesQuery, [user_id]);
    const expenses = expensesResult.rows;

    // 3️⃣ Preia bugetul lunar
    const budgetQuery = `
    SELECT COALESCE(amount, 0) AS monthly_budget 
    FROM monthly_budget 
    WHERE user_id = $1 AND month = $2 AND year = $3;
  `;
  const budgetResult = await pool.query(budgetQuery, [user_id, currentMonth, currentYear]);

  // Dacă nu există un buget pentru luna curentă, setează-l la 0
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



// Servește fișierele statice construite de React
app.use(express.static(path.join(__dirname, 'build')));

// Rutele pentru frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});