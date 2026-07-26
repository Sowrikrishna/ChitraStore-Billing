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
const DeleteProduct = () => {
  const [productId, setProductId] = useState('');
  const [product, setProduct] = useState(null); // full product details
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  // ---------- Check & fetch product details ----------
  const handleCheck = async () => {
    const id = productId.trim();
    if (!id) {
      setMessage({ type: 'warning', text: 'Please enter a Product ID.' });
      return;
    }

    setChecking(true);
    setMessage({ type: '', text: '' });
    setProduct(null);
    setError(null);

    try {
      const data = await jsonpRequest(`${BASE_URL}?action=getProductById&id=${encodeURIComponent(id)}`);
      if (data.success) {
        setProduct(data.product);
        setMessage({ type: 'info', text: `Product "${id}" found. Review details below.` });
      } else {
        setError(data.message || 'Product not found.');
        setMessage({ type: 'error', text: data.message || 'Product not found.' });
      }
    } catch (error) {
      console.error('Check error:', error);
      setMessage({ type: 'error', text: 'Network error while checking ID. Details: ' + error.message });
    } finally {
      setChecking(false);
    }
  };

  // ---------- Delete product ----------
  const handleDelete = async () => {
    if (!product) {
      setMessage({ type: 'warning', text: 'Please check a product first.' });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete product "${product.product_id}"?\nThis will permanently remove it and renumber S.No.`)) {
      return;
    }

    setDeleting(true);
    setMessage({ type: '', text: '' });

    try {
      const data = await jsonpRequest(`${BASE_URL}?action=deleteProduct&id=${encodeURIComponent(product.product_id)}`);
      if (data.success) {
        setMessage({ type: 'success', text: `Product "${product.product_id}" deleted successfully. S.No renumbered.` });
        setProduct(null);
        setProductId('');
      } else {
        setMessage({ type: 'error', text: 'Failed to delete: ' + data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error while deleting product. Details: ' + error.message });
    } finally {
      setDeleting(false);
    }
  };

  // ---------- Message box ----------
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
      <div className="max-w-2xl mx-auto">
        <button
                      onClick={() => navigate('/')}
                      className="p-2 rounded-full bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                      aria-label="Back to Dashboard">
                        <FaArrowLeft className="text-gray-600 w-4 h-4" />
                    </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
          Delete Product
        </h1>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          {/* Input area */}
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
                  setProduct(null);
                  setMessage({ type: '', text: '' });
                }}
                placeholder="e.g., P001"
                className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-base"
                disabled={deleting}
              />
              <button
                type="button"
                onClick={handleCheck}
                disabled={checking || deleting || !productId.trim()}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap text-sm font-medium"
              >
                {checking ? 'Checking...' : 'Check'}
              </button>
            </div>

            {/* Message shown right under the Product ID field */}
            <div className="mt-2">{renderMessage()}</div>
          </div>

          {/* Product preview (if found) */}
          {product && (
            <div className="mb-6 border rounded-lg p-3 sm:p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm sm:text-base">
                Product Details
              </h3>
              <div className="grid grid-cols-[auto_1fr] sm:grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div className="font-medium text-gray-500">S.No</div>
                <div className="break-words">{product.s_no}</div>
                <div className="font-medium text-gray-500">Product ID</div>
                <div className="font-mono break-all">{product.product_id}</div>
                <div className="font-medium text-gray-500">Name (Tamil)</div>
                <div className="break-words">{product.product_name}</div>
                <div className="font-medium text-gray-500">Name (English)</div>
                <div className="break-words">{product.product_name_en || '-'}</div>
                <div className="font-medium text-gray-500">Quantity</div>
                <div className="break-words">{product.quantity}</div>
                <div className="font-medium text-gray-500">Rate (₹)</div>
                <div className="break-words">₹{product.rate}</div>
              </div>
            </div>
          )}

          {/* Delete button – enabled only when product is loaded */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || !product}
            className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg text-base"
          >
            {deleting ? 'Deleting...' : 'Delete Product'}
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center px-2">
            ⚠️ This action is permanent. The S.No column will be automatically renumbered after deletion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeleteProduct;