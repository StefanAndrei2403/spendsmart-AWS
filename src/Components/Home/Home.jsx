import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import './Home.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Verifică dacă există token în localStorage
        const token = localStorage.getItem('auth_token');
        if (!token) {
          // Dacă nu există token, redirecționează la login
          navigate('/');
          return;
        }

        // Adaugă token-ul la antetul cererii
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        // Fetch user profile
        const profileResponse = await axios.get('/profile');
        if (profileResponse.data && profileResponse.data.user) {
          setUser(profileResponse.data.user);  // Setează profilul utilizatorului
        } else {
          setError('Eroare la obținerea profilului.');
          return;
        }

        // Fetch financial data
        const financialResponse = await axios.get('/api/get-financial-data');
        const { income, expenses, monthly_budget } = financialResponse.data;

        setIncome(income || 0);
        setExpenses(expenses || []);
        setMonthlyBudget(monthly_budget || 0);

        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);

        if (err.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('auth_token');
          delete axios.defaults.headers.common['Authorization'];
          navigate('/');
          return;
        }

        setError(err.response?.data?.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Calculate total expenses
  const totalExpenses = expenses.reduce((acc, expense) => acc + (expense.amount ? parseFloat(expense.amount) : 0), 0);
  const formattedTotalExpenses = totalExpenses && !isNaN(totalExpenses) ? totalExpenses.toFixed(2) : '0.00';

  // Calculate remaining budget
  const remainingBudget = monthlyBudget - totalExpenses;

  // Prepare chart data
  const chartData = {
    labels: ['Buget Lunar', 'Cheltuieli Totale'],
    datasets: [
      {
        label: 'Suma (RON)',
        data: [monthlyBudget, totalExpenses],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)', // Gradinat mai subtil
          'rgba(255, 99, 132, 0.8)' // Gradinat mai subtil
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        borderWidth: 1,
        hoverBackgroundColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ],
        hoverBorderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)'
        ]
      }
    ]
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Permite dimensionarea automată
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14, // Modifică dimensiunea fontului legendei
            weight: 'bold' // Face fontul legendei mai îndrăzneț
          }
        }
      },
      title: {
        display: true,
        text: 'Buget vs Cheltuieli',
        font: {
          size: 18,
          weight: 'bold',
          family: 'Arial, sans-serif' // Stil personalizat pentru titlu
        },
        padding: {
          bottom: 20 // Mărește distanța sub titlu
        }
      }
    },
    animation: {
      duration: 1000, // Adaugă o animație la încărcare
      easing: 'easeOutBounce' // Efect de animație la încărcare
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 100, // Adaugă trepte de 100 în grafic
          font: {
            size: 14 // Modifică fontul valorilor de pe axa Y
          }
        }
      },
      x: {
        ticks: {
          font: {
            size: 14, // Modifică fontul valorilor de pe axa X
            weight: 'bold'
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-spinner">
          <p>Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="error-message">
          <p>Eroare: {error}</p>
          <button onClick={() => window.location.reload()}>Reîncarcă</button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="left-container">
        <div className="welcome-section">
          <h2>Bun venit, {user?.username || 'Utilizator'}!</h2>
          <p>Email: {user?.email || 'N/A'}</p>
        </div>

        <div className="financial-summary">
          <div className="summary-card">
            <h3>Venituri Lunare</h3>
            <p>{income} RON</p>
          </div>

          <div className="summary-card">
            <h3>Buget Lunar</h3>
            <p>{monthlyBudget} RON</p>
          </div>

          <div className="summary-card">
            <h3>Cheltuieli Totale</h3>
            <p>{formattedTotalExpenses} RON</p>
          </div>

          <div className="summary-card highlight">
            <h3>Bani Rămași</h3>
            <p className={remainingBudget >= 0 ? 'positive' : 'negative'}>
              {remainingBudget} RON
            </p>
          </div>
          <div className="expense-list">
            <h3>Cheltuieli Recente</h3>
            {expenses.length > 0 ? (
              <ul className="expenses-ul">
                {expenses.map((expense, index) => (
                  <li key={index} className="expense-item">
                    <span className="expense-category">{expense.category || 'Altele'}</span>
                    <span className="expense-amount">
                      {parseFloat(expense.amount).toFixed(2)} RON
                    </span>
                    <span className="expense-date">
                      {new Date(expense.date).toLocaleDateString('ro-RO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nu există cheltuieli înregistrate.</p>
            )}
          </div>
        </div>
      </div>

      <div className="right-container">
        <div className="chart-container">
          <h3>Bugetul meu</h3>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default Home;
