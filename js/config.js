const SUPABASE_URL = 'https://bmkttvfdcwdtluompzmb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QbcfHNLVWbELetGGg_BBtA_ctnAoBW1';
const CODIGO_BARBEIRO = 'BARBEARIA2024';
const HORARIOS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

let db;
try {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error('Erro Supabase:', e);
}

function isDiaUtil(dataStr) {
  const d = new Date(dataStr + 'T12:00:00');
  const dia = d.getDay();
  return dia !== 0 && dia !== 6;
}

function formatarData(dataStr) {
  return new Date(dataStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
}

function hoje() {
  return new Date().toISOString().split('T')[0];
}

async function getPerfil() {
  if (!db) return null;
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return null;
    const { data: perfil } = await db.from('perfis').select('*').eq('id', user.id).single();
    return perfil ? { ...user, ...perfil } : null;
  } catch (e) {
    return null;
  }
}

async function exigirAuth(tipo) {
  const perfil = await getPerfil();
  if (!perfil) {
    window.location.href = 'index.html';
    return null;
  }
  if (tipo && perfil.tipo !== tipo) {
    window.location.href = perfil.tipo === 'barbeiro' ? 'barbeiro.html' : 'cliente.html';
    return null;
  }
  return perfil;
}

async function sair() {
  if (db) await db.auth.signOut();
  window.location.href = 'index.html';
}
