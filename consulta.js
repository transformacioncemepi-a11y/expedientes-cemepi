/* Portal del consultante. Antes vivía en línea dentro de consulta.html; se separó (P29) para quitar 'unsafe-inline' de la CSP. */
document.addEventListener("submit", e => { if (e.target.matches?.("form[data-sin-envio]")) e.preventDefault(); }, true);
const { createClient } = window.supabase;   /* versión fija con huella verificada (SRI), cargada en <head> */
const NOTA = "Nota aclaratoria; El presente documento se elabora con fines exclusivamente de orientación, con base en lo observado y valorado durante el proceso terapéutico. No constituye un dictamen psicológico, peritaje, ni documento con alcances forenses o judiciales. Sus alcances se limitan a la comprensión terapéutica del momento actual de la consultante y pueden modificarse de acuerdo con la continuidad del proceso terapéutico y la evolución observada";
const cfg = window.CEMEPI_CONFIG || {};
const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const fechaLarga = f => { if (!f) return ""; const [y,m,d] = f.split("-").map(Number); return `${d} de ${MESES[m-1]} de ${y}`; };
let temporizador = null, avisoT = null, cred = null, datosAct = null;
/* P28 · Fase 5: el folio se acepta con minúsculas, espacios o guiones largos; el código, con o sin guion. Así se evitan intentos
   fallidos (que cuentan para la pausa de 15 minutos) por diferencias de escritura. No cambia lo que valida el servidor. */
const normFolio = f => { let x = String(f || "").toUpperCase().normalize("NFKC").replace(/[\u2010-\u2015\u2212_]/g, "-").replace(/\s+/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const m = x.replace(/-/g, "").match(/^CEMEPI([A-Z]{3})([A-Z]{3})(\d{4})(\d{4})$/); return m ? `CEMEPI-${m[1]}-${m[2]}-${m[3]}-${m[4]}` : x; };
const normCodigo = c => { const x = String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return x.length > 5 ? x.slice(0, 5) + "-" + x.slice(5, 10) : x; };
window.__portalNorm = { normFolio, normCodigo };   /* para pruebas locales */
function salir(){ cred = null; datosAct = null; $("#reportes").innerHTML = ""; $("#vista").hidden = true; $("#acceso").hidden = false; $("#frm").reset(); clearTimeout(temporizador); clearTimeout(avisoT); $("#avisoTiempo").hidden = true; }
/* Aviso un minuto antes de cerrar la sesión, con opción de seguir (WCAG 2.2.1) */
function vigilar(){ clearTimeout(temporizador); clearTimeout(avisoT); $("#avisoTiempo").hidden = true;
  avisoT = setTimeout(() => { $("#avisoTiempo").hidden = false; }, 14 * 60 * 1000); temporizador = setTimeout(salir, 15 * 60 * 1000); }
["click","keydown","scroll","touchstart"].forEach(e => document.addEventListener(e, () => { if (!$("#vista").hidden) vigilar(); }, { passive: true }));
$("#salir").onclick = salir; $("#seguir").onclick = vigilar;
$("#codigo").addEventListener("blur", () => { $("#codigo").value = normCodigo($("#codigo").value); });
$("#folio").addEventListener("blur", () => { $("#folio").value = normFolio($("#folio").value); });
function reporteHtml(r, i, datos){
  const secciones = (r.secciones || []).map(s => `${s.titulo ? `<h3>${esc(s.titulo)}</h3>` : ""}${String(s.texto || "").split(/\n{2,}/).map(t => `<p>${esc(t)}</p>`).join("")}`).join("");
  return `<article class="card rep" id="rep-${i}">
    <div class="fila no-print" style="margin-bottom:8px"><span class="status">Compartido el ${esc(new Date(r.liberado_en).toLocaleDateString("es-MX"))}</span><button class="sec" type="button" data-imprimir="${i}">Imprimir o guardar PDF</button></div>
    <h2>${esc(r.titulo)}</h2>
    <p class="lugar">${esc(r.lugar || "Ciudad de México")}, a ${esc(fechaLarga(r.fecha))}</p>
    <div class="ident">Folio: <b>${esc(datos.folio)}</b> · Iniciales: <b>${esc(datos.iniciales || "")}</b></div>
    ${secciones}
    <div class="firma">${r.firma ? `<img src="${esc(r.firma)}" alt="Firma del profesional">` : `<div style="height:50px"></div>`}<div class="linea"></div>
      <b>${esc(r.profesional)}</b><br><span class="status">Psicólogo(a) · Cédula profesional: ${esc(r.cedula || "")}</span><br><span class="status">CEMEPI · Centro Mexicano de Psicología Integrativa${r.sede ? " · Sede " + esc(r.sede) : ""}</span><br><span class="status">Tel. 55 9506 9766 · Dirección administrativa: Av. Victoria 18, Industrial, Gustavo A. Madero, 07800 Ciudad de México, CDMX.</span></div>
    <p class="nota">${esc(NOTA)}</p>
  </article>`;
}
const PARENT = ["madre","padre","tutor legal","otro representante legal"];
function consentHtml(c, datos){
  const secs = (c.texto?.secciones || []).map(s => `${s.titulo ? `<h3>${esc(s.titulo)}</h3>` : ""}${String(s.texto || "").split(/\n{2,}/).map(t => `<p>${esc(t)}</p>`).join("")}`).join("");
  if (c.estado === "firmado") return `<article class="card ci"><p class="ok" style="margin:0">Consentimiento informado firmado el ${esc(new Date(c.firmado_en).toLocaleString("es-MX"))}${c.firmante === "representante" ? ` por ${esc(c.parentesco || "el representante legal")}` : ""}.</p>
    <details style="margin-top:8px"><summary>Ver el texto que se firmó</summary><div class="texto" tabindex="0" role="region" aria-label="Texto del consentimiento firmado" style="margin-top:8px"><b>${esc(c.texto?.titulo || "")}</b>${secs}</div></details></article>`;
  const menor = !!datos.menor;
  return `<article class="card ci" data-ci="${esc(c.id)}">
    <h2 style="margin:0 0 4px;font-size:20px">Consentimiento informado pendiente de firma</h2>
    <p class="status" style="margin:0 0 10px">${menor ? "Como la persona consultante es menor de edad, debe firmar su madre, padre o representante legal." : "Léelo con calma. Si tienes dudas, coméntalas con tu psicólogo(a) antes de firmar."}</p>
    <div class="texto" tabindex="0" role="region" aria-label="Texto del consentimiento informado"><b>${esc(c.texto?.titulo || "")}</b><p class="status">Folio ${esc(datos.folio)} · Profesional: ${esc(c.profesional || "")}</p>${secs}</div>
    <label class="ck"><input type="checkbox" class="ck1" value="leido"> He leído la información, pude hacer preguntas y se resolvieron mis dudas.</label>
    <label class="ck"><input type="checkbox" class="ck1" value="confidencialidad"> Entiendo la confidencialidad y sus excepciones legales.</label>
    <label class="ck"><input type="checkbox" class="ck1" value="datos"> Acepto el tratamiento de mis datos personales conforme al aviso de privacidad de CEMEPI.</label>
    ${menor ? `<label class="ck"><input type="checkbox" class="ck1" value="representacion"> Declaro ser representante legal de la persona menor de edad y contar con facultades para otorgar este consentimiento.</label>` : ""}
    <label for="ci-f">¿Quién firma?</label><select id="ci-f">${menor ? "" : `<option value="consultante">Yo, la persona consultante</option>`}<option value="representante"${menor ? " selected" : ""}>Representante legal</option></select>
    <div id="ci-pf"${menor ? "" : " hidden"}><label for="ci-p">Parentesco o calidad</label><select id="ci-p"><option value="">Elige…</option>${PARENT.map(x => `<option>${esc(x)}</option>`).join("")}</select></div>
    <label for="ci-pad">Firma (con el dedo o el lápiz)</label><canvas id="ci-pad" width="900" height="300"></canvas>
    <div class="fila" style="margin-top:8px"><button class="sec" type="button" id="ci-borrar">Borrar firma</button><button type="button" id="ci-firmar">Firmar consentimiento</button></div>
    <div id="ci-err" class="error" hidden style="margin-top:10px"></div>
    <p class="status" style="margin:8px 0 0">No se guarda tu nombre: solo la firma, la fecha y el texto que aceptas.</p>
  </article>`;
}
let trazo = false;
function activarFirma(){
  const cv = $("#ci-pad"); if (!cv) return; const ctx = cv.getContext("2d"); ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0f2340"; trazo = false; let on = false;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.onpointerdown = e => { on = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + .1, y + .1); ctx.stroke(); trazo = true; };
  cv.onpointermove = e => { if (!on) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
  cv.onpointerup = cv.onpointercancel = () => { on = false; };
  $("#ci-borrar").onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); trazo = false; };
  $("#ci-f").onchange = () => { $("#ci-pf").hidden = $("#ci-f").value !== "representante"; };
  $("#ci-firmar").onclick = firmar;
}
function recortar(cv){
  const ctx = cv.getContext("2d"), { data } = ctx.getImageData(0, 0, cv.width, cv.height); let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (data[(y * cv.width + x) * 4 + 3] > 20){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null; const m = 6; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(cv.width - 1, x1 + m); y1 = Math.min(cv.height - 1, y1 + m);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, s = Math.min(1, 600 / w, 200 / h), o = document.createElement("canvas"); o.width = Math.max(1, Math.round(w * s)); o.height = Math.max(1, Math.round(h * s));
  o.getContext("2d").drawImage(cv, x0, y0, w, h, 0, 0, o.width, o.height); return { src: o.toDataURL("image/png"), w: o.width, h: o.height };
}
async function firmar(){
  const art = document.querySelector("[data-ci]"), err = $("#ci-err"); err.hidden = true;
  const checks = [...art.querySelectorAll(".ck1")];
  if (checks.some(c => !c.checked)){ err.textContent = "Marca todas las casillas para continuar."; err.hidden = false; return; }
  const firmante = $("#ci-f").value, parentesco = firmante === "representante" ? $("#ci-p").value : null;
  if (firmante === "representante" && !parentesco){ err.textContent = "Elige el parentesco o la calidad del representante."; err.hidden = false; return; }
  if (!trazo){ err.textContent = "Falta la firma."; err.hidden = false; return; }
  const f = recortar($("#ci-pad")); if (!f){ err.textContent = "No se detectó la firma."; err.hidden = false; return; }
  if (!cred){ salir(); return; }
  const btn = $("#ci-firmar"); btn.disabled = true; btn.textContent = "Guardando…";
  try{
    const { data, error } = await sb.rpc("portal_firmar_consentimiento", { p_folio: cred.folio, p_fecha_nac: cred.fnac, p_codigo: cred.codigo, p_id: art.dataset.ci,
      p_firmante: firmante, p_parentesco: parentesco, p_aceptaciones: Object.fromEntries(checks.map(c => [c.value, true])), p_firma: f.src, p_w: f.w, p_h: f.h });
    if (error) throw error;
    if (data?.error){ err.textContent = data.error; err.hidden = false; return; }
    await cargar();
  }catch(e){ err.textContent = "No se pudo guardar la firma. Revisa tu conexión e inténtalo de nuevo."; err.hidden = false; }
  finally{ if (document.body.contains(btn)){ btn.disabled = false; btn.textContent = "Firmar consentimiento"; } }
}
function pintar(data){
  datosAct = data; const reps = data.reportes || [], cis = data.consentimientos || [];
  const pend = cis.filter(c => c.estado === "pendiente").slice(0, 1), firm = cis.filter(c => c.estado === "firmado").slice(0, 1);
  $("#titExp").textContent = `Expediente ${data.folio} · ${data.iniciales || ""}`;
  $("#reportes").innerHTML = pend.map(c => consentHtml(c, data)).join("") + firm.map(c => consentHtml(c, data)).join("") + (reps.length ? reps.map((r, i) => reporteHtml(r, i, data)).join("")
    : (pend.length ? "" : `<div class="card"><p style="margin:0">Por ahora no tienes reportes compartidos. Tu psicólogo(a) te avisará cuando haya uno disponible.</p></div>`));
  if (pend.length) activarFirma();
}
async function cargar(){
  const { data, error } = await sb.rpc("portal_consultante", { p_folio: cred.folio, p_fecha_nac: cred.fnac, p_codigo: cred.codigo });
  if (error) throw error; if (data?.error){ salir(); $("#err").textContent = data.error; $("#err").hidden = false; return; }
  pintar(data);
}
$("#reportes").addEventListener("click", ev => {
  const b = ev.target.closest("[data-imprimir]"); if (!b) return;
  const art = $("#rep-" + b.dataset.imprimir); art.classList.add("imprimir"); document.body.classList.add("imprime-uno");
  window.print(); art.classList.remove("imprimir"); document.body.classList.remove("imprime-uno");
});
$("#frm").onsubmit = async ev => {
  ev.preventDefault(); const btn = $("#entrar"); $("#err").hidden = true; btn.disabled = true; btn.textContent = "Consultando…";
  try{
    const c0 = { folio: normFolio($("#folio").value), fnac: $("#fnac").value, codigo: normCodigo($("#codigo").value) };
    if (!c0.folio || !c0.fnac || c0.codigo.replace("-", "").length < 10){ $("#err").textContent = "Completa el folio, la fecha de nacimiento y el código de 10 caracteres."; $("#err").hidden = false; return; }
    const { data, error } = await sb.rpc("portal_consultante", { p_folio: c0.folio, p_fecha_nac: c0.fnac, p_codigo: c0.codigo });
    if (error) throw error;
    if (data?.error){ $("#err").textContent = data.error + (/incorrectos/.test(data.error) ? " Revisa que el folio, la fecha y el código coincidan con tu hoja. Si sigue sin funcionar, pide a tu psicólogo(a) un código nuevo." : ""); $("#err").hidden = false; return; }
    cred = c0; pintar(data);
    $("#acceso").hidden = true; $("#vista").hidden = false; $("#codigo").value = ""; vigilar(); window.scrollTo(0, 0); $("#titExp").focus();
  }catch(e){ $("#err").textContent = "No se pudo consultar en este momento. Revisa tu conexión e inténtalo de nuevo."; $("#err").hidden = false; }
  finally{ btn.disabled = false; btn.textContent = "Ver mis reportes"; }
};
