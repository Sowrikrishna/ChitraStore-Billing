
// AddProduct.jsx
import React, { useState, useEffect } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
// ============================================================
// CONFIGURATION – UPDATE THIS WITH YOUR DEPLOYED WEB APP URL
// ============================================================
const BASE_URL = import.meta.env.VITE_PRODUCT_URL;

// ============================================================
// JSONP helper
// ============================================================
function jsonpRequest(url, callbackName) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callback = callbackName || 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    window[callback] = function(data) {
      delete window[callback];
      document.body.removeChild(script);
      resolve(data);
    };
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callback;
    script.onerror = function() {
      delete window[callback];
      document.body.removeChild(script);
      reject(new Error('JSONP request failed'));
    };
    document.body.appendChild(script);
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const AddProduct = () => {
  // ---------- Form fields ----------
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productNameEn, setProductNameEn] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [sNo, setSNo] = useState(null);  
  const navigate = useNavigate();    // auto‑computed

  // ---------- UI states ----------
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [idExists, setIdExists] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAdding, setIsAdding] = useState(false);

  // ---------- Fetch next S.No on mount ----------
  useEffect(() => {
    const fetchNextSNo = async () => {
      try {
        const data = await jsonpRequest(`${BASE_URL}?action=getNextSNo`);
        if (data.success) {
          setSNo(data.nextSNo);
        } else {
          setMessage({ type: 'error', text: 'Failed to fetch next S.No: ' + data.message });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error fetching next S.No: ' + error.message });
      }
    };
    fetchNextSNo();
  }, []);

  // ---------- Check Product ID uniqueness ----------
  const handleCheckId = async () => {
    if (!productId.trim()) {
      setMessage({ type: 'warning', text: 'Please enter a Product ID to check.' });
      return;
    }
    setCheckLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await jsonpRequest(`${BASE_URL}?action=checkProductId&id=${encodeURIComponent(productId.trim())}`);
      if (data.success) {
        setIdExists(data.exists);
        if (data.exists) {
          setMessage({ type: 'error', text: `Product ID "${productId}" already exists. Choose a different one.` });
        } else {
          setMessage({ type: 'success', text: `Product ID "${productId}" is available.` });
        }
      } else {
        setMessage({ type: 'error', text: 'Error checking ID: ' + data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while checking ID.' });
    } finally {
      setCheckLoading(false);
    }
  };

  // ---------- Add new product ----------
  const handleAddProduct = async (e) => {
    e.preventDefault();

    // Validation
    if (!productId.trim() || !productName.trim() || !quantity || !rate) {
      setMessage({ type: 'warning', text: 'Please fill in all required fields (ID, Name, Quantity, Rate).' });
      return;
    }

    // Ensure ID is unique (double‑check)
    if (idExists) {
      setMessage({ type: 'error', text: 'Product ID already exists. Please change it.' });
      return;
    }

    const payload = {
      s_no: sNo,
      product_id: productId.trim(),
      product_name: productName.trim(),
      product_name_en: productNameEn.trim(),
      quantity: parseFloat(quantity),
      rate: parseFloat(rate),
    };

    setIsAdding(true);
    setMessage({ type: '', text: '' });
    try {
      const data = await jsonpRequest(`${BASE_URL}?action=addProduct&data=${encodeURIComponent(JSON.stringify(payload))}`);
      if (data.success) {
        setMessage({ type: 'success', text: `Product "${productName}" added successfully!` });
        // Reset form (keep the next S.No incremented)
        setSNo(data.nextSNo || sNo + 1);
        setProductId('');
        setProductName('');
        setProductNameEn('');
        setQuantity('');
        setRate('');
        setIdExists(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to add product: ' + data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while adding product.' });
    } finally {
      setIsAdding(false);
    }
  };

  // ---------- Message box (shared) ----------
  const renderMessage = () => {
    if (!message.text) return null;
    const styles = {
      error: 'bg-red-100 text-red-700 border-red-200',
      success: 'bg-green-100 text-green-700 border-green-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return (
      <div
        className={`mb-4 px-3 py-2.5 rounded-lg text-sm leading-snug border break-words ${
          styles[message.type] || 'bg-gray-100 text-gray-700 border-gray-200'
        }`}
      >
        {message.text}
      </div>
    );
  };

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
                      onClick={() => navigate('/dashboard')}
                      className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                      aria-label="Back to Dashboard"
                    >
                      <FaArrowLeft className="text-gray-600 w-4 h-4" />
                    </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
          Add New Product
        </h1>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <form onSubmit={handleAddProduct}>
            {/* S.No (auto) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S.No (Auto)
              </label>
              <input
                type="text"
                value={sNo !== null ? sNo : 'Loading...'}
                disabled
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed text-base"
              />
            </div>

            {/* Product ID */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product ID *
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setIdExists(false); // reset check status on change
                  }}
                  placeholder="e.g., P001"
                  className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-base"
                  required
                />
                <button
                  type="button"
                  onClick={handleCheckId}
                  disabled={checkLoading || !productId.trim()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap text-sm font-medium"
                >
                  {checkLoading ? 'Checking...' : 'Check ID'}
                </button>
              </div>

              {/* Error / info message shown right below the Product ID field */}
              <div className="mt-2">{renderMessage()}</div>

              {idExists && !message.text && (
                <p className="text-red-500 text-sm mt-1">This ID is already taken.</p>
              )}
            </div>

            {/* Product Name (Tamil) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name (Tamil) *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., மிளகாய் தூள்"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-base"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Supports Tamil / Unicode text.</p>
            </div>

            {/* Product Name (English) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name (English)
              </label>
              <input
                type="text"
                value={productNameEn}
                onChange={(e) => setProductNameEn(e.target.value)}
                placeholder="e.g., Chilli Powder"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-base"
              />
            </div>

            {/* Quantity & Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g., 100"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="e.g., 55"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-base"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isAdding || idExists || loading || sNo === null}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg text-base"
            >
              {isAdding ? 'Adding Product...' : 'Add Product'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;