/* Tonalli CEMEPI · arranque: se ejecuta antes de pintar (servicios de la app y preferencias del dispositivo). */
/* La app pide sus servicios a window.claude.use(); aquí los entrega el puente con Supabase
   en cuanto la persona inicia sesión (ver supabase-puente.js). */
(() => { let resolver; const listo = new Promise(r => resolver = r);
  window.__cemepi = { resolve: resolver };
  window.claude = { use: nombre => listo.then(api => api.use(nombre)) }; })();
/* Preferencias de este dispositivo (tema, densidad, texto, modo privado): se aplican antes de pintar */
try{ const d=document.documentElement, g=k=>localStorage.getItem("cemepi."+k);
  const t=g("tema"); if (t==="light"||t==="dark") d.dataset.theme=t;
  if (g("densidad")==="compacta") d.dataset.densidad="compacta";
  const tx=g("texto"); if (tx==="grande"||tx==="muygrande") d.dataset.texto=tx;
  if (g("privado")==="1") d.dataset.privado="1"; }catch(e){}
