/* =====================================================================
   Puente entre la app de Expedientes CEMEPI y Supabase.
   La app usa una interfaz sencilla de colecciones (pacientes, notas,
   documentos, terapeutas, cuentas, perfil). Aquí se traduce a las tablas
   de Supabase. Las reglas de seguridad (RLS) las aplica la base de datos.
   ===================================================================== */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const cfg = window.CEMEPI_CONFIG || {};
const $ = s => document.querySelector(s);
const login = $("#login");

function aviso(msg){ $("#lgMsg").textContent = msg || ""; }

if (!cfg.supabaseUrl || !cfg.supabaseAnonKey){
  login.hidden = false; $("#lgForm").hidden = true;
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
    from: r => ({ email: r.email || "", nombre: r.nombre || "", rol: r.rol }), to: () => ({}) },
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

/* ---------- Inicio de sesión ---------- */
async function esperarSesion(){
  const { data: { session } } = await sb.auth.getSession();
  if (session) return session.user;
  login.hidden = false;
  return new Promise(resolve => {
    $("#lgForm").onsubmit = async ev => {
      ev.preventDefault(); aviso(""); $("#lgBtn").disabled = true;
      const { data, error } = await sb.auth.signInWithPassword({ email: $("#lgEmail").value.trim(), password: $("#lgPass").value });
      $("#lgBtn").disabled = false;
      if (error){ aviso(/confirm/i.test(error.message) ? "Tu cuenta aún no está confirmada. Revisa tu correo." : "Correo o contraseña incorrectos."); return; }
      $("#lgPass").value = ""; resolve(data.user);
    };
    $("#lgOlvide").onclick = async () => {
      const email = $("#lgEmail").value.trim(); if (!email){ aviso("Escribe tu correo y vuelve a pulsar «Olvidé mi contraseña»."); return; }
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      aviso(error ? "No se pudo enviar el correo. Intenta más tarde." : "Si el correo está registrado, te llegará un enlace para crear una nueva contraseña.");
    };
  });
}

/* Enlace de recuperación de contraseña: pide la nueva antes de entrar */
sb.auth.onAuthStateChange((evento) => {
  if (evento !== "PASSWORD_RECOVERY") return;
  login.hidden = false; $("#lgForm").hidden = true; $("#lgNueva").hidden = false;
  $("#lgNueva").onsubmit = async ev => { ev.preventDefault();
    const p = $("#lgPass2").value; if (p.length < 10){ aviso("Usa al menos 10 caracteres."); return; }
    const { error } = await sb.auth.updateUser({ password: p });
    if (error){ aviso("No se pudo cambiar la contraseña."); return; }
    location.replace(location.origin + location.pathname); };
});

const usuario = await esperarSesion();
login.hidden = true;
const { data: perfil } = await sb.from("perfiles").select("rol,email,nombre").eq("id", usuario.id).maybeSingle();
const rol = perfil?.rol || "terapeuta";
document.body.dataset.rol = rol;
$("#sesionInfo").textContent = `${usuario.email} · ${({ direccion: "Dirección", terapeuta: "Terapeuta", administrativo: "Administrativo" })[rol] || rol}`;
document.addEventListener("click", ev => { if (ev.target.closest('[data-act="salir"]')) sb.auth.signOut().then(() => location.reload()); });

/* ---------- Interfaz que usa la app ---------- */
const db = {
  collection: col => consulta(col),
  doc(path){
    if (/^data\/users\/[^/]+\/perfil$/.test(path)) return {
      async get(){ const { data, error } = await sb.from("perfiles").select("*").eq("id", usuario.id).maybeSingle(); if (error) throw err(error);
        return { exists: !!data, data: () => data ? { nombre: data.nombre || "", cedula: data.cedula || "", sede: data.sede || "", firma: data.firma || "", firmaW: data.firma_w || 0, firmaH: data.firma_h || 0 } : undefined }; },
      async set(v){ const { error } = await sb.from("perfiles").update({ nombre: v.nombre || "", cedula: v.cedula || "", sede: v.sede || "", firma: v.firma || null, firma_w: v.firmaW || null, firma_h: v.firmaH || null }).eq("id", usuario.id);
        if (error) throw err(error); } };
    const [col, id] = path.split("/"); return refDoc(col, id);
  },
};
const user = {
  id: async () => usuario.id,
  can: async n => n === "data.write" ? true : n === "direccion" ? rol === "direccion" : null,
  canEdit: async () => rol === "direccion",
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
window.__cemepi.resolve({ use: async n => ({ db, user, downloads })[n] ?? null });
