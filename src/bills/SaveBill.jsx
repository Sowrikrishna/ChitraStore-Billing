

// SaveBill.jsx
import React, { useState } from 'react';

const SAVE_URL = import.meta.env.VITE_BILL_URL;

const SaveBill = ({ isOpen, onClose, products, totalAmount, onSaveSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter a customer name.');
      return;
    }

    const cleanedProducts = products.map(({ product_id, product_name, quantity, rate, amount }) => ({
      product_id,
      product_name,
      quantity,
      rate,
      amount
    }));

    const payload = {
      customerName: customerName.trim(),
      products: cleanedProducts,
      totalAmount: totalAmount
    };

    setLoading(true);
    setError(null);
    try {
      await fetch(SAVE_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSuccess(true);
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Save Bill</h2>
        {success ? (
          <div className="text-green-600 text-center py-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <p>Bill saved successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter customer name"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Bill'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SaveBill;