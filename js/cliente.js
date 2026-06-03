const STATUS = {
  pendente:   { label: 'Pendente',   cls: 'bg-yellow-100 text-yellow-800' },
  confirmado: { label: 'Confirmado', cls: 'bg-green-100 text-green-800' },
  concluido:  { label: 'Concluído',  cls: 'bg-blue-100 text-blue-800' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-100 text-red-800' },
};

let horarioSelecionado = '';
let perfil = null;

(async () => {
  perfil = await exigirAuth('cliente');
  if (!perfil) return;
  document.getElementById('user-nome').textContent = perfil.nome;
  document.getElementById('user-nome').classList.remove('hidden');
  document.getElementById('data').min = hoje();
  await carregarServicos();
})();

async function carregarServicos() {
  const { data: servicos, error } = await db.from('servicos').select('*').order('preco');
  if (error || !servicos) return;

  const select = document.getElementById('servico');
  servicos.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.nome} — R$ ${Number(s.preco).toFixed(2).replace('.', ',')} (${s.duracao_minutos} min)`;
    select.appendChild(opt);
  });
}

async function carregarHorarios() {
  const data = document.getElementById('data').value;
  horarioSelecionado = '';
  atualizarBotao();
  document.getElementById('container-horarios').classList.add('hidden');
  document.getElementById('aviso-data').classList.add('hidden');

  if (!data) return;

  if (!isDiaUtil(data)) {
    document.getElementById('aviso-data').classList.remove('hidden');
    return;
  }

  const { data: agendados } = await db.from('agendamentos')
    .select('horario')
    .eq('data', data)
    .neq('status', 'cancelado');

  const ocupados = new Set((agendados || []).map(a => a.horario));
  const grade = document.getElementById('grade-horarios');
  grade.innerHTML = '';

  HORARIOS.forEach(h => {
    const disponivel = !ocupados.has(h);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = h;
    btn.disabled = !disponivel;
    btn.className = disponivel
      ? 'py-3 rounded-xl text-sm font-semibold transition-all bg-white border border-gray-300 text-gray-700 hover:border-yellow-400 hover:text-yellow-700'
      : 'py-3 rounded-xl text-sm font-semibold transition-all bg-gray-100 text-gray-400 cursor-not-allowed line-through';
    if (disponivel) btn.onclick = () => selecionarHorario(h, btn);
    grade.appendChild(btn);
  });

  document.getElementById('container-horarios').classList.remove('hidden');
  document.getElementById('aviso-lotado').classList.toggle('hidden', !HORARIOS.every(h => ocupados.has(h)));
}

function selecionarHorario(h, btnClicado) {
  horarioSelecionado = h;
  document.querySelectorAll('#grade-horarios button:not(:disabled)').forEach(btn => {
    btn.className = 'py-3 rounded-xl text-sm font-semibold transition-all bg-white border border-gray-300 text-gray-700 hover:border-yellow-400 hover:text-yellow-700';
  });
  btnClicado.className = 'py-3 rounded-xl text-sm font-semibold transition-all bg-yellow-500 text-white shadow-md ring-2 ring-yellow-300';
  atualizarBotao();
}

function atualizarBotao() {
  const servico = document.getElementById('servico').value;
  const data = document.getElementById('data').value;
  document.getElementById('btn-agendar').disabled = !servico || !data || !horarioSelecionado || !isDiaUtil(data);
}

async function criarAgendamento(e) {
  e.preventDefault();
  const erroEl = document.getElementById('erro-form');
  erroEl.classList.add('hidden');
  const btn = document.getElementById('btn-agendar');
  btn.disabled = true;
  btn.textContent = 'Agendando...';

  try {
    const servico_id = document.getElementById('servico').value;
    const data = document.getElementById('data').value;

    const { data: existente } = await db.from('agendamentos')
      .select('id')
      .eq('data', data)
      .eq('horario', horarioSelecionado)
      .neq('status', 'cancelado')
      .maybeSingle();

    if (existente) throw new Error('Horário ocupado. Escolha outro horário.');

    const { data: ag, error } = await db.from('agendamentos')
      .insert({ cliente_id: perfil.id, servico_id, data, horario: horarioSelecionado, status: 'pendente' })
      .select('*, servicos(nome)')
      .single();

    if (error) throw error;

    document.getElementById('form-container').classList.add('hidden');
    document.getElementById('confirmacao').classList.remove('hidden');
    document.getElementById('confirmacao-detalhes').innerHTML = `
      <p><span class="font-semibold">Serviço:</span> ${ag.servicos.nome}</p>
      <p><span class="font-semibold">Data:</span> ${formatarData(ag.data)}</p>
      <p><span class="font-semibold">Horário:</span> ${ag.horario}</p>
      <p><span class="font-semibold">Status:</span> <span class="text-yellow-700 font-semibold">Pendente</span></p>`;

  } catch (err) {
    erroEl.textContent = err.message || 'Erro ao agendar. Tente novamente.';
    erroEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Confirmar Agendamento';
  }
}

function novoAgendamento() {
  document.getElementById('form-container').classList.remove('hidden');
  document.getElementById('confirmacao').classList.add('hidden');
  document.getElementById('form-agendar').reset();
  document.getElementById('container-horarios').classList.add('hidden');
  horarioSelecionado = '';
  atualizarBotao();
}

async function trocarAba(aba) {
  const isAgendar = aba === 'agendar';
  document.getElementById('painel-agendar').classList.toggle('hidden', !isAgendar);
  document.getElementById('painel-historico').classList.toggle('hidden', isAgendar);
  document.getElementById('aba-agendar').className = `px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
    isAgendar ? 'bg-yellow-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
  }`;
  document.getElementById('aba-historico').className = `px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
    !isAgendar ? 'bg-yellow-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
  }`;
  if (!isAgendar) await carregarHistorico();
}

async function carregarHistorico() {
  const lista = document.getElementById('lista-agendamentos');
  lista.innerHTML = '<div class="text-center py-8 text-gray-400">Carregando...</div>';

  const { data: ags, error } = await db.from('agendamentos')
    .select('*, servicos(nome)')
    .eq('cliente_id', perfil.id)
    .order('data', { ascending: false });

  if (error) {
    lista.innerHTML = '<div class="text-center py-8 text-red-500 text-sm">Erro ao carregar histórico.</div>';
    return;
  }

  if (!ags || ags.length === 0) {
    lista.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div class="text-4xl mb-3">📅</div>
        <p class="text-gray-500">Você ainda não tem agendamentos.</p>
      </div>`;
    return;
  }

  lista.innerHTML = ags.map(ag => {
    const s = STATUS[ag.status] || STATUS.pendente;
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-3">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-bold text-gray-800">${ag.servicos?.nome || ''}</p>
            <p class="text-sm text-gray-500 mt-1">${formatarData(ag.data)} às ${ag.horario}</p>
          </div>
          <span class="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${s.cls}">${s.label}</span>
        </div>
      </div>`;
  }).join('');
}
