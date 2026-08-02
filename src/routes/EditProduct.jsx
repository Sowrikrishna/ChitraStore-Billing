

// EditProduct.jsx
import React, { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

// ============================================================
// CONFIGURATION – MUST match your deployed Web App URL
// ============================================================
const BASE_URL = import.meta.env.VITE_PRODUCT_URL;

// ============================================================
// JSONP helper with timeout
// ============================================================
function jsonpRequest(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callback = 'jsonp_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Request timed out after ' + timeout + 'ms'));
    }, timeout);

    window[callback] = function(data) {
      cleanup();
      resolve(data);
    };

    function cleanup() {
      clearTimeout(timer);
      delete window[callback];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + callback;
    script.onerror = function() {
      cleanup();
      reject(new Error('Network error – check URL and CORS settings.'));
    };
    document.body.appendChild(script);
  });
}

// ============================================================
// MAIN COMPONENT
// ============================================================
const EditProduct = () => {
  // ---------- Form state ----------
  const [sNo, setSNo] = useState(null);
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productNameEn, setProductNameEn] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');

  const navigate=useNavigate();

  // ---------- UI states ----------
  const [loading, setLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [productFound, setProductFound] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchId, setSearchId] = useState('');

  // ---------- Fetch product by ID ----------
  const handleFetchProduct = async () => {
    const id = searchId.trim();
    if (!id) {
      setMessage({ type: 'warning', text: 'Please enter a Product ID to edit.' });
      return;
    }

    setCheckLoading(true);
    setMessage({ type: '', text: '' });
    setProductFound(false);
    // Reset form fields
    setProductId('');
    setProductName('');
    setProductNameEn('');
    setQuantity('');
    setRate('');
    setSNo(null);

    try {
      const data = await jsonpRequest(`${BASE_URL}?action=getProductById&id=${encodeURIComponent(id)}`);
      if (data.success && data.product) {
        const p = data.product;
        setSNo(p.s_no);
        setProductId(p.product_id);
        setProductName(p.product_name);
        setProductNameEn(p.product_name_en || '');
        setQuantity(p.quantity.toString());
        setRate(p.rate.toString());
        setProductFound(true);
        setMessage({ type: 'success', text: `Product "${id}" loaded. Edit the details below.` });
      } else {
        setMessage({ type: 'error', text: data.message || 'Product not found.' });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setMessage({ type: 'error', text: 'Network error while fetching product. Details: ' + error.message });
    } finally {
      setCheckLoading(false);
    }
  };

  // ---------- Update product ----------
  const handleUpdate = async (e) => {
    e.preventDefault();

    // Keep a stable copy of the loaded Product ID so nothing in this
    // flow can accidentally blank the read-only field on screen.
    const currentProductId = productId.trim();

    // Validation
    if (!currentProductId || !productName.trim() || !quantity || !rate) {
      setMessage({ type: 'warning', text: 'Please fill in all required fields (ID, Name, Quantity, Rate).' });
      return;
    }

    const payload = {
      s_no: sNo,
      product_id: currentProductId,
      product_name: productName.trim(),
      product_name_en: productNameEn.trim(),
      quantity: parseFloat(quantity),
      rate: parseFloat(rate),
    };

    setUpdating(true);
    setMessage({ type: '', text: '' });

    try {
      const data = await jsonpRequest(`${BASE_URL}?action=updateProduct&data=${encodeURIComponent(JSON.stringify(payload))}`);
      if (data.success) {
        setMessage({ type: 'success', text: `Product "${currentProductId}" updated successfully!` });
        // Re-assert the loaded values so the read-only Product ID (and
        // the rest of the form) keep showing what was just saved,
        // regardless of what shape the backend's response is in.
        setProductId(currentProductId);
        setProductName(payload.product_name);
        setProductNameEn(payload.product_name_en);
        setQuantity(payload.quantity.toString());
        setRate(payload.rate.toString());
      } else {
        setMessage({ type: 'error', text: 'Failed to update product: ' + data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while updating product.' });
    } finally {
      setUpdating(false);
    }
  };

  // ---------- Clear form ----------
  const handleClear = () => {
    setSearchId('');
    setProductId('');
    setProductName('');
    setProductNameEn('');
    setQuantity('');
    setRate('');
    setSNo(null);
    setProductFound(false);
    setMessage({ type: '', text: '' });
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
          styles[message.type] || 'bg-blue-100 text-blue-700 border-blue-200'
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
                      onClick={() => navigate('/')}
                      className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                      aria-label="Back to Dashboard">
                        <FaArrowLeft className="text-gray-600 w-4 h-4" />
                    </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
          Edit Product
        </h1>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          {/* Product lookup */}
          <div className="mb-5 pb-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Find Product to Edit
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Product ID, e.g., P001"
                className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-base"
                disabled={checkLoading || updating}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFetchProduct}
                  disabled={checkLoading || updating || !searchId.trim()}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap text-sm font-medium"
                >
                  {checkLoading ? 'Loading...' : 'Load Product'}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={checkLoading || updating}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 active:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Message shown right under the lookup controls */}
            <div className="mt-2">{renderMessage()}</div>
          </div>

          {/* Edit form – only shown when product is found */}
          {productFound && (
            <form onSubmit={handleUpdate}>
              {/* S.No (read-only) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  S.No (Auto, read-only)
                </label>
                <input
                  type="text"
                  value={sNo !== null ? sNo : ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed text-base"
                />
              </div>

              {/* Product ID (read-only, can't change) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product ID (read-only)
                </label>
                <input
                  type="text"
                  value={productId}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed text-base"
                />
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

              {/* Update button */}
              <button
                type="submit"
                disabled={updating}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg text-base"
              >
                {updating ? 'Updating...' : 'Update Product'}
              </button>
            </form>
          )}

          {!productFound && !checkLoading && !message.text && (
            <div className="text-center text-gray-400 py-8 text-sm sm:text-base">
              Enter a Product ID and click "Load Product" to start editing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProduct;


