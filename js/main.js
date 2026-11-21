(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Toast ---------- */
  var toast = $('#toast');
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
  }

  /* ---------- Menu mobile ---------- */
  var toggle = $('#navToggle');
  var menu = $('#menu');
  function closeMenu() {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Ano no rodapé ---------- */
  $('#ano').textContent = new Date().getFullYear();

  /* ---------- Navegação inferior: item ativo por seção ---------- */
  var bottomLinks = $$('.bottom-nav a');
  var sections = bottomLinks.map(function (a) { return $(a.getAttribute('href')); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          bottomLinks.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    sections.forEach(function (s) { if (s) io.observe(s); });
  }

  /* ---------- Upload de contrato (simulado, 100% local) ---------- */
  var MAX_BYTES = 10 * 1024 * 1024;
  var ALLOWED = ['pdf', 'doc', 'docx'];
  var dz = $('#dropzone');
  var input = $('#fileInput');
  var errBox = $('#fileError');
  var result = $('#result');
  var resultFile = $('#resultFile');
  var bar = $('#progressBar');
  var body = $('#resultBody');
  var timer;

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
    result.hidden = true;
  }

  function handleFile(file) {
    errBox.hidden = true;
    if (!file) return;
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ALLOWED.indexOf(ext) === -1) return showError('Formato não suportado. Envie um arquivo PDF, DOC ou DOCX.');
    if (file.size > MAX_BYTES) return showError('O arquivo excede o limite de 10MB.');
    if (file.size === 0) return showError('O arquivo está vazio.');

    resultFile.textContent = 'Analisando: ' + file.name;
    body.hidden = true;
    bar.style.width = '0%';
    result.hidden = false;

    var p = 0;
    clearInterval(timer);
    timer = setInterval(function () {
      p += Math.random() * 18 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(timer);
        resultFile.textContent = 'Análise concluída: ' + file.name;
        body.hidden = false;
        showToast('Contrato analisado (demonstração)');
      }
      bar.style.width = p + '%';
    }, 300);
  }

  dz.addEventListener('click', function () { input.click(); });
  dz.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', function () { handleFile(input.files[0]); input.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('drag'); });
  });
  dz.addEventListener('drop', function (e) {
    var files = e.dataTransfer && e.dataTransfer.files;
    if (files && files.length) handleFile(files[0]);
  });

  /* ---------- Assistente Digital (chat com respostas pré-definidas) ---------- */
  var chat = $('#chat');
  var chatOpen = $('#chatOpen');
  var log = $('#chatLog');
  var form = $('#chatForm');
  var chatInput = $('#chatInput');
  var quick = $('#chatQuick');

  var FAQ = [
    { k: ['ferias', 'férias'], a: 'Todo trabalhador CLT tem direito a 30 dias de férias após 12 meses de trabalho, com adicional de 1/3 no pagamento.' },
    { k: ['13', 'decimo', 'décimo'], a: 'O 13º salário é um direito do trabalhador CLT, pago em duas parcelas, até 30/11 e até 20/12.' },
    { k: ['estagio', 'estágio', 'estagiario', 'estagiário'], a: 'Estágio não gera vínculo CLT, mas exige contrato (TCE), seguro contra acidentes, jornada compatível com os estudos e recesso de 30 dias a cada 12 meses.' },
    { k: ['jovem aprendiz', 'aprendiz', 'aprendizagem'], a: 'O Jovem Aprendiz (14 a 24 anos) tem contrato especial com carteira assinada, salário mínimo-hora, FGTS e férias, aliando trabalho e curso de aprendizagem.' },
    { k: ['hora extra', 'horas extras'], a: 'Horas extras devem ser pagas com adicional mínimo de 50% sobre a hora normal. Fique atento a cláusulas que tentem renunciar a esse direito.' },
    { k: ['rescisao', 'rescisão', 'demissao', 'demissão'], a: 'Na rescisão, verifique saldo de salário, férias proporcionais + 1/3, 13º proporcional e, conforme o caso, aviso prévio e multa do FGTS.' },
    { k: ['fgts'], a: 'O FGTS é um depósito mensal de 8% do salário feito pelo empregador em conta vinculada ao trabalhador CLT.' },
    { k: ['contrato', 'clausula', 'cláusula'], a: 'Envie seu contrato na área “Análise de Contratos”: eu traduzo o juridiquês e destaco cláusulas de risco com o Semáforo de Risco.' }
  ];
  var FALLBACK = 'Ainda estou aprendendo sobre isso! Para uma orientação segura, converse com um de nossos advogados na seção “Consulta de Advogados”.';
  var SUGGESTIONS = ['Férias', 'Horas extras', 'Estágio', 'Jovem Aprendiz'];

  function addMsg(text, who) {
    var d = document.createElement('div');
    d.className = 'msg ' + who;
    d.textContent = text; // textContent evita injeção de HTML
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function normalize(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function reply(q) {
    var n = normalize(q);
    var hit = FAQ.filter(function (f) {
      return f.k.some(function (k) { return n.indexOf(normalize(k)) !== -1; });
    })[0];
    setTimeout(function () { addMsg(hit ? hit.a : FALLBACK, 'bot'); }, 450);
  }

  function ask(q) {
    q = q.trim();
    if (!q) return;
    addMsg(q, 'user');
    reply(q);
  }

  SUGGESTIONS.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = s;
    b.addEventListener('click', function () { ask(s); });
    quick.appendChild(b);
  });

  chatOpen.addEventListener('click', function () {
    var willOpen = chat.hidden;
    chat.hidden = !willOpen;
    chatOpen.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      if (!log.children.length) addMsg('Olá! Eu sou o Divo, seu assistente jurídico. Como posso ajudar com seus direitos trabalhistas?', 'bot');
      chatInput.focus();
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    ask(chatInput.value);
    chatInput.value = '';
  });

  /* ---------- Conversar com advogado ---------- */
  $$('[data-lawyer]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showToast('Conectando você a ' + btn.getAttribute('data-lawyer') + '… (demonstração)');
    });
  });

  /* ---------- Gráfico de crescimento (valores ilustrativos, em R$ mil) ---------- */
  var DATA = [
    { ano: 2026, ganhos: 20, gastos: 60 },
    { ano: 2027, ganhos: 55, gastos: 85 },
    { ano: 2028, ganhos: 100, gastos: 110 },
    { ano: 2029, ganhos: 150, gastos: 130 },
    { ano: 2030, ganhos: 200, gastos: 150 }
  ];
  var MAX = 200;
  var chartEl = $('#chart');
  var bars = [];

  DATA.forEach(function (d) {
    var col = document.createElement('div');
    col.className = 'chart-col';
    var wrap = document.createElement('div');
    wrap.className = 'bars';
    [['gain', d.ganhos], ['cost', d.gastos]].forEach(function (pair) {
      var b = document.createElement('div');
      b.className = 'bar ' + pair[0];
      b.setAttribute('data-label', 'R$ ' + pair[1] + 'mil');
      b.setAttribute('data-h', String((pair[1] / MAX) * 100));
      wrap.appendChild(b);
      bars.push(b);
    });
    var y = document.createElement('div');
    y.className = 'chart-year';
    y.textContent = d.ano;
    col.appendChild(wrap);
    col.appendChild(y);
    chartEl.appendChild(col);
  });

  function growBars() {
    bars.forEach(function (b) { b.style.height = b.getAttribute('data-h') + '%'; });
  }
  if ('IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries, obs) {
      if (entries[0].isIntersecting) { growBars(); obs.disconnect(); }
    }, { threshold: 0.3 });
    co.observe(chartEl);
  } else {
    growBars();
  }
})();
