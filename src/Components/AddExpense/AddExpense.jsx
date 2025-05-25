/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import AddCategoryModal from './AddCategoryModal';
import './AddExpense.css';
import { FiPlusCircle } from 'react-icons/fi';
import { FiFilter } from 'react-icons/fi';
import { FiRefreshCw } from 'react-icons/fi';
import { FaEdit } from "react-icons/fa";
import { FaTrashAlt } from "react-icons/fa";
import EditExpenseModal from './EditExpenseModal.jsx';
import { FaChartLine } from 'react-icons/fa';
import { FaCalendarAlt } from 'react-icons/fa';
import { FaPlus } from 'react-icons/fa';


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
  const [categoryFilterOptions, setCategoryFilterOptions] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [dateFilterOptions, setDateFilterOptions] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [impulsiveFilterOptions, setImpulsiveFilterOptions] = useState(['✅', '❌']);
  const [selectedImpulsive, setSelectedImpulsive] = useState([]);
  const [showImpulsiveFilter, setShowImpulsiveFilter] = useState(false);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showAmountFilter, setShowAmountFilter] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);



  const dateFilterRef = useRef(null);
  const categoryFilterRef = useRef(null);
  const impulsiveFilterRef = useRef(null);
  const amountFilterRef = useRef(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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
    const handleClickOutside = (e) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target)) {
        setShowDateFilter(false);
      }
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target)) {
        setShowCategoryFilter(false);
      }
      if (impulsiveFilterRef.current && !impulsiveFilterRef.current.contains(e.target)) {
        setShowImpulsiveFilter(false);
      }
      if (amountFilterRef.current && !amountFilterRef.current.contains(e.target)) {
        setShowAmountFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const uniqueCategories = [
      ...new Set(expenses.map(exp => {
        const cat = categories.find(c => c.id === exp.category_id);
        return cat ? cat.name : 'Necunoscut';
      }))
    ];
    setCategoryFilterOptions(uniqueCategories);
    const uniqueDates = [
      ...new Set(expenses.map(exp => new Date(exp.date).toLocaleDateString('ro-RO')))
    ];
    setDateFilterOptions(uniqueDates);
  }, [expenses, categories]);

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

  const finalFilteredExpenses = filteredExpenses.filter(exp => {
    const categoryName = categories.find(c => c.id === exp.category_id)?.name || 'Necunoscut';
    const dateFormatted = new Date(exp.date).toLocaleDateString('ro-RO');
    const impulsiv = exp.planned_impulsive ? '✅' : '❌';

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(categoryName);
    const matchesDate = selectedDates.length === 0 || selectedDates.includes(dateFormatted);
    const matchesImpulsive = selectedImpulsive.length === 0 || selectedImpulsive.includes(impulsiv);
    const amountValue = parseFloat(exp.amount);
    const matchesAmount =
      (!minAmount || amountValue >= parseFloat(minAmount)) &&
      (!maxAmount || amountValue <= parseFloat(maxAmount));


    return matchesCategory && matchesDate && matchesImpulsive && matchesAmount;
  });

  // Handle editing of an existing expense
  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updated) => {
    try {
      await axios.put(`/api/expenses/${updated.id}`, updated);
      setShowEditModal(false);
      fetchExpenses();
    } catch (err) {
      console.error('Eroare la salvare edit:', err);
    }
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
    <div className="expenses-grid">
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
              <div className="category-select-wrapper">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="category-dropdown"
                >
                  <option value="">Selectează o categorie</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-category-btn"
                  onClick={() => setShowAddCategoryModal(true)}
                  title="Adaugă categorie nouă"
                >
                  <FaPlus />
                </button>
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


            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                checked={plannedImpulsive}
                onChange={(e) => setPlannedImpulsive(e.target.checked)}
              />
              <label>
                Cheltuială neplanificată / impulsivă
              </label>
            </div>
            <button type="submit" className="primary-btn">
              {editingExpense ? 'Salvează modificările' : 'Adaugă Cheltuială'}
            </button>
          </form>
          {editingExpense && (
            <button onClick={handleCancelEdit} className="cancel-edit-button">
              Anulează editarea
            </button>
          )}
        </div>

        <div className="list-section">
          <div className="expense-header">
            <h2>
              <FaChartLine style={{ marginRight: '8px' }} />
              Cheltuielile Mele – {selectedMonth}/{selectedYear}
            </h2>
            <div className="header-buttons">
              <button onClick={() => setCalendarVisible(!calendarVisible)} className="month-picker-btn">
                <FaCalendarAlt style={{ marginRight: '6px' }} />
                Selectează luna
              </button>
              <button
                className="reset-filters-btn"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedDates([]);
                  setSelectedImpulsive([]);
                  setMinAmount('');
                  setMaxAmount('');
                }}
              >
                <FiRefreshCw size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Resetează filtrele
              </button>
            </div>
          </div>
          {calendarVisible && (
            <DatePicker
              selected={new Date(selectedYear, selectedMonth - 1)}
              onChange={handleDateChange}
              dateFormat="MM/yyyy"
              showMonthYearPicker
              open 
              inline
              popperPlacement="bottom-start" 
            />
          )}
          <div className="expenses-list">
            {finalFilteredExpenses.length === 0 ? (
              <div className="no-data-container">
                <p style={{ marginTop: '1rem', color: '#555' }}>
                  Nu există cheltuieli care să corespundă filtrelor selectate.
                </p>

                <table className="expenses-table">
                  <thead>
                    <tr>
                      <th>Nume</th>
                      <th style={{ position: 'relative' }}>
                        Sumă (RON)
                        <FiFilter
                          size={18}
                          onClick={() => setShowAmountFilter(prev => !prev)}
                          title="Filtrează după sumă"
                          style={{
                            marginLeft: '8px',
                            cursor: 'pointer',
                            verticalAlign: 'middle',
                            color: showAmountFilter ? '#007bff' : '#333'
                          }}
                        />
                        {showAmountFilter && (
                          <div className="filter-dropdown" ref={amountFilterRef}>
                            <label>
                              Min:
                              <input
                                type="number"
                                value={minAmount}
                                onChange={e => setMinAmount(e.target.value)}
                                placeholder="ex: 10"
                              />
                            </label>
                            <label>
                              Max:
                              <input
                                type="number"
                                value={maxAmount}
                                onChange={e => setMaxAmount(e.target.value)}
                                placeholder="ex: 500"
                              />
                            </label>
                            <button onClick={() => { setMinAmount(''); setMaxAmount(''); }}>Resetează</button>
                          </div>
                        )}
                      </th>
                      {/* Dată */}
                      <th style={{ position: 'relative' }}>
                        Dată
                        <FiFilter
                          size={18}
                          onClick={() => setShowDateFilter(prev => !prev)}
                          title="Filtrează după dată"
                          style={{
                            marginLeft: '8px',
                            cursor: 'pointer',
                            verticalAlign: 'middle',
                            color: showDateFilter ? '#007bff' : '#333'
                          }}
                        />
                        {showDateFilter && (
                          <div className="filter-dropdown" ref={dateFilterRef}>
                            {dateFilterOptions.map((date, idx) => (
                              <label key={idx}>
                                <input
                                  type="checkbox"
                                  checked={selectedDates.includes(date)}
                                  onChange={() =>
                                    setSelectedDates(prev =>
                                      prev.includes(date)
                                        ? prev.filter(d => d !== date)
                                        : [...prev, date]
                                    )
                                  }
                                />
                                {date}
                              </label>
                            ))}
                            <button onClick={() => setSelectedDates([])}>Resetează</button>
                          </div>
                        )}
                      </th>

                      {/* Categorie */}
                      <th style={{ position: 'relative' }}>
                        Categorie
                        <FiFilter
                          size={18}
                          onClick={() => setShowCategoryFilter(prev => !prev)}
                          title="Filtrează după categorie"
                          style={{
                            marginLeft: '8px',
                            cursor: 'pointer',
                            verticalAlign: 'middle',
                            color: showCategoryFilter ? '#007bff' : '#333'
                          }}
                        />
                        {showCategoryFilter && (
                          <div className="filter-dropdown" ref={categoryFilterRef}>
                            {categoryFilterOptions.map((cat, index) => (
                              <label key={index}>
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.includes(cat)}
                                  onChange={() => {
                                    setSelectedCategories(prev =>
                                      prev.includes(cat)
                                        ? prev.filter(c => c !== cat)
                                        : [...prev, cat]
                                    );
                                  }}
                                />
                                {cat}
                              </label>
                            ))}
                            <button onClick={() => setSelectedCategories([])}>Resetează</button>
                          </div>
                        )}
                      </th>

                      {/* Impulsivă */}
                      <th style={{ position: 'relative' }}>
                        Impulsivă?
                        <FiFilter
                          size={18}
                          onClick={() => setShowImpulsiveFilter(prev => !prev)}
                          title="Filtrează după impulsivitate"
                          style={{
                            marginLeft: '8px',
                            cursor: 'pointer',
                            verticalAlign: 'middle',
                            color: showImpulsiveFilter ? '#007bff' : '#333'
                          }}
                        />
                        {showImpulsiveFilter && (
                          <div className="filter-dropdown" ref={impulsiveFilterRef}>
                            {impulsiveFilterOptions.map((option, idx) => (
                              <label key={idx}>
                                <input
                                  type="checkbox"
                                  checked={selectedImpulsive.includes(option)}
                                  onChange={() =>
                                    setSelectedImpulsive(prev =>
                                      prev.includes(option)
                                        ? prev.filter(i => i !== option)
                                        : [...prev, option]
                                    )
                                  }
                                />
                                {option}
                              </label>
                            ))}
                            <button onClick={() => setSelectedImpulsive([])}>Resetează</button>
                          </div>
                        )}
                      </th>

                      <th>Acțiune</th>
                    </tr>
                  </thead>
                </table>
              </div>
            ) : (
              <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Nume</th>
                    <th style={{ position: 'relative' }}>
                      Sumă (RON)
                      <FiFilter
                        size={18}
                        onClick={() => setShowAmountFilter(prev => !prev)}
                        title="Filtrează după sumă"
                        style={{
                          marginLeft: '8px',
                          cursor: 'pointer',
                          verticalAlign: 'middle',
                          color: showAmountFilter ? '#007bff' : '#333'
                        }}
                      />
                      {showAmountFilter && (
                        <div className="filter-dropdown" ref={amountFilterRef}>
                          <label>
                            Min:
                            <input
                              type="number"
                              value={minAmount}
                              onChange={e => setMinAmount(e.target.value)}
                              placeholder="ex: 10"
                            />
                          </label>
                          <label>
                            Max:
                            <input
                              type="number"
                              value={maxAmount}
                              onChange={e => setMaxAmount(e.target.value)}
                              placeholder="ex: 500"
                            />
                          </label>
                          <button onClick={() => { setMinAmount(''); setMaxAmount(''); }}>Resetează</button>
                        </div>
                      )}
                    </th>
                    {/* Dată */}
                    <th style={{ position: 'relative' }}>
                      Dată
                      <FiFilter
                        size={18}
                        onClick={() => setShowDateFilter(prev => !prev)}
                        title="Filtrează după dată"
                        style={{
                          marginLeft: '8px',
                          cursor: 'pointer',
                          verticalAlign: 'middle',
                          color: showDateFilter ? '#007bff' : '#333'
                        }}
                      />
                      {showDateFilter && (
                        <div className="filter-dropdown" ref={dateFilterRef}>
                          {dateFilterOptions.map((date, idx) => (
                            <label key={idx}>
                              <input
                                type="checkbox"
                                checked={selectedDates.includes(date)}
                                onChange={() =>
                                  setSelectedDates(prev =>
                                    prev.includes(date)
                                      ? prev.filter(d => d !== date)
                                      : [...prev, date]
                                  )
                                }
                              />
                              {date}
                            </label>
                          ))}
                          <button onClick={() => setSelectedDates([])}>Resetează</button>
                        </div>
                      )}
                    </th>

                    {/* Categorie */}
                    <th style={{ position: 'relative' }}>
                      Categorie
                      <FiFilter
                        size={18}
                        onClick={() => setShowCategoryFilter(prev => !prev)}
                        title="Filtrează după categorie"
                        style={{
                          marginLeft: '8px',
                          cursor: 'pointer',
                          verticalAlign: 'middle',
                          color: showCategoryFilter ? '#007bff' : '#333'
                        }}
                      />
                      {showCategoryFilter && (
                        <div className="filter-dropdown" ref={categoryFilterRef}>
                          {categoryFilterOptions.map((cat, index) => (
                            <label key={index}>
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(cat)}
                                onChange={() => {
                                  setSelectedCategories(prev =>
                                    prev.includes(cat)
                                      ? prev.filter(c => c !== cat)
                                      : [...prev, cat]
                                  );
                                }}
                              />
                              {cat}
                            </label>
                          ))}
                          <button onClick={() => setSelectedCategories([])}>Resetează</button>
                        </div>
                      )}
                    </th>

                    {/* Impulsivă */}
                    <th style={{ position: 'relative' }}>
                      Impulsivă?
                      <FiFilter
                        size={18}
                        onClick={() => setShowImpulsiveFilter(prev => !prev)}
                        title="Filtrează după impulsivitate"
                        style={{
                          marginLeft: '8px',
                          cursor: 'pointer',
                          verticalAlign: 'middle',
                          color: showImpulsiveFilter ? '#007bff' : '#333'
                        }}
                      />
                      {showImpulsiveFilter && (
                        <div className="filter-dropdown" ref={impulsiveFilterRef}>
                          {impulsiveFilterOptions.map((option, idx) => (
                            <label key={idx}>
                              <input
                                type="checkbox"
                                checked={selectedImpulsive.includes(option)}
                                onChange={() =>
                                  setSelectedImpulsive(prev =>
                                    prev.includes(option)
                                      ? prev.filter(i => i !== option)
                                      : [...prev, option]
                                  )
                                }
                              />
                              {option}
                            </label>
                          ))}
                          <button onClick={() => setSelectedImpulsive([])}>Resetează</button>
                        </div>
                      )}
                    </th>

                    <th>Acțiune</th>
                  </tr>
                </thead>
                <tbody>
                  {finalFilteredExpenses.map((expense) => {
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
                              <button onClick={() => handleEdit(expense)} className="edit-btn">
                                <FaEdit /> Editează
                              </button>
                              <button onClick={() => handleDelete(expense.id)} className="delete-button">
                                <FaTrashAlt /> Șterge
                              </button>
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
      {showEditModal && selectedExpense && (
        <EditExpenseModal
          expense={selectedExpense}
          categories={categories}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
        />
      )}
      {showAddCategoryModal && (
        <AddCategoryModal
          onClose={() => setShowAddCategoryModal(false)}
          onCategoryAdded={fetchCategories} // funcția care actualizează categoriile
        />
      )}
    </div>
  );
};

export default AddExpense;
