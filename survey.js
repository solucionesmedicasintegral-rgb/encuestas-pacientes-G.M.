(() => {
  const CONFIG = window.SURVEY_CONFIG || {};
  const qs = new URLSearchParams(location.search);
  const LEAD = qs.get('lead') || '';
  const NOMBRE_COMPLETO = (qs.get('n') || '').trim();
  const NOMBRE = NOMBRE_COMPLETO.split(' ')[0] || '';
  const R = {};
  const TRACKING_TOKEN = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('gm-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const pasos = [...document.querySelectorAll('.paso')];
  const TOTAL = pasos.length - 1;
  let actual = 0;

  if (CONFIG.logoUrl) {
    const l = document.getElementById('logo');
    if (l) { l.src = CONFIG.logoUrl; l.hidden = false; }
  }

  if (NOMBRE) {
    const saludo = document.getElementById('saludo');
    const gracias = document.getElementById('gracias');
    if (saludo) saludo.textContent = `Hola ${NOMBRE}, nos encantaría saber cómo te fue`;
    if (gracias) gracias.textContent = `¡Gracias, ${NOMBRE}!`;
  }

  const btnGoogle = document.getElementById('btnGoogle');
  if (btnGoogle && CONFIG.googleReviewUrl) {
    btnGoogle.href = CONFIG.googleReviewUrl;
    btnGoogle.addEventListener('click', () => {
      if (!CONFIG.submitUrl || !CONFIG.supabaseAnonKey) return;
      const rpcUrl = CONFIG.submitUrl.replace('/rest/v1/encuestas_gabriel','/rest/v1/rpc/mark_google_review_clicked');
      fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.supabaseAnonKey,
          Authorization: 'Bearer ' + CONFIG.supabaseAnonKey
        },
        body: JSON.stringify({ p_token: TRACKING_TOKEN }),
        keepalive: true
      }).catch(() => {});
    });
  }

  const ETQ = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

  function ir(n) {
    pasos[actual].classList.remove('activo');
    actual = n;
    pasos[actual].classList.add('activo');
    const barra = document.querySelector('#barra i');
    if (barra) barra.style.width = (actual / TOTAL * 100) + '%';
    window.scrollTo(0, 0);
  }

  function listo(sec) {
    const b = sec.querySelector('[data-sig]');
    if (b) b.disabled = false;
  }

  pasos.forEach(sec => {
    const campo = sec.dataset.campo;
    const tipo = sec.dataset.tipo;

    if (tipo === 'estrellas') {
      const cont = sec.querySelector('.estrellas');
      const etq = sec.querySelector('.etq');
      for (let i = 1; i <= 5; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = '★';
        b.setAttribute('aria-label', i + ' estrellas');
        b.onclick = () => {
          R[campo] = i;
          [...cont.children].forEach((x, k) => x.classList.toggle('on', k < i));
          etq.textContent = ETQ[i];
          listo(sec);
        };
        cont.appendChild(b);
      }
    }

    if (tipo === 'opciones') {
      const cont = sec.querySelector('.opciones');
      cont.dataset.ops.split('|').forEach(t => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opcion';
        b.textContent = t;
        b.onclick = () => {
          R[campo] = t;
          [...cont.children].forEach(x => x.classList.toggle('on', x === b));
          listo(sec);
        };
        cont.appendChild(b);
      });
    }

    if (tipo === 'nps') {
      const cont = sec.querySelector('.nps');
      for (let i = 0; i <= 10; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = i;
        b.onclick = () => {
          R[campo] = i;
          [...cont.children].forEach(x => x.classList.toggle('on', x === b));
          listo(sec);
        };
        cont.appendChild(b);
      }
    }

    sec.querySelectorAll('[data-sig]').forEach(b => b.onclick = () => ir(actual + 1));
    sec.querySelectorAll('[data-ant]').forEach(b => b.onclick = () => ir(actual - 1));
  });

  async function enviar(payload) {
    if (!CONFIG.submitUrl) {
      try {
        localStorage.setItem('ultima_encuesta_gm', JSON.stringify(payload));
      } catch (_) {}
      return { preview: true };
    }

    const dbPayload = {
      lead_id: payload.lead_id || null,
      nombre: payload.nombre || null,
      tratamiento: payload.tratamiento,
      experiencia: payload.experiencia,
      nps: payload.nps,
      comentario: payload.comentario || null,
      alerta: !!payload.alerta,
      respuestas: payload.respuestas || {},
      origen: payload.origen || 'kommo',
      enviado_en: payload.enviado || new Date().toISOString(),
      tracking_token: TRACKING_TOKEN
    };

    const headers = {
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
    if (CONFIG.supabaseAnonKey) {
      headers.apikey = CONFIG.supabaseAnonKey;
      headers.Authorization = 'Bearer ' + CONFIG.supabaseAnonKey;
    }

    const r = await fetch(CONFIG.submitUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(dbPayload)
    });

    if (!r.ok) throw new Error('No se pudo registrar la respuesta');
    return { preview: false };
  }

  const enviarBtn = document.getElementById('enviar');
  if (enviarBtn) {
    enviarBtn.onclick = async () => {
      enviarBtn.disabled = true;
      R.comentario = (document.getElementById('comentario')?.value || '').trim();

      const alerta = typeof CONFIG.alertWhen === 'function'
        ? !!CONFIG.alertWhen(R)
        : ((R.experiencia && R.experiencia <= 3) || (R.recomendacion !== undefined && R.recomendacion <= 6));

      if (alerta) {
        const aviso = document.getElementById('avisoContacto');
        if (aviso) aviso.hidden = false;
      }

      const payload = {
        lead_id: LEAD,
        nombre: NOMBRE_COMPLETO || NOMBRE,
        tratamiento: CONFIG.tratamiento || '',
        respuestas: R,
        experiencia: R.experiencia ?? null,
        nps: R.recomendacion ?? null,
        comentario: R.comentario || '',
        alerta,
        origen: 'kommo',
        enviado: new Date().toISOString()
      };

      ir(TOTAL);

      const estado = document.getElementById('estadoEnvio');
      try {
        const result = await enviar(payload);
        if (estado) {
          estado.hidden = false;
          estado.textContent = result.preview
            ? 'Versión de prueba: la encuesta ya funciona visualmente. El siguiente paso es conectar Supabase para registrar las respuestas.'
            : 'Tu respuesta fue registrada. Muchas gracias.';
        }
      } catch (e) {
        if (estado) {
          estado.hidden = false;
          estado.textContent = 'Tu encuesta terminó correctamente. Estamos revisando el registro de la respuesta.';
        }
      }
    };
  }
})();
