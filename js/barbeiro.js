const STATUS = {
  pendente:   { label: 'Pendente',   cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  confirmado: { label: 'Confirmado', cls: 'bg-green-100 text-green-800 border-green-200' },
  concluido:  { label: 'Concluído',  cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  cancelado:  { label: 'Cancelado',  cls: 'bg-red-100 text-red-800 border-red-200' },
};

let agendamentos = [];
let servicoEditandoId = null;

(async () => {
  const perfil = await exigirAuth('barbeiro');
  if (!perfil) return;
  document.getElementById('user-nome').textContent = perfil.nome;
  document.getElementById('user-nome').classList.remove('hidden');
  await carregarAgendamentos();
})();

function trocarAba(aba) {
  const isAgendamentos = aba === 'agendamentos';
  document.getElementById('painel-agendamentos').classList.toggle('hidden', !isAgendamentos);
  document.getElementById('painel-servicos').classList.toggle('hidden', isAgendamentos);
  document.getElementById('aba-agendamentos').className = `px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
    isAgendamentos ? 'bg-yellow-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
  }`;
  document.getElementById('aba-servicos').className = `px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
    !isAgendamentos ? 'bg-yellow-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
  }`;
  if (!isAgendamentos) carregarServicos();
}

async function carregarServicos() {
  const lista = document.getElementById('lista-servicos');
  lista.innerHTML = '<div class="text-center py-8 text-gray-400">Carregando...</div>';

  const { data, error } = await db.from('servicos').select('*').order('preco');
  if (error) {
    lista.innerHTML = '<div class="text-center py-8 text-red-500 text-sm">Erro ao carregar serviços.</div>';
    return;
  }
  if (!data || data.length === 0) {
    lista.innerHTML = '<div class="text-center py-8 text-gray-400">Nenhum serviço cadastrado.</div>';
    return;
  }

  lista.innerHTML = `<div class="space-y-3">${data.map(s => `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between gap-4">
      <div>
        <p class="font-bold text-gray-800">${s.nome}</p>
        <p class="text-sm text-gray-500 mt-0.5">${s.duracao_minutos} min &nbsp;·&nbsp; R$ ${Number(s.preco).toFixed(2).replace('.', ',')}</p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button onclick="editarServico('${s.id}','${s.nome}',${s.duracao_minutos},${s.preco})"
          class="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all">
          Editar
        </button>
        <button onclick="excluirServico('${s.id}','${s.nome}')"
          class="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all">
          Excluir
        </button>
      </div>
    </div>`).join('')}</div>`;
}

function editarServico(id, nome, duracao, preco) {
  servicoEditandoId = id;
  document.getElementById('s-nome').value = nome;
  document.getElementById('s-duracao').value = duracao;
  document.getElementById('s-preco').value = preco;
  document.getElementById('titulo-form-servico').textContent = 'Editar Serviço';
  document.getElementById('btn-cancelar-servico').classList.remove('hidden');
  document.getElementById('s-nome').focus();
}

function cancelarEdicao() {
  servicoEditandoId = null;
  document.getElementById('s-nome').value = '';
  document.getElementById('s-duracao').value = '';
  document.getElementById('s-preco').value = '';
  document.getElementById('titulo-form-servico').textContent = 'Novo Serviço';
  document.getElementById('btn-cancelar-servico').classList.add('hidden');
  document.getElementById('erro-servico').classList.add('hidden');
}

async function salvarServico() {
  const nome    = document.getElementById('s-nome').value.trim();
  const duracao = parseInt(document.getElementById('s-duracao').value);
  const preco   = parseFloat(document.getElementById('s-preco').value);
  const erroEl  = document.getElementById('erro-servico');

  erroEl.classList.add('hidden');
  if (!nome)           { erroEl.textContent = 'Informe o nome do serviço.'; erroEl.classList.remove('hidden'); return; }
  if (!duracao || duracao < 15) { erroEl.textContent = 'Informe a duração (mínimo 15 min).'; erroEl.classList.remove('hidden'); return; }
  if (isNaN(preco) || preco < 0) { erroEl.textContent = 'Informe um preço válido.'; erroEl.classList.remove('hidden'); return; }

  const btn = document.getElementById('btn-salvar-servico');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  let error;
  if (servicoEditandoId) {
    ({ error } = await db.from('servicos').update({ nome, duracao_minutos: duracao, preco }).eq('id', servicoEditandoId));
  } else {
    ({ error } = await db.from('servicos').insert({ nome, duracao_minutos: duracao, preco }));
  }

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if (error) { erroEl.textContent = 'Erro ao salvar. Tente novamente.'; erroEl.classList.remove('hidden'); return; }

  cancelarEdicao();
  carregarServicos();
}

async function excluirServico(id, nome) {
  if (!confirm(`Excluir o serviço "${nome}"?`)) return;
  const { error } = await db.from('servicos').delete().eq('id', id);
  if (error) { alert('Erro ao excluir. Verifique se há agendamentos com esse serviço.'); return; }
  carregarServicos();
}

async function carregarAgendamentos() {
  const filtro = document.getElementById('filtro-data').value;
  document.getElementById('btn-limpar').classList.toggle('hidden', !filtro);

  let query = db.from('agendamentos')
    .select('*, servicos(nome)')
    .order('data')
    .order('horario');

  query = filtro ? query.eq('data', filtro) : query.gte('data', hoje());

  const { data, error } = await query;

  if (error) {
    document.getElementById('lista-agendamentos').innerHTML =
      '<div class="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center text-sm">Erro ao carregar agendamentos. Verifique a conexão.</div>';
    return;
  }

  if (data && data.length > 0) {
    const ids = [...new Set(data.map(a => a.cliente_id))];
    const { data: clientes } = await db.from('perfis').select('id, nome').in('id', ids);
    const mapa = Object.fromEntries((clientes || []).map(c => [c.id, c.nome]));
    agendamentos = data.map(a => ({ ...a, cliente: { nome: mapa[a.cliente_id] || 'Cliente' } }));
  } else {
    agendamentos = data || [];
  }

  atualizarStats();
  renderizarLista();
}

function atualizarStats() {
  const dh = hoje();
  document.getElementById('stat-hoje').textContent        = agendamentos.filter(a => a.data === dh).length;
  document.getElementById('stat-pendentes').textContent   = agendamentos.filter(a => a.status === 'pendente').length;
  document.getElementById('stat-confirmados').textContent = agendamentos.filter(a => a.status === 'confirmado').length;
  document.getElementById('stat-concluidos').textContent  = agendamentos.filter(a => a.status === 'concluido').length;
}

function renderizarLista() {
  const lista = document.getElementById('lista-agendamentos');
  const filtro = document.getElementById('filtro-data').value;
  const dh = hoje();

  if (agendamentos.length === 0) {
    lista.innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div class="text-4xl mb-3">📅</div>
        <p class="text-gray-500">Nenhum agendamento encontrado.</p>
      </div>`;
    return;
  }

  if (filtro) {
    lista.innerHTML = `<div class="space-y-3">${agendamentos.map(a => cardHtml(a, a.data === dh)).join('')}</div>`;
    return;
  }

  const deHoje   = agendamentos.filter(a => a.data === dh);
  const proximos = agendamentos.filter(a => a.data > dh);
  let html = '';

  if (deHoje.length > 0) {
    html += `<div class="mb-6">
      <h2 class="text-base font-bold text-yellow-700 mb-3 flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
        Hoje — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
      </h2>
      <div class="space-y-3">${deHoje.map(a => cardHtml(a, true)).join('')}</div>
    </div>`;
  }

  if (proximos.length > 0) {
    html += `<div>
      <h2 class="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"></span>
        Próximos Agendamentos
      </h2>
      <div class="space-y-3">${proximos.map(a => cardHtml(a, false)).join('')}</div>
    </div>`;
  }

  lista.innerHTML = html || `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
      <div class="text-4xl mb-3">📅</div>
      <p class="text-gray-500">Nenhum agendamento para hoje ou próximos dias.</p>
    </div>`;
}

function cardHtml(ag, isHoje) {
  const s = STATUS[ag.status] || STATUS.pendente;
  const dataFmt = new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  });
  const podeMudar = ag.status !== 'cancelado' && ag.status !== 'concluido';

  let botoes = '';
  if (podeMudar) {
    if (ag.status === 'pendente')
      botoes += `<button onclick="atualizarStatus('${ag.id}','confirmado')" class="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500 hover:bg-green-600 text-white transition-all">Confirmar</button>`;
    if (ag.status === 'confirmado')
      botoes += `<button onclick="atualizarStatus('${ag.id}','concluido')" class="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white transition-all">Concluir</button>`;
    botoes += `<button onclick="cancelar('${ag.id}')" class="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all">Cancelar</button>`;
  }

  return `
    <div class="bg-white rounded-2xl shadow-sm border p-5 ${isHoje ? 'border-yellow-300 bg-yellow-50/30' : 'border-gray-100'}">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-1">
            <p class="font-bold text-gray-800">${ag.cliente?.nome || 'Cliente'}</p>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full border ${s.cls}">${s.label}</span>
          </div>
          <p class="text-sm font-medium text-gray-700">${ag.servicos?.nome || ''}</p>
          <p class="text-sm text-gray-500 mt-0.5">${dataFmt} às ${ag.horario}</p>
        </div>
        ${botoes ? `<div class="flex gap-2 shrink-0">${botoes}</div>` : ''}
      </div>
    </div>`;
}

async function atualizarStatus(id, status) {
  const { error } = await db.from('agendamentos').update({ status }).eq('id', id);
  if (error) { alert('Erro ao atualizar. Tente novamente.'); return; }
  await carregarAgendamentos();
}

async function cancelar(id) {
  if (!confirm('Deseja cancelar este agendamento?')) return;
  await atualizarStatus(id, 'cancelado');
}

function limparFiltro() {
  document.getElementById('filtro-data').value = '';
  carregarAgendamentos();
}
