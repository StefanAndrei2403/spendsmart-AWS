
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { FiPlus, FiEdit, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import EditIncomeModal from './EditIncomeModal';
import EditBudgetModal from './EditBudgetModal';
import './AddIncomeBudget.css';

const AddIncomeBudget = () => {
  const { user } = useAuth();
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState('');
  const [incomes, setIncomes] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [budget, setBudget] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('auth_token')}`;

  const fetchIncomes = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/incomes', {
        params: { user_id: user.userId, month: selectedMonth, year: selectedYear },
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
        params: { user_id: user.userId, month: selectedMonth, year: selectedYear },
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
      setSuccessMessage('');
      return;
    }

    const data = {
      name: incomeName,
      amount: incomeAmount,
      date: incomeDate,
      user_id: user.userId
    };

    try {
      await axios.post('/api/incomes', data);
      setSuccessMessage("Venitul a fost adăugat cu succes!");
      setErrorMessage('');
      setIncomeName('');
      setIncomeAmount('');
      setIncomeDate('');
      fetchIncomes();
    } catch (err) {
      setErrorMessage("Eroare la adăugarea venitului!");
      setSuccessMessage('');
      console.error("Eroare la adăugare venit:", err);
    }
  };

  const handleMonthChange = (date) => {
    setSelectedMonth(date.getMonth() + 1);
    setSelectedYear(date.getFullYear());
    setMonthPickerOpen(false);
  };

  const handleMonthPickerToggle = () => {
    setMonthPickerOpen((prev) => !prev);
  };

  return (
    <div className="income-grid">
      <div className="income-section card">
        <h2><FiPlus /> Adaugă Venit</h2>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        <form onSubmit={handleSubmitIncome}>
          <input
            type="text"
            placeholder="Nume venit"
            value={incomeName}
            onChange={(e) => setIncomeName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Sumă venit"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
          />
          <div className="datepicker-wrapper" style={{ overflow: 'visible' }}>
            <FiCalendar className="calendar-icon" />
            <DatePicker
              selected={incomeDate}
              onChange={(date) => setIncomeDate(date)}
              placeholderText="Selectează data"
              dateFormat="dd/MM/yyyy"
            />
          </div>
          <button type="submit" className="primary-btn">Adaugă Venit</button>
        </form>
      </div>

      <div className="right-column">
        <div className="income-section card">
          <div className="income-header">
            <h2><FiTrendingUp /> Veniturile Mele - {selectedMonth}/{selectedYear}</h2>
            <button className="month-picker-btn" onClick={handleMonthPickerToggle}>
              <FiCalendar /> Selectează luna
            </button>
          </div>
          {monthPickerOpen && (
            <DatePicker
              selected={new Date(selectedYear, selectedMonth - 1)}
              onChange={handleMonthChange}
              dateFormat="MM/yyyy"
              showMonthYearPicker
              inline
            />
          )}
          <table className="income-table">
            <thead>
              <tr>
                <th>Nume</th>
                <th>Sumă</th>
                <th>Data</th>
                <th>Acțiune</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((income) => (
                <tr key={income.id}>
                  <td>{income.name}</td>
                  <td>{Number(income.amount).toFixed(2)} RON</td>
                  <td>{new Date(income.date).toLocaleDateString('ro-RO')}</td>
                  <td>
                    <button className="edit-btn" onClick={() => {
                      setIncomeToEdit(income);
                      setModalIsOpen(true);
                    }}>
                      <FiEdit /> Editează
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="income-section card">
          <h2><FiTrendingUp /> Buget pentru luna {selectedMonth}/{selectedYear}</h2>
          <div className="budget-form">
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
            <button onClick={() => setBudgetModalOpen(true)} className="primary-btn">Editează Buget</button>
          </div>
        </div>
      </div>

      {modalIsOpen && (
        <EditIncomeModal
          isOpen={modalIsOpen}
          onRequestClose={() => setModalIsOpen(false)}
          income={incomeToEdit}
          onSave={(updatedIncome) => {
            axios.put(`/api/incomes/${updatedIncome.id}`, {
              ...updatedIncome,
              user_id: user.userId
            }).then(fetchIncomes);
          }}
        />
      )}

      {budgetModalOpen && (
        <EditBudgetModal
          isOpen={budgetModalOpen}
          onRequestClose={() => setBudgetModalOpen(false)}
          budget={budget}
          onSave={(newAmount) => {
            axios.post('/api/monthly_budget', {
              user_id: user.userId,
              amount: newAmount,
              month: selectedMonth,
              year: selectedYear
            }).then(() => {
              setBudget(newAmount);
              fetchBudget();
            });
          }}
        />
      )}
    </div>
  );
};

export default AddIncomeBudget;
