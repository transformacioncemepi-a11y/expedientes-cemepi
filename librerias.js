/* Librerías externas: versión fija y huella verificada (SRI). PDF, ZIP y QR se cargan solo cuando se usan. */
const LIBS={zip:{g:"JSZip",src:"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",sri:"sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG"},
  pdf:{g:"PDFLib",src:"https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",sri:"sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI"},
  pdfjs:{g:"pdfjsLib",src:"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",sri:"sha384-/1qUCSGwTur9vjf/z9lmu/eCUYbpOTgSjmpbMQZ1/CtX2v/WcAIKqRv+U1DUCG6e"},
  pdfjsw:{g:"pdfjsWorker",src:"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",sri:"sha384-SnzOobpRMLXZ52iJvZm/C0fYw0OQemTXzTjIsdsfMcrCtCEe9qgzxTd3RSklO5x2"},
  qr:{g:"qrcode",src:"https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js",sri:"sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1"}};
const libsCargando={};
function libCargar(k){ const L=LIBS[k]; if (window[L.g]) return Promise.resolve();
  return libsCargando[k] ||= new Promise((ok,mal)=>{ const x=document.createElement("script"); x.src=L.src; x.integrity=L.sri; x.crossOrigin="anonymous";
    x.onload=()=>ok(); x.onerror=()=>{ delete libsCargando[k]; x.remove(); mal(new Error("No se pudo cargar "+L.g)); }; document.head.appendChild(x); }); }
async function libLista(k){ try{ await libCargar(k); return true; }catch(e){ console.warn(e); return false; } }
