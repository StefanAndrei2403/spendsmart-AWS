
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { FiPlus, FiEdit, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import EditIncomeModal from './EditIncomeModal';
import EditBudgetModal from './EditBudgetModal';
import './AddIncomeBudget.css';
import FileUploadDropzone from './FileUploadDropzone';
import FilePreviewModal from './FilePreviewModal';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';



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
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFilePath, setPreviewFilePath] = useState(null);

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

    let formattedDate;
    try {
      console.log("📅 DEBUG — incomeDate (raw):", incomeDate);

      const dateObj = incomeDate instanceof Date ? incomeDate : new Date(incomeDate);
      const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      formattedDate = dateOnly.toLocaleDateString('sv-SE');

      console.log("📅 DEBUG — formattedDate trimis la server:", formattedDate);
    } catch (e) {
      console.error("❌ Data introdusă nu este validă:", incomeDate, e);
      setErrorMessage("Data este invalidă. Te rugăm să alegi o dată corectă.");
      return;
    }

    const data = {
      name: incomeName,
      amount: incomeAmount,
      date: formattedDate,
      user_id: user.userId,
    };

    try {
      // ✅ Creezi venitul
      const response = await axios.post('/api/incomes', data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const newIncome = response.data;

      // ✅ Dacă ai ales fișier, îl încarci
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        await axios.post(`/api/incomes/upload/${newIncome.id}`, formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setSuccessMessage("Venitul a fost adăugat cu succes!");
      setErrorMessage('');
      setIncomeName('');
      setIncomeAmount('');
      setIncomeDate('');
      setSelectedFile(null);
      fetchIncomes();

    } catch (err) {
      console.error("Eroare la adăugare venit:", err);
      setErrorMessage("Eroare la adăugarea venitului!");
      setSuccessMessage('');
    }
  };

  const handleMonthChange = (date) => {
    setSelectedMonth(date.getMonth() + 1);
    setSelectedYear(date.getFullYear());
    setMonthPickerOpen(false);
  };

  const handleDeleteIncome = async (incomeId) => {
    try {
      await axios.delete(`/api/incomes/${incomeId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      toast.success("Venitul a fost șters cu succes!");
      fetchIncomes();
    } catch (err) {
      console.error("Eroare la ștergerea venitului:", err);
      toast.error("❌ Eroare la ștergerea venitului!");
    }
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
          <FileUploadDropzone onFileSelected={setSelectedFile} />
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
              {incomes.map((income) => {
                console.log("👀 Income item:", income);
                return (
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
                      <button
                        className="delete-btn"
                        onClick={() => {
                          Swal.fire({
                            title: 'Ești sigur?',
                            text: 'Această acțiune va șterge venitul permanent.',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#3085d6',
                            cancelButtonColor: '#d33',
                            confirmButtonText: 'Da, șterge-l!',
                            cancelButtonText: 'Anulează'
                          }).then((result) => {
                            if (result.isConfirmed) {
                              handleDeleteIncome(income.id);
                            }
                          });
                        }}
                      >
                        🗑️ Șterge
                      </button>
                      {income.file_path && (
                        <button
                          className="primary-btn"
                          style={{ marginTop: '8px', display: 'block' }}
                          onClick={() => {
                            setPreviewFilePath(`/${income.file_path}`);
                            setPreviewModalOpen(true);
                          }}
                        >
                          Preview
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
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

      {previewModalOpen && (
        <FilePreviewModal
          isOpen={previewModalOpen}
          onRequestClose={() => setPreviewModalOpen(false)}
          filePath={previewFilePath}
        />
      )}

    </div>
  );
};

export default AddIncomeBudget;
