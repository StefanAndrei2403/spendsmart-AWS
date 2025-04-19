import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Doughnut } from 'react-chartjs-2';
import './Home.css';
import {
  Chart as ChartJS,
  ArcElement, // Adaugă ArcElement pentru a crea un Donut Chart
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { useNavigate } from 'react-router-dom';

// Register ChartJS components
ChartJS.register(
  ArcElement, // Înregistrează ArcElement pentru a crea un Donut Chart
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

  const currentDate = new Date();
  const monthName = currentDate.toLocaleString('ro-RO', { month: 'long' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

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
    labels: ['Cheltuieli', 'Ramas din buget'],
    datasets: [
      {
        data: [totalExpenses, remainingBudget],
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(75, 192, 192, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)'
        ],
        hoverBorderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 16,
            weight: 'bold',
            family: 'Arial, sans-serif'
          },
          padding: 20
        }
      },
      title: {
        display: true,
        text: 'Comparație Buget vs Cheltuieli',
        font: {
          size: 20,
          weight: 'bold',
          family: 'Arial, sans-serif'
        },
        padding: {
          bottom: 30
        }
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            const value = tooltipItem.raw;
            return `${tooltipItem.label}: ${value} RON`;
          }
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutBounce'
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 100,
          font: {
            size: 14
          },
          callback: function (value) {
            if (value === 0 || value === 1) {
              return '';
            }
            return value;
          }
        },
        grid: {
          display: false,
          borderColor: 'transparent', // Asigură-te că linia de margine a axei Y este transparentă
          drawBorder: false // Evită desenarea marginilor pe axa Y
        },
        borderWidth: 0
      },
      x: {
        ticks: {
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        grid: {
          display: false,
          borderColor: 'transparent', // Asigură-te că linia de margine a axei X este transparentă
          drawBorder: false // Evită desenarea marginilor pe axa X
        },
        borderWidth: 0
      }
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10
      }
    }
  };

  // Render the chart
  if (loading) {
    return (
      <div className="home-root-container">
        <div className="loading-spinner">
          <p>Se încarcă datele...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-root-container">
        <div className="error-message">
          <p>Eroare: {error}</p>
          <button onClick={() => window.location.reload()}>Reîncarcă</button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-root-container">
      <div className="home-left-container">
        <div className="welcome-section">
          <h2>Bun venit, {user?.username || 'Utilizator'}!</h2>
          <p>Email: {user?.email || 'N/A'}</p>
        </div>

        <div className="financial-summary">
          <div className="home-summary-card">
            <h3>Venituri luna {capitalizedMonthName}</h3>
            <p>{income} RON</p>
          </div>

          <div className="home-summary-card">
            <h3>Bugetul lunii {capitalizedMonthName} </h3>
            <p>{monthlyBudget} RON</p>
          </div>

          <div className="home-summary-card">
            <h3>Cheltuieli luna {capitalizedMonthName}</h3>
            <p>{formattedTotalExpenses} RON</p>
          </div>

          <div className="home-summary-card highlight">
            <h3>Bani rămași din buget</h3>
            <p className={remainingBudget >= 0 ? 'positive' : 'negative'}>
              {remainingBudget} RON
            </p>
          </div>
          <div className="home-progress-container" title={`Ai cheltuit ${totalExpenses} RON din ${monthlyBudget} RON`}>
            <label className="home-progress-label">
              Progres Buget ({((totalExpenses / monthlyBudget) * 100).toFixed(1)}%)
            </label>
            <div className="home-progress-bar">
              <div
                className="home-progress-fill"
                style={{
                  width: `${Math.min((totalExpenses / monthlyBudget) * 100, 100)}%`,
                  backgroundColor: totalExpenses > monthlyBudget ? '#e74c3c' : '#2ecc71',
                }}
              />
            </div>
          </div>

          <div className="home-expense-list">
            <h3>Cheltuieli Recente</h3>
            {expenses.length > 0 ? (
              <ul className="home-expenses-ul">
                {expenses.map((expense, index) => (
                  <li key={index} className="home-expense-item">
                    <span className="home-expense-category">{expense.name || 'Fara denumire'}</span>
                    <span className="home-expense-amount">
                      {parseFloat(expense.amount).toFixed(2)} RON
                    </span>
                    <span className="home-expense-date">
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

      <div className="home-right-container">
        <div className="home-chart-container">
          <h3>Bugetul meu {capitalizedMonthName}</h3>
          <div className="home-chart-wrapper">
          <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
