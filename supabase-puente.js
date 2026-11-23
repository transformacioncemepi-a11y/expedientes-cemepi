/* =====================================================================
   Puente entre la app de Expedientes CEMEPI y Supabase.
   - Inicio de sesión, solicitud de cuenta (registro propio) y cuentas pendientes.
   - Traduce las colecciones de la app (pacientes, notas, documentos,
     terapeutas, cuentas, perfil) a tablas de Supabase.
   - Registra el tiempo activo de uso de la app.
   Las reglas de seguridad (RLS) las aplica la base de datos, no este archivo.
   ===================================================================== */
const { createClient } = window.supabase;   /* versión fija con huella verificada (SRI), cargada en index.html */

const cfg = window.CEMEPI_CONFIG || {};
const $ = s => document.querySelector(s);
const login = $("#login");
const vistas = ["#lgForm", "#lgRegistro", "#lgPendiente", "#lgNueva", "#lgMfa", "#lgMfaAlta"];
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
    from: r => ({ pacienteId: r.expediente_id, fecha: r.fecha || "", texto: r.texto || "", creado: ms(r.created_at), autor: r.autor || "", formato: r.formato || "libre", campos: r.campos || null }),
    to: d => { const o = {}; if (d.pacienteId) o.expediente_id = d.pacienteId; if (d.fecha !== undefined) o.fecha = d.fecha; if (d.texto !== undefined) o.texto = d.texto;
      if (d.formato !== undefined) o.formato = d.formato; if (d.campos !== undefined) o.campos = d.campos; return o; } },
  documentos: { tabla: "documentos", campo: { pacienteId: "expediente_id" },
    from: r => ({ pacienteId: r.expediente_id, tipo: r.tipo, fecha: r.fecha || "", lugar: r.lugar || "", indicaciones: r.indicaciones || "", contenido: r.contenido, creado: ms(r.created_at), autor: r.autor || "", notaId: r.nota_id || "", revision: r.revision || null,
      estado: r.estado || "borrador", folioEmision: r.folio_emision || "", version: r.version || 1, versionDe: r.version_de || "", reemplazadoPor: r.reemplazado_por || "",
      emitidoEn: r.emitido_en || "", emision: r.emision || null, anuladoEn: r.anulado_en || "", motivoAnulacion: r.motivo_anulacion || "" }),
    to: d => { const o = {}; if (d.pacienteId) o.expediente_id = d.pacienteId;
      for (const k of ["tipo", "lugar", "indicaciones", "contenido"]) if (d[k] !== undefined) o[k] = d[k];
      if (d.notaId !== undefined) o.nota_id = d.notaId || null;
      if (d.revision !== undefined) o.revision = d.revision || null;
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
$("#rgTipo").addEventListener("change", () => { $("#rgCedulaFld").hidden = !$("#rgTipo").value.startsWith("psicologo");
  $("#rgDirNota").hidden = $("#rgTipo").value !== "direccion";
  $("#rgSedeNota").hidden = $("#rgTipo").value !== "admin_sede";
  $("#rgEmpNota").hidden = $("#rgTipo").value !== "administrativo";
  $("#rgModNota").hidden = !$("#rgTipo").value.endsWith("comision"); });

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
    desactivado: ["Cuenta desactivada", "Esta cuenta ya no tiene acceso. Si crees que es un error, comunícate con la Dirección de CEMEPI."],
  };
  const [t, x] = textos[p?.estado] || textos.pendiente;
  $("#pdTitulo").textContent = t; $("#pdTexto").textContent = x; aviso(""); mostrar("#lgPendiente");
}

async function esperarAcceso(){
  for (;;){
    const { data: { session } } = await sb.auth.getSession();
    if (session){
      let p = await leerPerfil(session.user.id);
      if (p?.estado === "invitado"){ await sb.rpc("activar_invitacion"); p = await leerPerfil(session.user.id); }   /* invitación del Superusuario: se activa al primer acceso */
      if (p?.estado === "activo"){ if (await verificarMfa(p)) return { usuario: session.user, perfil: p }; continue; }
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
        const [tipo, modalidad] = $("#rgTipo").value.split("|"), nombre = $("#rgNombre").value.trim(), cedula = $("#rgCedula").value.trim();
        const tel = $("#rgTel").value.trim(), sede = $("#rgSede").value, pass = $("#rgPass").value;
        if (nombre.split(/\s+/).length < 2){ aviso("Escribe tu nombre completo."); return; }
        if (tipo === "psicologo" && cedula.length < 5){ aviso("Escribe tu cédula profesional."); return; }
        if (!sede && tipo !== "direccion"){ aviso("Selecciona tu sede."); return; }
        if (tel.replace(/\D/g, "").length < 10){ aviso("Escribe un teléfono de 10 dígitos."); return; }
        if (pass.length < 10){ aviso("La contraseña debe tener al menos 10 caracteres."); return; }
        $("#rgBtn").disabled = true;
        const { data, error } = await sb.auth.signUp({ email: $("#rgEmail").value.trim(), password: pass,
          options: { emailRedirectTo: location.origin + location.pathname,
            data: { nombre, cedula: tipo === "psicologo" ? cedula : "", telefono: tel, sede, rol_solicitado: tipo, modalidad: tipo === "psicologo" ? (modalidad || "nomina") : null } } });
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

/* ---------- Código de verificación (MFA). Opcional: se pide a quien registró su código; si el Superusuario
   activa el MFA, quien lo requiera y no lo tenga debe registrarlo antes de entrar. ---------- */
async function verificarMfa(perfil){
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") return true;
  const { data: fs } = await sb.auth.mfa.listFactors();
  const factor = (fs?.totp || []).find(f => f.status === "verified");
  if (factor){
    mostrar("#lgMfa"); aviso(""); $("#mfCodigo").value = "";
    return await new Promise(res => {
      $("#lgMfa").onsubmit = async ev => { ev.preventDefault(); $("#mfBtn").disabled = true;
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: $("#mfCodigo").value.trim() });
        $("#mfBtn").disabled = false;
        if (error){ aviso("Código incorrecto o vencido. Escribe el número que aparece ahora en tu aplicación."); return; }
        res(true); };
      $("#mfSalir").onclick = async () => { await sb.auth.signOut(); res(false); };
    });
  }
  const [{ data: activo }, { data: cfg }] = await Promise.all([sb.rpc("mfa_activo"), sb.from("config_seguridad").select("valor").eq("clave", "mfa_roles").maybeSingle()]);
  if (!activo || !(cfg?.valor || []).includes(perfil.rol)) return true;
  /* MFA activado para este rol y aún sin código: registrarlo antes de entrar */
  mostrar("#lgMfaAlta"); aviso("");
  const { data: alta, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "CEMEPI " + new Date().toISOString().slice(0, 10) });
  if (error){ aviso("No se pudo preparar el código. Recarga la página."); return false; }
  $("#maQr").src = alta.totp.qr_code; $("#maClave").textContent = alta.totp.secret;
  return await new Promise(res => {
    $("#lgMfaAlta").onsubmit = async ev => { ev.preventDefault();
      const { error: e2 } = await sb.auth.mfa.challengeAndVerify({ factorId: alta.id, code: $("#maCodigo").value.trim() });
      if (e2){ aviso("Código incorrecto. Revisa que escaneaste el código y escribe el número actual."); return; }
      res(true); };
    $("#maSalir").onclick = async () => { await sb.auth.mfa.unenroll({ factorId: alta.id }).catch(() => {}); await sb.auth.signOut(); res(false); };
  });
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
/* Permisos adicionales que el superusuario le otorgó a esta persona */
const { data: permRows } = await sb.from("permisos").select("permiso").eq("user_id", usuario.id);
const { data: orgNivel } = await sb.rpc("nivel_maximo", { p_modulo: "organizacion" });
const { data: rolesRows } = await sb.from("usuario_roles").select("rol,hasta").eq("user_id", usuario.id).is("revocado_en", null);
const misRoles = (rolesRows || []).filter(r => !r.hasta || r.hasta >= new Date().toISOString().slice(0, 10)).map(r => r.rol);
const { data: cfgInact } = await sb.from("config_seguridad").select("valor").eq("clave", "inactividad_min").maybeSingle();
const { data: asisNivel } = await sb.rpc("nivel_maximo", { p_modulo: "asistencia" });
const { data: docNivel } = await sb.rpc("nivel_maximo", { p_modulo: "documentos" });   /* Módulo 05 */
const { data: rhNivel } = await sb.rpc("nivel_maximo", { p_modulo: "recursos_humanos" });   /* Incorporación */   /* Módulo 03 */   /* Módulo 01: 0 sin acceso · 1 lectura · 2 operación · 3 admin · 4 superusuario */
login.hidden = true;
const rol = perfil.rol;
const ROL_TXT = { superusuario: "Superusuario", direccion: "Directivo(a)", admin_sede: "Administración de sede", administrativo: "Administrativo", psicologo: "Psicólogo(a)" };
document.body.dataset.rol = rol;
$("#sesionInfo").textContent = `${usuario.email} · ${ROL_TXT[rol] || rol}${perfil.sede ? " · " + perfil.sede : ""}`;
document.addEventListener("click", ev => { if (ev.target.closest('[data-act="salir"]')) sb.auth.signOut().then(() => location.reload()); });

/* ---------- Tiempo activo de uso (solo lo consulta el superusuario) ----------
   Cuenta minutos con la app visible y con actividad en los últimos 5 minutos. */
const sesionUso = crypto.randomUUID();
let ultimaActividad = Date.now(), ultimoEnvio = Date.now(), acumulado = 0;
["pointerdown", "keydown", "scroll", "pointermove"].forEach(t => document.addEventListener(t, () => { ultimaActividad = Date.now(); }, { passive: true, capture: true }));
/* Cierre de sesión por inactividad (minutos definidos por el Superusuario en Configuración de seguridad) */
setInterval(() => { if (Date.now() - ultimaActividad > (Number(cfgInact?.valor) || 30) * 60000) sb.auth.signOut().then(() => location.reload()); }, 60000);
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
  rol, sede: perfil.sede || "", nombre: perfil.nombre || "", uid: usuario.id, email: usuario.email, modalidad: perfil.modalidad || null,
  permisos: (permRows || []).map(r => r.permiso),
  orgNivel: orgNivel || 0,
  misRoles, inactividadMin: Number(cfgInact?.valor) || 30,
  asisNivel: asisNivel || 0,
  docNivel: docNivel || 0,
  rhNivel: rhNivel || 0,
  async permisosTodos(){ const { data, error } = await sb.from("permisos").select("user_id,permiso,otorgado_en"); if (error) fallo(error); return data || []; },
  async otorgarPermiso(id, permiso, activo){ const { error } = await sb.rpc("otorgar_permiso", { p_id: id, p_permiso: permiso, p_activo: !!activo }); if (error) fallo(error); },
  async cambiarModalidad(id, m){ const { error } = await sb.rpc("cambiar_modalidad", { p_id: id, p_modalidad: m }); if (error) fallo(error); },
  async sedes(todas){ let q = sb.from("sedes").select("*").order("nombre"); if (!todas) q = q.eq("activa", true);
    const { data, error } = await q; if (error) fallo(error); return data || []; },
  async guardarSede(s){ const row = { nombre: s.nombre.trim(), clave: s.clave.trim().toUpperCase(), activa: s.activa !== false };
    const { error } = s.id ? await sb.from("sedes").update(row).eq("id", s.id) : await sb.from("sedes").insert(row); if (error) fallo(error); },
  /* ---------- Módulo 03 · Asistencia y jornadas (todo se valida en la base: RLS + funciones) ---------- */
  async asisDatos(desde, hasta){
    const q = await Promise.all([
      sb.from("asistencia_config").select("clave,valor"),
      sb.rpc("mi_colaborador"),
      sb.from("horarios").select("*").order("nombre"),
      sb.from("horario_asignaciones").select("*"),
      sb.from("jornadas").select("*"),
      sb.from("marcas").select("id,colaborador_id,tipo,momento,sede_id,modalidad,metodo").gte("momento", desde + "T00:00:00-06:00").lte("momento", hasta + "T23:59:59-06:00").order("momento"),
      sb.from("marca_ajustes").select("*").gte("momento", desde + "T00:00:00-06:00").lte("momento", hasta + "T23:59:59-06:00"),
      sb.from("asistencia_solicitudes").select("*").order("creado_en", { ascending: false }).limit(300),
      sb.from("incidencias").select("*").gte("fecha", desde).order("fecha", { ascending: false }),
      sb.from("actividades").select("*").gte("fecha", desde).lte("fecha", hasta).order("fecha", { ascending: false }),
      sb.from("actividad_categorias").select("*").eq("activo", true),
      sb.from("politicas_asistencia").select("*").order("desde", { ascending: false }),
      sb.from("cortes_asistencia").select("id,entidad_id,desde,hasta,estado,validado_en"),
      sb.rpc("resumen_asistencia", { p_desde: desde, p_hasta: hasta, p_sede: null }),
      sb.from("sedes").select("id,nombre,clave").eq("activa", true).order("nombre"),
      sb.from("sede_entidad").select("sede_id,entidad_id").is("hasta", null),
      sb.from("entidades_fiscales").select("id,nombre_corto,principal")]);
    const val = r => r.error ? [] : (r.data ?? []);
    if (q[0].error) fallo(q[0].error);
    const [cf, yo, ho, ha, jo, ma, aj, so, inc, ac, ca, po, co, re, sd, sx, en] = q.map(val);
    const config = Object.fromEntries(cf.map(c => [c.clave, c.valor]));
    let aplica = false; if (yo){ const { data } = await sb.rpc("asis_aplica", { p_col: yo }); aplica = !!data; }
    return { config, yo, aplica, horarios: ho, asignaciones: ha, jornadas: jo, marcas: ma, ajustes: aj, solicitudes: so, incidencias: inc, actividades: ac,
      categorias: ca, politicas: po, cortes: co, personas: re, sedes: sd, sedeEnt: sx, entidades: en }; },
  async registrarMarca(tipo, metodo, modalidad, qr){ const { data, error } = await sb.rpc("registrar_marca", { p_tipo: tipo, p_metodo: metodo, p_modalidad: modalidad || "presencial", p_qr: qr || null, p_agente: navigator.userAgent.slice(0, 200) }); if (error) fallo(error); return data; },
  async qrSede(sede){ const { data, error } = await sb.rpc("qr_sede", { p_sede: sede }); if (error) fallo(error); return (data || [])[0]; },
  async crearSolicitudAsis(s){ const { error } = await sb.from("asistencia_solicitudes").insert({ colaborador_id: s.colaborador_id, tipo: s.tipo, fecha: s.fecha, fecha_fin: s.fecha_fin || null,
      hora_propuesta: s.hora_propuesta || null, detalle: s.detalle, estado: "enviada" }); if (error) fallo(error); },
  async cancelarSolicitudAsis(id){ const { error } = await sb.from("asistencia_solicitudes").update({ estado: "cancelada" }).eq("id", id); if (error) fallo(error); },
  async resolverSolicitudAsis(id, d, r){ const { error } = await sb.rpc("resolver_solicitud_asistencia", { p_id: id, p_decision: d, p_respuesta: r || null }); if (error) fallo(error); },
  async resolverIncidencia(id, e, r){ const { error } = await sb.rpc("resolver_incidencia", { p_id: id, p_estado: e, p_resolucion: r }); if (error) fallo(error); },
  async detectarIncidencias(dia){ const { data, error } = await sb.rpc("detectar_incidencias", { p_dia: dia }); if (error) fallo(error); return data || 0; },
  async crearActividad(a){ const { error } = await sb.from("actividades").insert({ colaborador_id: a.colaborador_id, fecha: a.fecha, categoria: a.categoria, minutos: a.minutos, nota: a.nota || null, sede_id: a.sede_id || null }); if (error) fallo(error); },
  async borrarActividad(id){ const { error } = await sb.from("actividades").delete().eq("id", id); if (error) fallo(error); },
  async validarActividad(id, ok){ const { error } = await sb.rpc("validar_actividad", { p_id: id, p_valida: !!ok }); if (error) fallo(error); },
  async guardarHorario(h){ const row = { nombre: h.nombre, dias: h.dias, inicio: h.inicio, fin: h.fin, descanso_min: Number(h.descanso_min) || 0, sede_id: h.sede_id || null,
      desde: h.desde || undefined, hasta: h.hasta || null, estado: h.estado || "vigente" };
    const { error } = h.id ? await sb.from("horarios").update(row).eq("id", h.id) : await sb.from("horarios").insert(row); if (error) fallo(error); },
  async asignarHorario(a){ const { error } = await sb.from("horario_asignaciones").insert({ colaborador_id: a.colaborador_id, horario_id: a.horario_id, sede_id: a.sede_id,
      modalidad: a.modalidad || "presencial", desde: a.desde || undefined, hasta: a.hasta || null, motivo: a.motivo || null }); if (error) fallo(error); },
  async terminarAsignacion(id, fecha){ const { error } = await sb.from("horario_asignaciones").update({ hasta: fecha }).eq("id", id); if (error) fallo(error); },
  async guardarJornada(j){ const { error } = await sb.from("jornadas").insert({ colaborador_id: j.colaborador_id, horas_semana: j.horas_semana, atencion_h: j.atencion_h || null,
      complementarias_h: j.complementarias_h || null, fuente: j.fuente || "Contrato individual", desde: j.desde || undefined }); if (error) fallo(error); },
  async guardarPolitica(p){ const row = { nombre: p.nombre, descripcion: p.descripcion || null, sedes: p.sedes || null, aplica_a: p.aplica_a || null, condiciones: p.condiciones || null,
      desde: p.desde || undefined, hasta: p.hasta || null, autoriza: p.autoriza || null, estado: p.estado || "vigente" };
    const { error } = p.id ? await sb.from("politicas_asistencia").update(row).eq("id", p.id) : await sb.from("politicas_asistencia").insert(row); if (error) fallo(error); },
  async resumenAsistencia(desde, hasta, sede){ const { data, error } = await sb.rpc("resumen_asistencia", { p_desde: desde, p_hasta: hasta, p_sede: sede || null }); if (error) fallo(error); return data || []; },
  async validarCorte(ent, desde, hasta){ const { error } = await sb.rpc("validar_corte", { p_entidad: ent, p_desde: desde, p_hasta: hasta }); if (error) fallo(error); },
  /* ---------- Módulo 05 · Documentos y firmas (Fase E1) ---------- */
  async docsDatos(){
    const r = await Promise.all([
      sb.from("docs").select("*").order("creado_en", { ascending: false }),
      sb.from("doc_versiones").select("*").order("version", { ascending: false }),
      sb.from("doc_tipos").select("*").order("orden"),
      sb.from("doc_categorias").select("*").order("orden"),
      sb.from("sedes").select("id,nombre,clave").order("nombre"),
      sb.from("sede_entidad").select("sede_id,entidad_id,hasta").is("hasta", null),
      sb.from("entidades_fiscales").select("id,nombre_corto,principal"),
      sb.from("colaboradores").select("id,nombre,sede_principal_id,perfil_id,estatus").order("nombre"),
      sb.rpc("mi_colaborador"),
      sb.from("firma_solicitudes").select("*").order("creado_en", { ascending: false }),
      sb.from("firma_participantes").select("*").order("orden"),
      sb.rpc("mis_firmas_pendientes")]);
    for (const x of r) if (x.error) fallo(x.error);
    const [d, v, t, c, s, se, e, co, yo, fs, fp, mp] = r.map(x => x.data);
    return { docs: d || [], versiones: v || [], tipos: t || [], categorias: c || [], sedes: s || [], sedeEnt: se || [], entidades: e || [], colaboradores: co || [], yo: yo || null,
             solicitudes: fs || [], participantes: fp || [], misFirmas: mp || [] };
  },
  async crearDoc(o){ const { data, error } = await sb.rpc("crear_doc", { p_tipo: o.tipo, p_nombre: o.nombre, p_sede: o.sede || null, p_entidad: o.entidad || null,
      p_colaborador: o.colaborador || null, p_vence: o.vence || null, p_etiquetas: o.etiquetas || [], p_confidencialidad: o.confidencialidad || null, p_area: null }); if (error) fallo(error); return data; },
  async actualizarDoc(id, o){ const { error } = await sb.rpc("actualizar_doc", { p_doc: id, p_nombre: o.nombre, p_vence: o.vence || null, p_etiquetas: o.etiquetas || [], p_area: null }); if (error) fallo(error); },
  /* Sube una versión: calcula la huella SHA-256 en el dispositivo, guarda el archivo en el depósito privado y la registra */
  async subirVersionDoc(id, file, motivo){
    const tipos = ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","image/png","image/jpeg"];
    if (!tipos.includes(file.type)) fallo({ message: "Solo PDF, Word (.docx), PNG o JPG." });
    if (file.size > 20 * 1024 * 1024) fallo({ message: "El archivo pesa más de 20 MB." });
    const buf = await file.arrayBuffer(), h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map(b => b.toString(16).padStart(2, "0")).join("");
    const limpio = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
    const ruta = `${id}/${Date.now()}-${limpio}`;
    const up = await sb.storage.from("documentos-institucionales").upload(ruta, file, { contentType: file.type, upsert: false }); if (up.error) fallo(up.error);
    const { data, error } = await sb.rpc("agregar_version_doc", { p_doc: id, p_archivo: ruta, p_nombre_archivo: file.name, p_mime: file.type, p_tamano: file.size, p_sha256: h, p_motivo: motivo });
    if (error) fallo(error); return { version: data, sha256: h }; },
  async urlDoc(id, version){ const { data: ruta, error } = await sb.rpc("registrar_descarga_doc", { p_doc: id, p_version: version }); if (error) fallo(error);
    const u = await sb.storage.from("documentos-institucionales").createSignedUrl(ruta, 120); if (u.error) fallo(u.error); return u.data.signedUrl; },
  async huellaDoc(ruta){ const { data, error } = await sb.storage.from("documentos-institucionales").download(ruta); if (error) fallo(error);
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", await data.arrayBuffer()))].map(b => b.toString(16).padStart(2, "0")).join(""); },
  async emitirDoc(id){ const { data, error } = await sb.rpc("emitir_doc", { p_doc: id }); if (error) fallo(error); return data; },
  async verificarDoc(id){ const { error } = await sb.rpc("verificar_doc", { p_doc: id }); if (error) fallo(error); },
  async archivarDoc(id, motivo){ const { error } = await sb.rpc("archivar_doc", { p_doc: id, p_motivo: motivo }); if (error) fallo(error); },
  async eliminarBorradorDoc(id){ const { error } = await sb.rpc("eliminar_borrador_doc", { p_doc: id }); if (error) fallo(error); },
  /* Archivo de una versión (registra la descarga) para revisarlo, firmarlo o imprimir la firma */
  async archivoDoc(id, version){ const { data: ruta, error } = await sb.rpc("registrar_descarga_doc", { p_doc: id, p_version: version }); if (error) fallo(error);
    const { data, error: e2 } = await sb.storage.from("documentos-institucionales").download(ruta); if (e2) fallo(e2);
    const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await data.arrayBuffer()))].map(b => b.toString(16).padStart(2, "0")).join("");
    return { blob: data, sha256: sha }; },
  async enviarAFirma(id, o){ const { data, error } = await sb.rpc("enviar_a_firma", { p_doc: id, p_modo: o.modo, p_limite: o.limite, p_firmantes: o.firmantes, p_papeles: o.papeles, p_mensaje: o.mensaje || null }); if (error) fallo(error); return data; },
  async firmarDocumento(sol, sha256, acepto, contrasena){ const { data, error } = await sb.rpc("firmar_documento", { p_sol: sol, p_sha256: sha256, p_acepto: acepto, p_contrasena: contrasena, p_agente: navigator.userAgent.slice(0, 200) }); if (error) fallo(error); return data; },
  async rechazarFirma(sol, motivo){ const { error } = await sb.rpc("rechazar_firma", { p_sol: sol, p_motivo: motivo }); if (error) fallo(error); },
  async cancelarFirma(sol, motivo){ const { error } = await sb.rpc("cancelar_firma", { p_sol: sol, p_motivo: motivo }); if (error) fallo(error); },
  async cerrarFirmasVencidas(){ const { data } = await sb.rpc("cerrar_firmas_vencidas"); return data || 0; },
  async misFirmasPendientes(){ const { data, error } = await sb.rpc("mis_firmas_pendientes"); if (error) fallo(error); return data || []; },
  async firmarContrato(id, parte, contrasena){ const { data, error } = await sb.rpc("firmar_contrato", { p_id: id, p_parte: parte, p_acepto: true, p_contrasena: contrasena, p_agente: navigator.userAgent.slice(0, 200) }); if (error) fallo(error); return data; },
  async contratoHuella(id){ const { data, error } = await sb.rpc("contrato_huella", { p_id: id }); if (error) fallo(error); return data; },
  async contratoFirmas(id){ const { data, error } = await sb.from("contrato_firmas").select("parte,tipo,fecha,sha256,metodo").eq("contrato_id", id).eq("tipo", "FIRMADA").order("fecha"); if (error) fallo(error); return data || []; },
  /* ---------- Incorporación de colaboradores (90 días) ---------- */
  async incDatos(){
    const r = await Promise.all([
      sb.from("incorporaciones").select("*").order("inicio", { ascending: false }),
      sb.from("inc_tareas").select("*").order("orden"),
      sb.from("inc_evaluaciones").select("*"),
      sb.from("inc_plantillas").select("id,clase,nombre,puesto_id,activa"),
      sb.from("colaboradores").select("id,nombre,sede_principal_id,perfil_id,estatus,fecha_incorporacion").order("nombre"),
      sb.from("sedes").select("id,nombre"),
      sb.rpc("mi_colaborador")]);
    for (const x of r) if (x.error) fallo(x.error);
    const [i, t, e, p, c, s, yo] = r.map(x => x.data);
    return { incs: i || [], tareas: t || [], evals: e || [], plantillas: p || [], colaboradores: c || [], sedes: s || [], yo: yo || null };
  },
  async incAutomaticas(id){ const { data, error } = await sb.rpc("inc_automaticas", { p_inc: id }); if (error) fallo(error); return data || []; },
  async crearIncorporacion(col, inicio, jefe, acomp){ const { data, error } = await sb.rpc("crear_incorporacion", { p_col: col, p_inicio: inicio || null, p_jefe: jefe || null, p_acompanante: acomp || null }); if (error) fallo(error); return data; },
  async marcarTareaInc(id, hecha, nota){ const { error } = await sb.rpc("marcar_tarea_inc", { p_tarea: id, p_hecha: hecha, p_nota: nota || null }); if (error) fallo(error); },
  async validarTareaInc(id){ const { error } = await sb.rpc("validar_tarea_inc", { p_tarea: id }); if (error) fallo(error); },
  async guardarEvaluacionInc(inc, corte, evaluador, competencias, puntajes, fortalezas, mejoras, cerrar){ const { error } = await sb.rpc("guardar_evaluacion_inc", { p_inc: inc, p_corte: corte, p_evaluador: evaluador,
      p_competencias: competencias, p_puntajes: puntajes, p_fortalezas: fortalezas || null, p_mejoras: mejoras || null, p_cerrar: !!cerrar }); if (error) fallo(error); },
  async recomendarInc(inc, reco, motivo){ const { error } = await sb.rpc("recomendar_incorporacion", { p_inc: inc, p_recomendacion: reco, p_motivo: motivo }); if (error) fallo(error); },
  async decidirInc(inc, decision, motivo){ const { data, error } = await sb.rpc("decidir_incorporacion", { p_inc: inc, p_decision: decision, p_motivo: motivo }); if (error) fallo(error); return data; },
  async cerrarInc(inc, estado, motivo){ const { error } = await sb.rpc("cerrar_incorporacion", { p_inc: inc, p_estado: estado, p_motivo: motivo }); if (error) fallo(error); },
  async expedienteDocs(col){ const { data, error } = await sb.rpc("expediente_docs", { p_colaborador: col }); if (error) fallo(error); return data || []; },
  async guardarConfigAsistencia(clave, valor){ const { error } = await sb.rpc("guardar_config_asistencia", { p_clave: clave, p_valor: valor }); if (error) fallo(error); },
  /* ---------- Módulo 02 · Usuarios, perfiles y permisos ---------- */
  async segDatos(){
    const amplio = rol === "superusuario" || misRoles.includes("auditor");
    const q = await Promise.all([
      sb.from("roles").select("*").order("base", { ascending: false }),
      sb.from("rol_accesos").select("*"),
      sb.from("usuario_roles").select("*").is("revocado_en", null),
      sb.from("accesos").select("*").is("revocado_en", null).order("otorgado_en", { ascending: false }),
      sb.from("solicitudes_acceso").select("*").order("creado_en", { ascending: false }),
      sb.from("eventos_seguridad").select("*").order("fecha", { ascending: false }).limit(400),
      sb.from("config_seguridad").select("*"),
      amplio ? sb.rpc("usuarios_seguridad") : Promise.resolve({ data: [] }),
      amplio ? sb.rpc("sesiones_activas") : sb.rpc("mis_sesiones"),
      sb.from("perfiles").select("id,email,nombre,sede,rol,estado,modalidad,created_at,desactivado_en,invitado_en").order("nombre"),
      sb.from("sedes").select("id,nombre,clave"),
      sb.from("sede_entidad").select("sede_id,entidad_id").is("hasta", null),
      sb.from("entidades_fiscales").select("id,nombre_corto,principal")]);
    for (const r of q) if (r.error) fallo(r.error);
    const [ro, ra, ur, ac, so, ev, cf, us, se, pf, sd, sx, en] = q.map(r => r.data || []);
    return { roles: ro, rolAccesos: ra, usuarioRoles: ur, accesos: ac, solicitudes: so, eventos: ev,
      config: Object.fromEntries(cf.map(c => [c.clave, c.valor])), seguridad: us, sesiones: se, perfiles: pf, sedes: sd, sedeEnt: sx, entidades: en }; },
  async accesoEfectivo(uid){ const { data, error } = await sb.rpc("acceso_efectivo", { p_user: uid }); if (error) fallo(error); return data || []; },
  async cambiarEstadoCuenta(id, estado, motivo){ const { error } = await sb.rpc("cambiar_estado_cuenta", { p_id: id, p_estado: estado, p_motivo: motivo }); if (error) fallo(error); },
  async asignarRol(uid, r, hasta, motivo){ const { error } = await sb.rpc("asignar_rol", { p_user: uid, p_rol: r, p_hasta: hasta || null, p_motivo: motivo }); if (error) fallo(error); },
  async retirarRol(id, motivo){ const { error } = await sb.rpc("retirar_rol", { p_id: id, p_motivo: motivo }); if (error) fallo(error); },
  async otorgarAcceso(a){ const { data, error } = await sb.rpc("otorgar_acceso", { p_user: a.user, p_efecto: a.efecto, p_alcance: a.alcance, p_alcance_id: a.alcance_id || null,
      p_modulo: a.modulo, p_nivel: a.nivel || 0, p_especiales: a.especiales || [], p_desde: a.desde || null, p_hasta: a.hasta || null, p_motivo: a.motivo }); if (error) fallo(error); return data; },
  async revocarAcceso(id, motivo){ const { error } = await sb.rpc("revocar_acceso", { p_id: id, p_motivo: motivo }); if (error) fallo(error); },
  async crearSolicitud(s){ const { error } = await sb.from("solicitudes_acceso").insert({ sede_id: s.sede_id || null, entidad_id: s.entidad_id || null, modulo: s.modulo,
      funcionalidad: s.funcionalidad || null, nivel: s.nivel || 1, justificacion: s.justificacion, hasta: s.hasta || null }); if (error) fallo(error); },
  async cancelarSolicitud(id){ const { error } = await sb.from("solicitudes_acceso").update({ estado: "cancelada" }).eq("id", id); if (error) fallo(error); },
  async responderSolicitud(id, decision, respuesta, nivel, hasta){ const { error } = await sb.rpc("responder_solicitud", { p_id: id, p_decision: decision, p_respuesta: respuesta || null, p_nivel: nivel ?? null, p_hasta: hasta || null }); if (error) fallo(error); },
  async cerrarSesionUsuario(id){ const { error } = await sb.rpc("cerrar_sesion_usuario", { p_sesion: id }); if (error) fallo(error); },
  async cerrarMiSesion(id){ const { error } = await sb.rpc("cerrar_mi_sesion", { p_sesion: id }); if (error) fallo(error); },
  async cerrarMisOtrasSesiones(){ const { error } = await sb.auth.signOut({ scope: "others" }); if (error) fallo(error); },
  async guardarConfigSeguridad(clave, valor){ const { error } = await sb.rpc("guardar_config_seguridad", { p_clave: clave, p_valor: valor }); if (error) fallo(error); },
  async guardarRol(r){ const row = { nombre: r.nombre, descripcion: r.descripcion || null, plantilla: !!r.plantilla, activo: r.activo !== false };
    const { error } = r.nuevo ? await sb.from("roles").insert({ clave: r.clave, ...row }) : await sb.from("roles").update(row).eq("clave", r.clave); if (error) fallo(error); },
  async guardarRolAccesos(clave, filas){ const { error: e1 } = await sb.from("rol_accesos").delete().eq("rol", clave); if (e1) fallo(e1);
    if (filas.length){ const { error } = await sb.from("rol_accesos").insert(filas.map(f => ({ rol: clave, alcance: f.alcance, modulo: f.modulo, nivel: f.nivel }))); if (error) fallo(error); } },
  async registrarDenegado(recurso){ await sb.rpc("registrar_denegado", { p_recurso: String(recurso || "").slice(0, 200) }).catch(() => {}); },
  async adminUsuarios(cuerpo){ const { data, error } = await sb.functions.invoke("admin-usuarios", { body: cuerpo });
    if (error){ let m = ""; try{ m = (await error.context?.json?.())?.error || ""; }catch{} fallo({ message: m || error.message }); } if (data?.error) fallo({ message: data.error }); return data; },
  async mfaFactores(){ const { data } = await sb.auth.mfa.listFactors(); return (data?.totp || []); },
  async mfaNivel(){ const { data } = await sb.auth.mfa.getAuthenticatorAssuranceLevel(); return data || {}; },
  async mfaAlta(nombre){ const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: nombre }); if (error) fallo(error); return { id: data.id, qr: data.totp.qr_code, clave: data.totp.secret }; },
  async mfaConfirmar(id, codigo){ const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: id, code: codigo }); if (error) fallo(error); },
  async mfaQuitar(id){ const { error } = await sb.auth.mfa.unenroll({ factorId: id }); if (error) fallo(error); },
  async cerrarSesion(){ await sb.auth.signOut(); location.reload(); },
  /* ---------- Módulo 01 · Organización (catálogos). Todo pasa por RLS y el servicio de permisos de la base ---------- */
  async orgCatalogos(){
    const q = await Promise.all([
      sb.from("sedes").select("*").order("nombre"),
      sb.from("sede_entidad").select("id,sede_id,entidad_id,desde,hasta").is("hasta", null),
      sb.from("entidades_fiscales").select("*").order("principal", { ascending: false }),
      sb.from("entidades_fiscales_datos").select("*"),
      sb.from("areas").select("*").order("nombre"),
      sb.from("puestos").select("*").order("codigo"),
      sb.from("posiciones").select("*").order("created_at"),
      sb.rpc("sedes_autorizadas", { p_modulo: "organizacion" }),
      sb.from("colaboradores").select("id,nombre,perfil_id,sede_principal_id,tipo_funcion,perfil_profesional,fecha_incorporacion,estatus").order("nombre"),
      sb.from("asignaciones").select("id,colaborador_id,posicion_id,sede_id,principal,desde,hasta"),
      sb.from("relaciones").select("*").order("desde", { ascending: false })]);
    for (const r of q) if (r.error) fallo(r.error);
    const [sd, se, en, ed, ar, pu, po, au, co, asg, rel] = q.map(r => r.data || []);
    const aut = au.map(x => typeof x === "string" ? x : x.sedes_autorizadas);
    const niveles = {};
    await Promise.all(aut.map(async id => { const { data } = await sb.rpc("nivel_acceso", { p_modulo: "organizacion", p_sede: id }); niveles[id] = data || 0; }));
    return { sedes: sd, sedeEnt: se, entidades: en, datosFiscales: ed, areas: ar, puestos: pu, posiciones: po, autorizadas: aut, niveles, colaboradores: co, asignaciones: asg, relaciones: rel }; },
  async guardarColaborador(c){
    const row = { estatus: c.estatus, fecha_incorporacion: c.fecha_incorporacion || null, perfil_profesional: c.perfil_profesional || null, tipo_funcion: c.tipo_funcion || null };
    if (c.sede_principal_id) row.sede_principal_id = c.sede_principal_id;
    const { error } = await sb.from("colaboradores").update(row).eq("id", c.id); if (error) fallo(error); },
  async guardarRelacion(r){
    const row = { tipo: r.tipo, de_id: r.de_id, a_id: r.a_id, tema: r.tema || null, desde: r.desde || undefined, hasta: r.hasta || null, motivo: r.motivo || null };
    const { error } = await sb.from("relaciones").insert(row); if (error) fallo(error); },
  async terminarRelacion(id, fecha){ const { error } = await sb.from("relaciones").update({ hasta: fecha }).eq("id", id); if (error) fallo(error); },
  async asegurarColaborador(perfil){ const { data, error } = await sb.rpc("asegurar_colaborador", { p_perfil: perfil }); if (error) fallo(error); return data; },
  async asignarPlaza(posicion, perfil){ const { error } = await sb.rpc("asignar_plaza", { p_posicion: posicion, p_perfil: perfil || null }); if (error) fallo(error); },
  async guardarSedeOrg(s){
    const row = { direccion: s.direccion || null, alcaldia_municipio: s.alcaldia_municipio || null, estado_republica: s.estado_republica || null,
      horarios: s.horarios || null, capacidad: s.capacidad === "" || s.capacidad == null ? null : Number(s.capacidad), observaciones: s.observaciones || null };
    if (s.nombre != null) row.nombre = s.nombre.trim();
    if (s.clave != null) row.clave = s.clave.trim().toUpperCase();
    if (s.activa != null) row.activa = s.activa !== false;
    let id = s.id;
    if (id){ const { error } = await sb.from("sedes").update(row).eq("id", id); if (error) fallo(error); }
    else { const { data, error } = await sb.from("sedes").insert(row).select("id").single(); if (error) fallo(error); id = data.id; }
    if (s.entidad_id && s.entidadCambio){ const { error } = await sb.rpc("cambiar_entidad_sede", { p_sede: id, p_entidad: s.entidad_id, p_motivo: s.motivo || "Asignación de entidad fiscal" }); if (error) fallo(error); }
    return id; },
  async guardarEntidad(e){
    const row = { nombre_corto: e.nombre_corto.trim(), tipo_persona: e.tipo_persona || null, estatus: e.estatus || "por_validar",
      vigente_desde: e.vigente_desde || null, vigente_hasta: e.vigente_hasta || null, representante_legal: e.representante_legal || null };
    let id = e.id;
    if (id){ const { error } = await sb.from("entidades_fiscales").update(row).eq("id", id); if (error) fallo(error); }
    else { const { data, error } = await sb.from("entidades_fiscales").insert(row).select("id").single(); if (error) fallo(error); id = data.id; }
    const d = { entidad_id: id, razon_social: e.razon_social || null, rfc: e.rfc ? e.rfc.trim().toUpperCase() : null,
      regimen_fiscal: e.regimen_fiscal || null, domicilio_fiscal: e.domicilio_fiscal || null, updated_at: new Date().toISOString() };
    const { error } = await sb.from("entidades_fiscales_datos").upsert(d); if (error) fallo(error);
    return id; },
  async guardarArea(a){
    const row = { nombre: a.nombre.trim(), proposito: a.proposito || null, funciones: a.funciones || null, estatus: a.estatus || "propuesta", responsable_id: a.responsable_id || null };
    const { error } = a.id ? await sb.from("areas").update(row).eq("id", a.id) : await sb.from("areas").insert(row); if (error) fallo(error); },
  async guardarPuesto(p){
    const campos = ["proposito","responsabilidades","actividades_diarias","actividades_semanales","competencias","formacion","indicadores","limites_autoridad","herramientas","capacitacion"];
    const row = { codigo: p.codigo.trim().toUpperCase(), nombre: p.nombre.trim(), area_id: p.area_id || null, estatus: p.estatus || "propuesta" };
    campos.forEach(k => { row[k] = p[k] || null; });
    const { error } = p.id ? await sb.from("puestos").update(row).eq("id", p.id) : await sb.from("puestos").insert(row); if (error) fallo(error); },
  async guardarPosicion(p){
    const row = { puesto_id: p.puesto_id, sede_id: p.sede_id, estado: p.estado || "vacante", prioridad: p.prioridad || null, abierta_en: p.abierta_en || null };
    if (p.id){ const { error } = await sb.from("posiciones").update(row).eq("id", p.id); if (error) fallo(error); return p.id; }
    const { data, error } = await sb.from("posiciones").insert(row).select("id").single(); if (error) fallo(error); return data.id; },
  async usuarios(){ const { data, error } = await sb.from("perfiles").select("id,email,nombre,cedula,telefono,sede,rol,rol_solicitado,modalidad,estado,created_at,autorizado_en").order("created_at", { ascending: false });
    if (error) fallo(error); return data || []; },
  async gestionar(id, estado, nuevoRol, sede){ const { error } = await sb.rpc("gestionar_usuario", { p_id: id, p_estado: estado, p_rol: nuevoRol, p_sede: sede || "" });
    if (error) fallo(error); avisar("terapeutas"); },
  async asignarContrasena(id, pass){ const { error } = await sb.rpc("asignar_contrasena", { p_id: id, p_password: pass }); if (error) fallo(error); },
  async editarUsuario(id, nombre, cedula, telefono){ const { error } = await sb.rpc("editar_datos_usuario", { p_id: id, p_nombre: nombre, p_cedula: cedula, p_telefono: telefono });
    if (error) fallo(error); avisar("terapeutas"); },
  async cambiarMiContrasena(pass){ const { error } = await sb.auth.updateUser({ password: pass }); if (error) fallo(error); },
  async reglamento(){ const { data, error } = await sb.from("reglamento").select("id,titulo,version,leyenda,rfc_empleador,razon_social,registro_patronal,contenido,publicado_en").eq("vigente", true).order("publicado_en", { ascending: false }).limit(1);
    if (error) fallo(error); return data?.[0] || null; },
  async acuses(regId){ const { data, error } = await sb.from("reglamento_acuses").select("user_id,fecha").eq("reglamento_id", regId); if (error) fallo(error); return data || []; },
  async acusar(regId){ const { error } = await sb.from("reglamento_acuses").insert({ reglamento_id: regId }); if (error) fallo(error); },
  async guardarLeyenda(regId, cambios){ const { error } = await sb.from("reglamento").update(cambios).eq("id", regId); if (error) fallo(error); },
  /* Plantillas vigentes que la persona puede ver (la de su rol; la Dirección ve ambas), por tipo */
  async plantillasContrato(){ const { data, error } = await sb.from("contrato_plantilla").select("id,nombre,version,tipo,parte,orden_nombre,cuerpo").eq("vigente", true).order("creado", { ascending: false });
    if (error) fallo(error); const m = {}; for (const r of data || []) if (!m[r.tipo]) m[r.tipo] = r; return m; },
  async contratos(){ const { data, error } = await sb.from("contratos").select("*"); if (error) fallo(error); return data || []; },
  async crearContrato(datos){ const { data, error } = await sb.from("contratos").insert({ datos }).select().single(); if (error) fallo(error); return data; },
  async guardarContrato(id, cambios){ const { data, error } = await sb.from("contratos").update(cambios).eq("id", id).select().single(); if (error) fallo(error); return data; },
  async portalExpediente(expId){
    const [a, r] = await Promise.all([
      sb.from("accesos_consultante").select("expediente_id,creado_en,vence,revocado,intentos_fallidos,bloqueado_hasta,accesos,ultimo_acceso").eq("expediente_id", expId).maybeSingle(),
      sb.from("reportes_liberados").select("id,documento_id,titulo,fecha,liberado_en,revocado,revocado_en").eq("expediente_id", expId).order("liberado_en", { ascending: false })]);
    if (a.error) fallo(a.error); if (r.error) fallo(r.error); return { acceso: a.data, reportes: r.data || [] }; },
  async liberarReporte(docId, confirma){ const { error } = await sb.rpc("liberar_reporte", { p_documento: docId, p_confirma_representante: !!confirma }); if (error) fallo(error); },
  async retirarReporte(id){ const { error } = await sb.rpc("retirar_reporte", { p_id: id }); if (error) fallo(error); },
  async generarCodigo(expId){ const { data, error } = await sb.rpc("generar_codigo_consultante", { p_expediente: expId }); if (error) fallo(error); return data; },
  async revocarCodigo(expId){ const { error } = await sb.rpc("revocar_codigo_consultante", { p_expediente: expId }); if (error) fallo(error); },
  /* Documentación del personal (PDF en depósito privado; carpeta = id de la persona) */
  async docsPersonal(uid){ let q = sb.from("documentos_personal").select("*").is("borrado_en", null).order("subido_en", { ascending: false }); if (uid) q = q.eq("user_id", uid);
    const { data, error } = await q; if (error) fallo(error); return data || []; },
  async subirDocPersonal(file, tipo, descripcion){
    const ruta = `${usuario.id}/${crypto.randomUUID()}.pdf`;
    const up = await sb.storage.from("documentos-personal").upload(ruta, file, { contentType: "application/pdf", upsert: false });
    if (up.error) fallo(up.error);
    const { error } = await sb.from("documentos_personal").insert({ tipo, descripcion, archivo: ruta, nombre_archivo: file.name.slice(0, 200), tamano: file.size });
    if (error){ await sb.storage.from("documentos-personal").remove([ruta]); fallo(error); } },
  async urlDocPersonal(ruta){ const { data, error } = await sb.storage.from("documentos-personal").createSignedUrl(ruta, 120); if (error) fallo(error); return data.signedUrl; },
  /* "Eliminar" manda a la papelera (30 días); solo la Dirección restaura o elimina definitivamente */
  async borrarDocPersonal(d){ const { error } = await sb.rpc("enviar_papelera_documento", { p_id: d.id }); if (error) fallo(error); },
  async papeleraDocs(){ const { data, error } = await sb.from("documentos_personal").select("*").not("borrado_en", "is", null).order("borrado_en", { ascending: false });
    if (error) fallo(error); return data || []; },
  async restaurarDocPersonal(id){ const { error } = await sb.rpc("restaurar_documento", { p_id: id }); if (error) fallo(error); },
  async eliminarDefinitivoDoc(d){
    const st = await sb.storage.from("documentos-personal").remove([d.archivo]); if (st.error) fallo(st.error);
    const { data, error } = await sb.from("documentos_personal").delete().eq("id", d.id).select("id");
    if (error) fallo(error); if (!data?.length) fallo({ message: "Solo se elimina definitivamente después de 30 días en la papelera." }); },
  async archivoDocPersonal(ruta){ const { data, error } = await sb.storage.from("documentos-personal").download(ruta); if (error) fallo(error); return data; },
  async registrarRespaldoDocs(n, bytes){ const { error } = await sb.rpc("registrar_respaldo_documentos", { p_archivos: n, p_bytes: bytes }); if (error) fallo(error); },
  async verificarDocPersonal(id, v){ const { error } = await sb.rpc("verificar_documento", { p_id: id, p_verificado: !!v }); if (error) fallo(error); },
  /* Consentimiento informado firmado (en sesión o desde el portal) */
  async consentimientos(expId){ const { data, error } = await sb.from("consentimientos").select("*").eq("expediente_id", expId).order("creado_en", { ascending: false }); if (error) fallo(error); return data || []; },
  async firmarConsentimiento(expId, texto, firmante, parentesco, aceptaciones, firma){ const { data, error } = await sb.rpc("firmar_consentimiento_sesion", { p_expediente: expId, p_texto: texto, p_firmante: firmante, p_parentesco: parentesco || null, p_aceptaciones: aceptaciones, p_firma: firma.src, p_w: firma.w, p_h: firma.h }); if (error) fallo(error); return data; },
  async enviarConsentimientoPortal(expId, texto){ const { data, error } = await sb.rpc("enviar_consentimiento_portal", { p_expediente: expId, p_texto: texto }); if (error) fallo(error); return data; },
  async cancelarConsentimientoPortal(id){ const { error } = await sb.rpc("cancelar_consentimiento_portal", { p_id: id }); if (error) fallo(error); },
  async revocarConsentimiento(id, motivo){ const { error } = await sb.rpc("revocar_consentimiento", { p_id: id, p_motivo: motivo }); if (error) fallo(error); },
  async registrarExportacion(expId, finalidad, notas, documentos){ const { data, error } = await sb.rpc("registrar_exportacion_expediente", { p_expediente: expId, p_finalidad: finalidad, p_notas: notas, p_documentos: documentos }); if (error) fallo(error); return data; },
  async tablero(desde, hasta, sede){ const { data, error } = await sb.rpc("tablero_indicadores", { p_desde: desde, p_hasta: hasta, p_sede: sede || null }); if (error) fallo(error); return data || {}; },
  async avisos(){ const { data, error } = await sb.rpc("avisos_inicio"); if (error) fallo(error); return data || {}; },
  /* Emisión de documentos: folio propio, bloqueo, anulación y versiones */
  async emitirDocumento(id){ const { data, error } = await sb.rpc("emitir_documento", { p_id: id }); if (error) fallo(error); avisar("documentos"); return data; },
  async anularDocumento(id, motivo){ const { error } = await sb.rpc("anular_documento", { p_id: id, p_motivo: motivo }); if (error) fallo(error); avisar("documentos"); },
  async nuevaVersion(id){ const { data, error } = await sb.rpc("nueva_version_documento", { p_id: id }); if (error) fallo(error); avisar("documentos"); return data; },
  async resumenUso(desde){ const { data, error } = await sb.rpc("resumen_uso", { p_desde: desde.toISOString() }); if (error) fallo(error); return data || []; },
};
/* Redacción con Claude desde la función de Supabase "redactar" (la clave de la API vive en Supabase, no aquí).
   Si la función no está configurada, la app sigue en modo copiar/pegar con claude.ai. */
async function llamarRedactar(cuerpo, signal){
  const { data: { session } } = await sb.auth.getSession();
  const r = await fetch(`${cfg.supabaseUrl}/functions/v1/redactar`, { method: "POST", signal,
    headers: { "Content-Type": "application/json", apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${session?.access_token || ""}` },
    body: JSON.stringify(cuerpo) });
  let j = null; try { j = await r.json(); } catch { /* sin cuerpo */ }
  return { ok: r.ok, j };
}
let sample = null;
if (rol !== "administrativo"){
  try{
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const p = await llamarRedactar({ ping: true }, ctl.signal); clearTimeout(t);
    if (p.ok && p.j?.configurada) sample = {
      async json(prompt, opts = {}){
        try{ const r = await llamarRedactar({ prompt, expediente: opts.expediente || null }, opts.signal);   /* el servidor verifica que la persona puede ver ese expediente */
          if (!r.ok || !r.j || r.j.error) throw { code: r.j?.error || "api" };
          return r.j; }
        catch(e){ if (e?.name === "AbortError") throw { code: "cancelled" }; throw e?.code ? e : { code: "red" }; }
      } };
  }catch{ /* sin redacción automática: modo copiar/pegar */ }
}
window.__cemepi.resolve({ use: async n => ({ db, user, downloads, cemepi, sample })[n] ?? null });
