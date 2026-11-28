/* Contenidos de Tonalli CEMEPI separados de index.html (auditoría P23, H-007, paso 1 · 2026-11-26).
   Solo DATOS y textos SIN funciones (lo que usa el estado de la app, como GUIAS, se queda en index.html): formatos de documentos, raíces culturales y manuales. Se cargan antes del script principal
   como script clásico: sus constantes quedan globales y el resto de la app las usa igual que antes. */
/* ===== FORMATOS (antes en index.html, líneas 508–571) ===== */
const FORMATOS = {
  constancia_inicio:{ nombre:"Constancia de inicio de proceso", riesgo:"bajo", ia:false, titulo:"Constancia de inicio de proceso de atención psicológica",
    desc:"Hace constar el inicio de la atención. Sin información clínica.", dest:"A QUIEN CORRESPONDA\nPRESENTE" },
  constancia_asistencia:{ nombre:"Constancia de asistencia", riesgo:"bajo", ia:false, titulo:"Constancia de asistencia a sesiones",
    desc:"Acredita las fechas de sesión, tomadas de las fechas de tus notas.", dest:"A QUIEN CORRESPONDA\nPRESENTE" },
  carta_proceso:{ nombre:"Carta de proceso de atención", riesgo:"bajo", ia:true, titulo:"Carta de proceso de atención psicológica", dest:"A QUIEN CORRESPONDA\nPRESENTE",
    desc:"Inicio, modalidad, frecuencia y continuidad. Sin diagnósticos ni contenidos de sesión.",
    guia:["Párrafos sin título (titulo vacío): existencia del proceso y fecha de inicio; modalidad y frecuencia si las notas las mencionan (si no, Dato pendiente de recabar); número de sesiones registradas; continuidad prevista.",
      "No incluyas diagnósticos, conflictos familiares, relatos íntimos ni contenidos de sesión. Distingue continuidad propuesta de atención realizada."],
    ph:"Opcional: a quién va dirigida y para qué la solicitan." },
  referencia_psiquiatria:{ nombre:"Carta de referencia a psiquiatría", riesgo:"moderado", ia:true, titulo:"Carta de referencia a Psiquiatría", dest:"Médico(a) especialista en Psiquiatría\nPRESENTE",
    desc:"Solicita valoración psiquiátrica con la información clínica mínima necesaria.",
    guia:["Primer párrafo sin título: se refiere a la persona (iniciales, folio, edad) en atención en CEMEPI desde la primera sesión, para valoración por Psiquiatría.",
      "Secciones con título: Motivo de la referencia; Antecedentes y evolución relevantes; Observaciones clínicas; Valoración de riesgo; Impresión diagnóstica (solo si las notas dan fundamento; si no, omite la sección); Medicación y tratamientos referidos; Solicitud.",
      "Último párrafo sin título: el proceso psicoterapéutico continúa en CEMEPI y se solicita contrarreferencia."],
    ph:"Opcional: institución o médico al que se refiere, urgencia, qué se espera de la valoración." },
  reporte:{ nombre:"Reporte psicológico", riesgo:"moderado", ia:true, ident:true, titulo:"Reporte psicológico", dest:"",
    desc:"Motivo, metodología, hallazgos, análisis, conclusiones y recomendaciones.",
    guia:["Secciones con título: Motivo del reporte; Antecedentes relevantes; Metodología (solo lo realmente realizado según las notas: entrevistas, número de sesiones, instrumentos); Hallazgos; Análisis clínico; Conclusiones (con alcance y limitaciones); Recomendaciones.",
      "No conviertas el reporte en dictamen pericial. No opines sobre capacidad parental, culpabilidad ni veracidad de declaraciones."],
    ph:"Recomendado: quién lo solicita, para qué y con qué autorización. Indica si hay contexto de custodia, juzgado, violencia o protección de menores." },
  evaluacion:{ nombre:"Evaluación psicológica", riesgo:"moderado", ia:true, ident:true, titulo:"Informe de evaluación psicológica", dest:"",
    desc:"Instrumentos aplicados, resultados, integración, alcances y limitaciones.",
    guia:["Secciones con título: Motivo de la evaluación; Instrumentos aplicados; Condiciones de aplicación; Observaciones durante la evaluación; Resultados; Integración e interpretación; Conclusiones; Recomendaciones; Alcances y limitaciones.",
      "Incluye solo instrumentos que las notas indiquen como aplicados. No interpretes puntuaciones sin versión, baremo y condiciones; si faltan, indícalo como dato pendiente y como advertencia. No reproduzcas reactivos protegidos."],
    ph:"Recomendado: instrumentos aplicados con versión y puntuaciones, y quién solicita la evaluación." },
  carta_tutores:{ nombre:"Carta informativa a tutores", riesgo:"moderado", ia:true, titulo:"Carta informativa", dest:"Nombre del tutor o familiar: ______________________________\nPRESENTE",
    desc:"Para madre, padre o tutor: propósito, recomendaciones generales y siguientes pasos.",
    guia:["Párrafos sin título, lenguaje accesible, respetuoso y no acusatorio: propósito de la carta; información o recomendaciones generales; qué se solicita, por qué y cuáles son los siguientes pasos; cierre cordial.",
      "No reveles contenidos confidenciales de las sesiones del menor."],
    ph:"Opcional: qué necesitas pedir o informar a la familia." },
  orientacion:{ nombre:"Hoja de orientación y referencia institucional", riesgo:"alto", ia:true, titulo:"Hoja de orientación y referencia institucional",
    desc:"Orienta a un familiar hacia una institución especializada. No equivale a denuncia.",
    guia:["Secciones con título en este orden: Nombre del familiar o acompañante (texto: ______________________________); Relación con la persona menor de edad; Institución recomendada (por defecto: Procuraduría de Protección de Derechos de Niñas, Niños y Adolescentes de la Ciudad de México, DIF CDMX, salvo que las indicaciones digan otra); Motivo general de orientación; Finalidad de la referencia; Datos oficiales de contacto (texto exacto: Dato pendiente de recabar (verificar en la fuente oficial antes de entregar)); Alcance del documento (texto: La presente hoja tiene fines de orientación. No equivale a una denuncia, notificación formal, valoración pericial ni determinación de violencia.).",
      "En advertencias indica si las notas muestran indicadores de riesgo, violencia o vulneración de derechos que requieran actuación institucional adicional, urgente u obligatoria."],
    ph:"Opcional: relación del acompañante con el menor e institución, si es otra." },
  resumen_alta:{ nombre:"Resumen clínico de alta", riesgo:"moderado", ia:true, ident:true, titulo:"Resumen clínico de alta", dest:"",
    desc:"Cierre del proceso: evolución, objetivos alcanzados, motivo de alta y recomendaciones.",
    guia:["Secciones con título: Periodo de atención; Motivo de consulta; Evolución durante el proceso; Objetivos trabajados y alcanzados; Motivo de alta; Recomendaciones."],
    ph:"Opcional: fecha y motivo del alta." },
  expediente:{ nombre:"Expediente clínico", riesgo:"moderado", ia:true, interno:true, ident:true, titulo:"Expediente clínico psicológico",
    desc:"Organiza tus notas en la estructura del expediente clínico de CEMEPI. Uso interno.",
    guia:["Secciones con título: Motivo de consulta; Fuente de información; Historia del problema actual; Antecedentes personales y familiares relevantes; Contexto relacional y social; Factores de riesgo y protección; Observaciones clínicas; Formulación clínica (dificultades, hipótesis de trabajo sustentadas, recursos personales y familiares, necesidades de atención); Impresión diagnóstica (solo con fundamento suficiente; si no, Dato pendiente de recabar); Plan de atención; Notas de evolución.",
      "En Notas de evolución escribe un párrafo por cada fecha de nota, empezando con la fecha en formato dd/mm/aaaa, con lo clínicamente relevante, intervenciones, respuesta observada, acuerdos y plan de continuidad. Respeta lo escrito: no lo reinterpretes."],
    ph:"Opcional: indicaciones adicionales." },
  oficio_autoridad:{ nombre:"Oficio de remisión a autoridad", riesgo:"alto", ia:true, titulo:"Oficio de remisión de información", dest:"______________________________\n(Autoridad solicitante)\nPRESENTE",
    desc:"Responde a un requerimiento de juzgado o fiscalía con lo estrictamente procedente.",
    guia:["Primer párrafo sin título: en atención al requerimiento (número de oficio, expediente y fecha según indicaciones; si faltan, Dato pendiente de recabar) se remite la información que se indica.",
      "Secciones con título: Información que se remite (solo lo solicitado y legalmente procedente; síntesis clínica mínima); Carácter de la información (clínica, no pericial; basada en el proceso terapéutico; el expediente original permanece bajo resguardo de CEMEPI).",
      "Último párrafo sin título: cierre formal.",
      "En advertencias recuerda: verificar autenticidad y competencia de la autoridad, alcance exacto de lo solicitado, fundamento legal, protección de datos de terceros, registro de la entrega y revisión jurídica antes de enviar. No modifiques notas para la controversia."],
    ph:"Necesario: autoridad, número de oficio y de expediente, fecha y qué información solicitan exactamente." },
  cambio_terapeuta:{ nombre:"Carta de cambio de terapeuta", riesgo:"moderado", ia:true, titulo:"Carta de continuidad de atención", dest:"A la persona consultante\nPRESENTE",
    desc:"Informa la continuidad de la atención con otro profesional asignado por CEMEPI.",
    guia:["Párrafos sin título: motivo general del cambio (administrativo o clínico, sin detalles innecesarios); la continuidad será proporcionada por otro profesional asignado por CEMEPI (nombre según indicaciones o Dato pendiente de recabar); el expediente y la confidencialidad se conservan; siguientes pasos y fecha prevista de la próxima sesión si se conoce; cierre cordial."],
    ph:"Recomendado: motivo general del cambio, profesional que recibe el caso y fecha de la próxima sesión." },
  supervision:{ nombre:"Retroalimentación de supervisión", riesgo:"bajo", ia:true, titulo:"Retroalimentación de supervisión documental", sinNotas:true,
    desc:"Revisa un informe de un terapeuta y redacta retroalimentación formativa.",
    guia:["Revisa el informe pegado en las indicaciones como supervisor de calidad documental: precisión del lenguaje, sustento, separación entre hechos y relatos, neutralidad, confidencialidad, coherencia metodológica, conclusiones, alcance de recomendaciones, riesgo de interpretación jurídica, ortografía y claridad.",
      "Secciones con título: Fortalezas del documento; Aspectos a mejorar (para cada uno: el texto original, por qué es un problema y una redacción alternativa); Retroalimentación para el terapeuta (cálida, profesional y formativa, sin tono punitivo)."],
    ph:"Pega aquí el informe que quieres revisar." },
  consentimiento:{ nombre:"Consentimiento informado", riesgo:"moderado", ia:false, titulo:"Consentimiento informado para la atención psicológica",
    desc:"Formato base para firma. Borrador sujeto a revisión jurídica." },
};

/* ===== RAICES (antes en index.html, líneas 5719–5719) ===== */
const RAICES = {"evid": {"D": "Documentado en fuentes históricas o etnográficas", "I": "Interpretación académica", "C": "Interpretación contemporánea discutida", "A": "Adaptación de CEMEPI"}, "cat": [["comunalidad", "Comunalidad", "Pueblos de la Sierra Norte de Oaxaca (ayuujk/mixe y zapotecos serranos); conceptualizada en las décadas de 1980–1990.", ["Floriberto Díaz Gómez (mixe)", "Jaime Martínez Luna (zapoteco)"], "Modo de vida comunitario. Floriberto Díaz la describe con la Tierra como madre y territorio, el consenso en asamblea, el servicio gratuito como ejercicio de autoridad, el trabajo colectivo y los ritos como expresión del don comunal; Martínez Luna la resume en territorio, poder, trabajo y fiesta comunales. Es una categoría elaborada por intelectuales indígenas desde su propia experiencia.", "I", "Se discute su generalización a otros pueblos y su uso por instituciones o empresas ajenas a las comunidades.", "CEMEPI SOMOS NOSOTROS: la organización se entiende como proyecto colectivo con responsabilidades compartidas, no como propiedad de alguien. Es una analogía organizacional, no una comunidad agraria ni una asamblea con poder sobre bienes comunales.", "No usar el término para justificar trabajo no remunerado ni para decir que CEMEPI «es» una comunidad indígena."], ["comunidad", "Comunidad", "Concepto general; en Mesoamérica, el altépetl nahua y las comunidades campesinas e indígenas posteriores; en filosofía, Villoro distingue comunidad y asociación.", ["Luis Villoro", "Guillermo Bonfil Batalla", "Maritza Montero (FASE 03)"], "Grupo cuyos miembros comparten una identidad y un bien común y se reconocen mutuamente responsables (Villoro: en la comunidad el bien de cada uno incluye el bien del todo).", "I", "La comunidad también puede ejercer control sobre las personas: no idealizarla.", "Comunidad CEMEPI: personas que se reconocen corresponsables del proyecto, sin borrar la individualidad ni los derechos de cada quien.", ""], ["tequio", "Tequio", "Oaxaca y otras regiones indígenas; la palabra viene del náhuatl tequitl (trabajo, tributo). Práctica viva hoy.", ["Floriberto Díaz Gómez", "Jaime Martínez Luna"], "Trabajo colectivo no remunerado que los miembros de la comunidad aportan para obras de beneficio común, dentro de un sistema de derechos y obligaciones recíprocos de la comunidad.", "D", "Fuera de su contexto, el tequio puede volverse pretexto para exigir trabajo gratuito.", "Se adapta como CONTRIBUCIÓN VOLUNTARIA a lo común (proponer mejoras, compartir saberes, cuidar espacios) DENTRO de la jornada y del contrato. Nunca como trabajo no pagado ni obligatorio.", "Prohibido usarlo para pedir trabajo gratuito o fuera de jornada."], ["reciprocidad", "Reciprocidad", "Universal antropológica; en Mesoamérica y los Andes (ayni andino, gozona o guelaguetza en Oaxaca).", ["Marcel Mauss", "Floriberto Díaz Gómez"], "Obligación de dar, recibir y devolver, que crea y sostiene vínculos sociales (Mauss, *Ensayo sobre el don*, 1925). En Oaxaca, la gozona o guelaguetza es ayuda mutua que se devuelve.", "I", "Mauss compara sociedades muy distintas; sus generalizaciones han sido revisadas.", "Compromiso bidireccional: CEMEPI cumple lo que debe (salario, derechos, formación, escucha) y cada colaborador aporta su trabajo y su palabra.", ""], ["servicio", "Servicio y sistema de cargos", "Comunidades indígenas mesoamericanas, con origen colonial y transformaciones posteriores (cargos civiles y religiosos).", ["Floriberto Díaz Gómez", "etnografía mesoamericana"], "Los cargos comunitarios se asumen como servicio a la comunidad, de forma rotativa y con prestigio social más que con beneficio económico.", "D", "Los sistemas de cargos también reproducen desigualdades (de género, de edad o económicas).", "Autoridad como servicio: coordinar es servir a las condiciones de trabajo de otros (ver «Autoridad como servicio»).", ""], ["trabajo_colectivo", "Trabajo colectivo", "Práctica de muchos pueblos (tequio, mano vuelta, faena, minga andina); distinta en cada lugar.", ["Jaime Martínez Luna", "Orlando Fals Borda (minga y acción comunal en Colombia)"], "Organización del trabajo para fines comunes con participación de todas las personas.", "D", "", "Colaboración: los resultados de CEMEPI son de equipo; se reconocen las aportaciones individuales y colectivas.", ""], ["territorio", "Territorio", "Central en la comunalidad (Díaz) y en las ontologías relacionales (Escobar).", ["Floriberto Díaz Gómez", "Arturo Escobar"], "El territorio no es solo tierra o propiedad: es el espacio vivido que sostiene la identidad, la memoria y la vida comunitaria.", "I", "", "Analogía prudente: las sedes como espacios de cuidado y pertenencia que se cuidan entre todos (orden, recursos, trato). No se equiparan con territorios indígenas.", "No usar el término «territorio» para hablar de las sedes en documentos oficiales."], ["identidad", "Identidad", "México pluricultural; Bonfil Batalla: México profundo (civilización mesoamericana viva) frente al México imaginario.", ["Guillermo Bonfil Batalla", "Luis Villoro", "Silvia Rivera Cusicanqui"], "Las identidades son históricas y relacionales; Bonfil denuncia la negación de la civilización mesoamericana; Rivera Cusicanqui propone lo ch'ixi (lo abigarrado que coexiste sin fundirse) frente al mestizaje armonioso.", "I", "El «México profundo» ha sido criticado por oponer bloques civilizatorios de forma demasiado nítida.", "Respeto a la pluralidad de identidades de colaboradores y consultantes; no se asigna ni se presume la identidad étnica de nadie.", "Nunca registrar ni inferir la pertenencia étnica de personas sin su decisión expresa."], ["nosotros", "Nosotros", "Tojolabal (maya, Chiapas), estudiado por Carlos Lenkersdorf.", ["Carlos Lenkersdorf"], "En tojolabal, el sufijo -tik («nosotros») organiza la lengua y la vida; Lenkersdorf lo interpreta como una filosofía intersubjetiva en la que no hay objetos, sino sujetos que se relacionan.", "I", "La lectura de Lenkersdorf es valorada y también discutida por idealizar y generalizar a partir de una lengua.", "CEMEPI SOMOS NOSOTROS: preferir el «nosotros» en la comunicación organizacional, con responsabilidades claras de cada quien.", ""], ["palabra", "Palabra", "Nahua (tlahtolli), maya y otros; también en el discurso zapatista contemporáneo («la palabra verdadera»).", ["Miguel León-Portilla", "Carlos Lenkersdorf (Aprender a escuchar)"], "La palabra dada compromete; escuchar es tan importante como hablar. En la tradición nahua, la palabra de los ancianos (huehuetlatolli) transmite normas de vida.", "I", "", "NUESTRA PALABRA TAMBIÉN ES NUESTRA CONTRIBUCIÓN: cumplir acuerdos, decir la verdad en registros y opinar con respeto por los canales adecuados (respeto a la palabra, principio 8).", ""], ["huehuetlatolli", "Huehuetlatolli", "Nahuas del centro de México; textos recogidos en el siglo XVI por frailes (Andrés de Olmos, Bernardino de Sahagún —Códice Florentino, libro VI—; edición de Juan Bautista, 1600).", ["Miguel León-Portilla y Librado Silva Galeana (edición 1991)", "Bernardino de Sahagún"], "«Palabras de los ancianos»: discursos de consejo, cortesía y enseñanza moral (de padres a hijos, en ceremonias, en el gobierno).", "D", "Fueron registrados y editados por frailes con fines de evangelización: hay mediación colonial en la forma que conocemos.", "Inspiración para la transmisión de experiencia entre generaciones (mentores, supervisión). No se citan como texto sagrado ni se usan en ceremonias.", "Citar ediciones académicas; no atribuir a los huehuetlatolli frases de libros de autoayuda."], ["responsabilidad", "Responsabilidad", "Concepto general; en comunidades indígenas ligado a obligaciones del cargo y de la asamblea.", ["Floriberto Díaz Gómez", "Enrique Dussel"], "Responder ante la comunidad por lo que se hace y por lo que se deja de hacer.", "I", "", "Responsabilidad colectiva: cuidar lo que construimos juntos, sin diluir la responsabilidad individual.", ""], ["autoridad_servicio", "Autoridad como servicio", "Cargos comunitarios; lema zapatista «mandar obedeciendo» (1994–); Dussel: poder obediencial.", ["Enrique Dussel (20 tesis de política, 2006)", "Floriberto Díaz Gómez"], "La autoridad legítima obedece a la comunidad que la delega; quien manda sirve. Dussel lo formula como «poder obediencial».", "I", "El lema zapatista es político y situado; no debe vaciarse de contexto.", "Coincide con la definición de la Dirección (FASE 02): autoridad = servicio, responsabilidad, escucha y generar condiciones. No elimina la estructura ni la toma de decisiones.", "No usar el lema zapatista como eslogan comercial."], ["bien_comun", "Bien común", "Ostrom (bienes comunes), Villoro (comunidad), tradiciones comunitarias.", ["Elinor Ostrom", "Luis Villoro"], "Ostrom muestra que comunidades gestionan bienes comunes con reglas propias, vigilancia y sanciones graduales (8 principios de diseño).", "I", "", "LO COMUNITARIO POR ENCIMA DEL APROVECHAMIENTO PERSONAL INDEBIDO: agenda, consultantes, información, recursos y reputación se cuidan con reglas claras y consecuencias proporcionales.", ""], ["cuidado_vida", "Cuidado de la vida", "Presente en muchas tradiciones; en el discurso latinoamericano contemporáneo, el «buen vivir» (sumak kawsay o suma qamaña, andino) y la defensa de la vida.", ["Arturo Escobar", "Enrique Dussel"], "La vida como criterio último de la ética (Dussel) y de las alternativas al desarrollo (Escobar).", "I", "«Buen vivir» es andino y ha sido usado políticamente con significados distintos; no es mesoamericano.", "Coincide con la identidad de CEMEPI (al servicio del cuidado de la vida). Se traduce en el cuidado de consultantes y de quienes cuidan.", ""], ["interdependencia", "Interdependencia", "Ontologías relacionales (Escobar), diálogo intercultural (Panikkar), comunalidad.", ["Arturo Escobar", "Raimon Panikkar"], "Nada existe por sí solo: personas, comunidades y naturaleza se co-constituyen.", "I", "", "Ver FASE 02 y 03: modelo organizacional interdependiente.", ""], ["naturaleza", "Relación con la naturaleza", "Diversas cosmovisiones mesoamericanas y andinas; López Austin documenta la cosmovisión mesoamericana; Escobar, las ontologías relacionales.", ["Alfredo López Austin", "Arturo Escobar"], "La naturaleza no como recurso sino como parte de una red de relaciones con obligaciones mutuas (varía mucho entre pueblos).", "I", "Riesgo de romantizar («el indígena ecológico»).", "Cuidado de recursos: uso responsable de materiales, energía y espacios en las sedes (CEM-020).", ""], ["patrimonio_biocultural", "Patrimonio biocultural", "Conceptualizado por Víctor M. Toledo y Narciso Barrera-Bassols (La memoria biocultural, 2008) y la etnoecología.", ["Víctor M. Toledo y N. Barrera-Bassols (ampliación)", "Arturo Escobar"], "Conocimientos, prácticas, lenguas y biodiversidad producidos juntos por pueblos a lo largo del tiempo; inseparables.", "I", "", "Respeto: CEMEPI no usa ni comercializa conocimientos tradicionales (por ejemplo, herbolaria) sin consentimiento y sin las salvaguardas de DERECHOS_CULTURALES_Y_DATOS.md.", "Ligado a la fase de «Cuerpo, salud y herbolaria»: pendiente."], ["transmision", "Transmisión intergeneracional del conocimiento", "Huehuetlatolli (nahua), tradición oral de muchos pueblos; investigación-acción participativa (Fals Borda).", ["Miguel León-Portilla", "Orlando Fals Borda"], "El conocimiento vive en la relación entre generaciones y en la práctica, no solo en textos.", "I", "", "Mentoría y supervisión: quienes tienen experiencia acompañan a quienes inician; quienes inician también enseñan (bidireccional, como en la metaobservación).", ""], ["espiritualidad", "Espiritualidad", "Pluralidad de prácticas y creencias de cada pueblo; no hay una «espiritualidad indígena» única.", ["Alfredo López Austin", "Raimon Panikkar"], "Formas de dar sentido a la vida en relación con lo sagrado, propias de cada pueblo y persona.", "I", "Corrientes de «mexicanidad» y neochamanismo comercializan prácticas atribuidas a los toltecas o mexicas sin respaldo histórico.", "CEMEPI respeta todas las creencias; no promueve ni impone prácticas espirituales, ni ceremonias, en la organización.", "Nunca preguntar ni evaluar creencias religiosas o espirituales (salvaguarda de la brújula)."], ["equilibrio", "Equilibrio", "Interpretaciones de la cosmovisión mesoamericana (fuerzas opuestas y complementarias) y del pensamiento andino.", ["Alfredo López Austin", "Miguel León-Portilla"], "Búsqueda de equilibrio entre fuerzas (frío/caliente en la medicina tradicional, entre otras) documentada etnográficamente en Mesoamérica.", "I", "Las generalizaciones filosóficas sobre «la mente mesoamericana» son discutidas.", "Analogía: equilibrio entre la atención al consultante, el cuidado de quienes cuidan y la sostenibilidad (rumbos de la brújula).", ""], ["complementariedad", "Complementariedad", "Dualidad mesoamericana (Ometéotl, según la interpretación de León-Portilla); yanantin andino.", ["Miguel León-Portilla", "Silvia Rivera Cusicanqui"], "Pares opuestos que se complementan sin anularse. La interpretación de Ometéotl como principio dual supremo es de León-Portilla y ha sido discutida.", "I", "Se discute si la «filosofía náhuatl» de León-Portilla proyecta categorías occidentales; Rivera Cusicanqui critica las lecturas armonizadoras.", "Complementariedad de funciones: psicología, administración, coordinación y dirección se necesitan entre sí.", ""], ["tonalli", "Tonalli (nombre de la app)", "Nahua del centro de México (época prehispánica y colonial); estudiado por López Austin.", ["Alfredo López Austin (Cuerpo humano e ideología, 1980)"], "En la concepción nahua, tonalli designa el calor solar, el día y su signo y una de las entidades anímicas de la persona, ligada a la cabeza, al destino y a la vitalidad.", "D", "", "La app se llama Tonalli CEMEPI (decisión de la Dirección, 2026-11-22). Se propone explicar el nombre con esta fuente académica y con respeto, sin atribuirle poderes ni usarlo en rituales.", "Explicar el origen del nombre con fuente; no ampliar su uso comercial a otros símbolos indígenas sin la revisión de derechos culturales."]], "prin": [["CEMEPI SOMOS NOSOTROS", "Proyecto colectivo construido por todas las personas que colaboran; nadie lo encarna solo."], ["LO COMUNITARIO POR ENCIMA DEL APROVECHAMIENTO PERSONAL INDEBIDO", "Consultantes, información, agenda, recursos y reputación son bienes comunes que no se usan para ventaja personal indebida."], ["NUESTRA PALABRA TAMBIÉN ES NUESTRA CONTRIBUCIÓN A LA COMUNIDAD", "Cumplir acuerdos, registrar con verdad y opinar con respeto es aportar a lo común."], ["CUIDAR LO QUE CONSTRUIMOS JUNTOS ES CUIDAR NUESTRAS PROPIAS POSIBILIDADES DE DESARROLLO", "La sostenibilidad del proyecto sostiene el desarrollo de cada persona; el compromiso es bidireccional."]], "areas": [["Colaboración", "Resultados de equipo; reconocimiento de aportaciones individuales y colectivas (trabajo colectivo, complementariedad)."], ["Respeto a los acuerdos", "Acuerdos con responsable, fecha y verificación; la palabra dada compromete (palabra)."], ["No competencia desleal", "No desviar consultantes a la práctica privada, no usar información o materiales de CEMEPI para provecho propio, no denigrar a colegas. Lo que es obligación jurídica lo define el contrato y la ley (con asesoría laboral); lo demás es criterio ético."], ["Responsabilidad colectiva", "Cuidar lo común sin diluir la responsabilidad de cada quien (responsabilidad, bien común)."], ["Autosustentabilidad", "Sostener el proyecto para que continúe su contribución social (cuidado de la vida, reciprocidad)."], ["Cuidado de los recursos", "Uso responsable de materiales, espacios y tiempo (relación con la naturaleza, bien común)."], ["Liderazgo", "Autoridad como servicio y poder obediencial: quien coordina responde a quienes coordina."], ["Formación", "Transmisión intergeneracional y bidireccional del conocimiento (huehuetlatolli como inspiración, mentoría)."], ["Supervisión", "Palabra respetuosa, metaobservación y reciprocidad (quien supervisa también aprende)."], ["Desarrollo humano", "Cuidar lo que construimos juntos es cuidar nuestras posibilidades de desarrollo."]], "salv": ["Lo comunitario NUNCA justifica trabajo no remunerado, horas fuera de jornada, renuncia de derechos laborales ni de prestaciones.", "No hay subordinación ideológica: nadie debe adherirse a estas tradiciones; se evalúan conductas profesionales, no creencias (brújula cultural §4).", "No justifica abusos de autoridad: la autoridad es servicio y rinde cuentas.", "El compromiso es bidireccional: CEMEPI cumple salario, derechos, formación, escucha y condiciones dignas; cada colaborador aporta su trabajo y su palabra.", "CEMEPI no es una comunidad indígena ni se presenta como tal; las referencias son analogías respetuosas con fuente.", "No se usan ceremonias, símbolos sagrados ni conocimientos colectivos de pueblos sin su consentimiento (DERECHOS_CULTURALES_Y_DATOS.md)."]};

/* ===== MANUALES (antes en index.html, líneas 6759–6907) ===== */
const MANUALES = {
 psicologo: { n:"Psicólogo(a)", para:"Psicólogo base (nómina) y psicólogo independiente (comisión)",
  intro:"Este instructivo explica cómo trabajar tus expedientes en la plataforma de CEMEPI, desde la primera sesión hasta la entrega de documentos. Solo ves los expedientes que tienes asignados.",
  caps:[
   {t:"Tu cuenta y tu perfil", p:[
    "Si aún no tienes cuenta, en la pantalla de entrada pulsa «Solicita tu cuenta», elige «Psicólogo base» (con contrato y sueldo) o «Psicólogo independiente» (por comisión) y llena tus datos. Tu cuenta queda pendiente hasta que la autorice tu administración de sede o la Dirección.",
    "Al entrar por primera vez, ve a «Mi perfil»: escribe tu nombre completo tal como irá en la firma y tu cédula profesional. Sube o dibuja tu firma: se coloca sobre la línea de firma de tus documentos.",
    "Si te asignaron una contraseña, cámbiala en «Mi perfil → Cambiar mi contraseña» (mínimo 10 caracteres).",
    "En «Mi perfil → Apariencia y privacidad» puedes elegir tema claro u oscuro, letra más grande y el modo privado."]},
   {t:"Tu día en Inicio", p:[
    "«Pendientes» te dice lo que falta: completar tu perfil, firmar tu contrato, confirmar el reglamento o subir documentos.",
    "«Avisos» te alerta de códigos del portal por vencer, borradores sin emitir de más de 7 días, expedientes sin notas en 60 días y consultantes que cumplen 18 años. Cada aviso tiene un botón que te lleva directo.",
    "Usa el buscador de la barra superior (Ctrl K) para encontrar un expediente por iniciales, folio o fecha de nacimiento."]},
   {t:"Abrir un expediente", p:[
    "Pulsa «Nuevo expediente» en el menú.",
    "Escribe solo las iniciales del consultante con puntos (por ejemplo J.L.M.R.), su fecha de nacimiento y la fecha de la primera sesión. Si escribes el nombre completo, la app lo convierte en iniciales.",
    "Elige la sede y el terapeuta asignado y pulsa «Guardar datos». El folio lleva la clave de la sede.",
    "Nunca registres nombre completo, teléfono, correo, domicilio ni CURP del consultante. Para los datos de contacto descarga la «Hoja administrativa» en Word: se llena a mano, se resguarda aparte y no se envía por mensajería."]},
   {t:"Consentimiento informado", p:[
    "En el expediente, pestaña «Documentos», sección «Consentimiento informado», escribe las condiciones de participación (frecuencia, duración, cancelaciones y honorarios).",
    "En sesión: pulsa «Firmar en esta sesión» y entrega tu tablet o celular a la persona. Lee el texto, marca las casillas, elige quién firma y firma con el dedo.",
    "Desde casa: pulsa «Enviar al portal para firma». La persona entra al portal con su código y firma desde su celular.",
    "Si la persona es menor de edad, firma su madre, padre o representante legal y debe declarar que tiene facultades para hacerlo.",
    "Descarga el PDF del consentimiento firmado. Si la persona lo retira, pulsa «Revocar» y escribe el motivo."]},
   {t:"Notas de sesión", p:[
    "En la pestaña «Notas» elige «Nota libre» (pegas tu texto) o «Estructurada (NOM-004)» (hora, modalidad, lo que refiere, lo que observaste, intervención, respuesta, evolución, riesgo, acuerdos y plan).",
    "Escribe solo iniciales. Separa lo que la persona refiere de lo que tú observaste y de tus hipótesis.",
    "Si marcas «Se identificaron indicadores de riesgo», describe los hechos y avisa a la Dirección. La nota no sustituye las medidas de protección.",
    "Las notas no se editan. Si hubo un error, agrega una nota nueva que lo aclare."]},
   {t:"Documentos: redactar, revisar y emitir", p:[
    "Al guardar una nota aparecen las opciones para crear un documento con ella (reporte, evaluación, carta de proceso, referencia, constancia, carta a tutores, resumen de alta). También puedes ir a la pestaña «Documentos».",
    "Claude redacta el documento con tus notas y los criterios de CEMEPI. Léelo completo y corrige lo necesario: la responsabilidad es tuya.",
    "Pulsa «Revisar calidad con Claude». Atiende los hallazgos; «Aplicar sugerencia» cambia el texto por ti.",
    "Pulsa «Guardar en el expediente». Mientras sea borrador, el Word y el PDF salen con la leyenda «BORRADOR · No válido para entregar».",
    "Cuando esté listo, pulsa «Emitir documento» y pulsa otra vez para confirmar. Recibe folio propio (CEMEPI-DOC-AAAA-NNNNN) y queda bloqueado. Ahora descárgalo en Word o PDF: ese es el que se entrega.",
    "Para corregir un documento emitido: ábrelo y pulsa «Crear nueva versión», corrige el borrador y emítelo. Si ya no es válido, pulsa «Anular» y escribe el motivo."]},
   {t:"Portal del consultante", p:[
    "En «Documentos → Portal del consultante» pulsa «Generar código de acceso». El código se muestra una sola vez: anótalo y entrégalo en persona. Vence a los 180 días.",
    "Junto a un reporte o evaluación emitidos pulsa «Compartir con el consultante». Solo se comparten documentos emitidos.",
    "La persona entra a la página de consulta con su folio, fecha de nacimiento y código. Con menores de edad, verifica antes la representación legal.",
    "Puedes retirar un reporte o revocar el código cuando quieras."]},
   {t:"Expediente completo en PDF", p:[
    "En los datos del expediente pulsa «Expediente completo (PDF)», elige la finalidad y pulsa «Generar PDF».",
    "Es un documento interno y confidencial: guárdalo en un lugar seguro y no lo envíes por mensajería. La exportación queda en la bitácora.",
    "Si una autoridad solicita información, avisa a la Dirección antes de entregar nada."]},
   {t:"Mi espacio: contrato, documentación y reglamento", p:[
    "Psicólogo base: en «Mi contrato» pulsa «Comenzar mi contrato», captura tus datos y beneficiarios y guarda. La Dirección registra tu fecha de alta y salario; después firmas tú y al final firma CEMEPI. Psicólogo independiente: no tienes contrato individual de trabajo.",
    "En «Mis documentos» sube en PDF tus documentos obligatorios (identificación, CURP, comprobante de domicilio, constancia fiscal, cédula y título). Las etiquetas «Falta» y «✓» te guían. El comprobante de domicilio debe tener menos de 3 meses.",
    "En «Reglamento» léelo y pulsa «Confirmo que lo recibí y lo leí»."]},
   {t:"Reglas de privacidad", p:[
    "Del consultante solo se registran iniciales y fecha de nacimiento.",
    "Por Signal o WhatsApp solo se comparte folio e iniciales, nunca nombre, teléfono, correo ni domicilio.",
    "Activa el modo privado (ícono del ojo) si compartes pantalla o trabajas con gente alrededor.",
    "No compartas tu contraseña. Cada acción importante queda registrada en la bitácora."]}
  ]},
 admin_sede: { n:"Administración de sede", para:"Administración de una sede",
  intro:"Este instructivo explica cómo coordinar tu sede en la plataforma: cuentas del personal, expedientes, terapeutas y documentación de los psicólogos de tu sede.",
  caps:[
   {t:"Tu cuenta y tu perfil", p:[
    "Solicita tu cuenta eligiendo «Administración de sede»; la autoriza la Dirección.",
    "En «Mi perfil» escribe tu nombre, sube tu firma y cambia tu contraseña si te asignaron una."]},
   {t:"Autorizar y administrar cuentas de tu sede", p:[
    "En «Usuarios y permisos» → «Altas y datos de cuentas», sección «Solicitudes pendientes», revisa que el nombre y la cédula correspondan a personal real de tu sede.",
    "Elige el rol y pulsa «Autorizar» (o «Rechazar»).",
    "Con «Editar cuenta» corriges nombre, cédula y teléfono, cambias rol o estado y asignas una contraseña («Generar segura»). Entrégala por un canal distinto al correo.",
    "Usa el buscador y los filtros de la tabla para encontrar a una persona."]},
   {t:"Expedientes de tu sede", p:[
    "Pulsa «Nuevo expediente»: escribe solo iniciales, fecha de nacimiento y fecha de primera sesión, y asigna al terapeuta.",
    "Descarga la «Hoja administrativa» en Word para los datos de contacto; se resguarda aparte y no se envía por mensajería.",
    "En Inicio, «Avisos» te muestra los expedientes de tu sede sin terapeuta o sin fecha de nacimiento."]},
   {t:"Terapeutas de tu sede", p:[
    "En «Terapeutas» mantén al día el directorio de tu sede: nombre completo y cédula, que se usan en la firma de los documentos."]},
   {t:"Notas y documentos clínicos", p:[
    "Puedes ver y editar las notas y documentos de los expedientes de tu sede. Hazlo solo cuando sea necesario para la atención o la coordinación, por confidencialidad.",
    "Los documentos se emiten con «Emitir documento» y quedan bloqueados; las correcciones se hacen como nueva versión."]},
   {t:"Documentación de los psicólogos", p:[
    "En «Documentación» abre a cada psicólogo de tu sede, pulsa «Ver PDF» y cotéjalo con el original.",
    "Pulsa «Verificar». Un documento verificado ya no lo puede borrar su titular.",
    "El filtro «Con documentos faltantes» te dice a quién pedirle documentos."]},
   {t:"Tu propio contrato, documentación y reglamento", p:[
    "En «Mi contrato» captura tus datos; la Dirección registra alta y salario y después firmas.",
    "Sube tus documentos en «Documentación» y confirma el «Reglamento»."]},
   {t:"Reglas de privacidad", p:[
    "Del consultante solo iniciales y fecha de nacimiento; por mensajería solo folio e iniciales.",
    "Activa el modo privado si compartes pantalla. No compartas tu contraseña."]}
  ]},
 administrativo: { n:"Administrativo(a)", para:"Personal administrativo",
  intro:"Este instructivo explica lo que haces en la plataforma como trabajador(a) administrativo(a): tu contrato, tu documentación y el reglamento. Por confidencialidad, no tienes acceso a expedientes ni notas clínicas.",
  caps:[
   {t:"Tu cuenta y tu perfil", p:[
    "En la pantalla de entrada pulsa «Solicita tu cuenta», elige «Administrativo» y llena tus datos. Tu cuenta queda pendiente hasta que la autorice tu administración de sede o la Dirección.",
    "Al entrar, ve a «Mi perfil»: revisa tu nombre, sube o dibuja tu firma y, si te asignaron contraseña, cámbiala por una que solo tú conozcas (mínimo 10 caracteres)."]},
   {t:"Mi contrato", p:[
    "Entra a «Mi contrato» y pulsa «Comenzar mi contrato».",
    "Captura tus datos personales y tus beneficiarios y pulsa «Guardar mis datos».",
    "La Dirección registra tu fecha de alta ante el IMSS y tu salario.",
    "Cuando aparezca el aviso «Tu contrato está listo para firmar», pulsa «Firmar mi contrato». Al final firma el representante legal de CEMEPI.",
    "Puedes descargar tu contrato en Word. Si cambian tus datos, las firmas se anulan y se vuelve a firmar."]},
   {t:"Mis documentos", p:[
    "Entra a «Mis documentos», elige el tipo de documento y sube el PDF (máximo 10 MB). En cursos y diplomados escribe la descripción.",
    "Las etiquetas «Falta» y «✓» te indican qué documentos obligatorios te faltan: identificación, CURP, comprobante de domicilio, constancia de situación fiscal y comprobante de estudios.",
    "El comprobante de domicilio debe tener menos de 3 meses; la app te avisará cuando haya que renovarlo.",
    "Si eliminas un documento, pasa a la papelera y la Dirección puede restaurarlo durante 30 días. Un documento ya verificado no lo puedes borrar."]},
   {t:"Reglamento Interior de Trabajo", p:[
    "Entra a «Reglamento», léelo (tiene índice y buscador) y pulsa «Confirmo que lo recibí y lo leí». Queda registrada la fecha y hora."]},
   {t:"Usar la app en el celular", p:[
    "Puedes instalar la app: en Android pulsa «Instalar app»; en iPhone, «Compartir → Agregar a pantalla de inicio».",
    "Si tienes dudas, entra a «Ayuda»."]},
   {t:"Reglas", p:[
    "No compartas tu contraseña.",
    "Tus documentos solo los ven tú, la Dirección y quien administra el personal."]}
  ]},
 direccion: { n:"Directivo(a)", para:"Directivos y Dirección General",
  intro:"Este instructivo resume lo que la Dirección hace en la plataforma: autorizar al personal, supervisar la atención, completar contratos, cuidar la documentación y revisar indicadores. Tienes acceso a toda la plataforma; cada acción importante queda en la bitácora.",
  caps:[
   {t:"Tu cuenta", p:[
    "Solicita tu cuenta eligiendo «Directivo»; solo la autoriza el superusuario.",
    "En «Mi perfil» completa tu nombre, tu firma y tu contraseña."]},
   {t:"Inicio: pendientes y avisos", p:[
    "Revisa cada día «Pendientes»: solicitudes de cuenta, contratos por completar y documentos por verificar.",
    "En «Avisos» atiende el respaldo de la documentación (más de 30 días), la papelera con plazo cumplido, los comprobantes de domicilio vencidos y los expedientes sin terapeuta o sin fecha de nacimiento."]},
   {t:"Usuarios y sedes", p:[
    "En «Usuarios y permisos» → «Altas y datos de cuentas» autoriza a administrativos, administraciones de sede y psicólogos de cualquier sede, después de verificar nombre y cédula.",
    "Con «Editar cuenta» cambias rol, sede, estado, modalidad del psicólogo (base o independiente) y asignas contraseñas.",
    "En «Sedes» das de alta o editas sedes y su clave de 3 letras para el folio."]},
   {t:"Supervisión de la atención", p:[
    "Puedes abrir cualquier expediente, sus notas y documentos. Usa el buscador (Ctrl K) para encontrarlo.",
    "Los documentos de riesgo alto requieren revisión humana especializada antes de emitirse.",
    "Las notas NOM-004 con indicadores de riesgo deben activar la valoración y las medidas de protección que correspondan.",
    "Solo la Dirección puede eliminar un expediente completo."]},
   {t:"Contratos del personal", p:[
    "En «Contratos» abre el contrato de cada persona y registra la fecha de alta ante el IMSS, el salario diario y, si cambian, los datos del empleador (RFC, razón social y registro patronal).",
    "Cuando la persona firme, el superusuario firma por CEMEPI. Cualquier cambio posterior anula las firmas.",
    "Usa los filtros por sede y estado para ver qué contratos faltan."]},
   {t:"Documentación del personal", p:[
    "En «Documentación» abre a cada persona, coteja los PDF con el original y pulsa «Verificar».",
    "Al menos una vez al mes pulsa «Descargar respaldo (ZIP)» y guárdalo en un lugar seguro de CEMEPI: los respaldos automáticos no incluyen los PDF.",
    "En la «Papelera» puedes restaurar lo que se borró por error; después de 30 días puedes eliminarlo definitivamente."]},
   {t:"Solicitudes de autoridad y exportación", p:[
    "Ante una solicitud de juzgado, fiscalía u otra autoridad: verifica autenticidad y competencia, identifica exactamente qué se pide y entrega solo lo procedente.",
    "Usa «Expediente completo (PDF)» eligiendo la finalidad «Solicitud de autoridad»; la exportación queda en la bitácora. Nunca se modifican notas para adaptarlas a una controversia."]},
   {t:"Indicadores y reglamento", p:[
    "En «Tablero» revisa por sede y periodo: expedientes, sesiones, documentos emitidos y su revisión, notas con riesgo, cumplimiento del personal y portal.",
    "En «Reglamento» puedes editar la leyenda de vigencia y los datos del empleador. Cambiar el texto requiere una nueva versión aprobada por la Comisión Mixta."]},
   {t:"Privacidad", p:[
    "Activa el modo privado al compartir pantalla.",
    "Por mensajería solo folio e iniciales. La hoja administrativa llena no se envía por mensajería."]}
  ]}
};
/* ===== P37 · Etapas de continuidad (sección «¿En qué etapa necesitamos fortalecer la continuidad?»).
   Factores tomados del prompt P37 §5 y §10. Son HIPÓTESIS DE EXPLORACIÓN, no causas comprobadas por los indicadores. ===== */
const RD_COHORTE_ETAPAS = {
  A: {t:"Etapa A · Antes de la primera sesión", c:"De la primera cita agendada a la primera sesión", f:["Confirmación de citas","Comunicación administrativa","Disponibilidad de horarios","Facilidad de acceso","Información proporcionada al consultante","Cancelaciones","Inasistencias"]},
  B: {t:"Etapa B · De la primera a la tercera sesión", c:"De la primera a la tercera sesión", f:["Experiencia de bienvenida","Comprensión del motivo de consulta","Escucha","Construcción de confianza","Claridad del encuadre","Acuerdos de continuidad","Posibilidad de solicitar retroalimentación","Barreras de asistencia"]},
  C: {t:"Etapa C · De la tercera a la quinta sesión", c:"De la tercera a la quinta sesión", f:["Calidad del contacto","Relación terapéutica","Aceptación positiva incondicional","Calidez profesional","Comprensión de expectativas","Revisión conjunta del proceso","Dificultades relacionales que puedan explorarse respetuosamente"]},
  D: {t:"Etapa D · De la quinta a la décima sesión", c:"De la quinta a la décima sesión", f:["Evolución de objetivos","Experiencia subjetiva del consultante","Continuidad de los acuerdos","Barreras contextuales","Pertinencia de las intervenciones","Participación del consultante"]},
  E: {t:"Etapa E · Después de la décima sesión", c:"De la décima a más de diez sesiones", f:["Necesidades de continuidad","Objetivos alcanzados","Cambios en las necesidades","Autonomía","Pertinencia de profundización","Posibilidad de cierre clínico acordado"]}
};
const RD_COHORTE_RECOMIENDA = {
  clinicas:["Relación terapéutica","Conexión humana","Atención genuina","Escucha profunda","Calidez","Empatía","Aceptación positiva incondicional","Reconocimiento de prejuicios","Construcción de confianza","Reparación de dificultades del vínculo","Trabajo personal del terapeuta","Supervisión profesional","Preparación académica"],
  organizacionales:["Factores administrativos: confirmación de citas, asignación y comunicación con el consultante","Factores económicos: costo y formas de pago","Factores organizacionales: horarios disponibles, sede y continuidad del mismo terapeuta"],
  frase:"Una interrupción no se atribuye automáticamente al desempeño del psicólogo: la continuidad depende también del consultante, de sus circunstancias y de condiciones administrativas, económicas y organizacionales."
};
