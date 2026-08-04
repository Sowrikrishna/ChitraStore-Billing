
// // SaveBill.jsx
// import React, { useState, useRef } from 'react';

// const SAVE_URL = import.meta.env.VITE_BILL_URL;

// const SaveBill = ({ isOpen, onClose, products, totalAmount, onSaveSuccess }) => {
//   const [customerName, setCustomerName] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(false);

//   const iframeRef = useRef(null);
//   const formRef = useRef(null);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (!customerName.trim()) {
//       alert('Please enter a customer name.');
//       return;
//     }
//     if (!products || products.length === 0) {
//       alert('Cannot save an empty bill.');
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     // Clean product data
//     const cleanedProducts = products.map(({ product_id, product_name, quantity, rate, amount }) => ({
//       product_id,
//       product_name,
//       quantity,
//       rate,
//       amount
//     }));

//     const payload = {
//       action: 'newBill',
//       customerName: customerName.trim(),
//       products: cleanedProducts,
//       totalAmount: totalAmount,
//       timestamp: Date.now(),
//     };

//     // Create or reuse a hidden iframe
//     if (!iframeRef.current) {
//       const iframe = document.createElement('iframe');
//       iframe.name = 'saveBillIframe';
//       iframe.style.display = 'none';
//       document.body.appendChild(iframe);
//       iframeRef.current = iframe;
//     }

//     const handleLoad = () => {
//       iframeRef.current.removeEventListener('load', handleLoad);
//       setLoading(false);
//       setSuccess(true);
//       if (onSaveSuccess) onSaveSuccess();
//       setTimeout(() => onClose(), 1500);
//     };
//     iframeRef.current.addEventListener('load', handleLoad);

//     // Build hidden form with a single 'payload' field
//     const form = document.createElement('form');
//     form.method = 'POST';
//     form.action = SAVE_URL;
//     form.target = 'saveBillIframe';
//     form.enctype = 'multipart/form-data';
//     form.style.display = 'none';

//     const input = document.createElement('input');
//     input.type = 'hidden';
//     input.name = 'payload';
//     input.value = JSON.stringify(payload);
//     form.appendChild(input);

//     document.body.appendChild(form);
//     formRef.current = form;
//     form.submit();

//     setTimeout(() => {
//       if (form.parentNode) form.parentNode.removeChild(form);
//     }, 100);
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
//         <h2 className="text-xl font-bold text-gray-800 mb-4">Save Bill</h2>
//         {success ? (
//           <div className="text-green-600 text-center py-4">
//             <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
//             </svg>
//             <p>Bill saved successfully!</p>
//           </div>
//         ) : (
//           <form onSubmit={handleSubmit}>
//             <div className="mb-4">
//               <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
//                 Customer Name
//               </label>
//               <input
//                 type="text"
//                 id="customerName"
//                 value={customerName}
//                 onChange={(e) => setCustomerName(e.target.value)}
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 placeholder="Enter customer name"
//                 required
//                 autoFocus
//               />
//             </div>
//             {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
//             <div className="flex justify-end gap-3">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="px-4 py-2 text-gray-600 hover:text-gray-800"
//                 disabled={loading}
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
//                 disabled={loading}
//               >
//                 {loading ? 'Saving...' : 'Save Bill'}
//               </button>
//             </div>
//           </form>
//         )}
//       </div>
//     </div>
//   );
// };

// export default SaveBill;






// SaveBill.jsx
import React, { useState, useEffect, useRef } from 'react';

const SAVE_URL = import.meta.env.VITE_BILL_URL;

const SaveBill = ({ isOpen, onClose, products, totalAmount, onSaveSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const iframeRef = useRef(null);
  const formRef = useRef(null);

  // Listen for postMessage from the iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Optional: validate origin if you know it
      // if (event.origin !== 'https://script.google.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'billSaveResult') {
          setLoading(false);
          if (data.success) {
            setSuccess(true);
            if (onSaveSuccess) onSaveSuccess();
            setTimeout(() => onClose(), 1500);
          } else {
            setError(data.error || 'Unknown error saving bill.');
          }
        }
      } catch (_) { /* ignore non‑JSON messages */ }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSaveSuccess, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter a customer name.');
      return;
    }
    if (!products || products.length === 0) {
      alert('Cannot save an empty bill.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const cleanedProducts = products.map(({ product_id, product_name, quantity, rate, amount }) => ({
      product_id,
      product_name,
      quantity,
      rate,
      amount
    }));

    const payload = {
      action: 'newBill',
      customerName: customerName.trim(),
      products: cleanedProducts,
      totalAmount,
      timestamp: Date.now(),
    };

    // Create hidden iframe if not already present
    if (!iframeRef.current) {
      const iframe = document.createElement('iframe');
      iframe.name = 'saveBillIframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    }

    // Build hidden form with a single 'payload' field (multipart/form‑data)
    const form = document.createElement('form');
    form.method = 'POST';
    // Add _iframe=true to tell the server to return HTML with postMessage
    const url = new URL(SAVE_URL);
    url.searchParams.set('_iframe', 'true');
    form.action = url.toString();
    form.target = 'saveBillIframe';
    form.enctype = 'multipart/form-data';
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(payload);
    form.appendChild(input);

    document.body.appendChild(form);
    formRef.current = form;
    form.submit();

    // Clean up form after submission
    setTimeout(() => {
      if (form.parentNode) form.parentNode.removeChild(form);
    }, 100);
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