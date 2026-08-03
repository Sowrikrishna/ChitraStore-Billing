import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// ============================================================
// CONFIGURATION
// ============================================================
const BASE_URL = import.meta.env.VITE_PRODUCT_URL;

// ============================================================
// ROBUST JSONP HELPER (never rejects, retries, returns { success, ... })
// ============================================================
function jsonpRequest(url, timeout = 30000, retries = 2) {
  return new Promise((resolve) => {
    const attempt = (remaining) => {
      const script = document.createElement('script');
      const callback = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
      const timer = setTimeout(() => {
        cleanup();
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 2000);
        } else {
          resolve({ success: false, message: 'Request timed out' });
        }
      }, timeout);

      window[callback] = function (data) {
        cleanup();
        resolve(data);
      };

      function cleanup() {
        clearTimeout(timer);
        delete window[callback];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callback;
      script.onerror = function () {
        cleanup();
        if (remaining > 0) {
          setTimeout(() => attempt(remaining - 1), 2000);
        } else {
          resolve({ success: false, message: 'Network error' });
        }
      };
      document.body.appendChild(script);
    };
    attempt(retries);
  });
}

// ============================================================
// CACHE HELPERS (for product list – used for fast ID checks)
// ============================================================
const PRODUCTS_CACHE_KEY = 'addProduct_products_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedProducts() {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedProducts(data) {
  try {
    localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    /* ignore */
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const AddProduct = () => {
  const navigate = useNavigate();

  // ---------- Form fields ----------
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productNameEn, setProductNameEn] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [sNo, setSNo] = useState(null);

  // ---------- UI states ----------
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [idExists, setIdExists] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  const fetchingRef = useRef(false);

  // ---------- Fetch products list (for local ID checks) ----------
  const fetchProducts = async (forceRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!forceRefresh) {
      const cached = getCachedProducts();
      if (cached) {
        setAllProducts(cached);
        setProductsLoaded(true);
        fetchingRef.current = false;
        // Background refresh
        setTimeout(() => fetchProducts(true), 100);
        return;
      }
    }

    const res = await jsonpRequest(`${BASE_URL}?action=getProducts`);
    if (res.success) {
      setAllProducts(res.data);
      setCachedProducts(res.data);
      setProductsLoaded(true);
    } else {
      // If cache exists, keep using it
      const cached = getCachedProducts();
      if (cached) {
        setAllProducts(cached);
        setProductsLoaded(true);
      } else {
        setMessage({ type: 'error', text: 'Failed to load product list. ID checks may be slow.' });
      }
    }
    fetchingRef.current = false;
  };

  // ---------- Fetch next S.No on mount ----------
  useEffect(() => {
    const fetchNextSNo = async () => {
      const res = await jsonpRequest(`${BASE_URL}?action=getNextSNo`);
      if (res.success) {
        setSNo(res.nextSNo);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch next S.No: ' + res.message });
      }
    };
    fetchNextSNo();

    // Also load product list for fast ID checks
    fetchProducts(false);
  }, []);

  // ---------- Check Product ID uniqueness (local + remote fallback) ----------
  const handleCheckId = () => {
    const id = productId.trim();
    if (!id) {
      setMessage({ type: 'warning', text: 'Please enter a Product ID to check.' });
      return;
    }

    setCheckLoading(true);
    setMessage({ type: '', text: '' });

    // 1. Try local lookup if products are loaded
    if (productsLoaded) {
      const found = allProducts.some(p => p.product_id === id);
      setIdExists(found);
      if (found) {
        setMessage({ type: 'error', text: `Product ID "${id}" already exists.` });
      } else {
        setMessage({ type: 'success', text: `Product ID "${id}" is available.` });
      }
      setCheckLoading(false);
      return;
    }

    // 2. Fallback to remote check
    (async () => {
      const res = await jsonpRequest(`${BASE_URL}?action=checkProductId&id=${encodeURIComponent(id)}`);
      if (res.success) {
        setIdExists(res.exists);
        if (res.exists) {
          setMessage({ type: 'error', text: `Product ID "${id}" already exists.` });
        } else {
          setMessage({ type: 'success', text: `Product ID "${id}" is available.` });
        }
      } else {
        setMessage({ type: 'error', text: 'Error checking ID: ' + res.message });
      }
      setCheckLoading(false);
    })();
  };

  // ---------- Add new product ----------
  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!productId.trim() || !productName.trim() || !quantity || !rate) {
      setMessage({ type: 'warning', text: 'Please fill in all required fields.' });
      return;
    }

    // Double‑check uniqueness (if products loaded)
    if (productsLoaded) {
      const found = allProducts.some(p => p.product_id === productId.trim());
      if (found) {
        setMessage({ type: 'error', text: 'Product ID already exists. Please change it.' });
        return;
      }
    } else if (idExists) {
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

    const res = await jsonpRequest(
      `${BASE_URL}?action=addProduct&data=${encodeURIComponent(JSON.stringify(payload))}`
    );
    if (res.success) {
      setMessage({ type: 'success', text: `Product "${productName}" added successfully!` });
      // Increment S.No locally
      setSNo((prev) => (prev !== null ? prev + 1 : 1));
      // Reset form
      setProductId('');
      setProductName('');
      setProductNameEn('');
      setQuantity('');
      setRate('');
      setIdExists(false);
      // Invalidate product cache so Dashboard and others see the change
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      // Update local product list (add the new product)
      const newProduct = {
        product_id: payload.product_id,
        product_name: payload.product_name,
        product_name_en: payload.product_name_en,
        quantity: payload.quantity,
        rate: payload.rate,
        s_no: payload.s_no,
      };
      setAllProducts((prev) => [...prev, newProduct]);
      setCachedProducts([...allProducts, newProduct]);
    } else {
      setMessage({ type: 'error', text: 'Failed to add product: ' + res.message });
    }
    setIsAdding(false);
  };

  // ---------- Render message ----------
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
                    setIdExists(false);
                    setMessage({ type: '', text: '' });
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


