let perfilSelecionado = 'cliente';
let modoAtual = 'login';

function selecionarPerfil(p) {
  perfilSelecionado = p;
  const ativo  = 'flex:1;padding:.75rem .5rem;font-size:.85rem;font-weight:700;background:#d97706;color:#fff;border:none;cursor:pointer;transition:.2s';
  const inativo = 'flex:1;padding:.75rem .5rem;font-size:.85rem;font-weight:700;background:#fff;color:#6b7280;border:none;cursor:pointer;transition:.2s';
  document.getElementById('btn-cliente').style.cssText  = p === 'cliente'  ? ativo : inativo;
  document.getElementById('btn-barbeiro').style.cssText = p === 'barbeiro' ? ativo : inativo;
  esconderErro();
}

function alternarModo() {
  modoAtual = modoAtual === 'login' ? 'cadastro' : 'login';
  const c = modoAtual === 'cadastro';

  document.getElementById('campo-nome').style.display = c ? 'block' : 'none';
  document.getElementById('btn-submit').textContent   = c ? 'Criar conta' : 'Entrar';
  document.getElementById('btn-modo').textContent     = c ? 'Já tem conta? Faça login' : 'Cadastre-se';

  const linkDiv = document.getElementById('link-cadastro');
  linkDiv.childNodes[0].textContent = c ? 'Já tem conta? ' : 'Não tem conta? ';

  esconderErro();
}

function esconderErro() {
  const el = document.getElementById('erro-msg');
  el.textContent = '';
  el.style.display = 'none';
}

function mostrarErro(msg) {
  const el = document.getElementById('erro-msg');
  el.textContent = msg;
  el.style.display = 'block';
}

async function handleSubmit(e) {
  e.preventDefault();
  esconderErro();

  if (!db) {
    mostrarErro('Erro de conexão com o servidor. Verifique sua internet e recarregue.');
    return;
  }

  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const btn   = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = 'Aguarde...';

  const traduzirErro = {
    'Invalid login credentials': 'Email ou senha incorretos.',
    'User already registered': 'Este email já está cadastrado.',
    'Password should be at least 6 characters': 'A senha deve ter no mínimo 6 caracteres.',
    'Email not confirmed': 'Confirme seu email antes de entrar.',
    'signup_disabled': 'Novos cadastros estão desativados no momento.',
  };

  try {
    if (modoAtual === 'cadastro') {
      const nome = document.getElementById('nome').value.trim();
      if (!nome) throw new Error('Informe seu nome completo.');

      const { data, error } = await db.auth.signUp({ email, password: senha });
      if (error) throw error;

      if (data?.user) {
        const { error: errPerfil } = await db.from('perfis').insert({
          id: data.user.id,
          nome,
          tipo: perfilSelecionado,
        });
        if (errPerfil) throw errPerfil;
        window.location.href = perfilSelecionado === 'barbeiro' ? 'barbeiro.html' : 'cliente.html';
      } else {
        mostrarErro('Cadastro realizado! Verifique seu email para confirmar a conta.');
        btn.disabled = false;
        btn.textContent = 'Criar conta';
      }

    } else {
      const { data, error } = await db.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;

      const { data: perfil, error: errPerfil } = await db.from('perfis').select('tipo').eq('id', data.user.id).single();
      if (errPerfil || !perfil) throw new Error('Perfil não encontrado. Cadastre-se primeiro.');

      if (perfil.tipo !== perfilSelecionado) {
        await db.auth.signOut();
        throw new Error(`Esta conta é de ${perfil.tipo === 'barbeiro' ? 'barbeiro' : 'cliente'}. Selecione o perfil correto.`);
      }

      window.location.href = perfil.tipo === 'barbeiro' ? 'barbeiro.html' : 'cliente.html';
    }
  } catch (err) {
    mostrarErro(traduzirErro[err.message] || err.message || 'Erro inesperado. Tente novamente.');
    btn.disabled = false;
    btn.textContent = modoAtual === 'cadastro' ? 'Criar conta' : 'Entrar';
  }
}

// Redireciona se já estiver logado
(async () => {
  try {
    const perfil = await getPerfil();
    if (perfil) {
      window.location.href = perfil.tipo === 'barbeiro' ? 'barbeiro.html' : 'cliente.html';
    }
  } catch (_) {
    // sessão inválida — fica no login
  }
})();
