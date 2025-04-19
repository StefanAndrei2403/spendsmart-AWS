import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import AddCategoryModal from './AddCategoryModal';
import './AddExpense.css';
import { FiPlusCircle } from 'react-icons/fi';

const AddExpense = () => {
  const { user } = useAuth();
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Luna curentă
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Anul curent
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [availableYears, setAvailableYears] = useState([]);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [plannedImpulsive, setPlannedImpulsive] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [categorySuccessMessage, setCategorySuccessMessage] = useState('');




  axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('auth_token')}`;

  // Fetch categories for the select dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/api/categories');
      if (Array.isArray(response.data.categories)) {
        const sorted = response.data.categories.sort((a, b) =>
          a.name.localeCompare(b.name, 'ro', { sensitivity: 'base' })
        );
        setCategories(sorted);
      } else {
        console.error("Expected an array for categories:", response.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  // Fetch all expenses for the logged-in user
  const fetchExpenses = useCallback(async () => {
    if (!user) {
      console.error("User is not authenticated");
      return;
    }
    try {
      const response = await axios.get(`/api/expenses`, {
        params: {
          user_id: user.userId,
          month: selectedMonth,
          year: selectedYear
        }
      });
      console.log("Response data:", response.data); // Adaugă acest log pentru a verifica datele
      if (Array.isArray(response.data)) {
        setExpenses(response.data);
        const years = [...new Set(response.data.map(exp => exp.date.split('-')[0]))];
        setAvailableYears(years);
      } else {
        console.error("Expected an array for expenses:", response.data);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, [user, fetchCategories, fetchExpenses]);

  // Handle adding or editing expense
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
      user_id: user.userId,
      planned_impulsive: plannedImpulsive
    };

    try {
      if (editingExpense) {
        await axios.put(`/api/expenses/${editingExpense.id}`, expenseData);
        setSuccessMessage('Cheltuiala a fost actualizată cu succes!');
      } else {
        await axios.post('/api/expenses', expenseData);
        setSuccessMessage('Cheltuiala a fost adăugată cu succes!');
      }

      setExpenseName('');
      setExpenseAmount('');
      setExpenseDate('');
      setCategoryId('');
      setEditingExpense(null);
      fetchExpenses(); // Refresh the expenses list
    } catch (err) {
      console.error('Error adding or updating expense:', err);
      setErrorMessage('A apărut o eroare. Te rugăm să încerci din nou.');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !newCategoryDescription.trim()) {
      setCategorySuccessMessage('Completează toate câmpurile!');
      return;
    }

    try {
      const response = await axios.post('/categories', {
        name: newCategory,
        description: newCategoryDescription
      });

      setCategories([...categories, response.data.category]); // response.data.category în backend
      setCategoryId(response.data.category.id); // selectează automat
      setNewCategory('');
      setNewCategoryDescription('');
      setCategorySuccessMessage('Categorie adăugată cu succes! ✅');

      // ascunde mesajul după 2-3 secunde
      setTimeout(() => {
        setShowAddCategory(false);
        setCategorySuccessMessage('');
      }, 2000);
    } catch (error) {
      console.error('Eroare la adăugarea categoriei:', error);
      setCategorySuccessMessage('Eroare la adăugare ❌');
    }
  };


  // Handle filter change
  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value)); // Trimit luna ca număr
  };

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value)); // Trimit anul ca număr
  };

  const handleDateChange = (date) => {
    if (date) {
      setSelectedMonth(date.getMonth() + 1); // Get the month (1-based index)
      setSelectedYear(date.getFullYear());  // Get the year
      setCalendarVisible(false);
    }
  };

  // Filter expenses by selected month and year
  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.date);  // Creează un obiect Date din data completă
    const year = expenseDate.getFullYear();  // Extrage anul
    const month = (expenseDate.getMonth() + 1).toString().padStart(2, '0');  // Extrage luna și o formatează corect

    console.log(`Expense date: ${expense.date}, Year: ${year}, Month: ${month}`);
    console.log(`Selected Month: ${selectedMonth}, Selected Year: ${selectedYear}`);

    const matchesMonth = selectedMonth ? month === selectedMonth.toString().padStart(2, '0') : true;
    const matchesYear = selectedYear ? year === selectedYear : true;

    return matchesMonth && matchesYear;
  });

  // Handle editing of an existing expense
  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setExpenseName(expense.name);
    setExpenseAmount(expense.amount);
    setExpenseDate(expense.date);
    setCategoryId(expense.category_id);
    setPlannedImpulsive(expense.planned_impulsive);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingExpense(null);
    setExpenseName('');
    setExpenseAmount('');
    setExpenseDate('');
    setCategoryId('');
    setPlannedImpulsive(false);
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm("Ești sigur că vrei să ștergi această cheltuială?")) {
      try {
        await axios.delete(`/api/expenses/${expenseId}`);
        fetchExpenses(); // Reîncarcă lista
      } catch (err) {
        console.error("Eroare la ștergerea cheltuielii:", err);
        setErrorMessage('A apărut o eroare la ștergere.');
      }
    }
  };

  return (
    <div className="add-expense-container">
      <div className="form-section">
        <h2>{editingExpense ? 'Editează Cheltuiala' : 'Adaugă Cheltuială'}</h2>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
        {successMessage && <div className="success-message">{successMessage}</div>}
        <form onSubmit={handleSubmit}>
          <div>
            <label>Nume Cheltuială</label>
            <input
              type="text"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
            />
          </div>
          <div>
            <label>Sumă Cheltuială</label>
            <input
              type="number"
              value={expenseAmount}
              onChange={(e) => setExpenseAmount(e.target.value)}
            />
          </div>
          <div>
            <label>Data Cheltuielii</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
          <div>
            <label>Categorie</label>
            <div className="category-wrapper">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Selectează o categorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <FiPlusCircle
                className="add-category-icon"
                onClick={() => setShowAddCategory(true)}
                title="Adaugă categorie nouă"
              />
            </div>

            {showAddCategory && (
              <AddCategoryModal
                onClose={() => setShowAddCategory(false)}
                onAdd={handleAddCategory}
                name={newCategory}
                setName={setNewCategory}
                description={newCategoryDescription}
                setDescription={setNewCategoryDescription}
                message={categorySuccessMessage} // trimite mesajul aici
              />
            )}
          </div>


          <div>
            <label>
              <input
                type="checkbox"
                checked={plannedImpulsive}
                onChange={(e) => setPlannedImpulsive(e.target.checked)}
              />
              Cheltuială neplanificată / impulsivă
            </label>
          </div>
          <button type="submit">
            {editingExpense ? 'Salvează Modificările' : 'Adaugă Cheltuială'}
          </button>
        </form>
        {editingExpense && (
          <button onClick={handleCancelEdit} className="cancel-edit-button">
            Anulează editarea
          </button>
        )}
      </div>

      <div className="list-section">
        <h2>Cheltuielile mele</h2>
        <div className="filter-container">
          <label>Lună și An:</label>
          <button onClick={() => setCalendarVisible(!calendarVisible)}>
            {selectedMonth && selectedYear ? `${selectedMonth}/${selectedYear}` : 'Selectează luna și anul'}
          </button>
          {calendarVisible && (
            <DatePicker
              selected={new Date(selectedYear, selectedMonth - 1)}
              onChange={handleDateChange}
              dateFormat="MM/yyyy"
              showMonthYearPicker
              openToDate={new Date()} // Deschide calendarul la data curentă
              closeOnScroll={true}
            />
          )}
        </div>
        <div className="expenses-list">
          {filteredExpenses.length === 0 ? (
            <p>Nu există cheltuieli în luna selectată.</p>
          ) : (
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Nume</th>
                  <th>Sumă (RON)</th>
                  <th>Dată</th>
                  <th>Categorie</th>
                  <th>Impulsiva?</th>
                  <th>Acțiune</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => {
                  const categoryName = categories.find(cat => cat.id === expense.category_id)?.name || 'Necunoscut';
                  return (
                    <tr key={expense.id}>
                      <td>{expense.name}</td>
                      <td>{expense.amount}</td>
                      <td>{new Date(expense.date).toLocaleDateString('ro-RO')}</td>
                      <td>{categoryName}</td>
                      <td style={{ textAlign: 'center' }}>
                        {expense.planned_impulsive ? '✅' : '❌'}
                      </td>
                      <td>
                        {editingExpense && editingExpense.id === expense.id ? (
                          <button onClick={handleCancelEdit}>Anulează editarea</button>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(expense)}>Editează</button>
                            <button onClick={() => handleDelete(expense.id)} className="delete-button">Șterge</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddExpense;
