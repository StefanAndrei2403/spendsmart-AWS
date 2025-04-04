import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const AddExpense = () => {
  const { user } = useAuth();
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);

  axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('auth_token')}`;

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/categories', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        console.error("Expected an array for categories:", response.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []); // `fetchCategories` nu depinde de alte variabile

  const fetchExpenses = useCallback(async () => {
    if (!user) {
      console.error("User is not authenticated");
      return;
    }
    try {
      const response = await axios.get(`/expenses?user_id=${user.id}`);
      if (Array.isArray(response.data)) {
        setExpenses(response.data);
      } else {
        console.error("Expected an array for expenses:", response.data);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  }, [user]); // `fetchExpenses` depinde de `user`

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, [user, fetchCategories, fetchExpenses]); // Asigură-te că folosești dependențele corect

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expenseName || !expenseAmount || !expenseDate || !categoryId) {
      setErrorMessage('Te rugăm să completezi toate câmpurile!');
      return;
    }

    const expenseData = {
      name: expenseName,
      amount: expenseAmount,
      date: expenseDate,
      category_id: categoryId,
      user_id: user.id,
    };

    try {
      if (editingExpense) {
        await axios.put(`/api/expenses/${editingExpense.id}`, expenseData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        setSuccessMessage('Cheltuiala a fost actualizată cu succes!');
      } else {
        await axios.post('/api/expenses', expenseData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        setSuccessMessage('Cheltuiala a fost adăugată cu succes!');
      }

      setExpenseName('');
      setExpenseAmount('');
      setExpenseDate('');
      setCategoryId('');
      setEditingExpense(null);
      fetchExpenses();
    } catch (err) {
      console.error('Error adding or updating expense:', err);
      setErrorMessage('A apărut o eroare. Te rugăm să încerci din nou.');
    }
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const filteredExpenses = expenses.filter(expense =>
    selectedMonth ? new Date(expense.date).getMonth() + 1 === parseInt(selectedMonth) : true
  );

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setExpenseName(expense.name);
    setExpenseAmount(expense.amount);
    setExpenseDate(expense.date);
    setCategoryId(expense.category_id);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ width: '45%' }}>
        <h2>{editingExpense ? 'Editează Cheltuiala' : 'Adaugă Cheltuială'}</h2>
        {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
        {successMessage && <div style={{ color: 'green' }}>{successMessage}</div>}
        <form onSubmit={handleSubmit}>
          <div>
            <label>Nume Cheltuială</label>
            <input type="text" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} />
          </div>
          <div>
            <label>Sumă Cheltuială</label>
            <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
          </div>
          <div>
            <label>Data Cheltuielii</label>
            <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div>
            <label>Categorie</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Selectează o categorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">{editingExpense ? 'Salvează Modificările' : 'Adaugă Cheltuială'}</button>
        </form>
      </div>
      <div style={{ width: '50%' }}>
        <h2>Cheltuieli</h2>
        <label>Filtrare după lună:</label>
        <select value={selectedMonth} onChange={handleMonthChange}>
          <option value="">Toate</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('ro-RO', { month: 'long' })}</option>
          ))}
        </select>
        <ul>
          {filteredExpenses.map((expense) => {
            const categoryName = categories.find(cat => cat.id === expense.category_id)?.name || 'Necunoscut';
            return (
              <li key={expense.id}>
                {expense.name} - {expense.amount} RON - {new Date(expense.date).toLocaleDateString('ro-RO')} - {categoryName}
                <button onClick={() => handleEdit(expense)}>Edit</button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default AddExpense;
