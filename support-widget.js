/**
 * Lumen Support — embeddable widget
 * Injects a floating chat bubble + panel into the page and wires it up to
 * this site's own /api/chat and /api/escalate serverless functions.
 * Include this file on any page (plus styles.css) and add
 * `data-open-widget` to any button/link you want to open the chat.
 */
(function () {
  'use strict';

  const LANGS = [
    {code:'auto', name:'Auto-detect', native:'Auto-detect', rtl:false},
    {code:'en', name:'English', native:'English', rtl:false},
    {code:'zh', name:'Chinese (Simplified)', native:'中文（简体）', rtl:false},
    {code:'hi', name:'Hindi', native:'हिन्दी', rtl:false},
    {code:'es', name:'Spanish', native:'Español', rtl:false},
    {code:'fr', name:'French', native:'Français', rtl:false},
    {code:'ar', name:'Arabic', native:'العربية', rtl:true},
    {code:'pt', name:'Portuguese', native:'Português', rtl:false},
    {code:'ja', name:'Japanese', native:'日本語', rtl:false},
    {code:'ko', name:'Korean', native:'한국어', rtl:false},
    {code:'ru', name:'Russian', native:'Русский', rtl:false},
    {code:'de', name:'German', native:'Deutsch', rtl:false},
  ];
  const UI = {
    en:{payment:"Payment failed", refund:"Refund status", account:"Account access", other:"Something else",
        placeholder:"Describe the issue…", talk:"Talk to a human", escalate:"Escalate", online:"Online",
        thinking:"Thinking…", handoff:"Connecting you to support…"},
    zh:{payment:"支付失败", refund:"退款状态", account:"账户访问", other:"其他问题",
        placeholder:"请描述您遇到的问题…", talk:"转接人工", escalate:"升级处理", online:"在线",
        thinking:"思考中…", handoff:"正在为您转接支持团队…"},
    hi:{payment:"भुगतान विफल", refund:"रिफंड स्थिति", account:"खाता एक्सेस", other:"कुछ और",
        placeholder:"समस्या बताएं…", talk:"किसी व्यक्ति से बात करें", escalate:"एस्केलेट करें", online:"ऑनलाइन",
        thinking:"सोच रहा है…", handoff:"आपको सहायता टीम से जोड़ा जा रहा है…"},
    es:{payment:"Pago fallido", refund:"Estado del reembolso", account:"Acceso a la cuenta", other:"Otra cosa",
        placeholder:"Describe el problema…", talk:"Hablar con una persona", escalate:"Escalar", online:"En línea",
        thinking:"Pensando…", handoff:"Conectándote con soporte…"},
    fr:{payment:"Échec du paiement", refund:"Statut du remboursement", account:"Accès au compte", other:"Autre chose",
        placeholder:"Décrivez le problème…", talk:"Parler à un humain", escalate:"Escalader", online:"En ligne",
        thinking:"Réflexion…", handoff:"Connexion avec le support…"},
    ar:{payment:"فشل الدفع", refund:"حالة الاسترداد", account:"الوصول للحساب", other:"شيء آخر",
        placeholder:"صف المشكلة…", talk:"التحدث مع شخص", escalate:"تصعيد", online:"متصل",
        thinking:"جارٍ التفكير…", handoff:"جارٍ تحويلك إلى الدعم…"},
    pt:{payment:"Pagamento falhou", refund:"Status do reembolso", account:"Acesso à conta", other:"Outra coisa",
        placeholder:"Descreva o problema…", talk:"Falar com um humano", escalate:"Escalar", online:"Online",
        thinking:"Pensando…", handoff:"Conectando você ao suporte…"},
    ja:{payment:"支払いエラー", refund:"返金状況", account:"アカウントアクセス", other:"その他",
        placeholder:"問題を入力してください…", talk:"担当者につなぐ", escalate:"エスカレート", online:"オンライン",
        thinking:"考え中…", handoff:"サポートに接続しています…"},
    ko:{payment:"결제 실패", refund:"환불 상태", account:"계정 접근", other:"기타",
        placeholder:"문제를 설명해 주세요…", talk:"상담원 연결", escalate:"상담원 연결", online:"온라인",
        thinking:"생각 중…", handoff:"상담원에게 연결 중…"},
    ru:{payment:"Платёж не прошёл", refund:"Статус возврата", account:"Доступ к аккаунту", other:"Другое",
        placeholder:"Опишите проблему…", talk:"Связаться с человеком", escalate:"Эскалация", online:"В сети",
        thinking:"Думаю…", handoff:"Соединяем вас со службой поддержки…"},
    de:{payment:"Zahlung fehlgeschlagen", refund:"Rückerstattungsstatus", account:"Kontozugriff", other:"Etwas anderes",
        placeholder:"Problem beschreiben…", talk:"Mit Mensch sprechen", escalate:"Eskalieren", online:"Online",
        thinking:"Denkt nach…", handoff:"Verbindung zum Support wird hergestellt…"},
  };
  const uiFor = c => UI[c] || UI.en;
  const STATUS_RE = /\n?§STATUS§(RESOLVED|PROGRESS|ESCALATE)\s*$/;

  const state = { lang:'auto', category:null, messages:[], pendingImage:null, busy:false, opened:false };

  /* ---------------- Build DOM ---------------- */
  const bubble = document.createElement('button');
  bubble.className = 'lm-bubble'; bubble.setAttribute('aria-label', 'Open support chat');
  bubble.innerHTML = '💬';

  const panel = document.createElement('div');
  panel.className = 'lm-panel';
  panel.innerHTML = `
    <div class="lm-header">
      <div>
        <div class="lm-header-title">Aria · AI Support</div>
        <div class="lm-status"><span class="lm-dot" id="lmDot"></span><span id="lmStatusText">Online</span></div>
      </div>
      <button class="lm-icon-btn" id="lmTalkHuman" title="Talk to a human">🙋</button>
      <button class="lm-close" id="lmClose" aria-label="Close">✕</button>
    </div>
    <div class="lm-controls">
      <select class="lm-lang" id="lmLang"></select>
      <div id="lmChips" style="display:flex; gap:6px; flex-wrap:wrap;"></div>
    </div>
    <div class="lm-meter-track"><div class="lm-meter-fill" id="lmMeter"></div></div>
    <div class="lm-messages" id="lmMessages"></div>
    <div class="lm-composer-wrap">
      <div id="lmAttachPreview"></div>
      <div class="lm-composer">
        <button class="lm-icon-btn" id="lmAttachBtn" title="Attach a screenshot" aria-label="Attach a screenshot">📎</button>
        <textarea id="lmInput" rows="1" placeholder="Describe the issue…"></textarea>
        <button class="lm-icon-btn lm-send" id="lmSend" aria-label="Send message">➤</button>
      </div>
      <div class="lm-composer-foot"><button id="lmEscalate">This isn't resolving it — escalate</button></div>
      <input type="file" id="lmFile" accept="image/*" style="display:none">
    </div>
  `;

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(bubble);
    document.body.appendChild(panel);
    wire();
    document.querySelectorAll('[data-open-widget]').forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); openPanel(); }));
  });

  function openPanel(){ panel.classList.add('lm-open'); state.opened = true; if(state.messages.length===0) greet(); refs.input.focus(); }
  function closePanel(){ panel.classList.remove('lm-open'); }

  let refs = {};
  function wire(){
    refs = {
      dot: panel.querySelector('#lmDot'), statusText: panel.querySelector('#lmStatusText'),
      lang: panel.querySelector('#lmLang'), chips: panel.querySelector('#lmChips'),
      meter: panel.querySelector('#lmMeter'), messages: panel.querySelector('#lmMessages'),
      attachPreview: panel.querySelector('#lmAttachPreview'), input: panel.querySelector('#lmInput'),
      send: panel.querySelector('#lmSend'), attachBtn: panel.querySelector('#lmAttachBtn'),
      file: panel.querySelector('#lmFile'), escalateBtn: panel.querySelector('#lmEscalate'),
      talkHuman: panel.querySelector('#lmTalkHuman'), close: panel.querySelector('#lmClose'),
    };

    refs.lang.innerHTML = LANGS.map(l => `<option value="${l.code}">${l.native}</option>`).join('');
    refs.lang.onchange = () => { state.lang = refs.lang.value; renderChips(); applyChrome(); resetConversation(); };
    renderChips(); applyChrome();

    bubble.onclick = () => panel.classList.contains('lm-open') ? closePanel() : openPanel();
    refs.close.onclick = closePanel;
    refs.send.onclick = sendMessage;
    refs.escalateBtn.onclick = () => runEscalation();
    refs.talkHuman.onclick = () => runEscalation();
    refs.attachBtn.onclick = () => refs.file.click();
    refs.file.onchange = onFileChosen;
    refs.input.addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); } });
    refs.input.addEventListener('input', () => { refs.input.style.height='auto'; refs.input.style.height = Math.min(100, refs.input.scrollHeight)+'px'; });
  }

  function renderChips(){
    const t = uiFor(state.lang==='auto' ? 'en' : state.lang);
    const items = [['payment',t.payment],['refund',t.refund],['account',t.account],['other',t.other]];
    refs.chips.innerHTML = items.map(([k,label]) => `<button class="lm-chip" data-cat="${k}">${label}</button>`).join('');
    refs.chips.querySelectorAll('.lm-chip').forEach(btn => {
      btn.onclick = () => { state.category = btn.dataset.cat; refs.input.value = btn.textContent + ': '; refs.input.focus(); };
    });
  }
  function applyChrome(){
    const t = uiFor(state.lang==='auto' ? 'en' : state.lang);
    refs.input.placeholder = t.placeholder;
    refs.escalateBtn.textContent = t.escalate;
    refs.statusText.textContent = t.online;
    panel.dir = LANGS.find(l=>l.code===state.lang)?.rtl ? 'rtl' : 'ltr';
  }

  /* ---------------- Rendering ---------------- */
  function scrollDown(){ refs.messages.scrollTop = refs.messages.scrollHeight; }
  function addBubble(role, text, imgUrl){
    const wrap = document.createElement('div'); wrap.className = 'lm-msg lm-' + role;
    const b = document.createElement('div'); b.className = 'lm-bubble-text'; b.textContent = text;
    wrap.appendChild(b);
    if(imgUrl){ const img = document.createElement('img'); img.src = imgUrl; img.className='lm-thumb'; wrap.appendChild(img); }
    refs.messages.appendChild(wrap); scrollDown();
    return b;
  }
  function addTyping(){
    const wrap = document.createElement('div'); wrap.className = 'lm-msg lm-assistant'; wrap.id = 'lmTypingWrap';
    wrap.innerHTML = '<div class="lm-typing"><span></span><span></span><span></span></div>';
    refs.messages.appendChild(wrap); scrollDown();
  }
  function removeTyping(){ const el = panel.querySelector('#lmTypingWrap'); if(el) el.remove(); }
  function typewrite(el, text, done){
    let i = 0; const step = Math.max(1, Math.round(text.length/70));
    const iv = setInterval(() => { i += step; el.textContent = text.slice(0,i); scrollDown();
      if(i >= text.length){ clearInterval(iv); el.textContent = text; if(done) done(); } }, 14);
  }

  /* ---------------- API calls (own backend) ---------------- */
  function buildSystemPrompt(){
    const meta = LANGS.find(l=>l.code===state.lang) || LANGS[0];
    const langLine = state.lang==='auto'
      ? "Always reply in the same language the user is currently writing in. If they switch languages mid-conversation, switch with them."
      : `Always reply in ${meta.name}, regardless of what language the user types in, unless they explicitly ask you to switch.`;
    return [
      "You are Aria, a multilingual customer-support agent for Lumen, a business that processes payments through Razorpay.",
      "You help with payment failures, refunds, account access, and general questions. Be warm, clear, and concise — 2 to 6 sentences, or a short numbered list for troubleshooting steps.",
      "If the user attaches a screenshot, examine it closely and reference specific details you actually see (error codes, amounts, screen names) rather than speaking generically.",
      langLine,
      "If the issue involves a specific payment/order ID and looks like a gateway-level failure, say plainly that this may need direct verification with Razorpay.",
      "After your reply, on the very last line, output a machine-readable marker in this exact format and nothing else on that line: §STATUS§RESOLVED or §STATUS§PROGRESS or §STATUS§ESCALATE.",
      "Use RESOLVED when fully addressed, PROGRESS when still actively helping, ESCALATE when this genuinely needs a human (account changes, refund overrides, suspected fraud, or the same problem persisting). Never mention this marker to the user."
    ].join(' ');
  }
  async function callChat(messages, system){
    const res = await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        system: system || buildSystemPrompt(),
        messages: messages.map(m => ({
          role: m.role,
          text: m.text,
          hasImage: !!m.image,
        })),
      })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'chat failed');
    return data.text || '';
  }

  /* ---------------- Send flow ---------------- */
  async function sendMessage(){
    const raw = refs.input.value.trim();
    if(!raw && !state.pendingImage) return;
    if(state.busy) return;
    const userMsg = { role:'user', text:raw, image: state.pendingImage };
    state.messages.push(userMsg);
    addBubble('user', raw, state.pendingImage ? state.pendingImage.previewUrl : null);
    refs.input.value=''; refs.input.style.height='auto';
    state.pendingImage = null; refs.attachPreview.innerHTML='';
    setBusy(true); addTyping();
    try{
      const fullText = await callChat(state.messages);
      removeTyping();
      const match = fullText.match(STATUS_RE);
      const status = match ? match[1] : 'PROGRESS';
      const cleanText = fullText.replace(STATUS_RE,'').trim() || '…';
      const b = addBubble('assistant','');
      typewrite(b, cleanText, () => {
        state.messages.push({role:'assistant', text:cleanText});
        applyStatus(status); setBusy(false);
        if(status === 'ESCALATE') setTimeout(runEscalation, 700);
      });
    }catch(err){
      removeTyping();
      addBubble('system', "Couldn't reach the assistant just now. Check your connection and try again.");
      setBusy(false);
    }
  }
  function applyStatus(status){
    if(status==='RESOLVED'){ refs.meter.style.width='96%'; refs.meter.style.background='var(--success)'; }
    else if(status==='ESCALATE'){ refs.meter.style.width='30%'; refs.meter.style.background='var(--danger)'; }
    else { refs.meter.style.width='60%'; refs.meter.style.background='var(--accent)'; }
  }
  function setBusy(b){
    state.busy = b; refs.send.disabled = b; refs.dot.classList.toggle('lm-busy', b);
    const t = uiFor(state.lang==='auto'?'en':state.lang);
    refs.statusText.textContent = b ? t.thinking : t.online;
  }

  function onFileChosen(){
    const file = refs.file.files[0]; if(!file) return;
    if(file.size > 5*1024*1024){ alert('Please attach an image under 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result, base64 = dataUrl.split(',')[1];
      state.pendingImage = { mediaType:file.type, data:base64, previewUrl:dataUrl };
      refs.attachPreview.innerHTML = `<div class="lm-attach-preview"><img src="${dataUrl}"><span>Attached — will be sent to the support team on escalation. Describe what it shows in your message.</span><button id="lmRemoveAttach">Remove</button></div>`;
      panel.querySelector('#lmRemoveAttach').onclick = () => { state.pendingImage = null; refs.attachPreview.innerHTML=''; };
    };
    reader.readAsDataURL(file); refs.file.value = '';
  }

  /* ---------------- Escalation (real backend call) ---------------- */
  async function runEscalation(){
    if(state.busy) return;
    setBusy(true);
    const t = uiFor(state.lang==='auto'?'en':state.lang);
    addBubble('system', t.handoff);

    const card = document.createElement('div'); card.className = 'lm-ticket';
    card.innerHTML = `
      <h4>Support ticket</h4>
      <div class="lm-ticket-body" id="lmTicketBody">Drafting summary…</div>
      <div class="lm-stepper" id="lmStepper">
        <div class="lm-step lm-active" data-step="draft"><span class="lm-step-dot">•</span><span>Drafting ticket</span></div>
        <div class="lm-step" data-step="email"><span class="lm-step-dot">•</span><span>Emailing support</span></div>
        <div class="lm-step" data-step="telegram"><span class="lm-step-dot">•</span><span>Posting to Telegram</span></div>
        <div class="lm-step" data-step="razorpay"><span class="lm-step-dot">•</span><span>Flagging to Razorpay</span></div>
      </div>
      <div class="lm-ticket-note" id="lmTicketNote"></div>
    `;
    refs.messages.appendChild(card); scrollDown();

    const transcript = state.messages.map(m => `${m.role==='user'?'User':'Assistant'}: ${m.text}`).join('\n');
    const summarySystem = "You are drafting a concise internal support-ticket summary in English from a multilingual support chat transcript, for a human agent. Output plain text using exactly this structure and nothing else: \nTitle: ...\nCategory: ...\nLanguage detected: ...\nPriority: Low, Medium, or High\nSummary: 2-3 sentences.";
    let ticketSummary = 'Title: Unresolved support issue\nCategory: General\nLanguage detected: Unknown\nPriority: Medium\nSummary: Conversation summary unavailable.';
    try{ ticketSummary = await callChat([{role:'user', text: transcript}], summarySystem); }catch(e){ /* keep fallback */ }
    card.querySelector('#lmTicketBody').textContent = ticketSummary;

    const screenshots = state.messages.filter(m => m.image).slice(-5).map(m => ({ mediaType: m.image.mediaType, data: m.image.data }));

    let result = { ticketId: 'TCK-PENDING', delivered:{email:false, telegram:false, razorpayLooped:false}, isPayment:false };
    try{
      const res = await fetch('/api/escalate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ transcript, ticketSummary, category: state.category, language: state.lang, screenshots })
      });
      result = await res.json();
    }catch(e){ /* keep defaults, steps will show as not configured */ }

    if(!result.isPayment) card.querySelector('.lm-step[data-step="razorpay"]').remove();

    const stepOrder = ['draft','email','telegram'].concat(result.isPayment ? ['razorpay'] : []);
    const stepDelivered = { draft:true, email: result.delivered?.email, telegram: result.delivered?.telegram, razorpay: result.delivered?.razorpayLooped };
    for(let idx=0; idx<stepOrder.length; idx++){
      await new Promise(r => setTimeout(r, 450));
      const key = stepOrder[idx];
      const el = card.querySelector(`.lm-step[data-step="${key}"]`);
      el.classList.remove('lm-active');
      if(stepDelivered[key]){ el.classList.add('lm-done'); el.querySelector('.lm-step-dot').textContent = '✓'; }
      else { el.classList.add('lm-skipped'); el.querySelector('.lm-step-dot').textContent = '–'; }
      const next = card.querySelector(`.lm-step[data-step="${stepOrder[idx+1]}"]`);
      if(next) next.classList.add('lm-active');
      scrollDown();
    }
    const anyDelivered = result.delivered?.email || result.delivered?.telegram;
    card.querySelector('#lmTicketNote').textContent = anyDelivered
      ? `Reference ${result.ticketId} — our team will follow up shortly.`
      : `Ticket drafted as ${result.ticketId}, but delivery isn't wired up yet — add SMTP/Telegram credentials in the backend's environment variables.`;
    refs.meter.style.width = '0%';
    setBusy(false);
  }

  /* ---------------- Lifecycle ---------------- */
  async function greet(){
    addTyping();
    try{
      const greetSystem = buildSystemPrompt() + " A new user has just opened the support chat with no message yet. Greet them briefly, introduce yourself as Aria from Lumen support, and invite them to describe their issue or attach a screenshot. Keep it to 1-2 sentences.";
      const fullText = await callChat([], greetSystem);
      removeTyping();
      const clean = fullText.replace(STATUS_RE,'').trim();
      const b = addBubble('assistant','');
      typewrite(b, clean, () => { state.messages.push({role:'assistant', text:clean}); });
    }catch(e){
      removeTyping();
      addBubble('assistant', "Hi, I'm Aria from Lumen support. Tell me what's going on, or attach a screenshot, and I'll help sort it out.");
    }
  }
  function resetConversation(){
    state.messages = []; state.category = null; state.pendingImage = null;
    refs.attachPreview.innerHTML=''; refs.messages.innerHTML='';
    refs.meter.style.width='38%'; refs.meter.style.background='var(--accent)';
    if(state.opened) greet();
  }
})();
