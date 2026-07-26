

import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// A4 dimensions
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 3.7795275591;
const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * MM_TO_PX); // ~794px
const PREVIEW_SIDE_GUTTER_PX = 16;

const PrintView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const products = location.state?.products || [];
  // Use quotationNo from state, fallback only if missing (should not happen)
  const quotationNo = location.state?.quotationNo || 'Q-0000';
  const printRef = useRef();
  const previewViewportRef = useRef();
  const [isPrinting, setIsPrinting] = useState(false);

  // ------------------------------------------------------------
  // Mobile-responsive preview: scale the A4 document to fit viewport
  // ------------------------------------------------------------
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const computeScale = () => {
      const available =
        (previewViewportRef.current && previewViewportRef.current.clientWidth) ||
        window.innerWidth;
      const usable = Math.max(available - PREVIEW_SIDE_GUTTER_PX, 120);
      const nextScale = Math.min(1, usable / A4_WIDTH_PX);
      setScale(nextScale);
    };

    computeScale();
    window.addEventListener('resize', computeScale);
    return () => window.removeEventListener('resize', computeScale);
  }, []);

  useEffect(() => {
    if (!printRef.current) return undefined;
    const el = printRef.current;
    const update = () => setContentHeight(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [products]);

  // Date and time for display – use current time (or optionally pass from parent)
  const billTimestamp = location.state?.timestamp;
  const billDate = billTimestamp ? new Date(billTimestamp) : new Date();
  const dateStr = billDate.toLocaleDateString('en-IN', { day: '2-digit', month:       'short', year: 'numeric' });
  const timeStr = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const grandTotal = products.reduce((sum, item) => sum + item.amount, 0);
  const totalItems = products.length;

  const formatQty = (item) => {
    const raw =
      item.quantity_display !== undefined && item.quantity_display !== null
        ? item.quantity_display
        : item.quantity;
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    return Number.isInteger(n) ? String(n) : n.toFixed(3);
  };

  // Auto‑print (once)
  const printedRef = useRef(false);
  useEffect(() => {
    if (printedRef.current) return;
    printedRef.current = true;

    let cancelled = false;
    const triggerPrint = () => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) window.print();
        });
      });
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(triggerPrint).catch(triggerPrint);
    } else {
      triggerPrint();
    }

    const fallback = setTimeout(triggerPrint, 1200);
    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, []);

  // Helper: wait for images
  const waitForImages = (el) => {
    const imgs = Array.from(el.querySelectorAll('img'));
    if (imgs.length === 0) return Promise.resolve();
    return Promise.all(
      imgs.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  };

  // Helper: slice canvas to data URL
  const canvasSliceToDataUrl = (sourceCanvas, startY, sliceHeight) => {
    const safeHeight = Math.max(1, Math.floor(sliceHeight));
    const safeWidth = Math.max(1, Math.floor(sourceCanvas.width));

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = safeWidth;
    pageCanvas.height = safeHeight;

    const ctx = pageCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, safeWidth, safeHeight);
    ctx.drawImage(
      sourceCanvas,
      0,
      Math.floor(startY),
      safeWidth,
      safeHeight,
      0,
      0,
      safeWidth,
      safeHeight
    );

    const dataUrl = pageCanvas.toDataURL('image/jpeg', 0.95);
    if (!dataUrl || !dataUrl.startsWith('data:image/jpeg;base64,') || dataUrl.length < 100) {
      throw new Error('Failed to render a valid page image (empty canvas slice).');
    }
    return { dataUrl, widthPx: safeWidth, heightPx: safeHeight };
  };

  // ============================================================
  //  PDF DOWNLOAD (unchanged logic)
  // ============================================================
  const handleDownloadPDF = async () => {
    if (isPrinting) return;
    setIsPrinting(true);

    const original = printRef.current;
    if (!original) {
      setIsPrinting(false);
      return;
    }

    const clone = original.cloneNode(true);
    clone.removeAttribute('id');

    clone.style.width = `${A4_WIDTH_PX}px`;
    clone.style.maxWidth = 'none';
    clone.style.minWidth = `${A4_WIDTH_PX}px`;
    clone.style.margin = '0';

    const isolatedContainer = document.createElement('div');
    isolatedContainer.style.position = 'fixed';
    isolatedContainer.style.top = '0';
    isolatedContainer.style.left = '-99999px';
    isolatedContainer.style.width = `${A4_WIDTH_PX}px`;
    isolatedContainer.style.background = '#ffffff';
    isolatedContainer.style.zIndex = '-1';
    isolatedContainer.appendChild(clone);
    document.body.appendChild(isolatedContainer);

    try {
      await waitForImages(clone);
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      const fullWidth = A4_WIDTH_PX;
      const fullHeight = clone.scrollHeight;

      if (!fullHeight || fullHeight < 10) {
        throw new Error('Bill content has no measurable height — nothing to export.');
      }

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        scrollX: 0,
        scrollY: 0,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('html2canvas produced an empty canvas — capture failed.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageHeightMm = A4_HEIGHT_MM;
      const imgWidthMm = A4_WIDTH_MM;
      const totalImgHeightMm = (canvas.height * imgWidthMm) / canvas.width;

      if (totalImgHeightMm <= pageHeightMm) {
        const { dataUrl } = canvasSliceToDataUrl(canvas, 0, canvas.height);
        pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidthMm, totalImgHeightMm);
      } else {
        const pageHeightPx = Math.floor((pageHeightMm * canvas.width) / imgWidthMm);
        let renderedHeightPx = 0;
        let pageIndex = 0;
        const maxPages = 50;

        while (renderedHeightPx < canvas.height && pageIndex < maxPages) {
          const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
          if (sliceHeightPx <= 0) break;

          const { dataUrl, heightPx } = canvasSliceToDataUrl(
            canvas,
            renderedHeightPx,
            sliceHeightPx
          );
          const sliceHeightMm = (heightPx * imgWidthMm) / canvas.width;

          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidthMm, sliceHeightMm);

          renderedHeightPx += sliceHeightPx;
          pageIndex += 1;
        }

        if (renderedHeightPx < canvas.height) {
          console.warn('PDF export stopped early — hit the max page safety limit.');
        }
      }

      pdf.save(`Chitra_Store_Quotation_${quotationNo}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert(`Failed to generate PDF: ${error.message || 'Unknown error'}. Please try printing instead.`);
    } finally {
      document.body.removeChild(isolatedContainer);
      setIsPrinting(false);
    }
  };

  const scaledWidthPx = A4_WIDTH_PX * scale;
  const scaledHeightPx = contentHeight * scale;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-4 overflow-x-hidden px-2">
      {/* Buttons */}
      <div className="w-full max-w-[210mm] mb-4 flex flex-wrap gap-2 justify-between no-print px-2">
        <button
          onClick={() => navigate('/new-bill')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm sm:text-base"
        >
          ← Back to New Bill
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isPrinting}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm sm:text-base"
        >
          {isPrinting ? 'Generating...' : '⬇ Download PDF'}
        </button>
      </div>

      {/* Preview with scaling */}
      <div ref={previewViewportRef} className="preview-viewport">
        <div
          className="preview-scale-outer"
          style={{
            width: `${scaledWidthPx}px`,
            height: scaledHeightPx ? `${scaledHeightPx}px` : 'auto',
          }}
        >
          <div
            className="preview-scale-inner"
            style={{
              width: `${A4_WIDTH_PX}px`,
              transform: `scale(${scale})`,
            }}
          >
            <div ref={printRef} id="bill-content" className="print-wrapper">
              <style>{`
                @page { size: A4; margin: 0; }
                @media print {
                  body { margin: 0; background: white; }
                  .print-wrapper {
                    width: 210mm;
                    min-height: 297mm;
                    padding: 15mm;
                    font-family: 'Courier New', monospace;
                  }
                  .no-print { display: none !important; }
                  .preview-viewport,
                  .preview-scale-outer,
                  .preview-scale-inner {
                    all: revert !important;
                  }
                }
                .print-wrapper {
                  width: 210mm;
                  min-height: 297mm;
                  padding: 15mm;
                  margin: 0 auto;
                  background: white;
                  font-family: 'Courier New', monospace;
                  font-size: 12pt;
                  line-height: 1.5;
                  font-weight: bold;
                  box-sizing: border-box;
                  overflow: visible !important;
                }
                .print-wrapper,
                .print-wrapper * {
                  font-weight: bold !important;
                  box-sizing: border-box;
                }
                .tamil-symbol {
                  text-align: center;
                  font-size: 12pt;
                  font-weight: bold;
                  margin-bottom: 4mm;
                }
                .bill-header {
                  display: flex;
                  justify-content: space-between;
                  border-bottom: 2px dashed #333;
                  padding-bottom: 5mm;
                  margin-bottom: 6mm;
                }
                .store-info { font-weight: bold; }
                .store-name {
                  font-size: 20pt;
                  font-weight: bold;
                  margin-bottom: 2mm;
                }
                .quotation-info {
                  text-align: right;
                  font-size: 12pt;
                }
                .quotation-title {
                  font-size: 16pt;
                  font-weight: bold;
                  margin-bottom: 2mm;
                }
                .quotation-info .quotation-no {
                  font-weight: bold;
                }
                .bill-table {
                  width: 100%;
                  table-layout: fixed;
                  border-collapse: collapse;
                  font-size: 12pt;
                  margin-top: 4mm;
                }
                .bill-table col.col-sno     { width: 8%; }
                .bill-table col.col-product { width: 50%; }
                .bill-table col.col-qty     { width: 12%; }
                .bill-table col.col-rate    { width: 13%; }
                .bill-table col.col-amount  { width: 17%; }
                .bill-table th {
                  border-bottom: 2px solid #333;
                  text-align: left;
                  padding: 3mm 2mm;
                  font-weight: bold;
                  white-space: nowrap;
                  
                }
                .bill-table td {
                  padding: 2.5mm 2mm;
                  border-bottom: 1px dotted #ccc;
                  vertical-align: top;
                }
                .bill-table td.product-cell {
                  word-break: break-word;
                  overflow-wrap: break-word;
                  white-space: normal;
                }
                .bill-table .right { text-align: right; }
                .bill-table .center { text-align: center; }
                .bill-table td.right,
                .bill-table th.right {
                  font-variant-numeric: tabular-nums;
                  white-space: nowrap;
                }
                .bill-table td.amount-cell {
                  font-weight: bold;
                  white-space: nowrap;
                }
                .grand-total {
                  margin-top: 5mm;
                  display: flex;
                  justify-content: space-between;
                  align-items: baseline;
                  border-top: 3px solid #333;
                  padding-top: 3mm;
                }
                .grand-total .total-items {
                  font-size: 12pt;
                  font-weight: bold;
                }
                .grand-total .total-amount {
                  font-weight: bold;
                  font-size: 15pt;
                  white-space: nowrap;
                }
                .footer {
                  margin-top: 8mm;
                  text-align: center;
                  font-size: 13pt;
                  color: #333;
                  border-top: 1px dashed #333;
                  padding-top: 5mm;
                }
                .whatsapp-line {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 2mm;
                  font-size: 13pt;
                  font-weight: bold;
                  color: #075E54;
                  
                }
                .preview-viewport {
                  width: 100%;
                  max-width: 210mm;
                  display: flex;
                  justify-content: center;
                }
                .preview-scale-outer {
                  overflow: hidden;
                  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
                }
                .preview-scale-inner {
                  transform-origin: top left;
                }
              `}</style>

              <div className="tamil-symbol">உ</div>

              <div className="bill-header">
                <div className="store-info">
                  <div className="store-name">Chitra Store</div>
                  <div>Kaja Kadai Lane,</div>
                  <div>Palakkarai, Trichy-620008.</div>
                  <div>Phone: 9786641408</div>
                </div>
                <div className="quotation-info">
                  <div className="quotation-title">Quotation</div>
                  <div className="quotation-no">No: {quotationNo}</div>
                  <div>Date: {dateStr}</div>
                  <div>Time: {timeStr}</div>
                </div>
              </div>

              {products.length === 0 ? (
                <p style={{ textAlign: 'center', marginTop: '10mm' }}>No items in bill.</p>
              ) : (
                <>
                  <table className="bill-table">
                    <colgroup>
                      <col className="col-sno" />
                      <col className="col-product" />
                      <col className="col-qty" />
                      <col className="col-rate" />
                      <col className="col-amount" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="center">S.No</th>
                        <th>Product</th>
                        <th className="right">Qty</th>
                        <th className="right">Rate</th>
                        <th className="right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((item, idx) => (
                        <tr key={idx}>
                          <td className="center">{idx + 1}</td>
                          <td className="product-cell">{item.product_name}</td>
                          <td className="right">{formatQty(item)}</td>
                          <td className="right">{item.rate}</td>
                          <td className="right amount-cell">₹{item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="grand-total">
                    <span className="total-items">Total Items: {totalItems}</span>
                    <span className="total-amount">Grand Total: ₹{grandTotal.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="footer">
                <div>Thank you for your business!</div>
                <div className="whatsapp-line">
                  <svg width="14" height="14" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <circle cx="16" cy="18" r="18" fill="#25D366" />
                    <path
                      fill="#FFFFFF"
                      d="M23.47 8.52A10.9 10.9 0 0016 5.5a10.95 10.95 0 00-9.48 16.4L5.5 26.5l4.73-1.24a10.93 10.93 0 005.77 1.65h.01a10.95 10.95 0 007.46-18.4zm-7.46 16.8h-.01a9.1 9.1 0 01-4.63-1.27l-.33-.2-3.44.9.92-3.36-.22-.35a9.1 9.1 0 01-1.4-4.86A9.14 9.14 0 0116 7.31a9.06 9.06 0 016.44 2.68A9.06 9.06 0 0125.13 16a9.14 9.14 0 01-9.12 9.32zm5.01-6.85c-.27-.14-1.62-.8-1.87-.9-.25-.09-.43-.14-.62.14-.18.27-.71.9-.87 1.08-.16.18-.32.2-.6.07-.27-.14-1.14-.42-2.18-1.35-.8-.72-1.35-1.6-1.5-1.88-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.28 0 1.35.98 2.65 1.12 2.83.14.18 1.93 2.95 4.68 4.14.65.28 1.16.45 1.56.58.66.21 1.25.18 1.72.11.53-.08 1.62-.66 1.85-1.3.23-.63.23-1.18.16-1.3-.07-.11-.25-.18-.52-.32z"
                    />
                  </svg>
                  For WhatsApp Order No: 8056960138
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintView;