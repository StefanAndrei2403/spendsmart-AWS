import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './AddIncomeBudget.css';

const AddIncomeBudget = () => {
  const { user } = useAuth();
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState('');
  const [incomes, setIncomes] = useState([]);
  const [editingIncome, setEditingIncome] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [budget, setBudget] = useState('');
  const [editingBudget, setEditingBudget] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('auth_token')}`;

  const fetchIncomes = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/incomes', {
        params: { user_id: user.id, month: selectedMonth, year: selectedYear },
      });
      setIncomes(response.data || []);
    } catch (err) {
      console.error("Eroare la încărcarea veniturilor:", err);
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchBudget = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/monthly_budget', {
        params: { user_id: user.id, month: selectedMonth, year: selectedYear },
      });
      setBudget(response.data?.amount || '');
    } catch (err) {
      console.error("Eroare la încărcarea bugetului:", err);
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchIncomes();
    fetchBudget();
  }, [fetchIncomes, fetchBudget]);

  const handleSubmitIncome = async (e) => {
    e.preventDefault();
    if (!incomeName || !incomeAmount || !incomeDate) {
      setErrorMessage("Completează toate câmpurile pentru venit!");
      return;
    }

    const data = {
      name: incomeName,
      amount: incomeAmount,
      date: incomeDate,
      user_id: user.id
    };

    try {
      if (editingIncome) {
        await axios.put(`/api/incomes/${editingIncome.id}`, data);
        setSuccessMessage("Venitul a fost actualizat cu succes!");
      } else {
        await axios.post('/api/incomes', data);
        setSuccessMessage("Venitul a fost adăugat cu succes!");
      }
      setIncomeName('');
      setIncomeAmount('');
      setIncomeDate('');
      setEditingIncome(null);
      fetchIncomes();
    } catch (err) {
      console.error("Eroare la adăugare/editare venit:", err);
    }
  };

  const handleEditIncome = (income) => {
    setIncomeName(income.name);
    setIncomeAmount(income.amount);
    setIncomeDate(income.date);
    setEditingIncome(income);
  };

  const handleCancelEdit = () => {
    setIncomeName('');
    setIncomeAmount('');
    setIncomeDate('');
    setEditingIncome(null);
  };

  const handleSaveBudget = async () => {
    try {
      await axios.post('/api/monthly_budget', {
        amount: budget,
        user_id: user.id,
        month: selectedMonth,
        year: selectedYear
      });
      setSuccessMessage("Bugetul a fost salvat cu succes!");
      setEditingBudget(false);
    } catch (err) {
      console.error("Eroare la salvarea bugetului:", err);
    }
  };

  const handleDateChange = (date) => {
    setSelectedMonth(date.getMonth() + 1);
    setSelectedYear(date.getFullYear());
    setCalendarVisible(false);
  };

  return (
    <div className="add-income-container">
      {/* FORMULAR VENIT */}
      <div className="form-section">
        <h2>{editingIncome ? 'Editează Venit' : 'Adaugă Venit'}</h2>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        <form onSubmit={handleSubmitIncome}>
          <div>
            <label>Nume Venit</label>
            <input
              type="text"
              value={incomeName}
              onChange={(e) => setIncomeName(e.target.value)}
            />
          </div>
          <div>
            <label>Sumă Venit</label>
            <input
              type="number"
              value={incomeAmount}
              onChange={(e) => setIncomeAmount(e.target.value)}
            />
          </div>
          <div>
            <label>Data</label>
            <input
              type="date"
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
            />
          </div>
          <button type="submit">
            {editingIncome ? "Salvează Modificările" : "Adaugă Venit"}
          </button>
        </form>
        {editingIncome && (
          <button onClick={handleCancelEdit} className="cancel-edit-button">
            Anulează editarea
          </button>
        )}
      </div>

      {/* LISTĂ VENITURI */}
      <div className="list-section">
        <h2>Veniturile mele</h2>
        <div className="filter-container">
          <label>Lună și An:</label>
          <button onClick={() => setCalendarVisible(!calendarVisible)}>
            {selectedMonth}/{selectedYear}
          </button>
          {calendarVisible && (
            <DatePicker
              selected={new Date(selectedYear, selectedMonth - 1)}
              onChange={handleDateChange}
              dateFormat="MM/yyyy"
              showMonthYearPicker
            />
          )}
        </div>
        <table className="expenses-table">
          <thead>
            <tr>
              <th>Nume</th>
              <th>Sumă</th>
              <th>Data</th>
              <th>Acțiune</th>
            </tr>
          </thead>
          <tbody>
            {incomes.length === 0 ? (
              <tr><td colSpan="4">Nu ai venituri în luna selectată.</td></tr>
            ) : (
              incomes.map(income => (
                <tr key={income.id}>
                  <td>{income.name}</td>
                  <td>{income.amount} RON</td>
                  <td>{new Date(income.date).toLocaleDateString('ro-RO')}</td>
                  <td><button onClick={() => handleEditIncome(income)}>Editează</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SECȚIUNE BUGET */}
      <div className="budget-section">
        <h2>Buget pentru luna {selectedMonth}/{selectedYear}</h2>
        {successMessage && <div className="success-message">{successMessage}</div>}
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        <div className="budget-controls">
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Introdu bugetul"
            disabled={!editingBudget}
          />
          {!editingBudget ? (
            <button onClick={() => setEditingBudget(true)}>Editează Buget</button>
          ) : (
            <>
              <button onClick={handleSaveBudget}>Salvează Modificările</button>
              <button onClick={() => setEditingBudget(false)} className="cancel-edit-button">Anulează</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddIncomeBudget;
