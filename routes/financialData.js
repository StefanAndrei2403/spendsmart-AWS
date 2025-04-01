// routes/financialData.js
const express = require('express');
const router = express.Router();
const FinancialData = require('../models/FinancialData');
const User = require('../models/User');  // Importă modelul User pentru a verifica user_id

// Adăugarea datelor financiare pentru un utilizator
router.post('/add-financial-data', async (req, res) => {
  const { income, expenses, monthly_budget } = req.body;
  const userId = req.userId; // Presupunem că ai middleware-ul care adaugă userId

  try {
    const financialData = await FinancialData.create({
      user_id: userId,
      income,
      expenses,
      monthly_budget
    });
    res.status(201).json({ message: 'Date financiare adăugate cu succes!', financialData });
  } catch (error) {
    console.error('Eroare la adăugarea datelor financiare:', error);
    res.status(500).json({ message: 'Eroare la adăugarea datelor financiare.' });
  }
});

// Obținerea datelor financiare pentru un utilizator
router.get('/get-financial-data', async (req, res) => {
  const userId = req.userId; // Presupunem că ai middleware-ul care adaugă userId

  try {
    const financialData = await FinancialData.findOne({
      where: { user_id: userId }
    });

    if (!financialData) {
      return res.status(404).json({ message: 'Datele financiare nu au fost găsite.' });
    }

    res.status(200).json(financialData);
  } catch (error) {
    console.error('Eroare la obținerea datelor financiare:', error);
    res.status(500).json({ message: 'Eroare la obținerea datelor financiare.' });
  }
});

module.exports = router;
