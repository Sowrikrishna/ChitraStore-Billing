

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaReceipt,
  FaFileAlt,
  FaPlusSquare,
  FaEdit,
  FaTrash,
  FaArrowRight,
  FaRupeeSign,
  FaBoxes,
  FaShoppingCart,
  FaChartLine,
  FaListUl,
  FaSync,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { useAppContext } from '../context/AppContext'; // adjust path

const Dashboard = () => {
  const navigate = useNavigate();
  const { products, bills, loading, error, lastUpdated, refreshData } = useAppContext();
  const [toast, setToast] = useState(null);

  // ---- Compute stats ----
  const totalProducts = products.length;
  const totalBills = bills.length;

  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let todaySales = 0;
  let monthlyRevenue = 0;
  bills.forEach((bill) => {
    let billDate;
    if (bill.timestamp) {
      if (typeof bill.timestamp === 'number') {
        billDate = new Date(bill.timestamp);
      } else {
        billDate = new Date(bill.timestamp);
      }
    } else {
      return;
    }
    if (isNaN(billDate.getTime())) return;

    const amount = parseFloat(bill.totalAmount) || 0;
    if (
      billDate.getFullYear() === todayDate.getFullYear() &&
      billDate.getMonth() === todayDate.getMonth() &&
      billDate.getDate() === todayDate.getDate()
    ) {
      todaySales += amount;
    }
    if (
      billDate.getFullYear() === currentYear &&
      billDate.getMonth() === currentMonth
    ) {
      monthlyRevenue += amount;
    }
  });

  // Recent bills (latest 4)
  const recentBills = [...bills]
    .filter(b => b.timestamp)
    .sort((a, b) => {
      const tA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp).getTime();
      const tB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime();
      return tB - tA;
    })
    .slice(0, 4)
    .map((bill) => ({
      id: bill.quotationNo || 'Unknown',
      customer: bill.customerName || 'Unknown',
      amount: `₹${parseFloat(bill.totalAmount || 0).toFixed(2)}`,
      status: 'Paid',
    }));

  const formatCurrency = (value) => `₹ ${value.toLocaleString('en-IN')}`;

  const currentDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ---- Quick Action Cards (FULL list) ----
  const actionCards = [
    {
      id: 'new-bill',
      title: 'New Bill',
      description: 'Create a new customer invoice.',
      icon: FaReceipt,
      path: '/new-bill',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      hoverBorder: 'hover:border-blue-300',
    },
    {
      id: 'view-bills',
      title: 'View Bills',
      description: 'View all generated bills.',
      icon: FaFileAlt,
      path: '/view-bills',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      hoverBorder: 'hover:border-emerald-300',
    },
    {
      id: 'add-product',
      title: 'Add Product',
      description: 'Add new products to inventory.',
      icon: FaPlusSquare,
      path: '/add-product',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      hoverBorder: 'hover:border-indigo-300',
    },
    {
      id: 'edit-product',
      title: 'Edit Product',
      description: 'Update existing product details.',
      icon: FaEdit,
      path: '/edit-product',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      hoverBorder: 'hover:border-amber-300',
    },
    {
      id: 'delete-product',
      title: 'Delete Product',
      description: 'Remove products from inventory.',
      icon: FaTrash,
      path: '/delete-product',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      hoverBorder: 'hover:border-rose-300',
    },
    {
      id: 'view-products',
      title: 'View Products',
      description: 'View all products in inventory.',
      icon: FaListUl,
      path: '/view-products',
      iconBg: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
      hoverBorder: 'hover:border-cyan-300',
    },
  ];

  // Summary cards (unchanged)
  const summaryData = [
    {
      id: 1,
      label: 'Total Bills',
      value: loading && !products.length && !bills.length ? '...' : totalBills,
      icon: FaReceipt,
      border: 'border-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 2,
      label: 'Total Products',
      value: loading && !products.length ? '...' : totalProducts,
      icon: FaBoxes,
      border: 'border-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      id: 3,
      label: "Today's Sales",
      value: loading && !bills.length ? '...' : formatCurrency(todaySales),
      icon: FaShoppingCart,
      border: 'border-purple-500',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      mono: true,
    },
    {
      id: 4,
      label: 'Monthly Revenue',
      value: loading && !bills.length ? '...' : formatCurrency(monthlyRevenue),
      icon: FaChartLine,
      border: 'border-orange-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      mono: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase mb-1">
              Billing Dashboard
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Welcome back, SOWRI KRISHNAN
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here's your overview for today.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="text-sm bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-600">
              {currentDate}
            </div>
            <button
              onClick={refreshData}
              disabled={loading}
              className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="Refresh data"
            >
              <FaSync className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Error/Warning banner */}
        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-700 flex items-center gap-3">
            <FaExclamationTriangle className="flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={refreshData}
              className="ml-auto px-3 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {summaryData.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-sm border-t-4 ${item.border} p-4 sm:p-5 flex items-start gap-3 sm:gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1`}
              >
                <div
                  className={`p-2.5 sm:p-3 rounded-full ${item.iconBg} ${item.iconColor} flex-shrink-0`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-lg sm:text-2xl font-bold text-gray-900 truncate ${
                      item.mono ? 'font-mono' : ''
                    }`}
                  >
                    {item.value}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">{item.label}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Main grid: Quick Actions (2/3) + Recent Bills (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <section className="lg:col-span-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {actionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={() => navigate(card.path)}
                    className={`
                      group bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6
                      transition-all duration-200 ease-in-out
                      hover:shadow-lg hover:-translate-y-1
                      ${card.hoverBorder} hover:border-2 cursor-pointer
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 min-w-0">
                        <div
                          className={`p-3 rounded-full ${card.iconBg} ${card.iconColor} flex-shrink-0`}
                        >
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                            {card.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            {card.description}
                          </p>
                        </div>
                      </div>
                      <FaArrowRight className="text-gray-300 group-hover:text-blue-500 transition-colors duration-200 mt-1 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent Bills */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
              <FaRupeeSign className="text-gray-400" size={14} />
              Recent Bills
              {lastUpdated && (
                <span className="text-xs font-normal text-gray-400 ml-2">
                  (updated {lastUpdated})
                </span>
              )}
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
              {recentBills.length === 0 ? (
                <p className="text-gray-400 text-sm">No bills yet.</p>
              ) : (
                recentBills.map((bill, idx) => (
                  <div
                    key={bill.id}
                    className={`flex items-center justify-between py-3 ${
                      idx !== recentBills.length - 1
                        ? 'border-b border-dashed border-gray-200'
                        : ''
                    } ${idx === 0 ? 'pt-0' : ''}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 font-mono">{bill.id}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {bill.customer}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold text-gray-900 font-mono">
                        {bill.amount}
                      </p>
                      <span
                        className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded mt-0.5 ${
                          bill.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Toast notification (optional) */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
};

export default Dashboard;