const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./path_to_sequelize_instance'); // Importă instanța Sequelize de la User.js

const FinancialData = sequelize.define('FinancialData', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE' // Dacă un user este șters, datele financiare vor fi șterse automat
  },
  income: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  expenses: {
    type: DataTypes.JSONB, // Stocăm cheltuielile ca un array de obiecte (ex: { amount: 100, category: "food" })
    defaultValue: []
  },
  monthly_budget: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// Sincronizează baza de date
sequelize.sync()
  .then(() => {
    console.log('Tabela FinancialData a fost sincronizată!');
  })
  .catch(err => {
    console.error('Eroare la sincronizarea tabelei FinancialData:', err);
  });

module.exports = FinancialData;