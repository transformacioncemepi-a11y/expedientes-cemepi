/* =====================================================================
   Puente entre la app de Expedientes CEMEPI y Supabase.
   - Inicio de sesión, solicitud de cuenta (registro propio) y cuentas pendientes.
   - Traduce las colecciones de la app (pacientes, notas, documentos,
     terapeutas, cuentas, perfil) a tablas de Supabase.
   - Registra el tiempo activo de uso de la app.
   Las reglas de seguridad (RLS) las aplica la base de datos, no este archivo.
   ===================================================================== */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const cfg = window.CEMEPI_CONFIG || {};
const $ = s => document.querySelector(s);
const login = $("#login");
const vistas = ["#lgForm", "#lgRegistro", "#lgPendiente", "#lgNueva"];
const mostrar = sel => { login.hidden = false; vistas.forEach(v => { const el = $(v); if (el) el.hidden = v !== sel; }); };
function aviso(msg, ok){ const m = $("#lgMsg"); m.textContent = msg || ""; m.classList.toggle("ok", !!ok); }

if (!cfg.supabaseUrl || !cfg.supabaseAnonKey){
  mostrar(null);
  aviso("Falta configurar la clave pública de Supabase en el archivo web/config.js.");
  throw new Error("Sin configuración de Supabase");
}

const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });

/* ---------- Avisos de cambio: cada vista se vuelve a consultar al guardar ---------- */
const subs = new Map();
const avisar = tabla => (subs.get(tabla) || new Set()).forEach(f => f());
window.addEventListener("focus", () => subs.forEach(s => s.forEach(f => f())));
setInterval(() => { if (!document.hidden) subs.forEach(s => s.forEach(f => f())); }, 60000);

const err = e => {
  const c = String(e?.code || ""), m = e?.message || String(e);
  const permiso = c === "42501" || /row-level security|permission/i.test(m);
  return { code: (permiso || c.startsWith("23")) ? "invalid_argument" : "unavailable", message: m };
};
const fecha = v => v ? v : null;
const ms = t => t ? Date.parse(t) : 0;

/* ---------- Correspondencia colección de la app ↔ tabla de Supabase ---------- */
const MAP = {
  pacientes: { tabla: "expedientes", campo: {},
    from: r => ({ folio: r.folio, foliosAnteriores: r.folios_anteriores || [],
      ficha: { nombre: r.iniciales || "", fechaNac: r.fecha_nac || "", primeraSesion: r.primera_sesion || "", sede: r.sede || "", terapeutaId: r.terapeuta_id || "" },
      creado: ms(r.created_at), actualizado: ms(r.updated_at), creadoPor: r.creado_por || "" }),
    to: d => { const o = {};
      if (d.folio !== undefined) o.folio = d.folio;
      if (d.foliosAnteriores) o.folios_anteriores = d.foliosAnteriores;
      if (d.ficha){ const f = d.ficha; o.iniciales = f.nombre || ""; o.fecha_nac = fecha(f.fechaNac); o.primera_sesion = fecha(f.primeraSesion); o.sede = f.sede || ""; o.terapeuta_id = f.terapeutaId || null; }
      if (d.actualizado) o.updated_at = new Date().toISOString();
      return o; } },
  notas: { tabla: "notas", campo: { pacienteId: "expediente_id" },
    from: r => ({ pacienteId: r.expediente_id, fecha: r.fecha || "", texto: r.texto || "", creado: ms(r.created_at), autor: r.autor || "" }),
    to: d => { const o = {}; if (d.pacienteId) o.expediente_id = d.pacienteId; if (d.fecha !== undefined) o.fecha = d.fecha; if (d.texto !== undefined) o.texto = d.texto; return o; } },
  documentos: { tabla: "documentos", campo: { pacienteId: "expediente_id" },
    from: r => ({ pacienteId: r.expediente_id, tipo: r.tipo, fecha: r.fecha || "", lugar: r.lugar || "", indicaciones: r.indicaciones || "", contenido: r.contenido, creado: ms(r.created_at), autor: r.autor || "" }),
    to: d => { const o = {}; if (d.pacienteId) o.expediente_id = d.pacienteId;
      for (const k of ["tipo", "lugar", "indicaciones", "contenido"]) if (d[k] !== undefined) o[k] = d[k];
      if (d.fecha !== undefined) o.fecha = fecha(d.fecha); return o; } },
  terapeutas: { tabla: "terapeutas", campo: {},
    from: r => ({ nombre: r.nombre, cedula: r.cedula || "", sede: r.sede || "", uid: r.user_id || "", activo: r.activo, creado: ms(r.created_at) }),
    to: d => { const o = {}; for (const k of ["nombre", "cedula", "sede"]) if (d[k] !== undefined) o[k] = d[k];
      if ("uid" in d) o.user_id = d.uid || null; return o; } },
  cuentas: { tabla: "perfiles", campo: {}, soloLectura: true,
    from: r => ({ email: r.email || "", nombre: r.nombre || "", rol: r.rol, estado: r.estado, sede: r.sede || "" }), to: () => ({}) },
};

const snap = (rows, m) => { const docs = rows.map(r => ({ id: r.id, exists: true, data: () => m.from(r), metadata: { fromCache: false } }));
  return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false } }; };

function refDoc(col, id){
  const m = MAP[col];
  return { id, path: `${col}/${id}`,
    async set(d){ const { error } = await sb.from(m.tabla).upsert({ id, ...m.to(d) }); if (error) throw err(error); avisar(m.tabla); },
    async update(d){ const row = m.to(d);
      if (Object.keys(row).length){ const { data, error } = await sb.from(m.tabla).update(row).eq("id", id).select("id");
        if (error) throw err(error); if (!data?.length) throw { code: "invalid_argument", message: "Sin permiso para modificar este registro." }; }
      avisar(m.tabla); },
    async delete(){ const { data, error } = await sb.from(m.tabla).delete().eq("id", id).select("id");
      if (error) throw err(error); if (!data?.length) throw { code: "invalid_argument", message: "Sin permiso para eliminar este registro." }; avisar(m.tabla); },
    async get(){ const { data, error } = await sb.from(m.tabla).select("*").eq("id", id).maybeSingle(); if (error) throw err(error);
      return { id, exists: !!data, data: () => data ? m.from(data) : undefined, metadata: { fromCache: false } }; } };
}
function consulta(col, filtro){
  const m = MAP[col]; if (!m) throw new TypeError(`Colección desconocida: ${col}`);
  const ejecutar = async () => { let q = sb.from(m.tabla).select("*");
    if (filtro) q = q.eq(m.campo[filtro.campo] || filtro.campo, filtro.valor);
    const { data, error } = await q.limit(5000); if (error) throw err(error); return snap(data || [], m); };
  return {
    where: (campo, _op, valor) => consulta(col, { campo, valor }),
    get: ejecutar,
    onSnapshot(next, onErr){ let vivo = true;
      const f = () => ejecutar().then(s => vivo && next(s)).catch(e => vivo && onErr && onErr(e));
      if (!subs.has(m.tabla)) subs.set(m.tabla, new Set()); subs.get(m.tabla).add(f); f();
      return () => { vivo = false; subs.get(m.tabla).delete(f); }; },
    doc: id => refDoc(col, id || crypto.randomUUID()),
    async add(d){ const r = refDoc(col, crypto.randomUUID()); await r.set(d); return r; },
  };
}

/* ---------- Sedes para el formulario de solicitud (visibles sin sesión) ---------- */
async function cargarSedesRegistro(){
  const { data } = await sb.from("sedes").select("nombre,clave").eq("activa", true).order("nombre");
  $("#rgSede").innerHTML = `<option value="">Selecciona tu sede</option>` +
    (data || []).map(s => `<option value="${s.nombre.replace(/"/g, "&quot;")}">${s.nombre}</option>`).join("");
}
$("#rgTipo").addEventListener("change", () => { $("#rgCedulaFld").hidden = $("#rgTipo").value !== "psicologo"; });

/* ---------- Inicio de sesión, solicitud de cuenta y cuenta pendiente ---------- */
async function leerPerfil(uid){
  const { data } = await sb.from("perfiles").select("*").eq("id", uid).maybeSingle();
  return data;
}
function pantallaPendiente(p){
  const textos = {
    pendiente: ["Cuenta pendiente de autorización", "Tu solicitud ya está registrada. Cuando un administrativo de tu sede, la Dirección o el superusuario la autorice, podrás entrar."],
    rechazado: ["Solicitud no autorizada", "Tu solicitud no fue autorizada. Si crees que es un error, comunícate con la Dirección de CEMEPI."],
    suspendido: ["Cuenta suspendida", "Tu acceso está suspendido. Comunícate con la Dirección de CEMEPI."],
  };
  const [t, x] = textos[p?.estado] || textos.pendiente;
  $("#pdTitulo").textContent = t; $("#pdTexto").textContent = x; aviso(""); mostrar("#lgPendiente");
}

async function esperarAcceso(){
  for (;;){
    const { data: { session } } = await sb.auth.getSession();
    if (session){
      const p = await leerPerfil(session.user.id);
      if (p?.estado === "activo") return { usuario: session.user, perfil: p };
      pantallaPendiente(p);
      await new Promise(res => {
        $("#pdRevisar").onclick = () => res();
        $("#pdSalir").onclick = async () => { await sb.auth.signOut(); res(); };
      });
      continue;
    }
    mostrar("#lgForm");
    await new Promise(resolve => {
      $("#lgForm").onsubmit = async ev => {
        ev.preventDefault(); aviso(""); $("#lgBtn").disabled = true;
        const { error } = await sb.auth.signInWithPassword({ email: $("#lgEmail").value.trim(), password: $("#lgPass").value });
        $("#lgBtn").disabled = false;
        if (error){ aviso(/confirm/i.test(error.message) ? "Tu correo aún no está confirmado. Revisa tu bandeja de entrada." : "Correo o contraseña incorrectos."); return; }
        $("#lgPass").value = ""; resolve();
      };
      $("#lgOlvide").onclick = async () => {
        const email = $("#lgEmail").value.trim(); if (!email){ aviso("Escribe tu correo y vuelve a pulsar «Olvidé mi contraseña»."); return; }
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        aviso(error ? "No se pudo enviar el correo. Intenta más tarde." : "Si el correo está registrado, te llegará un enlace para crear una nueva contraseña.", !error);
      };
      $("#lgIrRegistro").onclick = () => { aviso(""); mostrar("#lgRegistro"); cargarSedesRegistro(); };
      $("#lgIrEntrar").onclick = () => { aviso(""); mostrar("#lgForm"); };
      $("#lgRegistro").onsubmit = async ev => {
        ev.preventDefault(); aviso("");
        const tipo = $("#rgTipo").value, nombre = $("#rgNombre").value.trim(), cedula = $("#rgCedula").value.trim();
        const tel = $("#rgTel").value.trim(), sede = $("#rgSede").value, pass = $("#rgPass").value;
        if (nombre.split(/\s+/).length < 2){ aviso("Escribe tu nombre completo."); return; }
        if (tipo === "psicologo" && cedula.length < 5){ aviso("Escribe tu cédula profesional."); return; }
        if (!sede){ aviso("Selecciona tu sede."); return; }
        if (tel.replace(/\D/g, "").length < 10){ aviso("Escribe un teléfono de 10 dígitos."); return; }
        if (pass.length < 10){ aviso("La contraseña debe tener al menos 10 caracteres."); return; }
        $("#rgBtn").disabled = true;
        const { data, error } = await sb.auth.signUp({ email: $("#rgEmail").value.trim(), password: pass,
          options: { emailRedirectTo: location.origin + location.pathname,
            data: { nombre, cedula: tipo === "psicologo" ? cedula : "", telefono: tel, sede, rol_solicitado: tipo } } });
        $("#rgBtn").disabled = false;
        if (error){
          aviso(/registered|already/i.test(error.message) ? "Ese correo ya tiene una cuenta. Entra con él o usa «Olvidé mi contraseña»."
            : /signups not allowed|disabled/i.test(error.message) ? "Por ahora no se reciben solicitudes nuevas. Comunícate con la Dirección."
            : "No se pudo enviar la solicitud. Revisa los datos e intenta de nuevo."); return; }
        $("#rgPass").value = "";
        if (data.session) resolve();   // sin confirmación de correo: pasa a la pantalla de cuenta pendiente
        else { mostrar("#lgForm"); aviso("Solicitud enviada. Confirma tu correo con el enlace que te llegó; después, tu sede o la Dirección autorizará tu cuenta.", true); }
      };
    });
  }
}

/* Enlace de recuperación de contraseña: pide la nueva antes de entrar */
sb.auth.onAuthStateChange((evento) => {
  if (evento !== "PASSWORD_RECOVERY") return;
  mostrar("#lgNueva");
  $("#lgNueva").onsubmit = async ev => { ev.preventDefault();
    const p = $("#lgPass2").value; if (p.length < 10){ aviso("Usa al menos 10 caracteres."); return; }
    const { error } = await sb.auth.updateUser({ password: p });
    if (error){ aviso("No se pudo cambiar la contraseña."); return; }
    location.replace(location.origin + location.pathname); };
});

const { usuario, perfil } = await esperarAcceso();
login.hidden = true;
const rol = perfil.rol;
const ROL_TXT = { superusuario: "Superusuario", direccion: "Dirección", administrativo: "Administrativo", psicologo: "Psicólogo(a)" };
document.body.dataset.rol = rol;
$("#sesionInfo").textContent = `${usuario.email} · ${ROL_TXT[rol] || rol}${perfil.sede ? " · " + perfil.sede : ""}`;
document.addEventListener("click", ev => { if (ev.target.closest('[data-act="salir"]')) sb.auth.signOut().then(() => location.reload()); });

/* ---------- Tiempo activo de uso (solo lo consulta el superusuario) ----------
   Cuenta minutos con la app visible y con actividad en los últimos 5 minutos. */
const sesionUso = crypto.randomUUID();
let ultimaActividad = Date.now(), ultimoEnvio = Date.now(), acumulado = 0;
["pointerdown", "keydown", "scroll", "pointermove"].forEach(t => document.addEventListener(t, () => { ultimaActividad = Date.now(); }, { passive: true, capture: true }));
setInterval(() => {
  const ahora = Date.now(), dt = Math.round((ahora - ultimoEnvio) / 1000); ultimoEnvio = ahora;
  if (!document.hidden && ahora - ultimaActividad < 5 * 60000) acumulado += Math.min(dt, 60);
}, 15000);
setInterval(async () => {
  if (!acumulado) return; const s = Math.min(acumulado, 120); acumulado -= s;
  const { error } = await sb.rpc("registrar_uso", { p_sesion: sesionUso, p_segundos: s }); if (error) acumulado += s;
}, 60000);
window.addEventListener("pagehide", () => { if (acumulado) sb.rpc("registrar_uso", { p_sesion: sesionUso, p_segundos: Math.min(acumulado, 120) }); });

/* ---------- Interfaz que usa la app ---------- */
const db = {
  collection: col => consulta(col),
  doc(path){
    if (/^data\/users\/[^/]+\/perfil$/.test(path)) return {
      async get(){ const data = await leerPerfil(usuario.id);
        return { exists: !!data, data: () => data ? { nombre: data.nombre || "", cedula: data.cedula || "", telefono: data.telefono || "", sede: data.sede || "", firma: data.firma || "", firmaW: data.firma_w || 0, firmaH: data.firma_h || 0 } : undefined }; },
      async set(v){ const { error } = await sb.from("perfiles").update({ nombre: v.nombre || "", cedula: v.cedula || "", telefono: v.telefono || "", firma: v.firma || null, firma_w: v.firmaW || null, firma_h: v.firmaH || null }).eq("id", usuario.id);
        if (error) throw err(error); } };
    const [col, id] = path.split("/"); return refDoc(col, id);
  },
};
const user = {
  id: async () => usuario.id,
  can: async n => n === "data.write" ? true : n === "direccion" ? ["superusuario", "direccion"].includes(rol) : n === rol,
  canEdit: async () => ["superusuario", "direccion"].includes(rol),
  profiles: async () => ({}),
};
const downloads = {
  async save({ filename, data }){
    const blob = data instanceof Blob ? data : new Blob([data]);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    return { status: "saved" };
  },
};
/* Funciones de administración: cuentas, sedes y tiempo de uso */
const fallo = e => { throw { code: "invalid_argument", message: e?.message || String(e) }; };
const cemepi = {
  rol, sede: perfil.sede || "", nombre: perfil.nombre || "", uid: usuario.id, email: usuario.email,
  async sedes(todas){ let q = sb.from("sedes").select("*").order("nombre"); if (!todas) q = q.eq("activa", true);
    const { data, error } = await q; if (error) fallo(error); return data || []; },
  async guardarSede(s){ const row = { nombre: s.nombre.trim(), clave: s.clave.trim().toUpperCase(), activa: s.activa !== false };
    const { error } = s.id ? await sb.from("sedes").update(row).eq("id", s.id) : await sb.from("sedes").insert(row); if (error) fallo(error); },
  async usuarios(){ const { data, error } = await sb.from("perfiles").select("id,email,nombre,cedula,telefono,sede,rol,rol_solicitado,estado,created_at,autorizado_en").order("created_at", { ascending: false });
    if (error) fallo(error); return data || []; },
  async gestionar(id, estado, nuevoRol, sede){ const { error } = await sb.rpc("gestionar_usuario", { p_id: id, p_estado: estado, p_rol: nuevoRol, p_sede: sede || "" });
    if (error) fallo(error); avisar("terapeutas"); },
  async asignarContrasena(id, pass){ const { error } = await sb.rpc("asignar_contrasena", { p_id: id, p_password: pass }); if (error) fallo(error); },
  async editarUsuario(id, nombre, cedula, telefono){ const { error } = await sb.rpc("editar_datos_usuario", { p_id: id, p_nombre: nombre, p_cedula: cedula, p_telefono: telefono });
    if (error) fallo(error); avisar("terapeutas"); },
  async cambiarMiContrasena(pass){ const { error } = await sb.auth.updateUser({ password: pass }); if (error) fallo(error); },
  async resumenUso(desde){ const { data, error } = await sb.rpc("resumen_uso", { p_desde: desde.toISOString() }); if (error) fallo(error); return data || []; },
};
window.__cemepi.resolve({ use: async n => ({ db, user, downloads, cemepi })[n] ?? null });
