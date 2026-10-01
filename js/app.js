(function(){
'use strict';
var $app=document.getElementById('app');
/* ---------- Sayfa Gecisi ve Yukleme Denetleyicisi (Page Transition Loader) ---------- */
var PAGE_LOAD_DURATION = 480; // ms yukleme bekleme suresi

function showPageLoader(msg, quote) {
  var loader = document.getElementById('page-loader');
  if (!loader) return;
  if (msg) {
    var sEl = document.getElementById('loader-status');
    if (sEl) sEl.innerHTML = esc(msg) + '<span class="loader-spinner"></span>';
  }
  if (quote) {
    var qEl = document.getElementById('loader-quote');
    if (qEl) qEl.innerText = quote;
  }
  loader.classList.add('active');
  var bar = document.getElementById('loader-bar');
  if (bar) {
    bar.style.width = '0%';
    setTimeout(function(){ if (bar) bar.style.width = '65%'; }, 40);
    setTimeout(function(){ if (bar) bar.style.width = '92%'; }, 260);
  }
}

function hidePageLoader() {
  var loader = document.getElementById('page-loader');
  if (!loader) return;
  var bar = document.getElementById('loader-bar');
  if (bar) bar.style.width = '100%';
  setTimeout(function() {
    loader.classList.remove('active');
    setTimeout(function() {
      if (bar) bar.style.width = '0%';
    }, 350);
  }, 180);
}

function navigateToPage(url, msg) {
  if (typeof closeMobileMenu === 'function') closeMobileMenu();
  showPageLoader(msg || 'Sayfa Yükleniyor...');
  setTimeout(function() {
    window.location.href = url;
  }, PAGE_LOAD_DURATION);
}

var BASE = JSON.stringify(window.SITE_DATA || (document.getElementById('site-data') ? JSON.parse(document.getElementById('site-data').textContent) : {}));
var S=JSON.parse(BASE);
var canEdit=false, dirty=false, readerScale=1;
var lib={q:'',cat:'',sort:'new',favOnly:false,dlOnly:false,page:1};
var formImg='';
var DEFAULT_CATS=['Roman','Öykü','Şiir','Deneme','Tiyatro','Sanat','Felsefe','Biyografi','Diğer'];
var COLORS=['#5b2a2a','#2f3e46','#3d4a36','#6b4f2a','#2d3a5a','#4a3358','#1f1f1f','#7a3b1d'];
var EMB='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M15 8 L9 12 L5 18 L8 44 L40 44 L43 18 L39 12 L33 8"/><path d="M15 8 L24 26 L33 8"/><path d="M24 26 V44"/><circle cx="20" cy="31" r="1.4" fill="currentColor"/><circle cx="20" cy="37" r="1.4" fill="currentColor"/><circle cx="28" cy="31" r="1.4" fill="currentColor"/><circle cx="28" cy="37" r="1.4" fill="currentColor"/></svg>';

/* ---------- Supabase & Üyelik Sistemi ---------- */
var SUPABASE_URL = 'https://epvpzfmvdakryixghdhk.supabase.co';
var SUPABASE_KEY = 'sb_publishable_pY_IRWrEcTmRVxbOAmKGgQ_k6Jl1qxu';
var supa = null;
try {
  if (window.supabase && SUPABASE_URL && SUPABASE_KEY) {
    supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.warn('Supabase başlatılamadı:', e);
}

function getStoredUser() {
  try {
    var raw = localStorage.getItem('gp-auth-user');
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (parsed && (parsed.id || parsed.email)) return parsed;
    return null;
  } catch(e) {
    return null;
  }
}

function storeUser(user) {
  try {
    if (user && (user.id || user.email)) {
      localStorage.setItem('gp-auth-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('gp-auth-user');
    }
  } catch(e) {}
}

/* ---------- Supabase Bulut VeritabanÄ± EÅŸitleme (Cloud Backend Sync) ---------- */
async function syncCloudReviews() {
  if (!supa) return;
  try {
    var res = await supa.from('book_reviews').select('*').order('created_at', { ascending: false });
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      var localRaw = localStorage.getItem('gp-book-reviews');
      var localList = localRaw ? JSON.parse(localRaw) : [];
      var map = {};
      res.data.forEach(function(r) { map[r.id] = r; });
      localList.forEach(function(r) { if (!map[r.id]) map[r.id] = r; });
      var merged = Object.values(map);
      localStorage.setItem('gp-book-reviews', JSON.stringify(merged));
    }
  } catch(e) {}
}

async function syncCloudCampComments() {
  if (!supa) return;
  try {
    var res = await supa.from('camp_comments').select('*').order('created_at', { ascending: true });
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      var localRaw = localStorage.getItem('gp-camp-comments');
      var localList = localRaw ? JSON.parse(localRaw) : [];
      var map = {};
      res.data.forEach(function(c) { map[c.id] = c; });
      localList.forEach(function(c) { if (!map[c.id]) map[c.id] = c; });
      var merged = Object.values(map);
      localStorage.setItem('gp-camp-comments', JSON.stringify(merged));
    }
  } catch(e) {}
}

async function syncCloudCampParticipants() {
  if (!supa) return;
  try {
    var res = await supa.from('camp_participants').select('*');
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      var localRaw = localStorage.getItem('gp-camp-participants');
      var localList = localRaw ? JSON.parse(localRaw) : [];
      var map = {};
      res.data.forEach(function(p) { map[p.id || p.username] = p; });
      localList.forEach(function(p) { if (!map[p.id || p.username]) map[p.id || p.username] = p; });
      var merged = Object.values(map);
      localStorage.setItem('gp-camp-participants', JSON.stringify(merged));
    }
  } catch(e) {}
}

async function syncCloudQuotes() {
  if (!supa) return;
  try {
    var res = await supa.from('community_quotes').select('*').order('created_at', { ascending: false });
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      var localRaw = localStorage.getItem('gp-custom-quotes');
      var localList = localRaw ? JSON.parse(localRaw) : [];
      var map = {};
      res.data.forEach(function(q) { map[q.id] = q; });
      localList.forEach(function(q) { if (!map[q.id]) map[q.id] = q; });
      var merged = Object.values(map);
      localStorage.setItem('gp-custom-quotes', JSON.stringify(merged));
    }
  } catch(e) {}
}

var curUser = getStoredUser();
var authTab = 'login';

function syncFavsWithCloud(cloudList) {
  if (!Array.isArray(cloudList)) cloudList = [];
  var merged = favs.slice();
  cloudList.forEach(function(id) {
    if (merged.indexOf(id) < 0) merged.push(id);
  });
  favs = merged;
  try { localStorage.setItem('gp-favs', JSON.stringify(favs)); } catch(e){}
  if (curUser && supa && merged.length > cloudList.length) {
    supa.auth.updateUser({ data: { reading_list: merged } }).catch(function(){});
  }
}

var ADMIN_IDENTIFIERS = ['gogolunpaltosu'];
if (!Array.isArray(S.members)) S.members = [];
var memberSearchQ = '';

var DEFAULT_ADMIN_MEMBER = {
  id: 'admin-gogolunpaltosu',
  email: 'gogolunpaltosu@gmail.com',
  username: 'gogolunpaltosu',
  full_name: "Gogol'un Paltosu (Yönetici)",
  role: 'admin',
  created_at: '2026-09-18T10:00:00.000Z',
  confirmed: true,
  reading_list: []
};

function getAdminMembersList() {
  if (!Array.isArray(S.members)) S.members = [];
  var localList = [];
  try {
    var raw = localStorage.getItem('gp-members');
    if (raw) localList = JSON.parse(raw);
  } catch(e){}

  var map = {};
  map['gogolunpaltosu'] = Object.assign({}, DEFAULT_ADMIN_MEMBER);

  S.members.forEach(function(m){
    var k = (m.username || m.email || m.id || '').toLowerCase();
    if (k) map[k] = Object.assign({}, m);
  });

  localList.forEach(function(m){
    var k = (m.username || m.email || m.id || '').toLowerCase();
    if (k) {
      if (map[k]) map[k] = Object.assign(map[k], m);
      else map[k] = Object.assign({}, m);
    }
  });

  var list = Object.values(map);
  list.sort(function(a, b){
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
  return list;
}

function findMemberByUsername(ident) {
  if (!ident) return null;
  var clean = String(ident).toLowerCase().replace(/^@/, '').trim();
  var list = getAdminMembersList();
  var found = list.find(function(m) {
    var u = (m.username || '').toLowerCase().replace(/^@/, '');
    var em = (m.email || '').toLowerCase();
    var id = (m.id || '').toLowerCase();
    return u === clean || id === clean || (clean.indexOf('@') >= 0 && em === clean);
  });
  if (found) return found;

  try {
    var accounts = JSON.parse(localStorage.getItem('gp-local-accounts') || '{}');
    for (var k in accounts) {
      var acc = accounts[k];
      var accU = (acc.username || (acc.user_metadata && acc.user_metadata.username) || '').toLowerCase().replace(/^@/, '');
      var accEm = (acc.email || '').toLowerCase();
      var accId = (acc.id || '').toLowerCase();
      if (accU === clean || accEm === clean || accId === clean) {
        return {
          id: acc.id || ('local_' + accU),
          email: acc.email,
          username: accU,
          full_name: (acc.user_metadata && acc.user_metadata.full_name) || accU,
          role: (acc.user_metadata && acc.user_metadata.role) || 'member',
          created_at: acc.created_at || new Date().toISOString(),
          confirmed: true,
          reading_list: (acc.user_metadata && acc.user_metadata.reading_list) || [],
          badges: (acc.user_metadata && acc.user_metadata.badges) || acc.badges || []
        };
      }
    }
  } catch(e){}

  return null;
}

function addMemberToRegistry(m) {
  if (!m || (!m.email && !m.username)) return;
  if (!Array.isArray(S.members)) S.members = [];

  var key = (m.username || m.email || m.id || '').toLowerCase();
  var idx = S.members.findIndex(function(x){
    return (x.username && x.username.toLowerCase() === key) ||
           (x.email && x.email.toLowerCase() === (m.email||'').toLowerCase()) ||
           (x.id && x.id === m.id);
  });

  if (idx >= 0) {
    S.members[idx] = Object.assign({}, S.members[idx], m);
  } else {
    S.members.unshift(m);
  }

  try {
    localStorage.setItem('gp-members', JSON.stringify(S.members));
  } catch(e){}
}

/* ==========================================================================
   YENİ EDEBİYAT PLATFORMU MODÜLLERİ (Müzik, Yorumlar, Hedef, Karakter, Quiz)
   ========================================================================== */

// 1. Alıntılar Sistemi
var DEFAULT_QUOTES = [
  { id: "dq_1", text: "Beni rahat bırakın, neden beni incitiyorsunuz? Ben de sizin kardeşinizim.", author: "Nikolay Gogol", book: "Palto", user_name: "Gogol'un Paltosu", username: "gogolunpaltosu", created_at: "2026-09-01T10:00:00Z" },
  { id: "dq_2", text: "Zeki olmak tek başına bir işe yaramaz; zekâyı yönlendiren bir akıl ve bir kalp gerekir.", author: "F. M. Dostoyevski", book: "Suç ve Ceza", user_name: "Gogol'un Paltosu", username: "gogolunpaltosu", created_at: "2026-09-05T12:00:00Z" },
  { id: "dq_3", text: "Güzellik dünyayı kurtaracak.", author: "F. M. Dostoyevski", book: "Budala", user_name: "Gogol'un Paltosu", username: "gogolunpaltosu", created_at: "2026-09-10T14:30:00Z" },
  { id: "dq_4", text: "Bir insanın değeri, başkalarının ona verdiği değerle değil, kendi içinde taşıdığı insanlıkla ölçülür.", author: "Nikolay Gogol", book: "Ölü Canlar", user_name: "Gogol'un Paltosu", username: "gogolunpaltosu", created_at: "2026-09-15T09:15:00Z" },
  { id: "dq_5", text: "Tüm mutlu aileler birbirine benzer; her mutsuz ailenin mutsuzluğu ise kendine özgüdür.", author: "Lev Tolstoy", book: "Anna Karenina", user_name: "Gogol'un Paltosu", username: "gogolunpaltosu", created_at: "2026-09-18T16:45:00Z" },
  { id: "dq_6", text: "İnsanları tanıdıkça yalnızlığı daha çok seviyorum değil, insanı anladıkça edebiyata sığınıyorum.", author: "Gogol'un Paltosu", book: "Edebiyat Kulübü", user_name: "Gogol'un Paltosu", username: "gogolunpaltosu", created_at: "2026-09-20T11:20:00Z" }
];

function getLikedQuotes() {
  try {
    var raw = localStorage.getItem('gp-liked-quotes');
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}

function isQuoteLiked(id) {
  if (!id) return false;
  return getLikedQuotes().indexOf(id) >= 0;
}

function getQuotes() {
  var map = {};
  var result = [];

  function addQ(q) {
    if (!q || !q.text || !String(q.text).trim()) return;
    var key = (q.id || (String(q.text).trim() + '|' + String(q.author || '').trim())).toLowerCase();
    if (!map[key]) {
      map[key] = true;
      var clone = Object.assign({}, q);
      clone.likes = isQuoteLiked(clone.id) ? 1 : 0;
      result.push(clone);
    }
  }

  // 1. Tarayıcı yerel alıntıları
  try {
    var custom = JSON.parse(localStorage.getItem('gp-custom-quotes') || '[]');
    if (Array.isArray(custom)) {
      custom.forEach(addQ);
    }
  } catch(e){}

  // 2. Site genel verisi (S.quotes) — tüm ziyaretçiler ve cihazlar için ortak
  if (S && Array.isArray(S.quotes)) {
    S.quotes.forEach(addQ);
  }

  // 3. Giriş yapan kullanıcının bulut profili alıntıları
  if (curUser && curUser.user_metadata && Array.isArray(curUser.user_metadata.quotes)) {
    curUser.user_metadata.quotes.forEach(addQ);
  }

  // 4. Kayıtlı üyelerin profillerindeki alıntılar
  try {
    var localMembers = JSON.parse(localStorage.getItem('gp-members') || '[]');
    if (Array.isArray(localMembers)) {
      localMembers.forEach(function(m){
        if (m && Array.isArray(m.quotes)) {
          m.quotes.forEach(addQ);
        }
      });
    }
  } catch(e){}

  // 5. Varsayılan edebi alıntılar
  if (Array.isArray(DEFAULT_QUOTES)) {
    DEFAULT_QUOTES.forEach(addQ);
  }

  return result;
}

function saveUserQuote(text, author, book, page) {
  if (!curUser) return false;
  if (!text || !text.trim()) return false;
  try {
    var custom = JSON.parse(localStorage.getItem('gp-custom-quotes') || '[]');
    var meta = curUser.user_metadata || {};
    var uName = meta.full_name || (curUser.email ? curUser.email.split('@')[0] : 'Okur');
    var uHandle = meta.username ? meta.username.replace(/^@/,'') : '';
    var uAvatar = meta.avatar_url || '';
    var uEmail = curUser.email || '';
    var uId = curUser.id || '';
    var newQ = {
      id: 'q_' + Date.now(),
      text: text.trim(),
      author: (author || 'Klasik Edebiyat').trim(),
      book: (book || '').trim(),
      page: (page || '').trim(),
      user_name: uName,
      username: uHandle,
      user_id: uId,
      email: uEmail,
      avatar_url: uAvatar,
      likes: 0,
      created_at: new Date().toISOString()
    };

    // 1. Yerel tarayıcı listesine ekle
    custom.unshift(newQ);
    localStorage.setItem('gp-custom-quotes', JSON.stringify(custom));

    // 2. S.quotes ve DEFAULT_QUOTES içine ekle (tüm ziyaretçiler ve sayfalar için hemen görünür olsun)
    if (!S.quotes || !Array.isArray(S.quotes)) S.quotes = [];
    S.quotes.unshift(newQ);
    DEFAULT_QUOTES.unshift(newQ);

    // 3. Ana sayfa döner alıntı kutusuna da anında ekle
    QUOTES.unshift({
      q: newQ.text,
      a: newQ.author + (newQ.user_name ? ' (Paylaşan: ' + newQ.user_name + ')' : ''),
      s: newQ.book || ''
    });

    // 4. Giriş yapılmışsa üye bulut hesabına ve genel veritabanına eşitle
    if (supa) {
      try {
        var uid = (curUser && curUser.id && curUser.id.indexOf('admin-') < 0 && curUser.id.indexOf('member_') < 0) ? curUser.id : null;
        supa.from('community_quotes').insert({
          id: newQ.id,
          text: newQ.text,
          author: newQ.author,
          book: newQ.book,
          page: newQ.page,
          user_id: uid,
          user_name: newQ.user_name,
          username: newQ.username,
          avatar_url: newQ.avatar_url,
          created_at: newQ.created_at
        }).then(function(){}).catch(function(err){ console.warn('Supabase quote insert error:', err); });
      } catch(e){}
    }
    if (curUser && supa) {
      try {
        var uMeta = Object.assign({}, curUser.user_metadata || {});
        var userQuotesList = Array.isArray(uMeta.quotes) ? uMeta.quotes.slice() : [];
        userQuotesList.unshift(newQ);
        uMeta.quotes = userQuotesList;
        curUser.user_metadata = uMeta;
        supa.auth.updateUser({ data: { quotes: userQuotesList } }).catch(function(){});
      } catch(e){}
    }

    return newQ;
  } catch(e){ return false; }
}

function likeQuote(id) {
  if (!id) return false;
  try {
    var likedList = getLikedQuotes();
    var idx = likedList.indexOf(id);
    var isNowLiked = (idx < 0);
    if (isNowLiked) {
      likedList.push(id);
    } else {
      likedList.splice(idx, 1);
    }
    localStorage.setItem('gp-liked-quotes', JSON.stringify(likedList));

    var custom = JSON.parse(localStorage.getItem('gp-custom-quotes') || '[]');
    custom.forEach(function(q){
      if (q.id === id) {
        q.likes = isNowLiked ? 1 : 0;
      }
    });
    localStorage.setItem('gp-custom-quotes', JSON.stringify(custom));

    var defLikes = JSON.parse(localStorage.getItem('gp-default-quote-likes') || '{}');
    defLikes[id] = isNowLiked ? 1 : 0;
    localStorage.setItem('gp-default-quote-likes', JSON.stringify(defLikes));

    toast(isNowLiked ? 'Alıntı beğenildi ❤️' : 'Beğeni geri çekildi 🤍');
    return true;
  } catch(e){ return false; }
}

function deleteQuote(id) {
  if (!id) return false;
  try {
    var custom = JSON.parse(localStorage.getItem('gp-custom-quotes') || '[]');
    custom = custom.filter(function(q){ return q.id !== id; });
    localStorage.setItem('gp-custom-quotes', JSON.stringify(custom));

    if (S && Array.isArray(S.quotes)) {
      S.quotes = S.quotes.filter(function(q){ return q.id !== id; });
      if (canEdit) markDirty();
    }
    DEFAULT_QUOTES = DEFAULT_QUOTES.filter(function(q){ return q.id !== id; });

    if (supa) {
      try { supa.from('community_quotes').delete().eq('id', id).catch(function(){}); } catch(e){}
    }
    if (curUser && supa && curUser.user_metadata && Array.isArray(curUser.user_metadata.quotes)) {
      try {
        var uMeta = Object.assign({}, curUser.user_metadata || {});
        uMeta.quotes = uMeta.quotes.filter(function(q){ return q.id !== id; });
        curUser.user_metadata = uMeta;
        supa.auth.updateUser({ data: { quotes: uMeta.quotes } }).catch(function(){});
      } catch(e){}
    }

    return true;
  } catch(e){ return false; }
}

function getUserQuotes(ident) {
  if (!ident) return [];
  var clean = String(ident).toLowerCase().replace(/^@/,'').trim();
  var all = getQuotes();
  return all.filter(function(q){
    var u = (q.username || '').toLowerCase().replace(/^@/,'').trim();
    var e = (q.email || '').toLowerCase().trim();
    var uid = (q.user_id || '').toLowerCase().trim();
    return (u && u === clean) || (e && e === clean) || (uid && uid === clean);
  });
}

// 2. Karakter Rehberleri
var CHARACTER_GUIDES = {
  "palto": [
    { name: "Akaki Akakiyeviç Başmaçkin", role: "Başkahraman · 9. Dereceden Memur", desc: "Bürokrasinin içinde silik, alaylara sabırla boyun eğen, eski paltosu yerine dişinden tırnağından artırarak yeni bir palto diktiren ve onunla varoluş kazanan trajik 'küçük adam'." },
    { name: "Petroviç", role: "Usta Terzi", desc: "Tek gözlü, içkiye düşkün ama zanaatında ödünsüz bir terzi. Akaki'yi yamalı eski paltosundan vazgeçirip yeni bir palto dikmeye ikna eden kilit karakter." },
    { name: "Önemli Kişi (General)", role: "Bürokratik Otorite", desc: "Katı sınıfsal kibrin simgesi. Akaki çalınan paltosu için yardım istediğinde yetkisini göstermek uğruna onu azarlayan ve ölümüne zemin hazırlayan general." }
  ],
  "suc-ve-ceza": [
    { name: "Rodion Romanoviç Raskolnikov", role: "Eski Hukuk Öğrencisi", desc: "Yoksulluk ve varoluşsal bunalımlarla boğuşan, 'üstün insanların sıradan ahlak kurallarının üzerinde olduğu' teorisini test etmek için cinayet işleyen ve vicdan azabıyla eriyen trajik deha." },
    { name: "Sofya Semyonovna Marmeladova (Sonya)", role: "Fedakâr Ruh", desc: "Ailesini açlıktan kurtarmak için kendini feda eden, derin bir inanç, merhamet ve sevgiyle Raskolnikov'un ruhani kurtuluş rehberi olan saf yürek." },
    { name: "Dmitri Prokofyeviç Razumihin", role: "Vefalı Dost", desc: "Raskolnikov'un en zor anında dahi onu terk etmeyen, hayat dolu, dürüst ve fedakâr üniversite arkadaşı." },
    { name: "Porfiri Petroviç", role: "Sorgu Yargıcı", desc: "Raskolnikov ile kedinin fareyle oynadığı gibi psikolojik zeka oyunları oynayan, katilin suçunu kendi kendine itiraf etmesini sağlayan dahi savcı." },
    { name: "Arkadi İvanoviç Svidrigaylov", role: "Karanlık Karakter", desc: "Raskolnikov'un ahlaki sınırları tamamen reddetmiş, hazcı ve karanlık çifti (öteki benliği)." }
  ]
};

function getCharacterGuide(bookId) {
  if (!bookId) return null;
  var key = String(bookId).toLowerCase();
  for (var k in CHARACTER_GUIDES) {
    if (key.indexOf(k) >= 0 || k.indexOf(key) >= 0) return CHARACTER_GUIDES[k];
  }
  return null;
}

// 3. Okur Yorumları ve Puanlama
function getLikedReviews() {
  try {
    var raw = localStorage.getItem('gp-liked-reviews');
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}

function isReviewLiked(id) {
  if (!id) return false;
  return getLikedReviews().indexOf(id) >= 0;
}

function likeReview(id) {
  if (!id) return false;
  try {
    var likedList = getLikedReviews();
    var idx = likedList.indexOf(id);
    var isNowLiked = (idx < 0);
    if (isNowLiked) {
      likedList.push(id);
    } else {
      likedList.splice(idx, 1);
    }
    localStorage.setItem('gp-liked-reviews', JSON.stringify(likedList));

    var raw = localStorage.getItem('gp-book-reviews');
    var all = raw ? JSON.parse(raw) : [];
    all.forEach(function(r){
      if (r.id === id) {
        r.likes = isNowLiked ? 1 : 0;
      }
    });
    localStorage.setItem('gp-book-reviews', JSON.stringify(all));

    toast(isNowLiked ? 'Yorum beğenildi ❤️' : 'Beğeni geri çekildi 🤍');
    return true;
  } catch(e){ return false; }
}

function getReviews(bookId) {
  var all = [];
  try {
    var raw = localStorage.getItem('gp-book-reviews');
    if (raw) all = JSON.parse(raw);
  } catch(e){}
  if (!Array.isArray(all)) all = [];
  all = all.map(function(r){
    var clone = Object.assign({}, r);
    clone.likes = isReviewLiked(clone.id) ? 1 : 0;
    return clone;
  });
  if (!bookId) return all;
  return all.filter(function(r){ return r.book_id === bookId; });
}

function calcBookRating(bookId) {
  var revs = getReviews(bookId);
  if (!revs.length) return { score: "5.0", count: 0 };
  var sum = revs.reduce(function(acc, r){ return acc + (Number(r.rating) || 5); }, 0);
  return { score: (sum / revs.length).toFixed(1), count: revs.length };
}

function addReview(bookId, rating, comment) {
  if (!bookId || !comment) return false;
  var revs = getReviews();
  var uName = 'Değerli Okur';
  var uHandle = '';
  var uAvatar = '';
  var uEmail = '';
  var uId = '';
  if (curUser) {
    var meta = curUser.user_metadata || {};
    uName = meta.full_name || (curUser.email ? curUser.email.split('@')[0] : 'Okur');
    uHandle = meta.username ? meta.username.replace(/^@/,'') : '';
    uAvatar = meta.avatar_url || '';
    uEmail = curUser.email || '';
    uId = curUser.id || '';
  }
  var newRev = {
    id: 'rev_' + Date.now(),
    book_id: bookId,
    user_name: uName,
    username: uHandle,
    email: uEmail,
    user_id: uId,
    avatar_url: uAvatar,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    comment: comment.trim(),
    likes: 0,
    created_at: new Date().toISOString()
  };
  revs.unshift(newRev);
  try {
    localStorage.setItem('gp-book-reviews', JSON.stringify(revs));
  } catch(e){}
  if (supa) {
    try {
      var uid = (curUser && curUser.id && curUser.id.indexOf('admin-') < 0 && curUser.id.indexOf('member_') < 0) ? curUser.id : null;
      supa.from('book_reviews').insert({
        id: newRev.id,
        book_id: newRev.book_id,
        user_id: uid,
        user_name: newRev.user_name,
        username: newRev.username,
        email: newRev.email,
        avatar_url: newRev.avatar_url,
        rating: newRev.rating,
        comment: newRev.comment,
        created_at: newRev.created_at
      }).then(function(){}).catch(function(err){ console.warn('Supabase review insert error:', err); });
    } catch(e){}
  }
  return newRev;
}

function getUserReviews(ident) {
  if (!ident) return [];
  var clean = String(ident).toLowerCase().replace(/^@/,'').trim();
  var all = getReviews();
  return all.filter(function(r){
    var u = (r.username || '').toLowerCase().replace(/^@/,'').trim();
    var e = (r.email || '').toLowerCase().trim();
    var uid = (r.user_id || '').toLowerCase().trim();
    return (u && u === clean) || (e && e === clean) || (uid && uid === clean);
  });
}

function renderUserReviewsHTML(userReviews, isSelf) {
  if (!userReviews || !userReviews.length) {
    return '<p class="empty" style="padding:16px 0">' + (isSelf ? 'Henüz hiçbir kitaba inceleme veya yorum yazmadınız.<br><br><a class="btn small" href="kitaplar.html">Kitapları İncele ve İlk Yorumunu Yaz →</a>' : 'Bu okur henüz hiçbir kitaba inceleme yazmamış.') + '</p>';
  }
  return '<div class="review-list">' + userReviews.map(function(r){
    var book = S.books.filter(function(b){ return b.id === r.book_id; })[0];
    var bookTitle = book ? book.title : (r.book_id || 'Kitap');
    var bookAuthor = book ? book.author : '';
    var stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    var dateStr = r.created_at ? fmtDate(r.created_at) : '';
    var bookCover = book ? '<div class="mini" style="--c:' + color(book.color) + (book.img && /^data:image\//.test(book.img) ? ';background-image:url(' + book.img + ');background-size:cover;background-position:center' : '') + '"></div>' : '';
    var isLiked = isReviewLiked(r.id);
    var likeBtn = '<button class="quote-like-btn' + (isLiked ? ' liked' : '') + '" data-a="like-review" data-id="' + esc(r.id) + '" title="' + (isLiked ? 'Beğeniyi Geri Çek' : 'Yorumu Beğen') + '">' + (isLiked ? '❤️' : '🤍') + ' <span>' + (r.likes || 0) + '</span></button>';

    return '<div class="review-card">'
      + '<div class="review-hdr">'
      + '<div style="display:flex;align-items:center;gap:12px">'
      + bookCover
      + '<div>'
      + '<a href="kitap.html?id=' + encodeURIComponent(r.book_id) + '" style="font-family:var(--serif);font-weight:700;font-size:1.05rem;color:var(--ink);text-decoration:none">📖 ' + esc(bookTitle) + '</a>'
      + (bookAuthor ? '<div style="font-size:.8rem;color:var(--ink-soft)">' + esc(bookAuthor) + '</div>' : '')
      + '</div>'
      + '</div>'
      + '<div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px">'
      + '<div style="color:var(--gold);font-size:1.1rem;letter-spacing:1px">' + stars + '</div>'
      + '<div style="font-size:.76rem;color:var(--ink-soft);margin-top:2px">' + esc(dateStr) + '</div>'
      + likeBtn
      + '</div>'
      + '</div>'
      + '<div class="review-body" style="margin-top:10px">' + esc(r.comment).replace(/\n/g, '<br>') + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

function renderUserQuotesHTML(userQuotes, isSelf) {
  if (!userQuotes || !userQuotes.length) {
    return '<p class="empty" style="padding:16px 0">' + (isSelf ? 'Henüz hiçbir kitaptan alıntı paylaşmadınız.<br><br><a class="btn small" href="alintilar.html">Alıntılar Duvarına Git ve Alıntı Paylaş →</a>' : 'Bu okur henüz hiçbir kitaptan alıntı paylaşmamış.') + '</p>';
  }
  return '<div class="quotes-wall-grid" style="margin:12px 0">' + userQuotes.map(function(q){
    var qId = q.id || '';
    var isLiked = isQuoteLiked(qId);
    var likeBtn = '<button class="quote-like-btn' + (isLiked ? ' liked' : '') + '" data-a="like-quote" data-id="' + esc(qId) + '" title="' + (isLiked ? 'Beğeniyi Geri Çek' : 'Alıntıyı Beğen') + '">' + (isLiked ? '❤️' : '🤍') + ' <span>' + (q.likes || 0) + '</span></button>';
    return '<div class="quote-tile">'
      + '<p class="quote-tile-text">“' + esc(q.text) + '”</p>'
      + '<div class="quote-tile-cite">'
      + '<span>— ' + esc(q.author) + (q.book ? ' <small style="opacity:.75">(' + esc(q.book) + (q.page ? ' · ' + esc(q.page) : '') + ')</small>' : '') + '</span>'
      + '<div style="display:flex;gap:6px;align-items:center">'
      + likeBtn
      + '<button class="btn ghost small" data-a="card-gen" data-text="'+esc(q.text)+'" data-author="'+esc(q.author)+'" data-book="'+esc(q.book||'')+'" title="Görsel Kart Üret">🖼️ Kart Yap</button>'
      + '<button class="btn ghost small" data-a="copy-quote-text" data-text="' + esc(q.text + ' — ' + q.author + (q.book ? ' (' + q.book + ')' : '')) + '" title="Kopyala">📋 Kopyala</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

// 3.5. Kullanıcıya Özel Rozet Yönetimi
function getUserBadges(ident) {
  if (!ident) {
    if (curUser) {
      var cMeta = curUser.user_metadata || {};
      ident = cMeta.username || curUser.email || curUser.id;
    } else {
      return [];
    }
  }
  var clean = String(ident).toLowerCase().replace(/^@/,'').trim();
  if (!clean) return [];

  // 1. Giriş yapmış kullanıcının kendi metadata'sından kontrol et
  if (curUser) {
    var cMeta = curUser.user_metadata || {};
    var curU = (cMeta.username || '').toLowerCase().replace(/^@/,'').trim();
    var curE = (curUser.email || '').toLowerCase().trim();
    var curId = (curUser.id || '').toLowerCase().trim();
    if (clean === curU || clean === curE || clean === curId) {
      if (Array.isArray(cMeta.badges) && cMeta.badges.length) {
        return cMeta.badges;
      }
    }
  }

  // 2. Cihazdaki kullanıcı-rozet haritasından kontrol et (gp-user-badges-map)
  try {
    var map = JSON.parse(localStorage.getItem('gp-user-badges-map') || '{}');
    if (Array.isArray(map[clean]) && map[clean].length) {
      return map[clean];
    }
  } catch(e){}

  // 3. Üye listesinden (gp-local-accounts veya gp-members) kontrol et
  var mem = findMemberByUsername(clean);
  if (mem) {
    if (Array.isArray(mem.badges) && mem.badges.length) return mem.badges;
    if (mem.user_metadata && Array.isArray(mem.user_metadata.badges) && mem.user_metadata.badges.length) {
      return mem.user_metadata.badges;
    }
  }

  return [];
}

function saveUserBadge(badgeName) {
  if (!badgeName || !badgeName.trim()) return;
  badgeName = badgeName.trim();

  if (curUser) {
    var meta = Object.assign({}, curUser.user_metadata || {});
    var badges = Array.isArray(meta.badges) ? meta.badges.slice() : [];
    if (badges.indexOf(badgeName) === -1) {
      badges.push(badgeName);
      meta.badges = badges;
      curUser.user_metadata = meta;

      // Supabase bulut hesabını güncelle
      if (supa) {
        supa.auth.updateUser({ data: { badges: badges } }).catch(function(){});
      }

      // Yerel hesap kaydını güncelle
      try {
        var localAccs = JSON.parse(localStorage.getItem('gp-local-accounts') || '{}');
        for (var k in localAccs) {
          var acc = localAccs[k];
          var aMeta = acc.user_metadata || {};
          if (acc.email === curUser.email || acc.id === curUser.id || (aMeta.username && aMeta.username === meta.username)) {
            acc.user_metadata = Object.assign({}, aMeta, { badges: badges });
            acc.badges = badges;
          }
        }
        localStorage.setItem('gp-local-accounts', JSON.stringify(localAccs));
      } catch(e){}

      // gp-user-badges-map'e kaydet
      try {
        var map = JSON.parse(localStorage.getItem('gp-user-badges-map') || '{}');
        var keys = [meta.username, curUser.email, curUser.id].filter(Boolean);
        keys.forEach(function(key){
          var k = String(key).toLowerCase().replace(/^@/,'').trim();
          if (k) map[k] = badges;
        });
        localStorage.setItem('gp-user-badges-map', JSON.stringify(map));
      } catch(e){}
    }
  } else {
    // Giriş yapılmamışsa yalnızca geçici misafir oturumuna kaydet, diğer üyelerin hesaplarına ASLA sızdırma
    try {
      var guestBadges = JSON.parse(localStorage.getItem('gp-guest-badges') || '[]');
      if (guestBadges.indexOf(badgeName) === -1) {
        guestBadges.push(badgeName);
        localStorage.setItem('gp-guest-badges', JSON.stringify(guestBadges));
      }
    } catch(e){}
  }
}

function removeUserBadge(badgeName) {
  if (!badgeName || !badgeName.trim()) return;
  badgeName = badgeName.trim();

  if (curUser) {
    var meta = Object.assign({}, curUser.user_metadata || {});
    var badges = Array.isArray(meta.badges) ? meta.badges.slice() : [];
    badges = badges.filter(function(b){ return b !== badgeName; });
    meta.badges = badges;
    curUser.user_metadata = meta;

    if (supa) {
      supa.auth.updateUser({ data: { badges: badges } }).catch(function(){});
    }

    try {
      var localAccs = JSON.parse(localStorage.getItem('gp-local-accounts') || '{}');
      for (var k in localAccs) {
        var acc = localAccs[k];
        var aMeta = acc.user_metadata || {};
        if (acc.email === curUser.email || acc.id === curUser.id || (aMeta.username && aMeta.username === meta.username)) {
          acc.user_metadata = Object.assign({}, aMeta, { badges: badges });
          acc.badges = badges;
        }
      }
      localStorage.setItem('gp-local-accounts', JSON.stringify(localAccs));
    } catch(e){}

    try {
      var map = JSON.parse(localStorage.getItem('gp-user-badges-map') || '{}');
      var keys = [meta.username, curUser.email, curUser.id].filter(Boolean);
      keys.forEach(function(key){
        var k = String(key).toLowerCase().replace(/^@/,'').trim();
        if (k && Array.isArray(map[k])) {
          map[k] = map[k].filter(function(b){ return b !== badgeName; });
        }
      });
      localStorage.setItem('gp-user-badges-map', JSON.stringify(map));
    } catch(e){}
  } else {
    try {
      var guestBadges = JSON.parse(localStorage.getItem('gp-guest-badges') || '[]');
      guestBadges = guestBadges.filter(function(b){ return b !== badgeName; });
      localStorage.setItem('gp-guest-badges', JSON.stringify(guestBadges));
    } catch(e){}
  }
}

// 4. Okuma Durumu (Want to read, Reading, Read) & Okuma Hedefi
function getReadingStatusMap() {
  try {
    return JSON.parse(localStorage.getItem('gp-reading-status') || '{}');
  } catch(e){ return {}; }
}

function getReadingStatus(bookId) {
  var map = getReadingStatusMap();
  return map[bookId] || (isFav(bookId) ? 'want' : '');
}

function setReadingStatus(bookId, status) {
  var map = getReadingStatusMap();
  if (status) {
    map[bookId] = status;
    if (!isFav(bookId)) toggleFav(bookId);
  } else {
    delete map[bookId];
  }
  try {
    localStorage.setItem('gp-reading-status', JSON.stringify(map));
  } catch(e){}
}

function getReadingGoal() {
  try {
    var g = parseInt(localStorage.getItem('gp-reading-goal') || '12', 10);
    return isNaN(g) || g <= 0 ? 12 : g;
  } catch(e){ return 12; }
}

function setReadingGoal(val) {
  var num = parseInt(val, 10);
  if (isNaN(num) || num <= 0) num = 12;
  try {
    localStorage.setItem('gp-reading-goal', String(num));
  } catch(e){}
}

// 5. Ayın Kitabı Kulüp Kampı & Tartışma Odası
function getClubCamp() {
  return {
    bookId: "palto",
    title: "Nikolay Gogol — Palto",
    badge: "Ekim 2026 Edebiyat Kulübü Kampı",
    targetDate: "31 Ekim",
    desc: "Bu ay 'küçük adam' geleneğinin başladığı Petersburg sokaklarına dönüyoruz. Akaki Akakiyeviç'in trajikomik varoluş mücadelesini birlikte okuyor, altını çizdiğimiz cümleleri tartışıyoruz.",
    quote: "“Hepimiz Gogol'un Palto'sundan çıktık.” — F. M. Dostoyevski"
  };
}

var DEFAULT_CAMP_PARTICIPANTS = [
  {
    id: "cp_1",
    user_id: "admin-gogolunpaltosu",
    username: "gogolunpaltosu",
    full_name: "Gogol'un Paltosu",
    role: "admin",
    avatar_url: "",
    status: "🏆 Moderatör · Okudu",
    joined_at: "2026-10-01T08:00:00.000Z",
    notes: "Bu ay Akaki'nin sessiz çığlığını ve Petersburg'un dondurucu sokaklarındaki yalnızlığını birlikte inceliyoruz."
  },
  {
    id: "cp_2",
    user_id: "u_elif_d",
    username: "elif_demir",
    full_name: "Elif Demir",
    avatar_url: "",
    status: "📖 Kampa Katıldı · Okuyor",
    joined_at: "2026-10-02T11:20:00.000Z",
    notes: "Akaki'nin paltosuyla kurduğu bağ adeta bir insanla kurulan dostluk gibi... İkinci kez okumak çok farklı hissettiriyor."
  },
  {
    id: "cp_3",
    user_id: "u_caner_y",
    username: "caner_y",
    full_name: "Caner Yılmaz",
    avatar_url: "",
    status: "⭐ Kampa Katıldı · Bitirdi",
    joined_at: "2026-10-03T14:15:00.000Z",
    notes: "Önemli Kişi sahnesi ve hayaletli son üzerine harika tezler var, tartışma sorularını sabırsızlıkla bekliyorum."
  },
  {
    id: "cp_4",
    user_id: "u_selin_k",
    username: "selin_kaya",
    full_name: "Selin Kaya",
    avatar_url: "",
    status: "🎯 Kampa Katıldı · Okuyor",
    joined_at: "2026-10-04T09:40:00.000Z",
    notes: "Kulüple beraber ilk okuma kampım, heyecanla katılıyorum!"
  }
];

function getCampParticipants() {
  var map = {};
  DEFAULT_CAMP_PARTICIPANTS.forEach(function(p){
    map[p.username.toLowerCase()] = Object.assign({}, p);
  });

  try {
    var saved = JSON.parse(localStorage.getItem('gp-camp-participants') || '[]');
    if(Array.isArray(saved)){
      saved.forEach(function(p){
        if(p && (p.username || p.user_id)){
          var key = (p.username || p.user_id).toLowerCase();
          map[key] = Object.assign(map[key] || {}, p);
        }
      });
    }
  } catch(e){}

  if(curUser){
    var meta = curUser.user_metadata || {};
    var uName = meta.username ? meta.username.replace(/^@/,'') : (curUser.email ? curUser.email.split('@')[0] : 'okur');
    var isJoined = !!meta.camp_joined;
    var localParts = [];
    try { localParts = JSON.parse(localStorage.getItem('gp-camp-participants') || '[]'); } catch(e){}
    var inLocal = localParts.some(function(lp){ return (lp.username && lp.username.toLowerCase() === uName.toLowerCase()) || (lp.user_id && lp.user_id === curUser.id); });
    
    if(isJoined || inLocal){
      var key = uName.toLowerCase();
      map[key] = {
        id: 'cp_user_' + (curUser.id || 'me'),
        user_id: curUser.id || '',
        username: uName,
        full_name: meta.full_name || (uName ? ('@' + uName) : 'Edebiyat Okuru'),
        avatar_url: meta.avatar_url || '',
        status: meta.camp_status || '🎯 Tartışmaya Katıldı · Okuyor',
        joined_at: meta.camp_joined_at || new Date().toISOString(),
        notes: meta.camp_note || 'Okuma kampında yerini aldı.'
      };
    }
  }

  var list = Object.values(map);
  list.sort(function(a, b){
    if(curUser && a.user_id === curUser.id) return -1;
    if(curUser && b.user_id === curUser.id) return 1;
    if(a.username === 'gogolunpaltosu') return -1;
    if(b.username === 'gogolunpaltosu') return 1;
    return new Date(b.joined_at || 0) - new Date(a.joined_at || 0);
  });
  return list;
}

function isUserInCamp() {
  if(!curUser) return false;
  var meta = curUser.user_metadata || {};
  if(meta.camp_joined) return true;
  var uName = meta.username ? meta.username.replace(/^@/,'').toLowerCase() : '';
  var uEmail = (curUser.email || '').toLowerCase();
  var uId = (curUser.id || '').toLowerCase();

  try {
    var saved = JSON.parse(localStorage.getItem('gp-camp-participants') || '[]');
    if(saved.some(function(x){ return (x.username && x.username.toLowerCase() === uName) || (x.user_id && x.user_id === uId); })) return true;
  } catch(e){}

  var parts = getCampParticipants();
  return parts.some(function(p){
    var pUser = (p.username || '').toLowerCase();
    var pId = (p.user_id || '').toLowerCase();
    return (uName && pUser === uName) || (uId && pId === uId);
  });
}

function joinCampDiscussion(status) {
  if(!curUser) return false;
  var meta = curUser.user_metadata || {};
  var uName = meta.username ? meta.username.replace(/^@/,'') : (curUser.email ? curUser.email.split('@')[0] : 'okur');
  var fullName = meta.full_name || (uName ? ('@' + uName) : 'Edebiyat Okuru');
  var avatar = meta.avatar_url || '';
  var now = new Date().toISOString();
  var sText = status || '🎯 Tartışmaya Katıldı · Okuyor';

  var pObj = {
    id: 'cp_' + Date.now(),
    user_id: curUser.id || '',
    username: uName,
    full_name: fullName,
    avatar_url: avatar,
    status: sText,
    joined_at: now,
    notes: 'Kampa katıldı ve tartışma odasında yerini aldı.'
  };

  try {
    var saved = JSON.parse(localStorage.getItem('gp-camp-participants') || '[]');
    var exists = saved.findIndex(function(x){ return (x.username && x.username.toLowerCase() === uName.toLowerCase()) || (x.user_id && x.user_id === curUser.id); });
    if(exists >= 0){
      saved[exists] = Object.assign(saved[exists], pObj);
    } else {
      saved.push(pObj);
    }
    localStorage.setItem('gp-camp-participants', JSON.stringify(saved));
  } catch(e){}

  if(supa){
    supa.auth.updateUser({
      data: {
        camp_joined: true,
        camp_status: sText,
        camp_joined_at: now
      }
    }).catch(function(){});
  }
  if(curUser.user_metadata){
    curUser.user_metadata.camp_joined = true;
    curUser.user_metadata.camp_status = sText;
    curUser.user_metadata.camp_joined_at = now;
  }
  if (supa) {
    try {
      var uid = (curUser && curUser.id && curUser.id.indexOf('admin-') < 0 && curUser.id.indexOf('member_') < 0) ? curUser.id : null;
      supa.from('camp_participants').upsert({
        id: pObj.id,
        camp_id: 'camp_2026_ekim',
        user_id: uid,
        username: pObj.username,
        full_name: pObj.full_name,
        avatar_url: pObj.avatar_url,
        role: (canEdit ? 'admin' : 'member'),
        status: pObj.status,
        notes: pObj.notes,
        created_at: pObj.joined_at
      }, { onConflict: 'camp_id,username' }).then(function(){}).catch(function(err){ console.warn('Supabase camp participant upsert error:', err); });
    } catch(e){}
  }
  return true;
}

function leaveCampDiscussion() {
  if(!curUser) return false;
  var meta = curUser.user_metadata || {};
  var uName = meta.username ? meta.username.replace(/^@/,'').toLowerCase() : '';
  try {
    var saved = JSON.parse(localStorage.getItem('gp-camp-participants') || '[]');
    saved = saved.filter(function(x){
      return !((x.username && x.username.toLowerCase() === uName) || (x.user_id && x.user_id === curUser.id));
    });
    localStorage.setItem('gp-camp-participants', JSON.stringify(saved));
  } catch(e){}
  if(supa){
    supa.auth.updateUser({
      data: {
        camp_joined: false
      }
    }).catch(function(){});
  }
  if(curUser.user_metadata){
    curUser.user_metadata.camp_joined = false;
  }
  if (supa && uName) {
    try {
      supa.from('camp_participants').delete().eq('camp_id', 'camp_2026_ekim').eq('username', uName).then(function(){}).catch(function(){});
    } catch(e){}
  }
  return true;
}

var DEFAULT_CAMP_COMMENTS = [
  {
    id: "cc_1",
    user_name: "Gogol'un Paltosu",
    username: "gogolunpaltosu",
    avatar_url: "",
    role: "admin",
    created_at: "2026-10-01T12:00:00.000Z",
    text: "Ekim ayı okuma kampımıza hoş geldiniz değerli edebiyat dostları! Bu ay Akaki Akakiyeviç'in trajikomik hikâyesini konuşuyoruz. Tartışma sorumuz: Akaki'nin hayatındaki yeni palto, sadece bir giysi mi yoksa toplumda 'var olabilmenin' ve saygı görebilmenin tek sembolü mü? Düşüncelerinizi duymayı çok isterim."
  },
  {
    id: "cc_2",
    user_name: "Elif Demir",
    username: "elif_demir",
    avatar_url: "",
    created_at: "2026-10-02T16:30:00.000Z",
    text: "Bence palto Akaki için neredeyse bir eş, bir sevgili gibi. Paltoyu diktirme sürecinde yemekten, mum ışığından bile feragat etmesi ama gözlerinde yeni bir yaşam ışıltısının doğması inanılmaz etkileyici anlatılmış. Gogol küçük insanın tutkusunu öyle naif işlemiş ki insanın içi sızlıyor."
  },
  {
    id: "cc_3",
    user_name: "Caner Yılmaz",
    username: "caner_y",
    avatar_url: "",
    created_at: "2026-10-03T19:10:00.000Z",
    text: "'Beni bırakın, neden beni incitiyorsunuz? Ben de sizin kardeşinizim' cümlesi bence dünya edebiyatının en büyük insanlık manifestolarından biri. Bürokrasi çarklarında ezilen tüm memurların ortak sesi."
  }
];

function getCampComments() {
  var list = [];
  var map = {};
  DEFAULT_CAMP_COMMENTS.forEach(function(c){ map[c.id] = c; });
  try {
    var saved = JSON.parse(localStorage.getItem('gp-camp-comments') || '[]');
    if(Array.isArray(saved)){
      saved.forEach(function(c){ map[c.id] = c; });
    }
  } catch(e){}
  list = Object.values(map);
  list.sort(function(a, b){ return new Date(a.created_at) - new Date(b.created_at); });
  return list;
}

function saveCampComment(text) {
  if(!curUser || !text || !text.trim()) return false;
  var meta = curUser.user_metadata || {};
  var uName = meta.username ? meta.username.replace(/^@/,'') : (curUser.email ? curUser.email.split('@')[0] : 'okur');
  var fullName = meta.full_name || (uName ? ('@' + uName) : 'Edebiyat Okuru');
  var newC = {
    id: 'cc_' + Date.now(),
    user_name: fullName,
    username: uName,
    avatar_url: meta.avatar_url || '',
    created_at: new Date().toISOString(),
    text: text.trim()
  };
  try {
    var saved = JSON.parse(localStorage.getItem('gp-camp-comments') || '[]');
    saved.push(newC);
    localStorage.setItem('gp-camp-comments', JSON.stringify(saved));
  } catch(e){}
  if (supa) {
    try {
      var uid = (curUser && curUser.id && curUser.id.indexOf('admin-') < 0 && curUser.id.indexOf('member_') < 0) ? curUser.id : null;
      supa.from('camp_comments').insert({
        id: newC.id,
        camp_id: 'camp_2026_ekim',
        user_id: uid,
        user_name: newC.user_name,
        username: newC.username,
        avatar_url: newC.avatar_url,
        role: (canEdit ? 'admin' : 'member'),
        text: newC.text,
        created_at: newC.created_at
      }).then(function(){}).catch(function(err){ console.warn('Supabase camp comment insert error:', err); });
    } catch(e){}
  }
  return true;
}

function renderUserCampBadgeHTML(ident) {
  var parts = getCampParticipants();
  var clean = String(ident || '').toLowerCase().replace(/^@/,'');
  var found = parts.find(function(p){
    return (p.username && p.username.toLowerCase() === clean) || (p.user_id && p.user_id.toLowerCase() === clean);
  });
  if(!found) return '';
  var camp = getClubCamp();
  return '<div class="acc-section">'
    + '<div class="acc-section-title"><span>Aktif Okuma Kampı & Tartışma Katılımı</span><a class="btn ghost small" href="kamp.html">Kampa Git 💬</a></div>'
    + '<div style="background:var(--paper-2);border:1px solid var(--accent);border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">'
    + '<div style="display:flex;align-items:center;gap:12px">'
    + '<span style="font-size:2rem">⛺</span>'
    + '<div>'
    + '<div style="font-weight:700;font-size:1rem;color:var(--ink)">' + esc(camp.badge) + ' — ' + esc(camp.title) + '</div>'
    + '<div style="font-size:.85rem;color:var(--ink-soft)">Durum: <b style="color:var(--accent)">' + esc(found.status || 'Kampa Katıldı') + '</b> · Katılım: ' + fmtDate(found.joined_at) + '</div>'
    + '</div>'
    + '</div>'
    + '<a class="btn small" href="kamp.html">Tartışma Odasına Git 💬</a>'
    + '</div>'
    + '</div>';
}

function campDiscussionPage() {
  var camp = getClubCamp();
  var participants = getCampParticipants();
  var comments = getCampComments();
  var userJoined = isUserInCamp();
  var book = S.books.find(function(b){ return b.id === camp.bookId; }) || {
    id: camp.bookId,
    title: "Palto",
    author: "Nikolay Gogol",
    year: "1842",
    publisher: "Can Yayınları",
    color: "#5b2a2a"
  };

  // 1. Üyenin katılım durumu kartı
  var statusCardHTML = '';
  if (curUser) {
    if (userJoined) {
      statusCardHTML = '<div class="camp-status-card joined">'
        + '<div style="display:flex;align-items:center;gap:16px;min-width:260px;flex:1">'
        + '<span style="font-size:2.5rem;line-height:1">🎉</span>'
        + '<div>'
        + '<div style="display:inline-flex;align-items:center;gap:6px;background:color-mix(in srgb,var(--accent) 15%,var(--paper-2));color:var(--accent);font-size:.78rem;font-weight:700;padding:3px 10px;border-radius:999px;margin-bottom:6px">✅ KATILIMINIZ ONAYLANDI</div>'
        + '<h3 style="margin:0 0 4px;font-size:1.25rem;font-family:var(--serif);color:var(--ink)">Bu Okuma Kampına ve Tartışmaya Katıldınız!</h3>'
        + '<p style="margin:0;color:var(--ink-soft);font-size:.9rem;line-height:1.5">Aşağıdaki katılımcı okurlar arasında profiliniz yer alıyor. Kitap tahlilini okuyabilir ve tartışma odasında fikirlerinizi paylaşabilirsiniz.</p>'
        + '</div>'
        + '</div>'
        + '<div class="btns" style="margin:0;gap:10px">'
        + '<a class="btn small" href="kitap.html?id=' + encodeURIComponent(camp.bookId) + '">📖 Konuşma Metnini Oku</a>'
        + '<a class="btn ghost small" href="kamp.html#camp-forum">💬 Fikrini Paylaş</a>'
        + '<button class="btn danger small ghost" data-a="leave-camp" title="Kamptan Ayrıl">Ayrıl</button>'
        + '</div>'
        + '</div>';
    } else {
      statusCardHTML = '<div class="camp-status-card">'
        + '<div style="display:flex;align-items:center;gap:16px;min-width:260px;flex:1">'
        + '<span style="font-size:2.5rem;line-height:1">📚</span>'
        + '<div>'
        + '<div style="font-size:.82rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Kulüp Okuma Kampı</div>'
        + '<h3 style="margin:0 0 4px;font-size:1.25rem;font-family:var(--serif);color:var(--ink)">Tartışmaya Katılın ve Okurlar Arasında Yerinizi Alın!</h3>'
        + '<p style="margin:0;color:var(--ink-soft);font-size:.9rem;line-height:1.5">Tek tıkla tartışmaya katılabilir, profilinizi bu ayın katılımcı listesine ekleyebilir ve sorular üzerine fikirlerinizi yazabilirsiniz.</p>'
        + '</div>'
        + '</div>'
        + '<div class="btns" style="margin:0">'
        + '<button class="btn" data-a="join-camp" style="background:var(--accent);color:#fff;font-weight:700;box-shadow:var(--shadow-sm)">🎯 Tartışmaya & Kampa Katıl</button>'
        + '</div>'
        + '</div>';
    }
  } else {
    statusCardHTML = '<div class="camp-status-card">'
      + '<div style="display:flex;align-items:center;gap:16px;min-width:260px;flex:1">'
      + '<span style="font-size:2.5rem;line-height:1">🔒</span>'
      + '<div>'
      + '<div style="font-size:.82rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Üyelere Özel Etkinlik</div>'
      + '<h3 style="margin:0 0 4px;font-size:1.25rem;font-family:var(--serif);color:var(--ink)">Tartışmaya Katılmak İçin Giriş Yapın</h3>'
      + '<p style="margin:0;color:var(--ink-soft);font-size:.9rem;line-height:1.5">Okuma kampına katılmak, isminizi katılımcı listesinde göstermek ve edebi tartışmaya dahil olmak için kulüp hesabınıza giriş yapın.</p>'
      + '</div>'
      + '</div>'
      + '<div class="btns" style="margin:0">'
      + '<button class="btn small" data-a="open-auth">Giriş Yap veya Üye Ol ↗</button>'
      + '</div>'
      + '</div>';
  }

  // 2. Katılımcı kartları
  var partsGridHTML = '<div class="camp-parts-grid">'
    + participants.map(function(p){
        var isSelf = curUser && ((p.user_id && p.user_id === curUser.id) || (p.username && curUser.user_metadata && curUser.user_metadata.username === p.username));
        var initials = 'GP';
        var parts = (p.full_name || 'Okur').trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] && parts[parts.length-1]) initials = (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
        else if (parts.length === 1 && parts[0]) initials = parts[0].slice(0, 2).toUpperCase();

        var avatarHTML = p.avatar_url
          ? '<div class="member-avatar-mini" style="background-image:url(' + esc(p.avatar_url) + ');background-size:cover;background-position:center;color:transparent">' + esc(initials) + '</div>'
          : '<div class="member-avatar-mini">' + esc(initials) + '</div>';

        var profLink = p.username ? ('#/profil/' + encodeURIComponent(p.username.replace(/^@/,''))) : '';
        var nameHTML = profLink
          ? '<a href="' + profLink + '" style="color:inherit;text-decoration:none" class="member-name-link">' + esc(p.full_name) + '</a>'
          : esc(p.full_name);

        return '<div class="camp-part-card' + (isSelf ? ' is-self' : '') + '">'
          + '<div class="camp-part-header">'
          + avatarHTML
          + '<div class="camp-part-info">'
          + '<div class="camp-part-name">' + nameHTML + (isSelf ? ' <span style="color:var(--accent);font-size:.8rem">(Siz)</span>' : '') + '</div>'
          + '<div class="camp-part-user">@' + esc(p.username) + '</div>'
          + '</div>'
          + '</div>'
          + '<div class="camp-part-badge' + (isSelf || p.role === 'admin' ? ' active' : '') + '">' + esc(p.status || 'Kampa Katıldı') + '</div>'
          + (p.notes ? '<div class="camp-part-note">“' + esc(p.notes) + '”</div>' : '')
          + '<div style="font-size:.76rem;color:var(--ink-soft);margin-top:auto">Katılım: ' + fmtDate(p.joined_at) + '</div>'
          + '</div>';
      }).join('')
    + '</div>';

  // 3. Tartışma soruları ve yorum kutusu
  var commentsListHTML = '<div class="camp-comments-list" id="camp-comments-section">'
    + comments.map(function(c){
        var initials = 'GP';
        var parts = (c.user_name || 'Okur').trim().split(/\s+/);
        if (parts.length >= 2 && parts[0] && parts[parts.length-1]) initials = (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
        else if (parts.length === 1 && parts[0]) initials = parts[0].slice(0, 2).toUpperCase();

        var avatarHTML = c.avatar_url
          ? '<div class="member-avatar-mini" style="background-image:url(' + esc(c.avatar_url) + ');background-size:cover;background-position:center;color:transparent">' + esc(initials) + '</div>'
          : '<div class="member-avatar-mini">' + esc(initials) + '</div>';

        var profLink = c.username ? ('#/profil/' + encodeURIComponent(c.username.replace(/^@/,''))) : '';
        var nameHTML = profLink
          ? '<a href="' + profLink + '" style="color:inherit;text-decoration:none" class="member-name-link">' + esc(c.user_name) + '</a>'
          : esc(c.user_name);

        return '<div class="camp-comment-item">'
          + '<div class="camp-comment-head">'
          + '<div class="camp-comment-author">'
          + avatarHTML
          + '<div>'
          + '<div style="font-weight:700;font-size:.92rem;color:var(--ink)">' + nameHTML + (c.role === 'admin' ? ' <span style="font-size:.75rem;color:var(--accent);font-weight:600">[Moderatör]</span>' : '') + '</div>'
          + '<div style="font-size:.78rem;color:var(--ink-soft)">@' + esc(c.username) + ' · ' + fmtDate(c.created_at) + '</div>'
          + '</div>'
          + '</div>'
          + '</div>'
          + '<div class="camp-comment-text">' + esc(c.text).replace(/\n/g, '<br>') + '</div>'
          + '</div>';
      }).join('')
    + '</div>';

  var commentFormHTML = '<div id="camp-forum" style="background:var(--paper-2);border:1px solid var(--line);border-radius:16px;padding:22px 20px;margin-top:24px">'
    + '<h3 style="margin:0 0 10px;font-size:1.15rem;font-family:var(--serif);color:var(--ink)">Tartışmaya Fikrinizi Yazın</h3>'
    + '<p style="color:var(--ink-soft);font-size:.88rem;margin:0 0 14px">Yukarıdaki tartışma soruları veya Palto öyküsünün sizde bıraktığı edebi hisler hakkında ne düşünüyorsunuz?</p>'
    + (curUser ? (
        '<textarea id="camp-comment-text" placeholder="Düşüncelerinizi, altını çizdiğiniz noktaları buraya yazın..." style="width:100%;min-height:100px;border-radius:10px;border:1px solid var(--line);padding:12px;font-family:inherit;font-size:.92rem;background:var(--card);box-sizing:border-box;margin-bottom:12px"></textarea>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">'
        + '<span style="font-size:.82rem;color:var(--ink-soft)">Paylaşan: <b>' + esc(curUser.user_metadata ? curUser.user_metadata.full_name : curUser.email) + '</b></span>'
        + '<button class="btn small" data-a="submit-camp-comment" style="background:var(--accent);color:#fff;font-weight:700">💬 Fikrimi Paylaş</button>'
        + '</div>'
      ) : (
        '<div style="text-align:center;padding:16px;background:var(--card);border-radius:10px;border:1px dashed var(--line)">'
        + '<span style="color:var(--ink-soft);font-size:.9rem;display:block;margin-bottom:10px">Tartışmaya yorum eklemek için kulüp üyesi olmanız gerekmektedir.</span>'
        + '<button class="btn small ghost" data-a="open-auth">Giriş Yap / Üye Ol</button>'
        + '</div>'
      ))
    + '</div>';

  return '<section class="page">'
    + '<a class="back" href="index.html">← Ana Sayfaya Dön</a>'

    + '<div class="camp-page-hero">'
    + '<span class="camp-badge">' + esc(camp.badge) + ' · AKTİF TARTIŞMA</span>'
    + '<h1 style="font-family:var(--serif);font-size:2rem;font-weight:700;margin:10px 0 12px;color:#fff">' + esc(camp.title) + ' Okuma Kampı & Tartışma Odası</h1>'
    + '<p style="font-size:1.05rem;line-height:1.65;max-width:720px;opacity:.95;margin:0 0 16px">' + esc(camp.desc) + '</p>'
    + '<div style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:14px 18px;max-width:680px;font-style:italic;font-family:var(--serif);font-size:.95rem">'
    + esc(camp.quote)
    + '</div>'
    + '<div class="camp-stats-bar">'
    + '<div class="camp-stats-item"><span>📖</span> <b>Kitap:</b> ' + esc(book.title) + ' (' + esc(book.author) + ')</div>'
    + '<div class="camp-stats-item"><span>⏳</span> <b>Hedef Tarih:</b> ' + esc(camp.targetDate) + ' 2026</div>'
    + '<div class="camp-stats-item"><span>👥</span> <b>Katılımcı:</b> ' + participants.length + ' Okur</div>'
    + '<div class="camp-stats-item"><span>💬</span> <b>Yorum:</b> ' + comments.length + ' Katkı</div>'
    + '</div>'
    + '</div>'

    + statusCardHTML

    + '<div class="sh" style="margin-top:28px">'
    + '<h2>👥 Tartışmaya & Kampa Katılan Okurlar (' + participants.length + ')</h2>'
    + '<span class="hint">Bu ay Akaki Akakiyeviç\'in öyküsünü birlikte okuyan kulüp üyeleri</span>'
    + '</div>'
    + partsGridHTML

    + '<div class="sh" style="margin-top:36px">'
    + '<h2>💡 Kamp Tartışma Soruları & Fikir Duvarı (' + comments.length + ')</h2>'
    + '<span class="hint">Öykünün temel felsefesi ve karakterleri üzerine kulüp tahlilleri</span>'
    + '</div>'

    + '<div style="background:color-mix(in srgb,var(--gold) 15%,var(--paper));border:1px solid var(--gold);border-radius:14px;padding:18px 20px;margin-bottom:20px">'
    + '<h3 style="margin:0 0 8px;font-size:1.05rem;font-family:var(--serif);color:var(--ink)">🎯 Bu Ayın Tartışma Odakları:</h3>'
    + '<ul style="margin:0;padding-left:20px;font-size:.92rem;line-height:1.7;color:var(--ink)">'
    + '<li><b>Kimlik ve Varoluş:</b> Akaki Akakiyeviç\'in yeni paltoya yüklediği anlam sadece soğuktan korunmak mı, yoksa toplumda "insan" yerine konulabilmenin tek yolu mu?</li>'
    + '<li><b>Bürokrasi ve İktidar Kibri:</b> "Önemli Kişi" (General) ile karşılaşma sahnesi, 19. yüzyıl bürokrasisinin acımasız sınıfsal kibri hakkında ne söylüyor?</li>'
    + '<li><b>Adalet ve Hayalet:</b> Öykünün fantastik sonu (Petersburg köprülerinde paltoları soyan hayalet) bir intikam öyküsü mü, yoksa vicdanın gecikmiş bir adaleti mi?</li>'
    + '</ul>'
    + '</div>'

    + commentsListHTML
    + commentFormHTML

    + '<div style="margin-top:40px;padding:20px;background:var(--paper-2);border-radius:14px;border:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">'
    + '<div>'
    + '<div style="font-weight:700;font-size:1rem;color:var(--ink)">Eseri henüz okumadınız veya tahlilini dinlemediniz mi?</div>'
    + '<div style="font-size:.85rem;color:var(--ink-soft)">Kitabın konuşma metnine, video kaydına ve e-kitap (EPUB/PDF) kaynaklarına hemen ulaşın.</div>'
    + '</div>'
    + '<div class="btns" style="margin:0">'
    + '<a class="btn small" href="kitap.html?id=' + encodeURIComponent(camp.bookId) + '">📖 Eser Sayfasına Git</a>'
    + '<a class="btn ghost small" href="alintilar.html">✨ Palto Alıntıları</a>'
    + '</div>'
    + '</div>'

    + '</section>';
}

// 6. Ambient Okuma Müzik Çaları (Web Audio API Rain + Fireplace + Classical Soundscapes)
// ============================================================================
// 7. Günün Açılış Cümlesi / Pasajları (Daily Excerpts)
// ============================================================================
var OPENING_PASSAGES = [
  { id: 'op_1', text: "Bütün mutlu aileler birbirine benzer; her mutsuz ailenin mutsuzluğu ise kendine özgüdür.", author: "Lev Tolstoy", book: "Anna Karenina", year: "1877", bookId: "" },
  { id: 'op_2', text: "Bakanlıklardan birinde... Yok, en iyisi bakanlığın adını vermeyelim; çünkü resmi daireler çabucak alınmaya pek eğilimlidir.", author: "Nikolay Gogol", book: "Palto", year: "1842", bookId: "palto" },
  { id: 'op_3', text: "Ben hasta bir adamım... Kötü bir adamım ben. Çekici hiçbir yanım yok. Sanırım karaciğerimden hastayım.", author: "F. M. Dostoyevski", book: "Yeraltından Notlar", year: "1864", bookId: "" },
  { id: 'op_4', text: "Gregor Samsa bir sabah bunaltıcı düşlerden uyandığında, kendini yatağında devasa bir böceğe dönüşmüş olarak buldu.", author: "Franz Kafka", book: "Dönüşüm", year: "1915", bookId: "" },
  { id: 'op_5', text: "Bugün annem öldü. Belki de dün, bilmiyorum. Huzurevinden telgraf geldi: 'Anneniz vefat etti. Cenaze yarın.'", author: "Albert Camus", book: "Yabancı", year: "1942", bookId: "" },
  { id: 'op_6', text: "Eğer Tanrı yoksa, o zaman her şey mubahtır; insan dilediği her şeyi yapmakta özgürdür.", author: "F. M. Dostoyevski", book: "Karamazov Kardeşler", year: "1880", bookId: "" },
  { id: 'op_7', text: "İvan İlyiç'in geçmiş hayatı son derece basit, sıradan ve bu yüzden de en korkunç olanıydı.", author: "Lev Tolstoy", book: "İvan İlyiç'in Ölümü", year: "1886", bookId: "" },
  { id: 'op_8', text: "Hey gidi üç atlı araba! Seni kim icat etti bilmem ki! Kuşkusuz yalnızca tez canlı bir halkın bağrından çıkabilirdin sen...", author: "Nikolay Gogol", book: "Ölü Canlar", year: "1842", bookId: "" }
];
var curPassageIdx = Math.floor(Math.random() * OPENING_PASSAGES.length);

function getLikedPassages() {
  try {
    var raw = localStorage.getItem('gp-liked-passages');
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}

function isPassageLiked(id) {
  if (!id) return false;
  return getLikedPassages().indexOf(id) >= 0;
}

function likePassage(id) {
  if (!id) return false;
  try {
    var list = getLikedPassages();
    var idx = list.indexOf(id);
    var isNowLiked = (idx < 0);
    if (isNowLiked) list.push(id);
    else list.splice(idx, 1);
    localStorage.setItem('gp-liked-passages', JSON.stringify(list));
    toast(isNowLiked ? 'Pasaj beğenildi ❤️' : 'Beğeni geri çekildi 🤍');
    return true;
  } catch(e){ return false; }
}

function getDailyPassage() {
  return OPENING_PASSAGES[curPassageIdx % OPENING_PASSAGES.length];
}

function nextDailyPassage() {
  curPassageIdx = (curPassageIdx + 1) % OPENING_PASSAGES.length;
  var el = document.getElementById('daily-passage-container');
  if (el) el.outerHTML = renderDailyPassageHTML();
}

function renderDailyPassageHTML() {
  var p = getDailyPassage();
  var isLiked = isPassageLiked(p.id);
  var likeBtn = '<button class="quote-like-btn' + (isLiked ? ' liked' : '') + '" data-a="like-passage" data-id="' + esc(p.id) + '" title="' + (isLiked ? 'Beğeniyi Geri Çek' : 'Pasajı Beğen') + '">' + (isLiked ? '❤️' : '🤍') + ' <span>' + (isLiked ? 1 : 0) + '</span></button>';

  return '<div id="daily-passage-container" class="daily-passage-box">'
    + '<div class="daily-passage-badge"><span>📜 Günün Edebi Pasajı</span><span>· ' + esc(p.year) + '</span></div>'
    + '<p class="daily-passage-text">“' + esc(p.text) + '”</p>'
    + '<div class="daily-passage-foot">'
    + '<div class="daily-passage-source">— ' + esc(p.author) + ', <em>' + esc(p.book) + '</em></div>'
    + '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    + likeBtn
    + '<button class="btn ghost small" data-a="next-passage" title="Rastgele başka bir klasik pasaj getir">🎲 Başka Pasaj</button>'
    + '<button class="btn small" data-a="card-gen" data-text="' + esc(p.text) + '" data-author="' + esc(p.author) + '" data-book="' + esc(p.book) + '" title="Instagram Story veya görsel kart üret">🖼️ Kart Oluştur</button>'
    + (p.bookId ? '<a class="btn ghost small" href="kitap.html?id=' + encodeURIComponent(p.bookId) + '">Kitaba Git →</a>' : '')
    + '</div>'
    + '</div>'
    + '</div>';
}

// ============================================================================
// 8. Alıntı Görseli Üretici (Canvas Quote-to-Card / Instagram Story)
// ============================================================================
var quoteCardState = {
  text: '',
  author: '',
  book: '',
  theme: 'paper',
  ratio: 'square'
};

function openQuoteCardModal(text, author, book) {
  quoteCardState.text = (text || '').trim();
  quoteCardState.author = (author || 'Edebi Klasik').trim();
  quoteCardState.book = (book || '').trim();
  var modal = document.getElementById('quote-card-modal');
  if (modal) {
    modal.classList.add('open');
    var inpText = document.getElementById('card-inp-text');
    var inpAuthor = document.getElementById('card-inp-author');
    var inpBook = document.getElementById('card-inp-book');
    if (inpText) inpText.value = quoteCardState.text;
    if (inpAuthor) inpAuthor.value = quoteCardState.author;
    if (inpBook) inpBook.value = quoteCardState.book;
    drawQuoteCardCanvas();
  }
}

function closeQuoteCardModal() {
  var modal = document.getElementById('quote-card-modal');
  if (modal) modal.classList.remove('open');
}

function drawQuoteCardCanvas() {
  var canvas = document.getElementById('quote-card-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  
  var isStory = (quoteCardState.ratio === 'story');
  var w = 1080;
  var h = isStory ? 1920 : 1080;
  canvas.width = w;
  canvas.height = h;

  var theme = quoteCardState.theme;
  var bg = '#f3ead9';
  var ink = '#241b14';
  var inkSoft = '#635345';
  var accent = '#7a1f2b';
  var gold = '#a97f2e';
  var line = '#d5c5a5';

  if (theme === 'dark') {
    bg = '#18191c';
    ink = '#f0f1f5';
    inkSoft = '#9ea1b2';
    accent = '#e05a68';
    gold = '#e5c07b';
    line = '#333642';
  } else if (theme === 'sepia') {
    bg = '#2d2218';
    ink = '#f7f1e6';
    inkSoft = '#c7b299';
    accent = '#d48344';
    gold = '#e5c07b';
    line = '#473629';
  }

  // 1. Arka plan
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 2. Kenarlık çerçevesi
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  var pad = 60;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(pad + 12, pad + 12, w - (pad + 12) * 2, h - (pad + 12) * 2);

  // 3. Üst Logo / Başlık
  ctx.fillStyle = accent;
  ctx.font = 'bold 32px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText("G O G O L ' U N   P A L T O S U", w / 2, isStory ? 240 : 160);

  ctx.fillStyle = gold;
  ctx.font = '500 20px "Lora", Georgia, serif';
  ctx.fillText("— EDEBİYAT KULÜBÜ —", w / 2, isStory ? 290 : 205);

  // 4. Büyük Tırnak İşareti
  ctx.fillStyle = gold;
  ctx.globalAlpha = 0.22;
  ctx.font = 'italic bold 200px "Playfair Display", Georgia, serif';
  ctx.fillText("“", w / 2, isStory ? 520 : 360);
  ctx.globalAlpha = 1.0;

  // 5. Alıntı Metnini Otomatik Sar (Wrap)
  var text = quoteCardState.text || 'Hepimiz Gogol\'un Palto\'sundan çıktık.';
  var maxWidth = w - 240;
  var fontSize = isStory ? 48 : 42;
  if (text.length > 200) fontSize = isStory ? 40 : 34;
  if (text.length > 350) fontSize = isStory ? 34 : 28;
  ctx.font = 'italic ' + fontSize + 'px "Playfair Display", Georgia, serif';
  ctx.fillStyle = ink;

  var words = text.split(' ');
  var lines = [];
  var curLine = '';
  for (var i = 0; i < words.length; i++) {
    var testLine = curLine ? (curLine + ' ' + words[i]) : words[i];
    var metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && curLine) {
      lines.push(curLine);
      curLine = words[i];
    } else {
      curLine = testLine;
    }
  }
  if (curLine) lines.push(curLine);

  var lineHeight = fontSize * 1.55;
  var totalTextH = lines.length * lineHeight;
  var startY = (isStory ? (h / 2 - totalTextH / 2) : (h / 2 - totalTextH / 2 + 30));

  for (var j = 0; j < lines.length; j++) {
    ctx.fillText(lines[j], w / 2, startY + (j * lineHeight));
  }

  // 6. Yazar ve Eser
  var authorY = startY + totalTextH + (isStory ? 80 : 60);
  var authorText = quoteCardState.author ? ('— ' + quoteCardState.author) : '';
  if (quoteCardState.book) authorText += (authorText ? ', ' : '— ') + quoteCardState.book;

  if (authorText) {
    ctx.fillStyle = accent;
    ctx.font = 'bold 30px "Lora", Georgia, serif';
    ctx.fillText(authorText, w / 2, authorY);
  }

  // 7. Alt Bilgi / YouTube & Web
  ctx.fillStyle = inkSoft;
  ctx.font = '500 20px "Lora", Georgia, serif';
  ctx.fillText("youtube.com/@ngogolunpaltosu", w / 2, h - pad - 40);
}

function downloadQuoteCardPNG() {
  var canvas = document.getElementById('quote-card-canvas');
  if (!canvas) return;
  var dataUrl = canvas.toDataURL('image/png');
  var a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'gogolun-paltosu-alinti-' + Date.now() + '.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('Alıntı görseli başarıyla indirildi! 🎨');
}

function renderQuoteCardModalHTML() {
  return '<div id="quote-card-modal" class="card-modal">'
    + '<div class="card-modal-box">'
    + '<div class="card-modal-head">'
    + '<h3 class="card-modal-title">🎨 Alıntı Görseli Üretici & Stüdyo</h3>'
    + '<button class="quote-del-btn" data-a="close-card-modal" style="font-size:1.3rem">✕</button>'
    + '</div>'
    + '<div class="card-canvas-wrap">'
    + '<canvas id="quote-card-canvas"></canvas>'
    + '</div>'
    + '<div class="card-opts">'
    + '<div class="card-opt-group"><span>Format:</span>'
    + '<button class="card-opt-btn' + (quoteCardState.ratio === 'square' ? ' on' : '') + '" data-a="card-ratio" data-v="square">Kare (1:1)</button>'
    + '<button class="card-opt-btn' + (quoteCardState.ratio === 'story' ? ' on' : '') + '" data-a="card-ratio" data-v="story">Hikaye (9:16)</button>'
    + '</div>'
    + '<div class="card-opt-group"><span>Tema:</span>'
    + '<button class="card-opt-btn' + (quoteCardState.theme === 'paper' ? ' on' : '') + '" data-a="card-theme" data-v="paper">Kağıt</button>'
    + '<button class="card-opt-btn' + (quoteCardState.theme === 'dark' ? ' on' : '') + '" data-a="card-theme" data-v="dark">Gece</button>'
    + '<button class="card-opt-btn' + (quoteCardState.theme === 'sepia' ? ' on' : '') + '" data-a="card-theme" data-v="sepia">Sepya</button>'
    + '</div>'
    + '</div>'
    + '<div style="background:var(--paper-2);padding:10px 12px;border-radius:10px;border:1px solid var(--line)">'
    + '<label style="display:block;font-size:.78rem;font-weight:700;color:var(--ink-soft);margin-bottom:4px">✏️ Alıntıyı Canlı Düzenle:</label>'
    + '<textarea id="card-inp-text" placeholder="Alıntı metni..." style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:inherit;font-size:.85rem;resize:vertical;min-height:54px"></textarea>'
    + '<div style="display:flex;gap:8px;margin-top:6px">'
    + '<input type="text" id="card-inp-author" placeholder="Yazar adı..." style="flex:1;min-width:0;box-sizing:border-box;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:inherit;font-size:.85rem">'
    + '<input type="text" id="card-inp-book" placeholder="Eser / Kitap..." style="flex:1;min-width:0;box-sizing:border-box;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:inherit;font-size:.85rem">'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px">'
    + '<button class="btn ghost small" data-a="close-card-modal">Kapat</button>'
    + '<button class="btn small" data-a="download-card-png">💾 Görseli İndir (PNG)</button>'
    + '</div>'
    + '</div>'
    + '</div>';
}

// ============================================================================
// 10. Edebi Kavramlar Sözlüğü (Literary Glossary)
// ============================================================================
var LITERARY_GLOSSARY = [
  { term: "Titüler Müşavir (Титулярный советник)", origin: "Rus Çarlık Bürokrasisi / 9. Derece", def: "14 dereceli Rus Çarlık Rütbe Tablosu'nda (Çin Sistemi) 9. basamağa denk gelen sivil memur unvanı. Asla soylu sayılmayan, terfi imkânı bulunmayan ve Akaki Akakiyeviç gibi bürokrasinin çarkları arasında yok sayılan 'küçük adam' simgesi." },
  { term: "Küçük Adam (Маленький человек)", origin: "19. Yüzyıl Rus Edebiyatı Kavramı", def: "Gogol'un Palto'suyla başlayan ve Dostoyevski ile derinleşen edebiyat tipi. Sosyal piramidin en altında yer alan, kimsenin fark etmediği, hakarete uğrayan ama içinde derin bir onur ve şefkat ihtiyacı taşıyan ezilen kent insanı." },
  { term: "Gereksiz Adam (Лишний человек - Lişniy Çelovek)", origin: "Rus Edebiyatı Aydın Tipi", def: "Zeki, kültürlü ve duyarlı olmasına rağmen Çarlık istibdadı, köhne toplumsal düzen ve can sıkıntısı nedeniyle eyleme geçemeyen, toplumda yer bulamayan melankolik aydın (Puşkin'in Onegin'i, Lermontov'un Peçorin'i, Turgenyev'in Rudin'i)." },
  { term: "Yeraltı İnsanı", origin: "Dostoyevski / Yeraltından Notlar", def: "Aydınlanmacı rasyonalizme, faydacılığa ve kusursuz 'Kristal Saray' ideallerine kafa tutan; insanın bazen sırf kendi özgür iradesini kanıtlamak için acıyı ve yıkımı seçebileceğini haykıran marjinal benlik." },
  { term: "Neva Caddesi (Невский проспект)", origin: "Gogol / Petersburg Anlatıları", def: "Petersburg'un ana bulvarı. Sosyal tabakaların, zenginlik ile sefaletin, gerçek ile hayalin birbirine karıştığı; Gogol'a göre 'şeytanın fenerlerini dünyayı kandırmak için yaktığı' aldatıcı kent metaforu." },
  { term: "Çin Sistemi (Табель о рангах)", origin: "I. Petro Reformları (1722)", def: "Soy ve kan bağı yerine devlete hizmet süresi ve bürokratik basamaklara (14 derece) dayanan resmi devlet sınıflandırması. Rus insanının tüm saygınlığını rütbesine bağlayan mekanik sistem." },
  { term: "Polifoni (Çokseslilik)", origin: "Mihail Bahtin / Edebiyat Kuramı", def: "Dostoyevski romanlarının temel anlatı özelliği. Yazarın kendi dünya görüşünü dayatmadığı, her karakterin bağımsız, eşit haklara sahip ve çatışan özgün bir ses olarak var olduğu kurgusal yapı." },
  { term: "Mizantropi", origin: "Felsefe & Edebiyat", def: "İnsan türünün ahlaki zaaflarından, riyakârlığından ve çıkarcılığından tiksinerek topluma mesafe koyma, insanlardan kaçınma ve yalnızlığa sığınma hali." },
  { term: "Karamsar İroni (Çehovyen İroni)", origin: "Anton Çehov Anlatım Tarzı", def: "Hayatın en büyük trajedilerini büyük çığlıklarla değil; günlük hayatın sıradan konuşmaları, unutulan çay bardakları ve acı bir tebessüm eşliğinde okura hissettiren edebi üslup." },
  { term: "Sobornost", origin: "Slavofil Felsefe", def: "Bireysel bencillik ve rasyonel hesapçılık yerine kalplerin kardeşliği, ortak vicdan ve sevgi temelli manevi birliktelik ideali." },
  { term: "Raskol (Bölünme)", origin: "Rus Düşüncesi & Suç ve Ceza", def: "Kökeni Rus Ortodoks Kilisesi'ndeki tarihi yarılmaya dayanan ve Raskolnikov'un soyadını oluşturan kavram; bir bireyin kendi aklı ile vicdanı, kibri ile insanlığı arasında yaşadığı derin iç çatışma." },
  { term: "Absürdizm (Uyumsuzluk)", origin: "Camus & Kafka", def: "İnsanın anlam, adalet ve düzen arayışı ile evrenin sağır ve anlamsız sessizliği arasındaki aşılmaz çelişki." },
  { term: "Mizansen (Kurgusal Sahneleme)", origin: "Tiyatro & Roman Sanatı", def: "Karakterlerin mekân içindeki hareketleri, bakışları ve sessizlikleriyle metindeki gizli gerilimi görünür kılma sanatı." },
  { term: "İtiraf Türü", origin: "Otobiyografik Edebiyat", def: "Yazarın veya kahramanın kendi günahlarını, utançlarını ve zaaflarını hiçbir filtre koymadan apaçık dile getirdiği edebi anlatı tarzı." },
  { term: "Grotesk (Gogoliyen Grotesk)", origin: "Nikolay Gogol / Edebi Anlatım Sanatı", def: "Gülünç ile korkuncun, gerçek ile fantezinin, sıradan ile akıl almazın iç içe geçtiği edebi üslup. Gogol'un Burun öyküsünde yüzünden kaçan memur burnu veya Palto'daki hayalet sahnesinde olduğu gibi, toplumsal çürümeyi ve trajediyi görünür kılan çarpıcı anlatım biçimi." }
];

var glossarySearchQ = '';

function glossaryPage() {
  var q = lc(glossarySearchQ).trim();
  var filtered = LITERARY_GLOSSARY.filter(function(item){
    if (!q) return true;
    return lc(item.term).indexOf(q) >= 0 || lc(item.origin).indexOf(q) >= 0 || lc(item.def).indexOf(q) >= 0;
  });

  return '<section class="page">'
    + '<a class="back" href="index.html">← Ana Sayfaya Dön</a>'
    + '<div class="glossary-hero">'
    + '<h1 class="ptitle">🏷️ Edebi Kavramlar Sözlüğü</h1>'
    + '<p class="tag" style="max-width:620px;margin:0 auto 20px">Rus edebiyatında ve klasiklerde sıkça karşımıza çıkan terimler, unvanlar, felsefi akımlar ve tarihsel bağlamlar rehberi.</p>'
    + '<div class="glossary-search">'
    + '<input id="glossary-search-input" type="search" placeholder="Kavram, yazar veya terim ara…" value="' + esc(glossarySearchQ) + '" style="width:100%;padding:12px 18px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit">'
    + '</div>'
    + '</div>'
    + '<div id="glossary-grid" class="glossary-grid">'
    + (filtered.length ? filtered.map(function(item){
        return '<div class="glossary-card">'
          + '<div class="glossary-term">' + esc(item.term) + '</div>'
          + '<div class="glossary-origin">📌 ' + esc(item.origin) + '</div>'
          + '<div class="glossary-def">' + esc(item.def) + '</div>'
          + '<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--line);display:flex;justify-content:flex-end">'
          + '<button class="btn ghost small" data-a="copy-quote-text" data-text="' + esc(item.term + ' (' + item.origin + '): ' + item.def) + '">📋 Kopyala</button>'
          + '</div>'
          + '</div>';
      }).join('') : '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--muted)">Aramanızla eşleşen edebi kavram bulunamadı.</div>')
    + '</div>'
    + '</section>';
}

// ============================================================================
// 11. Okuma Meydan Okumaları (Monthly Reading Challenges)
// ============================================================================
var READING_CHALLENGES = [
  {
    id: "ch_petersburg",
    title: "Petersburg Sokakları Meydan Okuması",
    icon: "🏛️",
    badge: "Petersburg Kâşifi",
    targetCount: 3,
    desc: "Kuzeyin puslu ve büyüleyici başkenti Sankt-Peterburg'un sokaklarında, köprülerinde ve tavan aralarında geçen 3 unutulmaz klasiği tamamlayın.",
    keywords: ["palto", "petersburg", "suç ve ceza", "dostoyevski", "gogol", "beyaz geceler", "öteki", "burun"],
    exampleBooks: [
      { title: "Palto", author: "Nikolay Gogol", note: "Petersburg bürokrasisi ve Akaki Akakiyeviç'in trajedisi" },
      { title: "Suç ve Ceza", author: "F. M. Dostoyevski", note: "Sennaya Meydanı ve Raskolnikov'un vicdan muhasebesi" },
      { title: "Beyaz Geceler", author: "F. M. Dostoyevski", note: "Petersburg mehtabında geçen 4 gecelik lirik rüya" },
      { title: "Burun", author: "Nikolay Gogol", note: "Nevski Bulvarı'nda geçen absürt ve fantastik bir taşlama" }
    ]
  },
  {
    id: "ch_kucukadam",
    title: "Küçük Adam'ın Onur Savaşı",
    icon: "🧥",
    badge: "Palto Muhafızı",
    targetCount: 2,
    desc: "Toplumun unuttuğu, katı bürokrasinin ezdiği küçük memurların, yalnız ruhların ve sessiz insanların dünyasını anlatan en az 2 eseri okuyun.",
    keywords: ["palto", "memur", "küçük adam", "gogol", "insancıklar", "müfettiş", "çehov", "öykü"],
    exampleBooks: [
      { title: "Palto", author: "Nikolay Gogol", note: "Küçük memur Akaki'nin hazin hikâyesi" },
      { title: "İnsancıklar", author: "F. M. Dostoyevski", note: "Makar Devuşkin ve Varenka'nın onur mücadelesi" },
      { title: "Müfettiş", author: "Nikolay Gogol", note: "Taşra bürokrasisini sarsan kılık değiştirme hicvi" },
      { title: "Altıncı Koğuş", author: "Anton Çehov", note: "Düşüncesi yüzünden tımarhaneye kapatılan hekimin dramı" }
    ]
  },
  {
    id: "ch_felsefe",
    title: "Rus Ruhunun Derinliği & Vicdan",
    icon: "📜",
    badge: "Rus Ruhunun Aynası",
    targetCount: 2,
    desc: "Tolstoy, Dostoyevski ve Çehov'un insan doğasını, ölümü, ahlakı ve hayatın nihai gayesini sorguladığı 2 felsefi başyapıtı keşfedin.",
    keywords: ["tolstoy", "çehov", "felsefe", "insan ne ile yaşar", "karamazov", "ivan ilyiç", "ölüm", "diriliş"],
    exampleBooks: [
      { title: "İnsan Ne İle Yaşar?", author: "Lev Tolstoy", note: "Sevgi, merhamet ve ilahi adalet üzerine ahlaki meseller" },
      { title: "İvan İlyiç'in Ölümü", author: "Lev Tolstoy", note: "Kaçınılmaz son karşısında sahte bir ömrün muhasebesi" },
      { title: "Karamazov Kardeşler", author: "F. M. Dostoyevski", note: "Büyük Engizisyoncu, inanç ve şüphenin zirvesi" },
      { title: "Martı", author: "Anton Çehov", note: "Sanat, aşk ve varoluşsal kırgınlıklar" }
    ]
  },
  {
    id: "ch_varolus",
    title: "Yeraltı ve Varoluşsal Yabancılaşma",
    icon: "🕯️",
    badge: "Gece Feneri",
    targetCount: 2,
    desc: "Modern çağın boğuntusunu, bireyin toplumdan kopuşunu ve yeraltındaki insanın isyanını irdeleyen 2 eseri bitirin.",
    keywords: ["yeraltı", "kafka", "varoluş", "dönüşüm", "dava", "yabancı", "aforizmalar", "burgess", "portakal"],
    exampleBooks: [
      { title: "Yeraltından Notlar", author: "F. M. Dostoyevski", note: "Modern varoluşçuluğun kapısını aralayan manifestosu" },
      { title: "Dönüşüm", author: "Franz Kafka", note: "Gregor Samsa'nın böceğe dönüşmesi ve yabancılaşma" },
      { title: "Aforizmalar", author: "Franz Kafka", note: "Günah, acı, umut ve doğru yol üzerine sarsıcı notlar" },
      { title: "Otomatik Portakal", author: "Anthony Burgess", note: "Özgür irade, şiddet ve mekanikleştirilen insan doğası" }
    ]
  },
  {
    id: "ch_estetizm",
    title: "Estetizm, Vicdan ve İroni",
    icon: "🥀",
    badge: "Zarif Dekadan",
    targetCount: 2,
    desc: "Oscar Wilde ve Stevenson'ın güzellik, çürüme, ikili ruh hali ve maskelerin ardındaki gerçeği işleyen 2 eserini okuyun.",
    keywords: ["wilde", "oscar", "dorian", "jekyll", "canterville", "profundis", "zindan", "stevenson"],
    exampleBooks: [
      { title: "De Profundis", author: "Oscar Wilde", note: "Reading Zindanı'ndan yükselen en samimi tövbe mektubu" },
      { title: "Dr. Jekyll ve Mr. Hyde", author: "R. L. Stevenson", note: "İnsanın aydınlık ve karanlık benlik savaşı" },
      { title: "Canterville Hortlağı", author: "Oscar Wilde", note: "Amerikan pragmatizmi ile gotik geleneğin neşeli çatışması" },
      { title: "Ciddi Olmanın Önemi", author: "Oscar Wilde", note: "Sosyal riyakarlıkları hicveden kıvrak bir zeka komedisi" }
    ]
  },
  {
    id: "ch_bilinc",
    title: "Sorgulayan Bilinç ve Alegori",
    icon: "🧭",
    badge: "Hakikat Arayıcısı",
    targetCount: 2,
    desc: "Saramago, Attar ve Conrad'ın insanın sınırlarını, alegorik yolculuklarını ve benlik krizini anlatan 2 derinlikli eserini keşfedin.",
    keywords: ["saramago", "ada", "mantık", "attar", "casus", "conrad", "kopyalanmış"],
    exampleBooks: [
      { title: "Bilinmeyen Adanın Öyküsü", author: "José Saramago", note: "Kendini bulmak için limandan ayrılan hayalperestin yolculuğu" },
      { title: "Mantıku't Tayr", author: "Feridüddin Attar", note: "Hakikati arayan 30 kuşun Simurg'a mistik seferi" },
      { title: "Kopyalanmış Adam", author: "José Saramago", note: "Kendi benzeriyle karşılaşan adamın kimlik parçalanması" },
      { title: "Casus", author: "Joseph Conrad", note: "Gizli örgütler, ahlaki çürüme ve siyasal kaos" }
    ]
  },
  {
    id: "ch_tiyatro",
    title: "Sahne Işıkları ve Büyük Trajediler",
    icon: "🎭",
    badge: "Tiyatro Tutkunu",
    targetCount: 2,
    desc: "Shakespeare, Molière, Çehov ve Euripides'in insan ruhunu ve zaaflarını sahneye taşıyan 2 büyük tiyatro klasiğini okuyun.",
    keywords: ["tiyatro", "oyun", "shakespeare", "hamlet", "macbeth", "cimri", "martı", "vişne bahçesi", "moliere", "euripides"],
    exampleBooks: [
      { title: "Hamlet", author: "William Shakespeare", note: "Olmak ya da olmamak; insanlığın en büyük varoluşsal trajedisi" },
      { title: "Cimri", author: "Molière", note: "Para hırsının gülünçleştirdiği Harpagon ve klasik Fransız yergisi" },
      { title: "Vişne Bahçesi", author: "Anton Çehov", note: "Değişen çağ karşısında köşkünü kaybeden soyluların hüznü" },
      { title: "Bakkhalar", author: "Euripides", note: "Akıl ile içgüdünün, düzen ile taşkınlığın antik tragedyası" }
    ]
  },
  {
    id: "ch_epik",
    title: "Destanlar, Tarih ve Sonsuzluk",
    icon: "⚔️",
    badge: "Destan Kâşifi",
    targetCount: 2,
    desc: "Homeros'tan Tolstoy'a insanlığın savaş, barış, kader ve kahramanlık arayışını anlatan 2 anıtsal destansı başyapıtı tamamlayın.",
    keywords: ["destan", "savaş ve barış", "ilyada", "odysseia", "homeros", "tarih", "faust", "goethe"],
    exampleBooks: [
      { title: "Savaş ve Barış", author: "Lev Tolstoy", note: "Napolyon istilasında Rus halkının ve ruhunun panoraması" },
      { title: "İlyada", author: "Homeros", note: "Truva surları önünde Akhilleus'un öfkesi ve antik destan" },
      { title: "Odysseia", author: "Homeros", note: "On yıllık çetin deniz seferi ve eve dönüşün efsanesi" },
      { title: "Faust", author: "J. W. von Goethe", note: "Şeytanla bahse giren bilgenin hakikat ve sonsuzluk arayışı" }
    ]
  },
  {
    id: "ch_kisaoyku",
    title: "Kısa Öykünün Büyülü Ustaları",
    icon: "☕",
    badge: "Kısa Öykü Ustası",
    targetCount: 3,
    desc: "Çehov, Zweig, Maupassant, Poe ve Gogol'un tek oturuşta okunup ömür boyu unutulmayan 3 usta öykü kitabını okuyun.",
    keywords: ["öykü", "hikaye", "zweig", "satranç", "amok", "korku", "maupassant", "poe", "gogol", "çehov"],
    exampleBooks: [
      { title: "Satranç", author: "Stefan Zweig", note: "Tecrit hücresinde zihinsel bölünme ve satranç tutkusu" },
      { title: "Seçme Öyküler", author: "Anton Çehov", note: "Küçük insanların hüzünlü ve ince ayrıntılarla dolu dünyası" },
      { title: "Bilinmeyen Bir Kadının Mektubu", author: "Stefan Zweig", note: "Ömür boyu süren sessiz ve karşılıksız bir aşkın itirafı" },
      { title: "Dedektif Auguste Dupin Öyküleri", author: "Edgar Allan Poe", note: "Modern polisiye ve akıl yürütme sanatının doğuşu" }
    ]
  }
];

function getUserChallenges(ident) {
  if (!ident) {
    if (curUser) {
      var cMeta = curUser.user_metadata || {};
      ident = cMeta.username || curUser.email || curUser.id;
    } else {
      try {
        return JSON.parse(localStorage.getItem('gp-user-challenges') || '{}');
      } catch(e) { return {}; }
    }
  }
  var clean = String(ident).toLowerCase().replace(/^@/,'').trim();
  if (!clean) {
    try {
      return JSON.parse(localStorage.getItem('gp-user-challenges') || '{}');
    } catch(e) { return {}; }
  }

  // 1. Giriş yapmış kullanıcının kendi verilerinden kontrol et
  if (curUser) {
    var cMeta = curUser.user_metadata || {};
    var curU = (cMeta.username || '').toLowerCase().replace(/^@/,'').trim();
    var curE = (curUser.email || '').toLowerCase().trim();
    var curId = (curUser.id || '').toLowerCase().trim();
    if (clean === curU || clean === curE || clean === curId) {
      if (cMeta.challenges && typeof cMeta.challenges === 'object' && Object.keys(cMeta.challenges).length) {
        return cMeta.challenges;
      }
      try {
        var localChs = JSON.parse(localStorage.getItem('gp-user-challenges') || '{}');
        if (localChs && typeof localChs === 'object' && Object.keys(localChs).length) {
          return localChs;
        }
      } catch(e){}
    }
  }

  // 2. Cihazdaki kullanıcı-meydan okuma haritasından kontrol et (gp-user-challenges-map)
  try {
    var map = JSON.parse(localStorage.getItem('gp-user-challenges-map') || '{}');
    if (map[clean] && typeof map[clean] === 'object') {
      return map[clean];
    }
  } catch(e){}

  // 3. Üye listesinden kontrol et (gp-local-accounts veya gp-members)
  var mem = findMemberByUsername(clean);
  if (mem) {
    if (mem.challenges && typeof mem.challenges === 'object') return mem.challenges;
    if (mem.user_metadata && mem.user_metadata.challenges && typeof mem.user_metadata.challenges === 'object') {
      return mem.user_metadata.challenges;
    }
  }

  return {};
}

function saveUserChallenge(id, joined) {
  if (!curUser && joined) return false;
  var chs = getUserChallenges();
  if (joined) {
    chs[id] = true;
  } else {
    delete chs[id];
  }
  try {
    localStorage.setItem('gp-user-challenges', JSON.stringify(chs));
  } catch(e) {}

  if (curUser) {
    var meta = Object.assign({}, curUser.user_metadata || {});
    meta.challenges = chs;
    curUser.user_metadata = meta;

    if (supa) {
      supa.auth.updateUser({ data: { challenges: chs } }).catch(function(){});
    }

    try {
      var localAccs = JSON.parse(localStorage.getItem('gp-local-accounts') || '{}');
      for (var k in localAccs) {
        var acc = localAccs[k];
        var aMeta = acc.user_metadata || {};
        if (acc.email === curUser.email || acc.id === curUser.id || (aMeta.username && aMeta.username === meta.username)) {
          acc.user_metadata = Object.assign({}, aMeta, { challenges: chs });
          acc.challenges = chs;
        }
      }
      localStorage.setItem('gp-local-accounts', JSON.stringify(localAccs));
    } catch(e){}

    try {
      var map = JSON.parse(localStorage.getItem('gp-user-challenges-map') || '{}');
      var keys = [meta.username, curUser.email, curUser.id].filter(Boolean);
      keys.forEach(function(key){
        var k = String(key).toLowerCase().replace(/^@/,'').trim();
        if (k) map[k] = chs;
      });
      localStorage.setItem('gp-user-challenges-map', JSON.stringify(map));
    } catch(e){}

    if (Array.isArray(S.members)) {
      var targetMem = S.members.find(function(m){
        return m.id === curUser.id || m.email === curUser.email || (m.username && m.username === meta.username);
      });
      if (targetMem) {
        targetMem.challenges = chs;
        if (targetMem.user_metadata) targetMem.user_metadata.challenges = chs;
      }
    }
  }
}

function renderUserChallengesHTML(userChs, userFavBooks, userBadges, isSelf) {
  userChs = userChs || {};
  userFavBooks = Array.isArray(userFavBooks) ? userFavBooks : [];
  userBadges = Array.isArray(userBadges) ? userBadges : [];

  var joinedList = READING_CHALLENGES.filter(function(ch){
    return !!userChs[ch.id];
  });

  if (!joinedList.length) {
    if (isSelf) {
      return '<p class="empty" style="padding:14px 0">Henüz bir okuma meydan okumasına katılmadınız.<br><br><a class="btn small" href="meydan-okuma.html">🏆 Okuma Meydan Okumalarını Gör ve Katıl →</a></p>';
    }
    return '<p class="empty" style="padding:14px 0">Bu okur henüz aktif bir okuma meydan okumasına katılmamış.</p>';
  }

  return '<div class="profile-challenges-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-top:12px">'
    + joinedList.map(function(ch){
        var isCompleted = userBadges.indexOf(ch.badge) >= 0;

        var matchedCount = 0;
        userFavBooks.forEach(function(b){
          var bTitle = lc(b.title || '');
          var str = lc([b.title, b.author, b.category, (b.tags||[]).join(' ')].join(' '));
          var matchKeyword = (ch.keywords || []).some(function(kw){ return str.indexOf(kw) >= 0; });
          var matchExample = (ch.exampleBooks || []).some(function(ex){ return lc(ex.title) === bTitle; });
          if (matchKeyword || matchExample) matchedCount++;
        });
        if (isCompleted) matchedCount = ch.targetCount;
        var progressPercent = Math.min(100, Math.round((matchedCount / ch.targetCount) * 100));

        var statusBadge = '';
        if (isCompleted) {
          statusBadge = '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:.76rem;font-weight:700;background:rgba(212,175,55,.14);color:var(--gold);border:1px solid rgba(212,175,55,.3)">🎉 Rozet Kazanıldı</span>';
        } else if (matchedCount >= ch.targetCount) {
          statusBadge = '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:.76rem;font-weight:700;background:rgba(40,140,60,.14);color:#288c3c;border:1px solid rgba(40,140,60,.3)">🏆 Tamamlandı</span>';
        } else {
          statusBadge = '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:.76rem;font-weight:600;background:rgba(122,31,43,.1);color:var(--accent);border:1px solid rgba(122,31,43,.25)">🎯 Devam Ediyor</span>';
        }

        return '<div class="profile-challenge-card" style="background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;box-shadow:var(--shadow);display:flex;flex-direction:column;justify-content:space-between">'
          + '<div>'
          + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px">'
          + '<div style="display:flex;align-items:center;gap:10px">'
          + '<span style="font-size:1.8rem;line-height:1">' + ch.icon + '</span>'
          + '<h4 style="font-family:var(--serif);font-size:1.02rem;margin:0;color:var(--ink);line-height:1.3">' + esc(ch.title) + '</h4>'
          + '</div>'
          + statusBadge
          + '</div>'
          + '<p style="font-size:.82rem;color:var(--ink-soft);margin:6px 0 12px;line-height:1.4">' + esc(ch.desc) + '</p>'
          + '<div class="challenge-progress-wrap" style="height:6px;background:var(--line);border-radius:999px;overflow:hidden;margin-bottom:6px"><div class="challenge-progress-bar" style="height:100%;background:linear-gradient(90deg,var(--accent),var(--gold));border-radius:999px;width:' + progressPercent + '%"></div></div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:.78rem;color:var(--ink-soft)">'
          + '<span>İlerleme: <b>' + matchedCount + ' / ' + ch.targetCount + ' Kitap</b></span>'
          + '<span>%' + progressPercent + '</span>'
          + '</div>'
          + '</div>'
          + '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">'
          + '<span style="font-size:.76rem;color:var(--gold);font-weight:600">🏅 Rozet: ' + esc(ch.badge) + '</span>'
          + '<a class="btn ghost small" href="meydan-okuma.html" style="font-size:.76rem;padding:3px 8px">Meydan Okuma →</a>'
          + '</div>'
          + '</div>';
      }).join('')
    + '</div>';
}

function challengesPage() {
  var chs = curUser ? getUserChallenges() : {};
  var userBadges = curUser ? getUserBadges() : [];
  var myFavs = S.books.filter(function(b){ return isFav(b.id); });

  return '<section class="page">'
    + '<a class="back" href="index.html">← Ana Sayfaya Dön</a>'
    + '<div class="glossary-hero">'
    + '<h1 class="ptitle">🏆 Okuma Meydan Okumaları</h1>'
    + '<p class="tag" style="max-width:640px;margin:0 auto 20px">Belirli temalardaki edebi hedefleri tamamlayarak hem okuma alışkanlığınızı derinleştirin hem de profilinize özel kulüp rozetleri kazanın.</p>'
    + (!curUser ? '<div class="sync-tip" style="max-width:680px;margin:0 auto 20px;text-align:center"><span>🔒 <b>Okuma Meydan Okumaları kulüp üyelerine özeldir.</b> Meydan okumalara katılıp hedeflerinizi tamamlamak ve profilinize rozet eklemek için <button data-a="open-auth" style="background:none;border:none;color:var(--accent);font-weight:700;cursor:pointer;padding:0;text-decoration:underline">Giriş Yapın veya Üye Olun →</button></span></div>' : '')
    + '</div>'
    + '<div class="challenge-grid">'
    + READING_CHALLENGES.map(function(ch){
        var isJoined = curUser ? !!chs[ch.id] : false;
        var isCompleted = curUser ? (userBadges.indexOf(ch.badge) >= 0) : false;
        
        // İlerleme hesabı (listede eşleşen kitaplar)
        var matchedCount = 0;
        myFavs.forEach(function(b){
          var bTitle = lc(b.title || '');
          var str = lc([b.title, b.author, b.category, (b.tags||[]).join(' ')].join(' '));
          var matchKeyword = (ch.keywords || []).some(function(kw){ return str.indexOf(kw) >= 0; });
          var matchExample = (ch.exampleBooks || []).some(function(ex){ return lc(ex.title) === bTitle; });
          if (matchKeyword || matchExample) matchedCount++;
        });
        if (isCompleted) matchedCount = ch.targetCount;
        var progressPercent = Math.min(100, Math.round((matchedCount / ch.targetCount) * 100));

        // Örnek kitaplar bölümü
        var examplesHTML = '';
        if (Array.isArray(ch.exampleBooks) && ch.exampleBooks.length) {
          examplesHTML = '<div class="challenge-books">'
            + '<div class="challenge-books-head"><span>📚 Temaya Uygun Örnek Kitaplar</span></div>'
            + '<div class="challenge-books-chips">'
            + ch.exampleBooks.map(function(ex){
                var bk = S.books.filter(function(b){ return lc(b.title) === lc(ex.title); })[0];
                var targetHref = bk ? ('#/kitap/' + encodeURIComponent(bk.id)) : ('#/kitaplar');
                return '<a href="' + targetHref + '" class="challenge-book-chip" title="' + esc(ex.note || (ex.title + ' — ' + ex.author)) + '">'
                  + '<span>📖 <b>' + esc(ex.title) + '</b></span>'
                  + '<small>(' + esc(ex.author) + ')</small>'
                  + '</a>';
              }).join('')
            + '</div>'
            + '</div>';
        }

        var actionBtnsHTML = '';
        if (!curUser) {
          actionBtnsHTML = '<button class="btn ghost small" data-a="open-auth" style="display:inline-flex;align-items:center;gap:6px">🔒 Üyelere Özel · Katıl</button>';
        } else if (isCompleted) {
          actionBtnsHTML = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
            + '<span style="color:var(--gold);font-weight:700">🎉 Rozet Kazanıldı!</span>'
            + '<button class="btn ghost small" data-a="leave-challenge" data-id="' + esc(ch.id) + '" data-badge="' + esc(ch.badge) + '" style="font-size:.76rem;padding:3px 9px;color:var(--ink-soft);opacity:.85" title="Meydan okumayı ve rozeti sıfırla">Ayrıl / Sıfırla</button>'
            + '</div>';
        } else if (isJoined) {
          if (matchedCount >= ch.targetCount) {
            actionBtnsHTML = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
              + '<button class="btn small" data-a="claim-challenge-badge" data-badge="' + esc(ch.badge) + '">🏆 Rozeti Al!</button>'
              + '<button class="btn ghost small" data-a="leave-challenge" data-id="' + esc(ch.id) + '" style="font-size:.76rem;padding:3px 9px;color:var(--ink-soft)" title="Meydan okumadan ayrıl">Ayrıl</button>'
              + '</div>';
          } else {
            actionBtnsHTML = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
              + '<span style="font-size:.82rem;color:var(--accent);font-weight:600">🎯 Devam Ediyor</span>'
              + '<button class="btn ghost small" data-a="leave-challenge" data-id="' + esc(ch.id) + '" style="font-size:.76rem;padding:3px 9px;color:var(--ink-soft);border:1px solid var(--line)" title="Meydan okumadan ayrıl">Ayrıl</button>'
              + '</div>';
          }
        } else {
          actionBtnsHTML = '<button class="btn small" data-a="join-challenge" data-id="' + esc(ch.id) + '">Meydan Okumaya Katıl</button>';
        }

        return '<div class="challenge-card' + (isCompleted ? ' completed' : '') + '">'
          + '<div>'
          + '<div class="challenge-badge-icon">' + ch.icon + '</div>'
          + '<h3 class="challenge-title">' + esc(ch.title) + '</h3>'
          + '<p class="challenge-desc">' + esc(ch.desc) + '</p>'
          + examplesHTML
          + '<div class="challenge-progress-wrap"><div class="challenge-progress-bar" style="width:' + (curUser ? progressPercent : 0) + '%"></div></div>'
          + '<div class="challenge-status-text">'
          + '<span>İlerleme: ' + (curUser ? (matchedCount + ' / ' + ch.targetCount) : ('Hedef: ' + ch.targetCount)) + ' Kitap</span>'
          + '<span>' + (curUser ? ('%' + progressPercent) : '🔒') + '</span>'
          + '</div>'
          + '</div>'
          + '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">'
          + actionBtnsHTML
          + '<a class="btn ghost small" href="kitaplar.html">Kütüphaneye Git →</a>'
          + '</div>'
          + '</div>';
      }).join('')
    + '</div>'
    + '</section>';
}

// ============================================================================
// 12. Odak Modu Altını Çizme ve Not Alma (Reader Highlights)
// ============================================================================
function getReaderHighlights(bookId) {
  try {
    var all = JSON.parse(localStorage.getItem('gp-reader-highlights') || '[]');
    if (bookId) return all.filter(function(h){ return h.bookId === bookId; });
    return all;
  } catch(e) { return []; }
}

function saveReaderHighlight(bookId, text, note) {
  if (!text || !text.trim()) return;
  var all = getReaderHighlights();
  var book = S.books.filter(function(b){ return b.id === bookId; })[0];
  var newHl = {
    id: 'hl_' + Date.now(),
    bookId: bookId,
    bookTitle: book ? book.title : 'Klasik Eser',
    author: book ? book.author : '',
    text: text.trim(),
    note: (note || '').trim(),
    created_at: new Date().toLocaleDateString('tr-TR')
  };
  all.unshift(newHl);
  try {
    localStorage.setItem('gp-reader-highlights', JSON.stringify(all));
  } catch(e) {}
  return newHl;
}

function deleteReaderHighlight(id) {
  var all = getReaderHighlights().filter(function(h){ return h.id !== id; });
  try {
    localStorage.setItem('gp-reader-highlights', JSON.stringify(all));
  } catch(e) {}
}

function renderUserHighlightsHTML(highlights) {
  if (!highlights || !highlights.length) {
    return '<p class="empty" style="padding:16px 0">Henüz odak modunda altını çizdiğiniz bir pasaj veya not bulunmuyor.<br><br><a class="btn small" href="kitaplar.html">Kitaplara Göz At ve Oku →</a></p>';
  }
  return '<div class="quotes-wall-grid" style="margin:12px 0">' + highlights.map(function(h){
    return '<div class="quote-tile">'
      + '<p class="quote-tile-text" style="background:color-mix(in srgb,var(--gold) 15%,transparent);padding:8px 12px;border-radius:8px">“' + esc(h.text) + '”</p>'
      + (h.note ? '<p style="font-size:.88rem;color:var(--ink);margin:6px 0 10px;background:var(--paper-2);padding:6px 10px;border-radius:6px">📝 <b>Notunuz:</b> ' + esc(h.note) + '</p>' : '')
      + '<div class="quote-tile-cite">'
      + '<span>📖 ' + esc(h.bookTitle) + (h.author ? ' · ' + esc(h.author) : '') + ' <small>(' + esc(h.created_at) + ')</small></span>'
      + '<div style="display:flex;gap:6px;align-items:center">'
      + '<button class="btn ghost small" data-a="card-gen" data-text="' + esc(h.text) + '" data-author="' + esc(h.author) + '" data-book="' + esc(h.bookTitle) + '">🖼️ Kart Yap</button>'
      + '<button class="quote-del-btn" data-a="del-highlight" data-id="' + esc(h.id) + '" title="Notu sil">🗑️</button>'
      + '</div>'
      + '</div>'
      + '</div>';
  }).join('') + '</div>';
}


var soundManager = (function(){
  var audioCtx = null;
  var rainNode = null;
  var fireNode = null;
  var fireCrackleTimer = null;
  var waveNode = null;
  var waveTimer = null;
  var forestNode = null;
  var forestTimer = null;
  var seqTimer = null;
  var gainNode = null;
  var curTrack = 'rain';
  var isPlaying = false;
  var volume = 0.5;
  var audioElem = null;

  var trackNames = {
    rain: '🌧️ Yağmur Ambiyansı',
    fire: '🔥 Çıtırdayan Şömine',
    waves: '🌊 Okyanus Dalgaları',
    forest: '🌲 Gece Ormanı & Rüzgâr',
    satie: '🎹 Erik Satie — Gymnopédie',
    chopin: '🎼 F. Chopin — Nocturne',
    beethoven: '🌕 L. v. Beethoven — Moonlight',
    debussy: '🌙 Claude Debussy — Clair de Lune',
    tchaikovsky: '🍂 P. I. Çaykovski — Autumn',
    bach: '🎻 J. S. Bach — Cello Suite No.1'
  };

  function getAudioContext() {
    if (!audioCtx) {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function getMasterGain() {
    var ctx = getAudioContext();
    if (!ctx) return null;
    if (!gainNode) {
      gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
    }
    gainNode.gain.setValueAtTime(volume * 0.75, ctx.currentTime);
    return gainNode;
  }

  function stopAllAudio() {
    // 1. Stop rain
    if (rainNode) {
      try { rainNode.stop(0); rainNode.disconnect(); } catch(e){}
      rainNode = null;
    }
    // 2. Stop fireplace
    if (fireNode) {
      try { fireNode.stop(0); fireNode.disconnect(); } catch(e){}
      fireNode = null;
    }
    if (fireCrackleTimer) {
      clearInterval(fireCrackleTimer);
      fireCrackleTimer = null;
    }
    // 3. Stop ocean waves
    if (waveNode) {
      try { waveNode.stop(0); waveNode.disconnect(); } catch(e){}
      waveNode = null;
    }
    if (waveTimer) {
      clearInterval(waveTimer);
      waveTimer = null;
    }
    // 4. Stop night forest & wind
    if (forestNode) {
      try { forestNode.stop(0); forestNode.disconnect(); } catch(e){}
      forestNode = null;
    }
    if (forestTimer) {
      clearInterval(forestTimer);
      forestTimer = null;
    }
    // 5. Stop classical sequencers
    if (seqTimer) {
      clearInterval(seqTimer);
      seqTimer = null;
    }
    // 6. Stop HTML5 audio element
    if (audioElem) {
      try { audioElem.pause(); audioElem.currentTime = 0; } catch(e){}
    }
    // 7. Suspend audio context
    if (gainNode && audioCtx) {
      try {
        gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      } catch(e){}
    }
    if (audioCtx && audioCtx.state === 'running') {
      try { audioCtx.suspend(); } catch(e){}
    }
  }

  // --- 1. Yağmur (Pink Noise) ---
  function initRain() {
    var ctx = getAudioContext();
    var master = getMasterGain();
    if (!ctx || !master) return;

    var bufferSize = ctx.sampleRate * 2;
    var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var output = noiseBuffer.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    var whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(750, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(master);
    whiteNoise.start(0);
    rainNode = whiteNoise;
  }

  // --- 2. Çıtırdayan Şömine ---
  function initFireplace() {
    var ctx = getAudioContext();
    var master = getMasterGain();
    if (!ctx || !master) return;

    var bufferSize = ctx.sampleRate * 2;
    var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var output = noiseBuffer.getChannelData(0);
    var lastOut = 0.0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 1.8;
    }

    var fireBase = ctx.createBufferSource();
    fireBase.buffer = noiseBuffer;
    fireBase.loop = true;

    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, ctx.currentTime);

    fireBase.connect(filter);
    filter.connect(master);
    fireBase.start(0);
    fireNode = fireBase;

    fireCrackleTimer = setInterval(function(){
      if (!isPlaying || curTrack !== 'fire') return;
      var count = Math.floor(Math.random() * 3) + 1;
      for (var k = 0; k < count; k++) {
        var delay = Math.random() * 280;
        setTimeout(function(){
          if (!isPlaying || curTrack !== 'fire' || !audioCtx) return;
          try {
            var osc = audioCtx.createOscillator();
            var g = audioCtx.createGain();
            var bp = audioCtx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 1800 + Math.random() * 1600;
            bp.Q.value = 4.0;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300 + Math.random() * 800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.035);

            var popVol = (0.15 + Math.random() * 0.35) * (volume * 0.8);
            g.gain.setValueAtTime(popVol, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.035);

            osc.connect(bp);
            bp.connect(g);
            g.connect(master);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.04);
          } catch(e){}
        }, delay);
      }
    }, 280);
  }

  // --- Piyano Notaları & Akor Sentezleyici ---
  function playPianoNote(freq, startTime, duration, velocity, harmonic) {
    var ctx = getAudioContext();
    var master = getMasterGain();
    if (!ctx || !master) return;

    try {
      var osc1 = ctx.createOscillator();
      var osc2 = ctx.createOscillator();
      var noteGain = ctx.createGain();
      var filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(3200, freq * 3.5), startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.max(200, freq * 1.2), startTime + duration);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      osc2.type = harmonic ? 'triangle' : 'sine';
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      var vel = (velocity || 0.4) * volume;
      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.linearRampToValueAtTime(vel, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(vel * 0.45, startTime + 0.3);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(master);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.05);
      osc2.stop(startTime + duration + 0.05);
    } catch(e){}
  }

  // --- 3. Erik Satie — Gymnopédie No.1 ---
  function initSatie() {
    var ctx = getAudioContext();
    if (!ctx) return;

    var step = 0;
    var bpm = 46;
    var beatSec = 60 / bpm; // ~1.3s per beat

    function scheduleSatieBar() {
      if (!isPlaying || curTrack !== 'satie') return;
      var now = ctx.currentTime + 0.05;
      var bar = step % 8;

      if (bar === 0 || bar === 2 || bar === 4 || bar === 6) {
        // Gmaj7 measure: Bass G2, chord B3, D4, F#4
        playPianoNote(98.0, now, beatSec * 2.8, 0.42, true); // G2
        playPianoNote(246.9, now + beatSec, beatSec * 1.8, 0.28, false); // B3
        playPianoNote(293.7, now + beatSec, beatSec * 1.8, 0.28, false); // D4
        playPianoNote(369.99, now + beatSec, beatSec * 1.8, 0.32, true); // F#4

        playPianoNote(246.9, now + beatSec * 2, beatSec * 1.4, 0.22, false);
        playPianoNote(293.7, now + beatSec * 2, beatSec * 1.4, 0.22, false);
        playPianoNote(369.99, now + beatSec * 2, beatSec * 1.4, 0.25, true);

        if (bar === 2) {
          playPianoNote(369.99, now + beatSec * 0.5, beatSec * 2.2, 0.38, true); // Melody F#4
        } else if (bar === 6) {
          playPianoNote(440.0, now + beatSec * 0.5, beatSec * 2.2, 0.38, true); // Melody A4
        }
      } else {
        // Dmaj7 measure: Bass D2, chord F#3, A3, C#4
        playPianoNote(73.42, now, beatSec * 2.8, 0.40, true); // D2
        playPianoNote(185.0, now + beatSec, beatSec * 1.8, 0.26, false); // F#3
        playPianoNote(220.0, now + beatSec, beatSec * 1.8, 0.26, false); // A3
        playPianoNote(277.18, now + beatSec, beatSec * 1.8, 0.30, true); // C#4

        playPianoNote(185.0, now + beatSec * 2, beatSec * 1.4, 0.20, false);
        playPianoNote(220.0, now + beatSec * 2, beatSec * 1.4, 0.20, false);
        playPianoNote(277.18, now + beatSec * 2, beatSec * 1.4, 0.24, true);

        if (bar === 3) {
          playPianoNote(329.63, now + beatSec * 0.5, beatSec * 2.2, 0.35, true); // Melody E4
        } else if (bar === 7) {
          playPianoNote(293.66, now + beatSec * 0.5, beatSec * 2.5, 0.35, true); // Melody D4
        }
      }
      step++;
    }

    scheduleSatieBar();
    seqTimer = setInterval(scheduleSatieBar, (beatSec * 3) * 1000);
  }

  // --- 4. F. Chopin — Nocturne Op.9 No.2 ---
  function initChopin() {
    var ctx = getAudioContext();
    if (!ctx) return;

    var step = 0;
    var beatSec = 1.05;

    function scheduleChopinBar() {
      if (!isPlaying || curTrack !== 'chopin') return;
      var now = ctx.currentTime + 0.05;
      var bar = step % 6;

      if (bar === 0 || bar === 3) {
        // Eb Major: Bass Eb2, chords G3-Bb3-Eb4
        playPianoNote(77.78, now, beatSec * 2.8, 0.42, true); // Eb2
        playPianoNote(196.0, now + beatSec * 0.9, beatSec * 1.5, 0.26, false); // G3
        playPianoNote(233.08, now + beatSec * 0.9, beatSec * 1.5, 0.26, false); // Bb3
        playPianoNote(311.13, now + beatSec * 0.9, beatSec * 1.5, 0.28, true); // Eb4

        // Famous opening melody: Bb4 -> G4 -> F4 -> Eb4
        playPianoNote(466.16, now + beatSec * 0.2, beatSec * 1.4, 0.40, true); // Bb4
        playPianoNote(392.00, now + beatSec * 1.6, beatSec * 1.2, 0.36, true); // G4
      } else if (bar === 1 || bar === 4) {
        // Ab / Fm chord flow
        playPianoNote(103.83, now, beatSec * 2.8, 0.38, true); // Ab2
        playPianoNote(207.65, now + beatSec * 0.9, beatSec * 1.5, 0.25, false); // Ab3
        playPianoNote(261.63, now + beatSec * 0.9, beatSec * 1.5, 0.25, false); // C4
        playPianoNote(311.13, now + beatSec * 0.9, beatSec * 1.5, 0.28, true); // Eb4

        playPianoNote(349.23, now + beatSec * 0.2, beatSec * 1.3, 0.35, true); // F4
        playPianoNote(311.13, now + beatSec * 1.5, beatSec * 1.4, 0.36, true); // Eb4
      } else {
        // Bb7 Dominant resolution
        playPianoNote(116.54, now, beatSec * 2.8, 0.40, true); // Bb2
        playPianoNote(233.08, now + beatSec * 0.9, beatSec * 1.5, 0.25, false); // Bb3
        playPianoNote(293.66, now + beatSec * 0.9, beatSec * 1.5, 0.25, false); // D4
        playPianoNote(349.23, now + beatSec * 0.9, beatSec * 1.5, 0.27, true); // F4

        playPianoNote(392.00, now + beatSec * 0.2, beatSec * 1.2, 0.34, true); // G4
        playPianoNote(466.16, now + beatSec * 1.4, beatSec * 1.5, 0.38, true); // Bb4
      }
      step++;
    }

    scheduleChopinBar();
    seqTimer = setInterval(scheduleChopinBar, (beatSec * 3) * 1000);
  }

  // --- 5. P. I. Çaykovski — Autumn Song ---
  function initTchaikovsky() {
    var ctx = getAudioContext();
    if (!ctx) return;

    var step = 0;
    var beatSec = 1.15;

    function scheduleTchaikovskyBar() {
      if (!isPlaying || curTrack !== 'tchaikovsky') return;
      var now = ctx.currentTime + 0.05;
      var bar = step % 6;

      if (bar === 0 || bar === 3) {
        // D minor arpeggio
        playPianoNote(73.42, now, beatSec * 3.0, 0.42, true); // D2
        playPianoNote(220.0, now + beatSec * 0.6, beatSec * 1.8, 0.28, false); // A3
        playPianoNote(293.66, now + beatSec * 1.2, beatSec * 1.8, 0.30, false); // D4
        playPianoNote(349.23, now + beatSec * 1.8, beatSec * 2.0, 0.36, true); // F4
      } else if (bar === 1 || bar === 4) {
        // A7 / C# minor transition
        playPianoNote(110.0, now, beatSec * 3.0, 0.38, true); // A2
        playPianoNote(220.0, now + beatSec * 0.6, beatSec * 1.8, 0.26, false); // A3
        playPianoNote(277.18, now + beatSec * 1.2, beatSec * 1.8, 0.28, false); // C#4
        playPianoNote(329.63, now + beatSec * 1.8, beatSec * 2.0, 0.34, true); // E4
      } else {
        // Resolution to D minor
        playPianoNote(73.42, now, beatSec * 3.0, 0.40, true); // D2
        playPianoNote(174.61, now + beatSec * 0.6, beatSec * 1.8, 0.28, false); // F3
        playPianoNote(220.0, now + beatSec * 1.2, beatSec * 1.8, 0.28, false); // A3
        playPianoNote(293.66, now + beatSec * 1.8, beatSec * 2.4, 0.36, true); // D4
      }
      step++;
    }

    scheduleTchaikovskyBar();
    seqTimer = setInterval(scheduleTchaikovskyBar, (beatSec * 2.6) * 1000);
  }

  // --- 6. L. v. Beethoven — Moonlight Sonata (Op. 27 No. 2) ---
  function initBeethoven() {
    var ctx = getAudioContext();
    if (!ctx) return;

    var step = 0;
    var tempo = 52;
    var beatSec = 60 / tempo;

    function scheduleBeethovenBar() {
      if (!isPlaying || curTrack !== 'beethoven') return;
      var now = ctx.currentTime + 0.05;
      var bar = step % 6;
      var trip = beatSec / 3;

      if (bar === 0 || bar === 1) {
        // C# minor: Bass C#2, triplets G#3 -> C#4 -> E4
        playPianoNote(65.41, now, beatSec * 3.8, 0.45, true);
        playPianoNote(130.81, now, beatSec * 3.8, 0.35, false);

        for (var i = 0; i < 4; i++) {
          var t = now + (i * beatSec);
          playPianoNote(207.65, t, trip * 1.5, 0.22, false);
          playPianoNote(277.18, t + trip, trip * 1.5, 0.24, false);
          playPianoNote(329.63, t + trip * 2, trip * 1.5, 0.26, true);
        }
      } else if (bar === 2) {
        // B bass: B1, triplets G#3 -> D4 -> E4
        playPianoNote(61.74, now, beatSec * 3.8, 0.42, true);
        playPianoNote(123.47, now, beatSec * 3.8, 0.32, false);

        for (var i = 0; i < 4; i++) {
          var t = now + (i * beatSec);
          playPianoNote(207.65, t, trip * 1.5, 0.22, false);
          playPianoNote(293.66, t + trip, trip * 1.5, 0.24, false);
          playPianoNote(329.63, t + trip * 2, trip * 1.5, 0.26, true);
        }
      } else if (bar === 3) {
        // A bass: A1, triplets A3 -> C#4 -> E4
        playPianoNote(55.00, now, beatSec * 3.8, 0.40, true);
        playPianoNote(110.00, now, beatSec * 3.8, 0.30, false);

        for (var i = 0; i < 4; i++) {
          var t = now + (i * beatSec);
          playPianoNote(220.00, t, trip * 1.5, 0.22, false);
          playPianoNote(277.18, t + trip, trip * 1.5, 0.24, false);
          playPianoNote(329.63, t + trip * 2, trip * 1.5, 0.26, true);
        }
      } else if (bar === 4) {
        // G# bass: G#1, triplets G#3 -> C4 -> D#4
        playPianoNote(51.91, now, beatSec * 3.8, 0.42, true);
        playPianoNote(103.83, now, beatSec * 3.8, 0.32, false);

        for (var i = 0; i < 4; i++) {
          var t = now + (i * beatSec);
          playPianoNote(207.65, t, trip * 1.5, 0.22, false);
          playPianoNote(261.63, t + trip, trip * 1.5, 0.24, false);
          playPianoNote(311.13, t + trip * 2, trip * 1.5, 0.26, true);
        }
      } else {
        // C# minor resolution with melody G#4
        playPianoNote(65.41, now, beatSec * 3.8, 0.45, true);
        for (var i = 0; i < 4; i++) {
          var t = now + (i * beatSec);
          playPianoNote(207.65, t, trip * 1.5, 0.22, false);
          playPianoNote(277.18, t + trip, trip * 1.5, 0.24, false);
          playPianoNote(329.63, t + trip * 2, trip * 1.5, 0.26, true);
        }
        playPianoNote(415.30, now + beatSec * 1.5, beatSec * 2.2, 0.38, true);
      }
      step++;
    }

    scheduleBeethovenBar();
    seqTimer = setInterval(scheduleBeethovenBar, (beatSec * 4) * 1000);
  }

  // --- 7. Claude Debussy — Clair de Lune ---
  function initDebussy() {
    var ctx = getAudioContext();
    if (!ctx) return;

    var step = 0;
    var beatSec = 1.25;

    function scheduleDebussyBar() {
      if (!isPlaying || curTrack !== 'debussy') return;
      var now = ctx.currentTime + 0.05;
      var bar = step % 6;

      if (bar === 0 || bar === 3) {
        // Db Major dreamy opening
        playPianoNote(69.30, now, beatSec * 3.5, 0.38, true);
        playPianoNote(138.59, now + beatSec * 0.4, beatSec * 2.5, 0.26, false);
        playPianoNote(174.61, now + beatSec * 0.8, beatSec * 2.2, 0.26, false);
        playPianoNote(207.65, now + beatSec * 1.2, beatSec * 2.0, 0.28, true);

        playPianoNote(349.23, now + beatSec * 0.5, beatSec * 1.6, 0.36, true);
        playPianoNote(311.13, now + beatSec * 1.8, beatSec * 1.8, 0.34, true);
      } else if (bar === 1 || bar === 4) {
        // Bbm chord transition
        playPianoNote(58.27, now, beatSec * 3.5, 0.36, true);
        playPianoNote(174.61, now + beatSec * 0.4, beatSec * 2.2, 0.24, false);
        playPianoNote(233.08, now + beatSec * 0.8, beatSec * 2.0, 0.26, false);
        playPianoNote(277.18, now + beatSec * 1.2, beatSec * 2.0, 0.28, true);

        playPianoNote(277.18, now + beatSec * 0.5, beatSec * 1.5, 0.34, true);
        playPianoNote(261.63, now + beatSec * 1.8, beatSec * 1.8, 0.32, true);
      } else if (bar === 2) {
        // Gb major arpeggiation
        playPianoNote(92.50, now, beatSec * 3.5, 0.36, true);
        playPianoNote(185.00, now + beatSec * 0.4, beatSec * 2.2, 0.25, false);
        playPianoNote(233.08, now + beatSec * 0.8, beatSec * 2.0, 0.26, false);
        playPianoNote(349.23, now + beatSec * 1.2, beatSec * 2.0, 0.32, true);

        playPianoNote(415.30, now + beatSec * 0.6, beatSec * 2.4, 0.36, true);
      } else {
        // Resolution to Ab7 -> Db
        playPianoNote(51.91, now, beatSec * 3.5, 0.38, true);
        playPianoNote(207.65, now + beatSec * 0.4, beatSec * 2.2, 0.25, false);
        playPianoNote(261.63, now + beatSec * 0.8, beatSec * 2.0, 0.26, false);
        playPianoNote(311.13, now + beatSec * 1.2, beatSec * 2.0, 0.28, true);

        playPianoNote(277.18, now + beatSec * 1.6, beatSec * 2.2, 0.35, true);
      }
      step++;
    }

    scheduleDebussyBar();
    seqTimer = setInterval(scheduleDebussyBar, (beatSec * 3) * 1000);
  }

  // --- 8. J. S. Bach — Cello Suite No. 1 (Prelude in G Major) ---
  function initBach() {
    var ctx = getAudioContext();
    if (!ctx) return;

    var step = 0;
    var noteSec = 0.29;

    function scheduleBachBar() {
      if (!isPlaying || curTrack !== 'bach') return;
      var now = ctx.currentTime + 0.05;
      var bar = step % 6;

      var pattern = [];
      if (bar === 0 || bar === 3) {
        pattern = [98.00, 146.83, 246.94, 220.00, 246.94, 146.83, 246.94, 146.83, 98.00, 146.83, 246.94, 220.00, 246.94, 146.83, 246.94, 146.83];
      } else if (bar === 1) {
        pattern = [98.00, 164.81, 261.63, 246.94, 261.63, 164.81, 261.63, 164.81, 98.00, 164.81, 261.63, 246.94, 261.63, 164.81, 261.63, 164.81];
      } else if (bar === 2) {
        pattern = [98.00, 185.00, 261.63, 246.94, 261.63, 185.00, 261.63, 185.00, 98.00, 185.00, 261.63, 246.94, 261.63, 185.00, 261.63, 185.00];
      } else if (bar === 4) {
        pattern = [98.00, 164.81, 246.94, 220.00, 246.94, 196.00, 246.94, 146.83, 98.00, 164.81, 246.94, 220.00, 246.94, 196.00, 246.94, 146.83];
      } else {
        pattern = [98.00, 146.83, 246.94, 220.00, 246.94, 146.83, 246.94, 98.00, 98.00, 146.83, 246.94, 220.00, 246.94, 146.83, 196.00, 98.00];
      }

      for (var i = 0; i < pattern.length; i++) {
        var t = now + (i * noteSec);
        var vel = (i % 8 === 0) ? 0.38 : (i % 4 === 0 ? 0.30 : 0.24);
        playPianoNote(pattern[i], t, noteSec * 1.35, vel, true);
      }
      step++;
    }

    scheduleBachBar();
    seqTimer = setInterval(scheduleBachBar, (noteSec * 16) * 1000);
  }

  // --- 9. Okyanus Dalgaları & Gece Kıyısı (Deep Ocean Waves) ---
  function initOceanWaves() {
    var ctx = getAudioContext();
    var master = getMasterGain();
    if (!ctx || !master) return;

    var bufferSize = ctx.sampleRate * 3;
    var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var output = noiseBuffer.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.06;
      b1 = 0.95 * b1 + white * 0.12;
      b2 = 0.85 * b2 + white * 0.25;
      output[i] = (b0 + b1 + b2) * 0.28;
    }

    var waveSource = ctx.createBufferSource();
    waveSource.buffer = noiseBuffer;
    waveSource.loop = true;

    var waveGain = ctx.createGain();
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, ctx.currentTime);
    filter.Q.value = 1.8;

    waveGain.gain.setValueAtTime(0.02 * volume, ctx.currentTime);

    waveSource.connect(filter);
    filter.connect(waveGain);
    waveGain.connect(master);
    waveSource.start(0);
    waveNode = waveSource;

    var wavePeriod = 7.2;
    function triggerWaveCycle() {
      if (!isPlaying || curTrack !== 'waves') return;
      var now = ctx.currentTime;
      var peakTime = now + 3.2;
      var settleTime = now + wavePeriod;

      waveGain.gain.cancelScheduledValues(now);
      waveGain.gain.setValueAtTime(waveGain.gain.value, now);
      waveGain.gain.linearRampToValueAtTime(0.48 * volume, peakTime);
      waveGain.gain.exponentialRampToValueAtTime(0.02 * volume, settleTime);

      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(750, peakTime);
      filter.frequency.exponentialRampToValueAtTime(200, settleTime);
    }

    triggerWaveCycle();
    waveTimer = setInterval(triggerWaveCycle, wavePeriod * 1000);
  }

  // --- 10. Fısıldayan Gece Ormanı & Rüzgâr (Whispering Forest & Wind) ---
  function initNightForest() {
    var ctx = getAudioContext();
    var master = getMasterGain();
    if (!ctx || !master) return;

    var bufferSize = ctx.sampleRate * 2.5;
    var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var output = noiseBuffer.getChannelData(0);
    var last = 0.0;
    for (var i = 0; i < bufferSize; i++) {
      var white = Math.random() * 2 - 1;
      last = (last + 0.03 * white) / 1.03;
      output[i] = last * 1.8;
    }

    var windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    var filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.Q.value = 2.2;

    var windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.35 * volume, ctx.currentTime);

    windSource.connect(filter);
    filter.connect(windGain);
    windGain.connect(master);
    windSource.start(0);
    forestNode = windSource;

    var windCycleSec = 4.8;
    forestTimer = setInterval(function(){
      if (!isPlaying || curTrack !== 'forest') return;
      var now = ctx.currentTime;
      var targetFreq = 220 + Math.random() * 260;
      filter.frequency.cancelScheduledValues(now);
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(targetFreq, now + windCycleSec * 0.8);

      if (Math.random() > 0.35) {
        var chimeFreqs = [1046.50, 1318.51, 1567.98, 1760.00];
        var cf = chimeFreqs[Math.floor(Math.random() * chimeFreqs.length)];
        var chimeOsc = ctx.createOscillator();
        var chimeGain = ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(cf, now + 0.5);

        chimeGain.gain.setValueAtTime(0.0001, now + 0.5);
        chimeGain.gain.linearRampToValueAtTime(0.06 * volume, now + 0.55);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(master);
        chimeOsc.start(now + 0.5);
        chimeOsc.stop(now + 2.6);
      }
    }, windCycleSec * 1000);
  }

  function play() {
    isPlaying = true;
    stopAllAudio();
    var ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
    getMasterGain();

    if (curTrack === 'rain') {
      initRain();
    } else if (curTrack === 'fire') {
      initFireplace();
    } else if (curTrack === 'waves') {
      initOceanWaves();
    } else if (curTrack === 'forest') {
      initNightForest();
    } else if (curTrack === 'satie') {
      initSatie();
    } else if (curTrack === 'chopin') {
      initChopin();
    } else if (curTrack === 'beethoven') {
      initBeethoven();
    } else if (curTrack === 'debussy') {
      initDebussy();
    } else if (curTrack === 'tchaikovsky') {
      initTchaikovsky();
    } else if (curTrack === 'bach') {
      initBach();
    }
    updateUI();
  }

  function pause() {
    isPlaying = false;
    stopAllAudio();
    updateUI();
  }

  function toggle() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function setTrack(t) {
    if (curTrack === t) {
      toggle();
      return;
    }
    curTrack = t;
    if (isPlaying) {
      play();
    } else {
      updateUI();
    }
  }

  function setVolume(v) {
    volume = parseFloat(v);
    if (gainNode && audioCtx) {
      gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      gainNode.gain.setValueAtTime(volume * 0.75, audioCtx.currentTime);
    }
    var volPct = document.getElementById('audio-vol-pct');
    if (volPct) volPct.textContent = Math.round(volume * 100) + '%';
  }

  function updateUI() {
    var fab = document.getElementById('audio-fab');
    var btn = document.getElementById('audio-play-btn');
    var label = document.getElementById('audio-fab-label');
    var quickBtn = document.getElementById('audio-fab-quick');
    var readerMusicBtn = document.getElementById('reader-music-btn');

    if (fab) fab.classList.toggle('playing', isPlaying);
    if (btn) btn.textContent = isPlaying ? '⏹ Müziği Durdur' : '▶ Müziği Başlat';
    if (quickBtn) quickBtn.textContent = isPlaying ? '⏸' : '▶';
    if (readerMusicBtn) {
      readerMusicBtn.innerHTML = isPlaying ? '🎵 Müziği Durdur' : '🎵 Müzik Başlat';
      readerMusicBtn.classList.toggle('active', isPlaying);
    }
    if (label) {
      label.textContent = isPlaying ? (trackNames[curTrack] || 'Müzik Çalıyor') : 'Okuma Müziği';
    }

    var items = document.querySelectorAll('.audio-track-item');
    items.forEach(function(el){
      var t = el.getAttribute('data-track');
      var isCurrent = (t === curTrack);
      el.classList.toggle('active', isCurrent);
      var st = el.querySelector('.track-state');
      if (st) {
        if (isCurrent && isPlaying) {
          st.textContent = '⏸ Çalıyor';
          st.style.color = 'var(--accent)';
          st.style.fontWeight = 'bold';
        } else {
          st.textContent = '▶';
          st.style.color = 'inherit';
          st.style.fontWeight = 'normal';
        }
      }
    });
  }

  return {
    play: play,
    pause: pause,
    toggle: toggle,
    setTrack: setTrack,
    setVolume: setVolume,
    getTrack: function(){ return curTrack; },
    isPlaying: function(){ return isPlaying; },
    getVolume: function(){ return volume; },
    updateUI: updateUI
  };
})();

var audioPanelOpen = false;

function audioWidgetHTML() {
  var isPlaying = soundManager.isPlaying();
  var track = soundManager.getTrack();
  var vol = soundManager.getVolume();
  var trackNames = {
    rain: '🌧️ Yağmur Ambiyansı',
    fire: '🔥 Çıtırdayan Şömine',
    waves: '🌊 Okyanus Dalgaları',
    forest: '🌲 Gece Ormanı & Rüzgâr',
    satie: '🎹 Erik Satie',
    chopin: '🎼 Chopin Nocturne',
    beethoven: '🌕 Beethoven Moonlight',
    debussy: '🌙 Debussy Clair de Lune',
    tchaikovsky: '🍂 Çaykovski',
    bach: '🎻 J. S. Bach Cello'
  };
  var curLabel = isPlaying ? (trackNames[track] || 'Müzik Çalıyor') : 'Okuma Müziği';

  return '<div class="audio-fab' + (isPlaying ? ' playing' : '') + '" id="audio-fab" data-a="toggle-audio-panel" title="Odaklanma & Okuma Müziği">'
    + '<span class="audio-fab-icon">🎵</span>'
    + '<span id="audio-fab-label">' + esc(curLabel) + '</span>'
    + '<button class="btn small" id="audio-fab-quick" data-a="toggle-play" style="padding:2px 8px;font-size:.78rem;margin-left:6px" title="Hızlı Başlat / Durdur">' + (isPlaying ? '⏸' : '▶') + '</button>'
    + '</div>'
    + '<div class="audio-panel' + (audioPanelOpen ? ' open' : '') + '" id="audio-panel">'
    + '<div class="audio-panel-hdr">'
    + '<h4 class="audio-panel-title">🎧 Odaklanma & Okuma Müziği (10 Parça)</h4>'
    + '<button class="audio-panel-close" data-a="toggle-audio-panel" title="Kapat">✕</button>'
    + '</div>'
    + '<div class="audio-tracks">'
    + '<div class="audio-track-item' + (track === 'rain' ? ' active' : '') + '" data-a="play-track" data-track="rain"><span>🌧️ Yağmur Ambiyansı (Pink Noise)</span><span class="track-state">' + (track === 'rain' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'fire' ? ' active' : '') + '" data-a="play-track" data-track="fire"><span>🔥 Çıtırdayan Şömine (Warm Fire)</span><span class="track-state">' + (track === 'fire' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'waves' ? ' active' : '') + '" data-a="play-track" data-track="waves"><span>🌊 Okyanus Dalgaları & Kıyı (Deep Waves)</span><span class="track-state">' + (track === 'waves' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'forest' ? ' active' : '') + '" data-a="play-track" data-track="forest"><span>🌲 Gece Ormanı & Rüzgâr (Whispering Forest)</span><span class="track-state">' + (track === 'forest' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'satie' ? ' active' : '') + '" data-a="play-track" data-track="satie"><span>🎹 Erik Satie — Gymnopédie No.1</span><span class="track-state">' + (track === 'satie' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'chopin' ? ' active' : '') + '" data-a="play-track" data-track="chopin"><span>🎼 F. Chopin — Nocturne Op.9 No.2</span><span class="track-state">' + (track === 'chopin' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'beethoven' ? ' active' : '') + '" data-a="play-track" data-track="beethoven"><span>🌕 L. v. Beethoven — Moonlight Sonata</span><span class="track-state">' + (track === 'beethoven' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'debussy' ? ' active' : '') + '" data-a="play-track" data-track="debussy"><span>🌙 Claude Debussy — Clair de Lune</span><span class="track-state">' + (track === 'debussy' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'tchaikovsky' ? ' active' : '') + '" data-a="play-track" data-track="tchaikovsky"><span>🍂 P. I. Çaykovski — Autumn Song</span><span class="track-state">' + (track === 'tchaikovsky' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '<div class="audio-track-item' + (track === 'bach' ? ' active' : '') + '" data-a="play-track" data-track="bach"><span>🎻 J. S. Bach — Cello Suite No.1 (Prelude)</span><span class="track-state">' + (track === 'bach' && isPlaying ? '⏸ Çalıyor' : '▶') + '</span></div>'
    + '</div>'
    + '<div class="audio-controls-row">'
    + '<button class="btn small" id="audio-play-btn" data-a="toggle-play">' + (isPlaying ? '⏹ Müziği Durdur' : '▶ Müziği Başlat') + '</button>'
    + '<div style="display:flex;align-items:center;gap:6px;flex:1;justify-content:flex-end">'
    + '<span style="font-size:.8rem;color:var(--ink-soft)">Ses:</span>'
    + '<input type="range" class="audio-vol-slider" id="audio-vol" min="0" max="1" step="0.05" value="' + vol + '" style="max-width:90px">'
    + '<span id="audio-vol-pct" style="font-size:.76rem;color:var(--ink-soft);min-width:28px">' + Math.round(vol * 100) + '%</span>'
    + '</div>'
    + '</div>'
    + '</div>';
}

// 7. Dahili Odak Modu / Kitap Okuyucu
var readerState = {
  theme: 'sepia',
  fontSize: 18,
  activeBookId: null
};

function openReaderMode(bookId) {
  var b = S.books.filter(function(x){ return x.id === bookId; })[0];
  if (!b) {
    toast('Kitap bilgisi bulunamadı.');
    return;
  }
  readerState.activeBookId = bookId;
  
  var el = document.getElementById('global-reader-modal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'global-reader-modal';
    el.className = 'reader-modal';
    document.body.appendChild(el);
  }

  var contentHTML = '';
  var hasTranscript = b.transcript && b.transcript.trim();

  if (hasTranscript) {
    var rawText = b.transcript.trim();
    contentHTML = rawText.split(/\n{2,}/).map(function(par){
      par = par.trim();
      if (!par) return '';
      if (par.indexOf('## ') === 0) {
        return '<h3 style="font-family:var(--serif);font-size:1.45rem;margin:36px 0 16px;color:var(--accent);border-bottom:1px solid rgba(120,120,120,.2);padding-bottom:8px">' + esc(par.slice(3)) + '</h3>';
      }
      var m = par.match(/^\[?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?\s+([\s\S]*)$/);
      var text = m ? m[2] : par;
      return '<p style="margin-bottom:1.5em;line-height:1.95;text-align:justify">' + esc(text).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  } else {
    var ep = safeUrl(b.epub) || ((b.epub && !/^(javascript|data):/i.test(b.epub.trim())) ? b.epub.trim() : '');
    var pd = safeUrl(b.pdf) || ((b.pdf && !/^(javascript|data):/i.test(b.pdf.trim())) ? b.pdf.trim() : '');
    var chars = getCharacterGuide(b.id);
    var bookQuotes = getQuotes().filter(function(q){
      return (q.book && q.book.toLowerCase() === b.title.toLowerCase()) || (q.author && q.author.toLowerCase() === b.author.toLowerCase());
    }).slice(0, 3);

    var charsHTML = '';
    if (chars && chars.length) {
      charsHTML = '<div style="margin:28px 0"><h3 style="font-family:var(--serif);font-size:1.3rem;margin-bottom:14px">🎭 Eserin Başlıca Karakterleri</h3>'
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">'
        + chars.map(function(c){
            return '<div style="background:rgba(120,120,120,.08);border:1px solid rgba(120,120,120,.2);border-radius:12px;padding:14px;border-left:3px solid var(--accent)">'
              + '<b style="font-size:1rem;color:inherit">' + esc(c.name) + '</b>'
              + '<div style="font-size:.76rem;color:var(--accent);font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">' + esc(c.role) + '</div>'
              + '<p style="font-size:.88rem;opacity:.8;margin:0;line-height:1.55">' + esc(c.desc) + '</p>'
              + '</div>';
          }).join('')
        + '</div></div>';
    }

    var quotesHTML = '';
    if (bookQuotes.length) {
      quotesHTML = '<div style="margin:28px 0"><h3 style="font-family:var(--serif);font-size:1.3rem;margin-bottom:14px">📜 Eserden Seçme Alıntılar</h3>'
        + bookQuotes.map(function(q){
            return '<blockquote style="background:rgba(120,120,120,.08);border-left:3px solid var(--gold);margin:0 0 12px;padding:14px 18px;border-radius:0 10px 10px 0;font-style:italic">'
              + '“' + esc(q.text) + '”'
              + (q.page ? '<span style="display:block;font-size:.8rem;font-style:normal;opacity:.7;margin-top:6px">Sayfa: ' + esc(q.page) + '</span>' : '')
              + '</blockquote>';
          }).join('')
        + '</div>';
    }

    var dlHTML = '';
    if (ep || pd) {
      dlHTML = '<div style="background:rgba(120,120,120,.08);border:1px solid rgba(120,120,120,.2);border-radius:16px;padding:22px;margin:28px 0;text-align:center">'
        + '<h4 style="font-family:var(--serif);font-size:1.2rem;margin:0 0 8px">📖 Tam Metin E-Kitap Dosyaları</h4>'
        + '<p style="font-size:.92rem;opacity:.8;margin-bottom:18px">Eserin orijinal tam metnini cihazınıza indirerek okuyucu uygulamanızda kesintisiz okuyabilirsiniz:</p>'
        + '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">'
        + (ep ? '<a class="btn small" href="' + esc(ep) + '" target="_blank" rel="noopener" download>⬇ EPUB İndir & Oku</a>' : '')
        + (pd ? '<a class="btn small ghost" href="' + esc(pd) + '" target="_blank" rel="noopener" download>⬇ PDF İndir & Oku</a>' : '')
        + '</div>'
        + '</div>';
    }

    contentHTML = '<div class="reader-dossier">'
      + '<div style="background:rgba(120,120,120,.08);border-left:4px solid var(--accent);border-radius:12px;padding:20px 24px;margin-bottom:28px">'
      + '<h3 style="font-family:var(--serif);font-size:1.25rem;margin:0 0 8px;color:inherit">📚 Eser İncelemesi & Özeti</h3>'
      + '<p style="line-height:1.9;font-size:1.05rem;margin:0;opacity:.95">' + esc(b.summary || 'Bu eser hakkında özet bilgi hazırlanıyor.') + '</p>'
      + '</div>'
      + dlHTML
      + charsHTML
      + quotesHTML
      + '</div>';
  }

  el.className = 'reader-modal open theme-' + readerState.theme;
  document.body.style.overflow = 'hidden';

  el.innerHTML = '<div class="reader-top-bar">'
    + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
    + '<button class="reader-ctrl-btn" data-a="close-reader" title="Odak Modunu Kapat (ESC)">✕ Kapat</button>'
    + '<span style="font-family:var(--serif);font-weight:700;font-size:1.05rem">' + esc(b.title) + '</span>'
    + '<span style="opacity:.65;font-size:.85rem">— ' + esc(b.author) + '</span>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
    + '<button class="reader-ctrl-btn" id="reader-music-btn" data-a="toggle-play" title="Okuma Müziği">' + (soundManager.isPlaying() ? '🎵 Müziği Durdur' : '🎵 Müzik Başlat') + '</button>'
    + '<button class="reader-ctrl-btn' + (readerState.theme==='sepia'?' active':'') + '" data-a="reader-theme" data-v="sepia" title="Parşömen">📜 Parşömen</button>'
    + '<button class="reader-ctrl-btn' + (readerState.theme==='light'?' active':'') + '" data-a="reader-theme" data-v="light" title="Açık Tema">☀️ Açık</button>'
    + '<button class="reader-ctrl-btn' + (readerState.theme==='dark'?' active':'') + '" data-a="reader-theme" data-v="dark" title="Koyu Gri Gece Teması">🌙 Gece</button>'
    + '<button class="reader-ctrl-btn" data-a="reader-fs" data-d="-1" title="Yazıyı Küçült">A−</button>'
    + '<button class="reader-ctrl-btn" data-a="reader-fs" data-d="1" title="Yazıyı Büyüt">A+</button>'
    + '</div>'
    + '<button class="reader-ctrl-btn" data-a="open-reader-notes-drawer" title="Bu Kitaptaki Notlar\u0131m">\uD83D\uDCDD Notlar\u0131m</button>'
    + '<div class="reader-progress-track" id="reader-prog-bar"></div>'
    + '</div>'
    + '<article class="reader-article" id="reader-article" style="font-size:' + readerState.fontSize + 'px">'
    + '<h1 style="font-family:var(--serif);font-size:2.3rem;margin-bottom:6px;text-align:center">' + esc(b.title) + '</h1>'
    + '<p style="text-align:center;color:inherit;opacity:.7;font-style:italic;margin-bottom:38px">' + esc(b.author) + (b.year ? ' (' + esc(b.year) + ')' : '') + (b.category ? ' · ' + esc(b.category) : '') + '</p>'
        + contentHTML
    + '</article>'
    + '<div id="reader-hl-toolbar" class="reader-hl-toolbar">'
    + '<button class="reader-hl-btn" data-a="save-reader-hl">🖍️ Çiz & Not Al</button>'
    + '<button class="reader-hl-btn" data-a="card-gen-selected">🖼️ Kart Yap</button>'
    + '<button class="reader-hl-btn" data-a="copy-selected">📋 Kopyala</button>'
    + '</div>'
    + '<div id="reader-notes-drawer" class="reader-notes-drawer">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--line);padding-bottom:10px">'
    + '<h3 style="margin:0;font-size:1.15rem;font-family:var(--serif)">📝 Kitap Notlarım & Pasajlar</h3>'
    + '<button class="quote-del-btn" data-a="close-reader-notes-drawer" style="font-size:1.2rem">✕</button>'
    + '</div>'
    + '<div id="reader-notes-list"></div>'
    + '</div>';

  el.onmouseup = function(ev) {
    setTimeout(function(){
      var sel = window.getSelection();
      var tb = document.getElementById('reader-hl-toolbar');
      if (!tb) return;
      var text = sel ? sel.toString().trim() : '';
      if (!text || text.length < 3) {
        tb.classList.remove('open');
        return;
      }
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      tb.style.top = Math.max(10, rect.top - 46) + 'px';
      tb.style.left = Math.max(10, Math.min(window.innerWidth - 290, rect.left + rect.width / 2 - 120)) + 'px';
      tb.setAttribute('data-selected-text', text);
      tb.classList.add('open');
    }, 20);
  };

  el.onscroll = function() {

    var bar = document.getElementById('reader-prog-bar');
    if (!bar) return;
    var total = el.scrollHeight - el.clientHeight;
    var pct = total > 0 ? (el.scrollTop / total) * 100 : 0;
    bar.style.width = Math.min(100, Math.max(0, pct)) + '%';
  };
}

function closeReaderMode() {
  var el = document.getElementById('global-reader-modal');
  if (el) el.classList.remove('open');
  document.body.style.overflow = '';
}

// 8. Edebiyat Kişilik ve Karakter Testleri (Multiple Literary Quizzes)
var LITERARY_QUIZZES = [
  {
    id: "rus-karakter",
    title: "Hangi Rus Edebiyatı Karakterisiniz?",
    icon: "🎭",
    tag: "Karakter Analizi",
    duration: "3 dk",
    desc: "Gogol'un Palto'sundan Dostoyevski'nin Karamazov Kardeşler'ine uzanan klasik Rus edebiyatının derin ve unutulmaz karakterlerinden hangisinin ruhunu taşıyorsunuz?",
    questions: [
      {
        q: "1. Hayatta haksızlığa uğradığında veya dünya üzerine geldiğinde içindeki ilk tepki ne olur?",
        opts: [
          { text: "A) Sessizce boyun eğer, kendi iç dünyama ve işime sığınırım.", char: "akaki" },
          { text: "B) İçimde derin bir öfke kabarır; adaleti kendi ellerimle sağlama isteği duyarım.", char: "raskolnikov" },
          { text: "C) Karşımdakinin çaresizliğini anlar, kötülüğe merhametle yaklaşırım.", char: "miskin" },
          { text: "D) Dünyanın anlamsızlığını ve tanrısal düzenin çelişkilerini mantıkla sorgularım.", char: "ivan" },
          { text: "E) Duygusallığa yer yok; pratik ve somut bir eylemle sorunu çözerim.", char: "bazarov" }
        ]
      },
      {
        q: "2. Bir kış akşamı Petersburg sokaklarında tek başına yürürken aklından ne geçer?",
        opts: [
          { text: "A) Keşke kimse beni fark etmese, sıcacık odamda huzurla otursam.", char: "akaki" },
          { text: "B) Sıradan insanlar ile dünyayı değiştirecek olağanüstü insanların farkı...", char: "raskolnikov" },
          { text: "C) Dünyada ne kadar çok sevilmeye muhtaç, yaralı insan var...", char: "miskin" },
          { text: "D) Acı çeken masum çocukların hesabını kim verecek?", char: "ivan" },
          { text: "E) Boş düşüncelerle vakit kaybetmek yerine somut bir iş üretmeliyim.", char: "bazarov" }
        ]
      },
      {
        q: "3. İnsanlarla olan ilişkilerinde seni en çok ne yorar?",
        opts: [
          { text: "A) İnsanların kibri, alaycılığı ve kalpsizliği.", char: "akaki" },
          { text: "B) Toplumun ikiyüzlülüğü ve vasatlığın yüceltilmesi.", char: "raskolnikov" },
          { text: "C) İnsanların birbirini anlayamaması ve sevgiden uzaklaşması.", char: "miskin" },
          { text: "D) İnsanların dogmalara körü körüne inanması ve sığlığı.", char: "ivan" },
          { text: "E) Eski geleneklere ve batıl inançlara duyulan anlamsız saygı.", char: "bazarov" }
        ]
      },
      {
        q: "4. Senin için 'özgürlük' kelimesinin gerçek karşılığı nedir?",
        opts: [
          { text: "A) Kendi emeğimle kimseye muhtaç olmadan sade bir ömür sürebilmek.", char: "akaki" },
          { text: "B) Toplumun ahlak sınırlarını aşıp kendi kaderini tayin edebilmek.", char: "raskolnikov" },
          { text: "C) Nefret ve kinden tamamen arınıp sınırsızca sevebilmek.", char: "miskin" },
          { text: "D) Zihnin her türlü inancı ve kuralı özgürce sorgulayabilmesi.", char: "ivan" },
          { text: "E) Hiçbir otoriteyi tanımadan gerçeğin ve bilimin peşinden gitmek.", char: "bazarov" }
        ]
      },
      {
        q: "5. Bir başucu kitabından beklediğin en büyük etki nedir?",
        opts: [
          { text: "A) Sıradan bir insanın görünmeyen dramını kalbime dokundurması.", char: "akaki" },
          { text: "B) Vicdanımı ve zihnimi sarsıp beni uçurumun kenarında yürütmesi.", char: "raskolnikov" },
          { text: "C) İçimi tarifsiz bir şefkatle doldurup gözlerimi yaşartması.", char: "miskin" },
          { text: "D) Felsefi derinliğiyle beynimi zonklatıp varoluşumu sorgulatması.", char: "ivan" },
          { text: "E) Tüm romantik süsleri yıkarak bana yalın gerçekleri göstermesi.", char: "bazarov" }
        ]
      }
    ],
    profiles: {
      akaki: {
        avatar: "🧥",
        name: "Akaki Akakiyeviç",
        book: "Nikolay Gogol — Palto",
        badge: "Edebi Ruh: Akaki Akakiyeviç",
        desc: "Dış dünyanın gürültüsünden ve sahte unvanlarından uzak, kendi emeğinde ve sadeliğinde huzur bulan saf bir ruha sahipsiniz. Kimseyle kavga etmez, içinizde dünyalar kadar derin bir edebi hüzün taşırsınız. 'Hepimiz Gogol'un Palto'sundan çıktık' sözündeki o derin insanlık sizde vücut buluyor."
      },
      raskolnikov: {
        avatar: "⚖️",
        name: "Rodion Raskolnikov",
        book: "F. M. Dostoyevski — Suç ve Ceza",
        badge: "Edebi Ruh: Rodion Raskolnikov",
        desc: "Keskin bir zeka, derin bir adalet tutkusu ve içsel bir isyan... Sıradanlığa tahammülü olmayan, sınırları ve vicdanı en uç noktada sorgulayan trajik bir dâhisiniz. Doğru ile yanlış arasındaki ince çizgide yürümekten asla korkmazsınız."
      },
      miskin: {
        avatar: "🕊️",
        name: "Prens Lev Mışkin",
        book: "F. M. Dostoyevski — Budala",
        badge: "Edebi Ruh: Prens Mışkin",
        desc: "Dünyanın kirliliğinin ve kibrinin lekeleyemediği ermiş bir kalbe sahipsiniz. İnsanları yargılamadan, yaralarıyla kabul edersiniz. 'Güzellik dünyayı kurtaracak' inancının yaşayan temsilcisisiniz; nezaketiniz bu çağın en büyük direnişidir."
      },
      ivan: {
        avatar: "📖",
        name: "İvan Karamazov",
        book: "F. M. Dostoyevski — Karamazov Kardeşler",
        badge: "Edebi Ruh: İvan Karamazov",
        desc: "Sarsılmaz bir mantık, felsefi bir sorgulama gücü ve derin varoluşsal sancılar... Kolay cevaplarla yetinmeyen, adaleti ve insanlığın acısını en yüksek entelektüel dürüstlükle tartan bir düşünürsünüz. Zihninizin ışığı kadar gölgeleri de derindir."
      },
      bazarov: {
        avatar: "🔬",
        name: "Yevgeni Bazarov",
        book: "İvan Turgenyev — Babalar ve Oğullar",
        badge: "Edebi Ruh: Yevgeni Bazarov",
        desc: "Gerçekçi, cesur ve bağımsız. Boş laflar ve romantik süsler yerine somut eyleme ve bilime inanan tutkulu bir reformersiniz. Toplumun yerleşik tabularını yıkmaktan çekinmez, kendi doğrularınızın peşinden tek başınıza bile olsa dimdik yürürsünüz."
      }
    }
  },
  {
    id: "yazar-ikizi",
    title: "Hangi Klasik Yazar Senin Edebi Ruh İkizin?",
    icon: "🖋️",
    tag: "Yazar Eşleşmesi",
    duration: "3 dk",
    desc: "Dostoyevski'nin vicdan fırtınaları mı, Tolstoy'un ahlaki hakikat arayışı mı, Çehov'un hüzünlü tebessümü mü yoksa Kafka'nın varoluşsal labirentleri mi?",
    questions: [
      {
        q: "1. Bir eser yazacak olsaydın, odaklanacağın temel tema ne olurdu?",
        opts: [
          { text: "A) İnsanın içindeki ahlaki yarılmalar, suçluluk ve vicdan azabı.", char: "dostoyevski" },
          { text: "B) Yaşamın büyük anlamı, ölümün kaçınılmazlığı ve doğayla uyumlu sade ahlak.", char: "tolstoy" },
          { text: "C) Günlük hayatın akıp giden sıradan anlarındaki gizli yalnızlık ve ince hüzün.", char: "cehov" },
          { text: "D) Akıl almaz kurallar, görünmeyen otoriteler ve yabancılaşmış bireyin çaresizliği.", char: "kafka" },
          { text: "E) Küçük insanların, memurların trajikomik ve masalsı dünyası.", char: "gogol" }
        ]
      },
      {
        q: "2. Boş bir günde seni zihnen en çok ne dinlendirir?",
        opts: [
          { text: "A) Gece yarısına kadar odama kapanıp insan doğasını ve çelişkilerini düşünmek.", char: "dostoyevski" },
          { text: "B) Doğaya, kırlara çıkıp toprağın ve sadeliğin dinginliğini hissetmek.", char: "tolstoy" },
          { text: "C) Bir çay bahçesinde veya kafede oturup insanları sessizce gözlemlemek.", char: "cehov" },
          { text: "D) Dünyanın anlamsız gürültüsünden kaçıp kendi iç odama çekilmek.", char: "kafka" },
          { text: "E) Eski sokaklarda dolaşıp insanların tuhaf konuşmalarını dinlemek.", char: "gogol" }
        ]
      },
      {
        q: "3. İnsanların en çok hangi kusuru seni hayal kırıklığına uğratır?",
        opts: [
          { text: "A) Vicdansızlık ve kendi kötülüğünü zekice aklamaya çalışmak.", char: "dostoyevski" },
          { text: "B) Sahte unvanlar, lüks düşkünlüğü ve yapay ahlak gösterileri.", char: "tolstoy" },
          { text: "C) Kaba duygusuzluk, empati eksikliği ve incelikten yoksunluk.", char: "cehov" },
          { text: "D) Sistemin adaletsiz kurallarına sorgusuz sualsiz boyun eğmek.", char: "kafka" },
          { text: "E) Makam ve rütbe karşısında iki büklüm olup masumu ezmek.", char: "gogol" }
        ]
      },
      {
        q: "4. Sence edebiyatın en yüce gayesi nedir?",
        opts: [
          { text: "A) Ruhun en karanlık uçurumlarına ayna tutarak insanı sarsmak.", char: "dostoyevski" },
          { text: "B) İnsana doğru, adil ve faziletli bir yaşamın rehberliğini sunmak.", char: "tolstoy" },
          { text: "C) Büyük nutuklar atmadan, hayatın kırılgan güzelliğini duyurmak.", char: "cehov" },
          { text: "D) Modern insanın görünmez tutsaklığını ve yabancılaşmasını göstermek.", char: "kafka" },
          { text: "E) İnsanın haline gülerken gözlerimizden yaşlar süzülmesini sağlamak.", char: "gogol" }
        ]
      },
      {
        q: "5. Seni en iyi anlatan edebi söz hangisi olurdu?",
        opts: [
          { text: "A) 'Cehennem, sevmeyi artık başaramamaktır.'", char: "dostoyevski" },
          { text: "B) 'Tüm mutlu aileler birbirine benzer; her mutsuz ailenin mutsuzluğu kendine göredir.'", char: "tolstoy" },
          { text: "C) 'Hayat ne kadar kısa, insanları sevmek ve incitmemek için ne kadar az vaktimiz var.'", char: "cehov" },
          { text: "D) 'Bir kafes bir kuş aramaya çıktı.'", char: "kafka" },
          { text: "E) 'Gözyaşları arasından yükselen görünmez bir kahkaha...'", char: "gogol" }
        ]
      }
    ],
    profiles: {
      dostoyevski: {
        avatar: "🕯️",
        name: "Fyodor Dostoyevski",
        book: "Suç ve Ceza, Karamazov Kardeşler, Yeraltından Notlar",
        badge: "Yazar İkizi: Dostoyevski",
        desc: "Siz ruhun karanlık labirentlerinde cesurca yürüyen, vicdanın ve ahlakın en derin fırtınalarını hisseden tutkulu bir kalbe sahipsiniz. Yüzeysel olan hiçbir şey sizi tatmin etmez; insan psikolojisinin sınırlarında dolaşmayı seversiniz."
      },
      tolstoy: {
        avatar: "🌾",
        name: "Lev Tolstoy",
        book: "Savaş ve Barış, Anna Karenina, İvan İlyiç'in Ölümü",
        badge: "Yazar İkizi: Tolstoy",
        desc: "Büyük resimleri gören, doğallığın, sadeliğin ve ahlaki doğruluğun peşinde koşan bilge bir ruha sahipsiniz. Yaşamın sahte süslerinden uzaklaşıp gerçeğin özüne ulaşmak sizin en büyük edebi pusulanızdır."
      },
      cehov: {
        avatar: "☕",
        name: "Anton Çehov",
        book: "Vanya Dayı, Altıncı Koğuş, Martı, Hikayeler",
        badge: "Yazar İkizi: Çehov",
        desc: "Hayatın sıradan anlarındaki o tarifsiz hüznü, insan zaaflarını ve incelikleri şefkat dolu bir tebessümle izleyen zarif bir gözlemcisiniz. Büyük laflardan hoşlanmaz, samimiyeti ve yalınlığı her şeyin üstünde tutarsınız."
      },
      kafka: {
        avatar: "🗝️",
        name: "Franz Kafka",
        book: "Dönüşüm, Dava, Şato, Aforizmalar",
        badge: "Yazar İkizi: Kafka",
        desc: "Dünyanın görünmez duvarlarını, modern hayatın yabancılaşmasını ve varoluşun tekinsiz labirentlerini çok derinden sezen hassas ve özgün bir zihne sahipsiniz. Alışılmış kalıpların dışındaki derinliğiniz sizi eşsiz kılıyor."
      },
      gogol: {
        avatar: "🧥",
        name: "Nikolay Gogol",
        book: "Palto, Ölü Canlar, Müfettiş, Burun",
        badge: "Yazar İkizi: Gogol",
        desc: "Gözyaşları arasından yükselen kahkahanın, küçük insanın trajikomik kaderinin ve masalsı hicvin ustası. Hem hayatın acımasız gerçeklerini hem de onun ardındaki büyüleyici şiirselliği aynı anda kalbinizde taşırsınız."
      }
    }
  },
  {
    id: "edebi-akim",
    title: "Hangi Edebi Akımın Temsilcisisiniz?",
    icon: "🏛️",
    tag: "Felsefi Akım",
    duration: "3 dk",
    desc: "Realizm, Varoluşçuluk, Romantizm, Nihilizm mi yoksa Modernizm mi? Sanata, hayata ve insan doğasına bakış açınız hangi büyük edebi gelenekle yankılanıyor?",
    questions: [
      {
        q: "1. Bir sanat eserinde seni en çok ne büyüler?",
        opts: [
          { text: "A) Toplumsal hayatın, sınıfların ve insan psikolojisinin çıplak gerçekliği.", char: "realizm" },
          { text: "B) İnsanın anlamsız bir dünyada kendi özünü ve seçimlerini sorgulaması.", char: "varolusculuk" },
          { text: "C) Sınırsız duygular, yüce doğa manzaraları, fırtınalı tutkular ve melankoli.", char: "romantizm" },
          { text: "D) Bütün kalıplaşmış inançların yıkılıp yerine saf mantık ve bilimin konması.", char: "nihilizm" },
          { text: "E) Zamanın, rüyaların ve bilinç akışının gizemli imgelerle örülmesi.", char: "modernizm" }
        ]
      },
      {
        q: "2. Tarihteki hangi atmosferde yaşamak seni daha çok heyecanlandırırdı?",
        opts: [
          { text: "A) 19. yüzyılın dönüşen, sanayileşen ve zenginleşen büyük Avrupa kentlerinde.", char: "realizm" },
          { text: "B) Savaş sonrası Paris'in dumanlı kafelerinde, felsefe tartışmalarının ortasında.", char: "varolusculuk" },
          { text: "C) Uçsuz bucaksız dağlarda, eski şatolarda veya fırtınalı deniz kıyılarında.", char: "romantizm" },
          { text: "D) Bilimsel aydınlanmanın ve devrimci laboratuvarların merkezinde.", char: "nihilizm" },
          { text: "E) 20. yüzyıl başının avangart sanat atölyelerinde ve edebiyat meclislerinde.", char: "modernizm" }
        ]
      },
      {
        q: "3. İnsan hayatının anlamı sence nerede saklıdır?",
        opts: [
          { text: "A) Yaşamı olduğu gibi kabullenip somut koşullar içinde onurlu kalmakta.", char: "realizm" },
          { text: "B) Önceden belirlenmiş bir anlam yoktur; insan kendi anlamını eylemleriyle kendisi yaratır.", char: "varolusculuk" },
          { text: "C) Kalbin saf sesinde, aşktan ve güzellikten gelen sonsuzluk arzusunda.", char: "romantizm" },
          { text: "D) Dogmaları yok edip faydalı ve kanıtlanabilir olanın peşinden gitmekte.", char: "nihilizm" },
          { text: "E) Anların içinde saklı sübjektif hafızada ve estetik yaratıcılıkta.", char: "modernizm" }
        ]
      },
      {
        q: "4. Bir kitapta en tahammül edemediğin anlatım biçimi nedir?",
        opts: [
          { text: "A) Gerçek dışı masallar ve ayağı yere basmayan yapmacık kahramanlar.", char: "realizm" },
          { text: "B) Bireyin sorumluluğunu kadere ya da topluma yükleyen tembel bahaneler.", char: "varolusculuk" },
          { text: "C) Duygusuz, mekanik ve soğuk hesap kitap kokan ruhsuz metinler.", char: "romantizm" },
          { text: "D) Eski batıl inançların ve romantik hayallerin gerçek gibi savunulması.", char: "nihilizm" },
          { text: "E) Tekdüze, tahmin edilebilir ve basmakalıp anlatım klişeleri.", char: "modernizm" }
        ]
      },
      {
        q: "5. Doğadaki bir fırtınaya baktığında ilk hissettiğin düşünce nedir?",
        opts: [
          { text: "A) Yağmurun toprağa, sokaktaki insanlara ve şehre olan somut etkisi.", char: "realizm" },
          { text: "B) Evrenin sonsuzluğu karşısında insanın kırılgan yalnızlığı.", char: "varolusculuk" },
          { text: "C) Ruhumdaki fırtınaların doğadaki o vahşi güçle kucaklaşması.", char: "romantizm" },
          { text: "D) Atmosferik basıncın ve rüzgarın fiziksel bir doğa olayı olduğu.", char: "nihilizm" },
          { text: "E) Şimşeklerin aydınlattığı zamanın parçalanışı ve hafızanın çağrışımları.", char: "modernizm" }
        ]
      }
    ],
    profiles: {
      realizm: {
        avatar: "🔍",
        name: "Realizm (Gerçekçilik)",
        book: "Balzac, Tolstoy, Flaubert, Gogol",
        badge: "Edebi Akım: Realist",
        desc: "Siz hayatı hayali tüllerle süslemek yerine tüm çıplaklığı, sosyo-psikolojik derinliği ve dürüstlüğüyle kavramak isteyen gözlemci bir zihne sahipsiniz. Edebi pusulanız hakikat ve sahiciliktir."
      },
      varolusculuk: {
        avatar: "🧭",
        name: "Varoluşçuluk (Egzistansiyalizm)",
        book: "Dostoyevski, Sartre, Camus, Kafka",
        badge: "Edebi Akım: Varoluşçu",
        desc: "Anlamsız ve kayıtsız bir evrende insanın kendi özünü, seçimlerini ve ahlakını özgürce inşa etmesi gerektiğine inanan cesur bir sorgulayıcısınız. Özgürlüğün getirdiği sorumluluktan asla kaçmazsınız."
      },
      romantizm: {
        avatar: "🌙",
        name: "Romantizm",
        book: "Puşkin, Victor Hugo, Goethe, Lermontov",
        badge: "Edebi Akım: Romantik",
        desc: "Mantığın soğuk kalıplarına karşı duygunun, doğanın, tutkunun ve sonsuzluk arayışının sözcüsüsünüz. Kalbinizin fırtınaları ve idealleriniz, bu dünyayı dönüştürecek en büyük ışıktır."
      },
      nihilizm: {
        avatar: "⚙️",
        name: "Rasyonalizm & Eleştirel Gerçekçilik",
        book: "Turgenyev, Çernişevski, Bazarov ekolü",
        badge: "Edebi Akım: Rasyonalist",
        desc: "Geleneksel dogmaları ve romantik süsleri reddeden, saf akıl, bilim ve somut faydaya dayanan bağımsız bir düşünürsünüz. Gerçeği ararken cesaretinizden asla ödün vermezsiniz."
      },
      modernizm: {
        avatar: "✨",
        name: "Modernizm & Sembolizm",
        book: "Virginia Woolf, James Joyce, Marcel Proust, Baudelaire",
        badge: "Edebi Akım: Modernist",
        desc: "Görünenin ardındaki saklı imgeleri, bilinç akışını, zamanın göreceliğini ve dilin sınırlarını keşfeden yenilikçi bir estetik ruha sahipsiniz. Sanat sizin için derin bir içsel yolculuktur."
      }
    }
  },
  {
    id: "kitap-onerisi",
    title: "Şu An Hangi Başucu Klasiğini Okumalısınız?",
    icon: "📖",
    tag: "Okuma Rehberi",
    duration: "2 dk",
    desc: "Ruh halinize, aradığınız tempoya ve hissetmek istediğiniz duyguya göre şu an başlamanız gereken mükemmel başucu klasiğini belirleyin.",
    questions: [
      {
        q: "1. Şu sıralar okuyacağın kitaptan en büyük beklentin nedir?",
        opts: [
          { text: "A) Vicdanımı ve ahlakımı sarsacak derin bir psikolojik gerilim.", char: "sucveceza" },
          { text: "B) Kalbime dokunacak, sıcacık ve hüzünlü bir insanlık öyküsü.", char: "palto" },
          { text: "C) Kuşaklar arası fikir çatışmasını ve akıl-duygu savaşını anlatan bir klasik.", char: "babalar" },
          { text: "D) Hayatın koşturmacasından kaçırıp kendimi arayacağım felsefi bir deniz yolculuğu.", char: "bilinmeyenada" },
          { text: "E) Hayatın geçiciliğini ve samimiyetsizliğini yüzüme çarpacak sarsıcı bir yüzleşme.", char: "ivanilyic" }
        ]
      },
      {
        q: "2. Nasıl bir anlatım temposu seni daha çok içine çeker?",
        opts: [
          { text: "A) Ateşli, sayıklamalarla dolu, nefes nefese bir kriz atmosferi.", char: "sucveceza" },
          { text: "B) Sade, masalsı, aralara ince mizah ve derin şefkat serpiştirilmiş bir üslup.", char: "palto" },
          { text: "C) Entelektüel diyaloglar, berrak bir dil ve sakin ama etkileyici bir akış.", char: "babalar" },
          { text: "D) Şiirsel, düşsel ve alegorik imgelerle örülü felsefi bir akış.", char: "bilinmeyenada" },
          { text: "E) Yalın, soğukkanlı ama her cümlesi bıçak gibi keskin bir gerçeklik.", char: "ivanilyic" }
        ]
      },
      {
        q: "3. Kitabın baş kahramanı nasıl biri olmalı?",
        opts: [
          { text: "A) Zihninde fırtınalar kopan, sınırları zorlayan karmaşık bir idealist.", char: "sucveceza" },
          { text: "B) Kendi halinde, kimseye zararı olmayan, görünmeyen masum bir memur.", char: "palto" },
          { text: "C) Kendi prensiplerine inanan, çağıyla çatışan genç bir nihilist.", char: "babalar" },
          { text: "D) Bilinmeyen bir adayı bulmak için kralın kapısına dayanan bir hayalperest.", char: "bilinmeyenada" },
          { text: "E) Toplumun istediği gibi yaşayan ama ölüm kapısını çalınca uyanan saygın bir yargıç.", char: "ivanilyic" }
        ]
      },
      {
        q: "4. Kitabı bitirdiğinde odadan ayrılırken ne hissetmek istersin?",
        opts: [
          { text: "A) İçimde vicdanın arındırıcı ve bağışlayıcı ışığını.", char: "sucveceza" },
          { text: "B) Tüm hırsların ve kibirlerin boş olduğunu, küçük insana şefkat duymayı.", char: "palto" },
          { text: "C) Geçmişle gelecek arasındaki o kaçınılmaz köprüyü ve hüznü.", char: "babalar" },
          { text: "D) Kendi içimdeki bilinmeyen adayı keşfetme cesaretini.", char: "bilinmeyenada" },
          { text: "E) Bugünden tezi yok, hayatı ertelemeden sahici yaşama kararlılığını.", char: "ivanilyic" }
        ]
      },
      {
        q: "5. Şu anki okuma ortamın nasıl olmalı?",
        opts: [
          { text: "A) Gece yarısı, tek bir masa lambasının solgun ışığı altında.", char: "sucveceza" },
          { text: "B) Sıcak bir battaniyenin altında, dışarıda rüzgar eserken.", char: "palto" },
          { text: "C) Sakin bir öğleden sonra, çay ve kahve eşliğinde pencere kenarında.", char: "babalar" },
          { text: "D) Dalga sesleri hayal ederek, geniş ufuklara bakarken.", char: "bilinmeyenada" },
          { text: "E) Mutlak bir sessizlikte, düşüncelerimle baş başa kaldığım bir akşamda.", char: "ivanilyic" }
        ]
      }
    ],
    profiles: {
      sucveceza: {
        avatar: "⚖️",
        name: "Suç ve Ceza — F. M. Dostoyevski",
        book: "Tavsiye Eser: Suç ve Ceza",
        badge: "Kitap Keşfi: Suç ve Ceza",
        desc: "Raskolnikov'un vicdan savaşı ve Petersburg'un boğucu sokakları tam size göre. İnsanın sınırlarını, suçluluğu ve ruhsal arınmayı iliklerinize kadar hissedeceksiniz."
      },
      palto: {
        avatar: "🧥",
        name: "Palto — Nikolay Gogol",
        book: "Tavsiye Eser: Palto",
        badge: "Kitap Keşfi: Palto",
        desc: "Akaki Akakiyeviç'in hüzünlü ve sıcacık öyküsü kalbinizi ısıtacak. 'Hepimiz Gogol'un Palto'sundan çıktık' sözünün derin anlamını yaşamak için mükemmel bir zaman."
      },
      babalar: {
        avatar: "🍃",
        name: "Babalar ve Oğullar — İvan Turgenyev",
        book: "Tavsiye Eser: Babalar ve Oğullar",
        badge: "Kitap Keşfi: Babalar ve Oğullar",
        desc: "Bazarov'un sarsıcı nihilizmi ve nesiller arası o ebedi çatışma... Zihninizi berraklaştıracak, edebi üslubuyla sizi büyüleyecek dingin bir başyapıt."
      },
      bilinmeyenada: {
        avatar: "⛵",
        name: "Bilinmeyen Adanın Öyküsü — José Saramago",
        book: "Tavsiye Eser: Bilinmeyen Adanın Öyküsü",
        badge: "Kitap Keşfi: Bilinmeyen Ada",
        desc: "Kendini bulmak için limandan açılan bir hayalperestin büyüleyici yolculuğu. Kısa, şiirsel ve ömür boyu unutamayacağınız bir edebi rüya."
      },
      ivanilyic: {
        avatar: "🕯️",
        name: "İvan İlyiç'in Ölümü — Lev Tolstoy",
        book: "Tavsiye Eser: İvan İlyiç'in Ölümü",
        badge: "Kitap Keşfi: İvan İlyiç'in Ölümü",
        desc: "Hayatın sahteliklerini ve insanın asıl varoluş gayesini anlatan sarsıcı bir yüzleşme. Her sayfasında kendinizi sorgulayacağınız kusursuz bir Tolstoy şaheseri."
      }
    }
  },
  {
    id: "dostoyevski-karakter",
    title: "Hangi Dostoyevski Karakterisiniz?",
    icon: "⚖️",
    tag: "Dostoyevski Ruhu",
    duration: "3 dk",
    desc: "Dostoyevski'nin karanlık ve aydınlık arasında bocalayan derin roman kahramanlarından hangisi senin ruh halini yansıtıyor?",
    questions: [
      {
        q: "1. Seni hayatta en çok tetikleyen içsel çatışma hangisidir?",
        opts: [
          { text: "A) Ahlaki kuralların ötesine geçip üstün bir hedef uğruna harekete geçme arzusu.", char: "raskolnikov" },
          { text: "B) Kötülükle dolu bu dünyada kalbimin masumiyetini ve sevgisini koruma çabası.", char: "miskin" },
          { text: "C) Haksız yere acı çeken masumların hesabını tanrısal düzene sorma öfkesi.", char: "ivan" },
          { text: "D) İçimdeki dizginlenemez tutkular, aşk ve taşkın coşkuların yarattığı fırtına.", char: "dmitri" },
          { text: "E) Herkesi anlamak, affetmek ve insanlara sessizce şifa olma arzusu.", char: "alyosa" }
        ]
      },
      {
        q: "2. Çok büyük bir hata yaptığında veya suçluluk hissettiğinde ilk ne yaparsın?",
        opts: [
          { text: "A) Odama kapanıp kendimle acımasızca yüzleşir, vicdanımın sesini susturmaya çalışırım.", char: "raskolnikov" },
          { text: "B) Hiçbir gurur yapmadan kimseden nefret etmez, acıyı sabırla göğüslerim.", char: "miskin" },
          { text: "C) Durumu mantık çerçevesinde analiz eder, felsefi bir çıkış yolu ararım.", char: "ivan" },
          { text: "D) Coşkuyla pişman olur, kendimi cezalandırmak pahasına günahımı haykırırım.", char: "dmitri" },
          { text: "E) Dua eder, bağışlanma diler ve sevgiyle yaraları sarmaya koyulurum.", char: "alyosa" }
        ]
      },
      {
        q: "3. Bir dostunda aradığın en belirleyici özellik nedir?",
        opts: [
          { text: "A) En karanlık anlarımda bile beni yargılamadan yanımda duracak sarsılmaz sadakat.", char: "raskolnikov" },
          { text: "B) Çıkarsız, çocuksu ve riyadan tamamen arınmış saf bir kalp.", char: "miskin" },
          { text: "C) Zihnimi zorlayacak felsefi derinlik ve entelektüel dürüstlük.", char: "ivan" },
          { text: "D) Hayatı dolu dolu yaşayan, tutkulu ve mert bir yoldaşlık.", char: "dmitri" },
          { text: "E) Dinleyen, teselli eden ve kalbime huzur aşılayan manevi bir şefkat.", char: "alyosa" }
        ]
      },
      {
        q: "4. Petersburg veya Moskova'da geçen bir gecede nerede olmak isterdin?",
        opts: [
          { text: "A) Tavan arası dar bir odada, gaz lambası altında büyük planlar düşünürken.", char: "raskolnikov" },
          { text: "B) İyileşmekte olan hastaların yanında, sessiz ve dingin bir köşede.", char: "miskin" },
          { text: "C) Bir meyhanede Büyük Engizisyoncu efsanesini tartışırken.", char: "ivan" },
          { text: "D) Şampanyaların patladığı, çingene şarkılarının yankılandığı ateşli bir mecliste.", char: "dmitri" },
          { text: "E) Manastırın bahçesinde, yaşlı bir bilgenin dizinin dibinde huzurla.", char: "alyosa" }
        ]
      },
      {
        q: "5. Dostoyevski romanlarından aklında en çok kalan temel felsefe nedir?",
        opts: [
          { text: "A) İnsan kendi cezasını vicdanında çeker; diriliş ancak fedakarlıkla mümkündür.", char: "raskolnikov" },
          { text: "B) Güzellik ve saf şefkat dünyayı kurtaracak tek güçtür.", char: "miskin" },
          { text: "C) Eğer ölümsüzlük ve aşk yoksa, o zaman her şey mubahtır.", char: "ivan" },
          { text: "D) İnsan kalbi, Tanrı ile Şeytan'ın savaştığı sonsuz bir muharebe meydanıdır.", char: "dmitri" },
          { text: "E) Cehennem, sevmeyi artık başaramayan ruhların çektiği acıdır.", char: "alyosa" }
        ]
      }
    ],
    profiles: {
      raskolnikov: {
        avatar: "🪓",
        name: "Rodion Raskolnikov (Suç ve Ceza)",
        book: "Eser: Suç ve Ceza",
        badge: "Dostoyevski Ruhu: Raskolnikov",
        desc: "Siz sınırları ve tabuları zorlayan, ahlakı vicdan terazisinde tartan gururlu ve trajik bir dehaya sahipsiniz. Hatalarınız da pişmanlıklarınız da büyük olur; ruhunuz ancak hakiki bir sevgi ve fedakarlıkla huzura kavuşabilir."
      },
      miskin: {
        avatar: "🕊️",
        name: "Prens Lev Mışkin (Budala)",
        book: "Eser: Budala",
        badge: "Dostoyevski Ruhu: Prens Mışkin",
        desc: "Kötülüğün ve riyanın kirletemediği, çıkarsız bir sevgiyle dolu aziz bir kalbiniz var. İnsanlar nezaketinizi bazen 'saflık' saysa da sizin masumiyetiniz dünyanın en soylu direnişidir."
      },
      ivan: {
        avatar: "📜",
        name: "İvan Karamazov (Karamazov Kardeşler)",
        book: "Eser: Karamazov Kardeşler",
        badge: "Dostoyevski Ruhu: İvan Karamazov",
        desc: "Sarsılmaz bir mantık, felsefi bir sorgulama cesareti ve derin bir varoluşsal sancı... Kolay cevaplarla avunmayan, adaleti en yüksek entelektüel dürüstlükle tartan bilge ve melankolik bir düşünürsünüz."
      },
      dmitri: {
        avatar: "🔥",
        name: "Dmitri Karamazov (Karamazov Kardeşler)",
        book: "Eser: Karamazov Kardeşler",
        badge: "Dostoyevski Ruhu: Dmitri Karamazov",
        desc: "İçinde fırtınalar kopan, coşkusu ve tutkusu sınır tanımayan açık yürekli bir aşık ve savaşçısınız. Uçurumlara yuvarlansanız bile kalbinizdeki o asil kıvılcım asla sönmez."
      },
      alyosa: {
        avatar: "🕯️",
        name: "Alyoşa Karamazov (Karamazov Kardeşler)",
        book: "Eser: Karamazov Kardeşler",
        badge: "Dostoyevski Ruhu: Alyoşa Karamazov",
        desc: "Dingin, şefkatli ve birleştirici bir ışığa sahipsiniz. Kimseyi kırmaz, herkesin derdini kendi derdiniz bilirsiniz. Dostoyevski'nin insanlığa sunduğu nihai sevgi umudu sizde hayat bulur."
      }
    }
  },
  {
    id: "dunya-edebiyati",
    title: "Hangi Dünya Edebiyatı Kahramanısınız?",
    icon: "🗺️",
    tag: "Evrensel Karakterler",
    duration: "3 dk",
    desc: "Kafka'nın Samsa'sından Wilde'ın Dorian Gray'ine, Camus'nün Meursault'sundan Cervantes'in Don Kişot'una hangi ölümsüz kahramansınız?",
    questions: [
      {
        q: "1. Bir sabah uyandığında her şeyin kökten değiştiğini görsen ilk tepkin ne olurdu?",
        opts: [
          { text: "A) İşe nasıl yetişeceğimi, ailemin benden beklentilerini düşünüp endişelenirim.", char: "samsa" },
          { text: "B) Sakince durumu izler, yapay bir panik sergilemeden akışa bırakırım.", char: "meursault" },
          { text: "C) Haksızlıklara karşı kılıcımı kuşanıp yeni bir şövalyelik macerasına atılırım.", char: "donkisot" },
          { text: "D) Aynaya bakar, gençliğimin ve güzelliğimin bozulup bozulmadığını kontrol ederim.", char: "dorian" },
          { text: "E) Hayatımın en büyük aşkına ve hayaline kavuşmak için görkemli bir parti veririm.", char: "gatsby" }
        ]
      },
      {
        q: "2. Toplumun yerleşik kurallarına karşı takındığın en belirgin tavır nedir?",
        opts: [
          { text: "A) Kuralları yerine getirmek için kendimi feda eder, sessizce katlanırım.", char: "samsa" },
          { text: "B) İkiyüzlü sosyal ritüellere katılmayı ve yalandan rol yapmayı reddederim.", char: "meursault" },
          { text: "C) Kurallar ne kadar acımasız olsa da ben kendi yüce ideallerime inanırım.", char: "donkisot" },
          { text: "D) Ahlaki sınırları zevk, estetik ve haz uğruna cesurca yıkar geçerim.", char: "dorian" },
          { text: "E) Kuralları kendi lehime çevirip hayal ettiğim konumu sıfırdan inşa ederim.", char: "gatsby" }
        ]
      },
      {
        q: "3. Bir eserin seni en çok etkileyen yönü nedir?",
        opts: [
          { text: "A) Modern insanın yabancılaşmasını ve anlaşılmaz yalnızlığını hissettirmesi.", char: "samsa" },
          { text: "B) Yalın, filtrelenmemiş ve çıplak bir varoluşsal dürüstlük sunması.", char: "meursault" },
          { text: "C) İmkânsız görünen idealler uğruna yel değirmenlerine meydan okuma cesareti.", char: "donkisot" },
          { text: "D) Büyüleyici zarafet, estetizm ve insanın içindeki gizli çürüme teması.", char: "dorian" },
          { text: "E) Geçmişi geri getirme tutkusu ve yeşil ışığın vaat ettiği büyük aşk.", char: "gatsby" }
        ]
      },
      {
        q: "4. Kendi hayatını tek bir metaforla özetleyecek olsaydın hangisini seçerdin?",
        opts: [
          { text: "A) Kapısı kilitli bir odada sessizce bekleyen yorgun bir böcek.", char: "samsa" },
          { text: "B) Akdeniz güneşinin altında her şeyi olduğu gibi kabul eden bir yabancı.", char: "meursault" },
          { text: "C) Paslı zırhıyla dünyadaki kötülükleri dize getirmeye çalışan gezgin şövalye.", char: "donkisot" },
          { text: "D) Tavan arasında saklanan, günahları üstlenen esrarengiz bir portre.", char: "dorian" },
          { text: "E) İskelenin ucunda durup karşı kıyıdaki yeşil ışığa uzanan bir hayalperest.", char: "gatsby" }
        ]
      },
      {
        q: "5. Aşk kelimesi sende en çok neyi çağrıştırır?",
        opts: [
          { text: "A) Karşılıksız fedakarlık ve sevdiğin insanların yükünü sırtlanma arzusu.", char: "samsa" },
          { text: "B) Büyük vaatler vermeden, anın içindeki sahici ten ve varoluş uyumu.", char: "meursault" },
          { text: "C) Ulaşılamaz Dulcinea'ya adanmış asil, tertemiz ve masalsı bir bağlılık.", char: "donkisot" },
          { text: "D) Tehlikeli bir haz, gençliğin büyüsü ve cazibenin dayanılmaz gücü.", char: "dorian" },
          { text: "E) Bütün bir ömrü ve serveti uğruna adayabileceğin tek bir kadın.", char: "gatsby" }
        ]
      }
    ],
    profiles: {
      samsa: {
        avatar: "🪲",
        name: "Gregor Samsa (Dönüşüm)",
        book: "Franz Kafka — Dönüşüm",
        badge: "Dünya Edebiyatı: Gregor Samsa",
        desc: "Sorumluluk sahibi, fedakâr ve hassas bir kalbiniz var. Sevdikleriniz için her şeyi feda etmeye hazırsınız ancak modern dünyanın soğuk dişlileri arasında kendinizi bazen yabancılaşmış hissedersiniz."
      },
      meursault: {
        avatar: "☀️",
        name: "Meursault (Yabancı)",
        book: "Albert Camus — Yabancı",
        badge: "Dünya Edebiyatı: Meursault",
        desc: "Toplumun ikiyüzlü ahlak kurallarına boyun eğmeyen, yapmacık duygulardan nefret eden dobra ve yalın bir ruha sahipsiniz. Gerçek hisleriniz neyse onu yaşar, kimseye şirin görünmeye çalışmazsınız."
      },
      donkisot: {
        avatar: "🛡️",
        name: "Don Kişot (Mançalı Şövalye)",
        book: "Miguel de Cervantes — Don Kişot",
        badge: "Dünya Edebiyatı: Don Kişot",
        desc: "Dünya ne kadar sıradanlaşırsa sıradanlaşsın, kalbinizdeki soylu idealleri ve romantizmi kaybetmeyen efsanevi bir kahramansınız. Yel değirmenlerine karşı savaşmak pahasına inandığınız değerleri savunursunuz."
      },
      dorian: {
        avatar: "🥀",
        name: "Dorian Gray",
        book: "Oscar Wilde — Dorian Gray'in Portresi",
        badge: "Dünya Edebiyatı: Dorian Gray",
        desc: "Estetik duygunuz, zarafetiniz ve güzelliğe olan tutkunuz olağanüstü. Sıradan kuralların ötesinde yaşamayı sever, sanatı ve hazzı hayatınızın merkezine koyarsınız."
      },
      gatsby: {
        avatar: "🍸",
        name: "Jay Gatsby",
        book: "F. Scott Fitzgerald — Muhteşem Gatsby",
        badge: "Dünya Edebiyatı: Jay Gatsby",
        desc: "Büyük hayallerin, imkânsız aşkların ve kararlılığın timsalisiniz. Karşı kıyıdaki o yeşil ışığa ulaşmak için dünyaları fethedebilir, geçmişi yeniden yaratma cesaretini gösterebilirsiniz."
      }
    }
  },
  {
    id: "edebi-sehir",
    title: "Hangi Edebi Şehirde Yaşamalıydınız?",
    icon: "🌆",
    tag: "Edebi Şehirler",
    duration: "3 dk",
    desc: "Petersburg'un sisli köprüleri mi, Balzac'ın Paris'i mi, Kafka'nın tekinsiz Prag'ı mı yoksa Wilde'ın Londra'sı mı?",
    questions: [
      {
        q: "1. Seni en çok büyüleyen şehir atmosferi hangisidir?",
        opts: [
          { text: "A) Beyaz gecelerin mehtabı, Neva Nehri'nin donmuş suları ve kasvetli tavan araları.", char: "petersburg" },
          { text: "B) Sanat kafeleri, Seine Nehri boyundaki kitapçılar, lüks bulvarlar ve tutku.", char: "paris" },
          { text: "C) Gotik kuleler, taş döşeli dar sokaklar, simyacı dükkanları ve tekinsiz gölgeler.", char: "prag" },
          { text: "D) Thames Nehri'ni saran yoğun sis, sarı gaz lambaları ve aristokrat kulüpleri.", char: "londra" },
          { text: "E) Geniş kar kaplı meydanlar, kilise çanları ve köklü aile konakları.", char: "moskova" }
        ]
      },
      {
        q: "2. Yaşamak istediğin şehirde akşam saatlerinde ne yapmak istersin?",
        opts: [
          { text: "A) Neva rıhtımında paltoma sarınıp yalnız başıma uzun felsefi yürüyüşler yapmak.", char: "petersburg" },
          { text: "B) Quartier Latin'deki bir kafede şarap eşliğinde edebiyat ve aşk konuşmak.", char: "paris" },
          { text: "C) Karl Köprüsü'nden eski kaleye doğru bakıp varoluşun gizemini düşünmek.", char: "prag" },
          { text: "D) Londra sisinde faytona binip gizemli bir sergiye veya tiyatroya yetişmek.", char: "londra" },
          { text: "E) Semaverden doldurulan demli çay eşliğinde dostlarla sabahlamak.", char: "moskova" }
        ]
      },
      {
        q: "3. Bir şehrin mimarisinde seni en çok ne büyüler?",
        opts: [
          { text: "A) Çarlık saraylarının görkemi ile arka sokakların sefaletinin yarattığı tezat.", char: "petersburg" },
          { text: "B) Haussmann tarzı geniş bulvarlar, zarif ferforje balkonlar ve şık kafeler.", char: "paris" },
          { text: "C) Orta Çağ'dan kalma astronomik saatler, karanlık dehlizler ve kemerler.", char: "prag" },
          { text: "D) Kırmızı tuğlalı Victoria evleri, saat kuleleri ve gotik kiliseler.", char: "londra" },
          { text: "E) Soğan kubbeler, renkli kuleler ve geniş ahşap avlular.", char: "moskova" }
        ]
      },
      {
        q: "4. Bir şehrin insanlarından beklediğin en belirgin karakter nedir?",
        opts: [
          { text: "A) Melankolik, derin düşünen, gözlerinde hem kederi hem insanlığı taşıyanlar.", char: "petersburg" },
          { text: "B) Hayat dolu, zevk sahibi, sanattan ve aşktan ödün vermeyenler.", char: "paris" },
          { text: "C) Sessiz, kendi gizemini koruyan, masalsı bir derinlik taşıyanlar.", char: "prag" },
          { text: "D) İronik zekaya sahip, mesafeli, kibar ve entelektüel olanlar.", char: "londra" },
          { text: "E) Samimi, sıcakkanlı, sofrasını herkese cömertçe açanlar.", char: "moskova" }
        ]
      },
      {
        q: "5. Hangi edebi yazarın adım attığı sokaklarda dolaşmak seni daha çok heyecanlandırır?",
        opts: [
          { text: "A) Dostoyevski ve Gogol'un adımlarını takip etmek.", char: "petersburg" },
          { text: "B) Balzac, Flaubert ve Baudelaire'in Paris'inde kaybolmak.", char: "paris" },
          { text: "C) Franz Kafka'nın ilham aldığı dar sokaklarda gezinmek.", char: "prag" },
          { text: "D) Oscar Wilde ve Charles Dickens'ın Londra'sında yürümek.", char: "londra" },
          { text: "E) Lev Tolstoy ve Çehov'un Moskova'sını solumak.", char: "moskova" }
        ]
      }
    ],
    profiles: {
      petersburg: {
        avatar: "🌉",
        name: "Sankt-Peterburg (Kuzeyin Başkenti)",
        book: "Dostoyevski & Gogol'un Edebi Kenti",
        badge: "Edebi Şehir: Petersburg",
        desc: "Sizin ruhunuz Neva Nehri'nin melankolisinde, beyaz gecelerin şiirselliğinde ve Petersburg'un derin edebiyatında atıyor. Hem hüznü hem de insanlığın en derin varoluşunu solumak için bu şehirde doğmalıydınız."
      },
      paris: {
        avatar: "🥐",
        name: "19. Yüzyıl Paris'i",
        book: "Balzac, Flaubert ve Victor Hugo'nun Kenti",
        badge: "Edebi Şehir: Paris",
        desc: "Sanat, tutku, zarafet ve edebiyat... Sizin ruhunuz Seine Nehri kıyısındaki sahaf tezgahlarında, kafelerde ve sanatsal fırtınalarda yaşıyor. Hayatı estetik bir başyapıt gibi deneyimlemek tam size göre."
      },
      prag: {
        avatar: "🏰",
        name: "Gizemli Prag",
        book: "Franz Kafka'nın Büyülü Coğrafyası",
        badge: "Edebi Şehir: Prag",
        desc: "Gotik kuleler, simyacı sokakları ve tekinsiz labirentler... Yüzeysel gürültüden uzak, gizemli ve düşsel bir dünyayı seven sizler için Prag, edebi evinizin ta kendisi."
      },
      londra: {
        avatar: "🕰️",
        name: "Sisli Victoria Londra'sı",
        book: "Oscar Wilde & Charles Dickens'ın Şehri",
        badge: "Edebi Şehir: Londra",
        desc: "Yoğun sisin ardındaki sarı sokak lambaları, kıvrak bir edebi ironi ve aristokratik zeka... Wilde'ın zarafeti ve Dickens'ın vicdanı sizin şehir ruhunuzla kusursuz örtüşüyor."
      },
      moskova: {
        avatar: "❄️",
        name: "Tarihi Moskova",
        book: "Lev Tolstoy & Anton Çehov'un Mekânı",
        badge: "Edebi Şehir: Moskova",
        desc: "Sıcak semaverler, geniş karlı caddeler ve köklü Rus samimiyeti... Yapmacık salonlardan uzak, toprağın ve hakikatin kalbinde atan bir şehri arzuluyorsunuz."
      }
    }
  },
  {
    id: "okur-tipi",
    title: "Edebi Okuma Alışkanlığınız & Okur Tipiniz Nedir?",
    icon: "📚",
    tag: "Okur Arketipi",
    duration: "2 dk",
    desc: "Satır aralarını didikliyen felsefi tahlilci mi, gece yarısı dünyadan kopan münzevi mi yoksa karakterlerle ağlayan tutkulu bir okur musunuz?",
    questions: [
      {
        q: "1. Bir kitabı okurken elinde en sık ne bulunur?",
        opts: [
          { text: "A) Kurşun kalem; satır altlarını çizer, kenarlara felsefi notlar düşerim.", char: "analitik" },
          { text: "B) Sıcak bir kahve veya çay kupası; odada sadece masa lambam ve sessizlik.", char: "munzevi" },
          { text: "C) Mendil veya bir kucak yastığı; karakterlerin acısını iliklerimde hissederim.", char: "tutkulu" },
          { text: "D) Kitabın şık kumaş ayracı; ciltli klasik baskılara gözüm gibi bakarım.", char: "klasik" },
          { text: "E) Harita veya sözlük; bilmediğim kavramları ve coğrafyaları araştırırım.", char: "kasif" }
        ]
      },
      {
        q: "2. Okuyacağın yeni bir kitabı seçerken en çok neye dikkat edersin?",
        opts: [
          { text: "A) Eserin düşünsel derinliğine, varoluşsal sorular sormasına.", char: "analitik" },
          { text: "B) Beni dış dünyadan tamamen koparıp içine alacak atmosferine.", char: "munzevi" },
          { text: "C) Karakterlerin sahiciliğine ve beni derinden sarsacak duygusal gücüne.", char: "tutkulu" },
          { text: "D) Yüzyılların süzgecinden geçmiş rüştünü ispatlamış bir klasik olmasına.", char: "klasik" },
          { text: "E) Alışılmışın dışında özgün bir bakış açısı veya farklı bir kültür sunmasına.", char: "kasif" }
        ]
      },
      {
        q: "3. Kitap okumak için senin ideal vaktin ne zamandır?",
        opts: [
          { text: "A) Zihnimin en açık olduğu dingin sabah saatleri.", char: "analitik" },
          { text: "B) Herkesin uyuduğu, şehrin sustuğu gece yarısı saatleri.", char: "munzevi" },
          { text: "C) Duygularımın yoğun olduğu, yağmurlu veya rüzgarlı akşamlar.", char: "tutkulu" },
          { text: "D) Rutinimin parçası olan ayrılmış düzenli okuma saatim.", char: "klasik" },
          { text: "E) Yolculuklarda, parklarda veya yeni keşfettiğim bir mekânda.", char: "kasif" }
        ]
      },
      {
        q: "4. Bir kitabı yarım bırakmak senin için ne ifade eder?",
        opts: [
          { text: "A) Eğer mantıksal ve düşünsel olarak sığsa hiç vakit kaybetmeden bırakırım.", char: "analitik" },
          { text: "B) Kitapla bağ kuramadıysam sessizce rafa kaldırırım.", char: "munzevi" },
          { text: "C) Karakterleri yarı yolda bırakmış gibi hisseder, suçluluk duyarım.", char: "tutkulu" },
          { text: "D) Bir klasiği yarım bırakmak prensiplerime aykırıdır, sonuna kadar giderim.", char: "klasik" },
          { text: "E) Zaman değerlidir, beni yeni ufuklara götürmüyorsa başka kitaba geçerim.", char: "kasif" }
        ]
      },
      {
        q: "5. Edebiyatın senin hayatındaki en temel karşılığı nedir?",
        opts: [
          { text: "A) İnsan aklını ve evrenin hakikatini anlama aracı.", char: "analitik" },
          { text: "B) Dünyanın gürültüsünden kaçıp sığındığım en güvenli kale.", char: "munzevi" },
          { text: "C) Başka kalplerin acısını ve sevincini paylaşma mucizesi.", char: "tutkulu" },
          { text: "D) İnsanlığın bin yıllık ortak kültürel mirası ve bilgeliği.", char: "klasik" },
          { text: "E) Kendi sınırlarımı aşmamı sağlayan sonsuz bir keşif yolculuğu.", char: "kasif" }
        ]
      }
    ],
    profiles: {
      analitik: {
        avatar: "🔍",
        name: "Felsefi & Analitik Okur",
        book: "Okur Tipi: Felsefi Tahlilci",
        badge: "Okur Tipi: Felsefi Tahlilci",
        desc: "Siz sadece bir hikâye okumaz, metnin alt metinlerini, felsefi açmazlarını ve yazarın zihin dünyasını didik didik edersiniz. Satır altını çizmek ve not almak sizin için okumanın ayrılmaz parçasıdır."
      },
      munzevi: {
        avatar: "🌙",
        name: "Gece Kuşu & Münzevi Okur",
        book: "Okur Tipi: Münzevi Okur",
        badge: "Okur Tipi: Münzevi Okur",
        desc: "Okumak sizin için bir ibadet gibi mutlak bir sessizlik gerektirir. Gece yarısı tek lamba altında dünyadan kopmak ve hayal gücünüzle baş başa kalmak en büyük lüksünüzdür."
      },
      tutkulu: {
        avatar: "❤️",
        name: "Duygusal & Tutkulu Okur",
        book: "Okur Tipi: Tutkulu Okur",
        badge: "Okur Tipi: Tutkulu Okur",
        desc: "Karakterlerle birlikte ağlayan, onlarla sevinen derin bir empati ustasısınız. Bir kitap bittiğinde yakın bir dostunuzu kaybetmiş gibi günlerce o atmosferin etkisinden çıkamazsınız."
      },
      klasik: {
        avatar: "🏛️",
        name: "Geleneksel Klasik Muhafızı",
        book: "Okur Tipi: Klasik Muhafızı",
        badge: "Okur Tipi: Klasik Muhafızı",
        desc: "Geçici popüler heveslere prim vermez, sadece yüzyılların süzgecinden geçmiş anıtsal klasiklere kıymet verirsiniz. Kütüphaneniz edebiyat tarihinin en saygın anıtı gibidir."
      },
      kasif: {
        avatar: "🧭",
        name: "Edebi Kâşif & Maceracı",
        book: "Okur Tipi: Edebi Kâşif",
        badge: "Okur Tipi: Edebi Kâşif",
        desc: "Farklı ülkelerden, unutulmuş yazarlardan ve ezber bozan anlatılardan beslenen meraklı bir zihne sahipsiniz. Edebiyat sizin için sınırları olmayan büyüleyici bir dünya turudur."
      }
    }
  },
  {
    id: "edebi-cag",
    title: "Hangi Edebi Dönemin Ruhunu Taşıyorsunuz?",
    icon: "⏳",
    tag: "Edebi Dönem",
    duration: "3 dk",
    desc: "19. yüzyıl Rus Altın Çağı mı, Antik Yunan trajedileri mi, Romantizmin fırtınası mı yoksa 20. yüzyılın avangart Modernizmi mi?",
    questions: [
      {
        q: "1. Seni en derinden sarsan edebi duygu hangisidir?",
        opts: [
          { text: "A) Vicdan azabı, ruhsal arınma ve küçük insanın hakikati.", char: "rusaltin" },
          { text: "B) Kaderin kaçınılmazlığı ve insanın ilahi adalet karşısındaki trajedisi.", char: "antik" },
          { text: "C) Doğa karşısındaki yüce ürperti, tutku ve melankolik aşk.", char: "romantik" },
          { text: "D) Zarafet, biçim kusursuzluğu ve sanat için sanat tutkusu.", char: "dekadan" },
          { text: "E) Parçalanmış zaman, bilinç akışı ve yabancılaşma.", char: "modernist" }
        ]
      },
      {
        q: "2. Masandaki yazı gereçleri nasıl olmalıydı?",
        opts: [
          { text: "A) Sade bir divit kalem, mürekkep hokkası ve Petersburg soğuğunda yanan tek mum.", char: "rusaltin" },
          { text: "B) Balmumu tabletler, papirüs rulosu ve antik bir zeytin dalı.", char: "antik" },
          { text: "C) Kuş tüyü kalem, mühür mumu ve kenarları yanık sararmış mektup kağıtları.", char: "romantik" },
          { text: "D) Altın uçlu dolmakalem, ipek ciltli defter ve yeşil deri masa süsü.", char: "dekadan" },
          { text: "E) Mekanik daktilo, dağınık taslak sayfaları ve siyah kahve fincanı.", char: "modernist" }
        ]
      },
      {
        q: "3. Bir sanatçının en büyük erdemi sence nedir?",
        opts: [
          { text: "A) Toplumsal yaraları ve insan ruhunun günahlarını cesurca teşhir etmek.", char: "rusaltin" },
          { text: "B) İnsana haddini, ahlakı ve evrensel dengeyi hatırlatmak.", char: "antik" },
          { text: "C) Kalbindeki fırtınaları hiçbir kurala sığdırmadan haykırmak.", char: "romantik" },
          { text: "D) Yaşamı kusursuz bir estetik zarafet ve üslupla işlemek.", char: "dekadan" },
          { text: "E) Kalıplaşmış anlatım biçimlerini kırıp yeni bir algı yaratmak.", char: "modernist" }
        ]
      },
      {
        q: "4. Doğaya çıktığında sende uyanan his nedir?",
        opts: [
          { text: "A) Uçsuz bucaksız Rus steplerinin ve köy yalnızlığının bilgeliği.", char: "rusaltin" },
          { text: "B) Ege mavisinin, tapınak sütunlarının ve mitlerin ebediyeti.", char: "antik" },
          { text: "C) Fırtınalı dağ dorukları, karanlık ormanlar ve sisli denizler.", char: "romantik" },
          { text: "D) Özenle düzenlenmiş saray bahçeleri ve nadide çiçek seraları.", char: "dekadan" },
          { text: "E) Modern kentin geometrik çizgileri ve endüstriyel soyutluk.", char: "modernist" }
        ]
      },
      {
        q: "5. Hangi düşünür veya yazar grubunun sohbetine katılmak isterdin?",
        opts: [
          { text: "A) Dostoyevski, Tolstoy ve Gogol'un edebiyat meclisi.", char: "rusaltin" },
          { text: "B) Sokrates, Platon ve Aristoteles'in Atina akademisi.", char: "antik" },
          { text: "C) Goethe, Lord Byron ve Shelley'nin romantik buluşması.", char: "romantik" },
          { text: "D) Oscar Wilde, Baudelaire ve Walter Pater'in salonları.", char: "dekadan" },
          { text: "E) Virginia Woolf, James Joyce ve Franz Kafka'nın dünyası.", char: "modernist" }
        ]
      }
    ],
    profiles: {
      rusaltin: {
        avatar: "📜",
        name: "19. Yüzyıl Rus Altın Çağı",
        book: "Dostoyevski, Tolstoy, Gogol, Turgenyev",
        badge: "Edebi Çağ: Rus Altın Çağı",
        desc: "Sizin ruhunuz insan psikolojisinin en derin uçurumlarına inen, ahlakı ve vicdanı didik didik eden 19. yüzyıl Rus gerçekçiliğinde atıyor. Edebi ağırlık ve samimiyet sizin pusulanızdır."
      },
      antik: {
        avatar: "🏛️",
        name: "Antik Klasik & Felsefe Çağı",
        book: "Homeros, Platon, Sofokles, Euripides",
        badge: "Edebi Çağ: Antik Klasik",
        desc: "Ölçü, denge, kader ve evrensel ahlak ilkeleri... Siz binlerce yıl öncesinin Atina'sında, insan doğasının temellerini kuran bilge düşünürlerin ve tragedya ustalarının ruhunu taşıyorsunuz."
      },
      romantik: {
        avatar: "🥀",
        name: "Fırtınalı Romantizm & Gotik Dönem",
        book: "Goethe, Puşkin, Mary Shelley, Victor Hugo",
        badge: "Edebi Çağ: Romantik Dönem",
        desc: "Soğuk akılcılığa karşı fırtınalı duyguların, doğanın yüceliğinin ve kırık kalplerin sözcüsü... Sizin edebi eviniz fırtınalı deniz kıyılarında ve melankolik gecelerde saklıdır."
      },
      dekadan: {
        avatar: "✨",
        name: "Belle Époque & Dekadan Estetizm",
        book: "Oscar Wilde, Baudelaire, Huysmans",
        badge: "Edebi Çağ: Dekadan Estetizm",
        desc: "Sanat için sanat, zarafet ve biçim kusursuzluğu... Hayatı sıradan ahlak kalıplarının ötesinde estetik bir haz ve güzellik arayışı olarak yaşayan zarif bir dekadansınız."
      },
      modernist: {
        avatar: "🎨",
        name: "20. Yüzyıl Avangart Modernizmi",
        book: "Kafka, Joyce, Woolf, Camus",
        badge: "Edebi Çağ: Modernist Dönem",
        desc: "Zamanın parçalandığı, yabancılaşmanın ve bilinç akışının yeni diller kurduğu modern çağ... Dünyanın görünen yüzünün ardındaki derin psikolojik gerçekleri sezen öncü bir zihne sahipsiniz."
      }
    }
  }
];

var QUIZ_QUESTIONS = LITERARY_QUIZZES[0].questions;
var QUIZ_PROFILES = LITERARY_QUIZZES[0].profiles;
var activeQuizId = 'rus-karakter';
var quizAnswersMap = {};
var quizAnswers = [];

function quizPage(testId){
  var userBadges = curUser ? getUserBadges() : [];

  // Test seçilmemişse test galerisini göster
  if (!testId) {
    return '<section class="page">'
      + '<a class="back" href="index.html">← Ana Sayfaya Dön</a>'
      + '<div class="glossary-hero">'
      + '<h1 class="ptitle">🎭 Edebi Testler & Karakter Analizleri</h1>'
      + '<p class="tag" style="max-width:660px;margin:0 auto 20px">Kişiliğinize, ruh halinize ve felsefi bakış açınıza en yakın edebiyat karakterini, yazar ruh ikizinizi veya şu an okumanız gereken başucu klasiğini keşfedin.</p>'
      + (!curUser ? '<div class="sync-tip" style="max-width:680px;margin:0 auto 20px;text-align:center"><span>🔒 <b>Edebi Testler kulüp üyelerine özeldir.</b> Testleri çözerek karakter analizinizi çıkarmak ve profilinize özel rozetler kazanmak için <button data-a="open-auth" style="background:none;border:none;color:var(--accent);font-weight:700;cursor:pointer;padding:0;text-decoration:underline">Giriş Yapın veya Üye Olun →</button></span></div>' : '')
      + '</div>'
      + '<div class="quiz-grid">'
      + LITERARY_QUIZZES.map(function(qz){
          var earnedBadge = '';
          userBadges.forEach(function(b){
            for(var k in qz.profiles){
              if (qz.profiles[k].badge === b) earnedBadge = b;
            }
          });
          var btnHTML = curUser
            ? '<a class="btn small" href="test.html?id=' + encodeURIComponent(qz.id) + '">' + (earnedBadge ? 'Tekrar Çöz →' : 'Teste Başla →') + '</a>'
            : '<button class="btn ghost small" data-a="open-test-auth" style="display:inline-flex;align-items:center;gap:6px">🔒 Üyelere Özel · Başla</button>';

          return '<div class="quiz-card">'
            + '<div>'
            + '<div class="quiz-card-top">'
            + '<span class="quiz-card-icon">' + qz.icon + '</span>'
            + '<span class="quiz-card-tag">' + esc(qz.tag) + '</span>'
            + '</div>'
            + '<h3 class="quiz-card-title">' + esc(qz.title) + '</h3>'
            + '<p class="quiz-card-desc">' + esc(qz.desc) + '</p>'
            + '<div class="quiz-card-meta">'
            + '<span>📝 ' + qz.questions.length + ' Soru</span>'
            + '<span>⏱️ ' + esc(qz.duration) + '</span>'
            + (earnedBadge ? '<span style="color:var(--gold);font-weight:700">🏆 Rozet Alındı</span>' : '')
            + '</div>'
            + (earnedBadge ? '<div style="font-size:.78rem;background:rgba(212,175,55,.12);border:1px solid rgba(212,175,55,.3);border-radius:8px;padding:6px 10px;margin-bottom:14px;color:var(--ink)">🌟 Rozetiniz: <b>' + esc(earnedBadge) + '</b></div>' : '')
            + '</div>'
            + '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">'
            + '<span style="font-size:.8rem;color:var(--ink-soft)">Rozetli Test</span>'
            + btnHTML
            + '</div>'
            + '</div>';
        }).join('')
      + '</div>'
      + '</section>';
  }

  // Seçilen testi bul
  var qz = LITERARY_QUIZZES.filter(function(q){ return q.id === testId; })[0] || LITERARY_QUIZZES[0];

  // Üye girişi yapılmamışsa testi kilitle
  if (!curUser) {
    return '<section class="page">'
      + '<a class="back" href="test.html">← Tüm Edebi Testlere Dön</a>'
      + '<div class="quiz-box" style="text-align:center;padding:48px 24px;max-width:540px;margin:32px auto">'
      + '<div style="font-size:3.2rem;margin-bottom:12px">🔒</div>'
      + '<h2 style="font-family:var(--serif);font-size:1.6rem;color:var(--ink);margin:0 0 12px">Edebi Testler Üyelere Özeldir</h2>'
      + '<p style="color:var(--ink-soft);font-size:.95rem;line-height:1.6;max-width:460px;margin:0 auto 24px">'
      + '“<b>' + esc(qz.title) + '</b>” testini çözmek, edebi karakter &amp; yazar analizinizi çıkarmak ve profilinize rozet kazanmak için lütfen giriş yapın veya kulübümüze katılın.'
      + '</p>'
      + '<div class="btns" style="justify-content:center;gap:12px;flex-wrap:wrap">'
      + '<button class="btn" data-a="open-auth" style="min-width:140px">Giriş Yap / Üye Ol</button>'
      + '<a class="btn ghost" href="test.html">← Test Listesine Dön</a>'
      + '</div>'
      + '</div>'
      + '</section>';
  }
  activeQuizId = qz.id;
  var answers = quizAnswersMap[qz.id] || [];
  var currentStep = answers.length;

  if (currentStep >= qz.questions.length) {
    // Sonucu hesapla
    var tally = {};
    answers.forEach(function(c){ tally[c] = (tally[c] || 0) + 1; });
    var maxKey = Object.keys(qz.profiles)[0], maxCount = 0;
    for (var k in tally) {
      if (tally[k] > maxCount) { maxCount = tally[k]; maxKey = k; }
    }
    var res = qz.profiles[maxKey] || qz.profiles[Object.keys(qz.profiles)[0]];

    // Kullanıcıya rozet kazandır
    var bName = res.badge;
    saveUserBadge(bName);

    var badgeAwardNotice = curUser
      ? '🎉 Tebrikler! Profilinize "' + esc(bName) + '" rozeti eklendi.'
      : '🎉 Tebrikler! Sonucunuz belirlendi: "' + esc(bName) + '". Bu rozeti profilinize kalıcı olarak işlemek için lütfen üye olun veya giriş yapın.';

    return '<section class="page">'
      + '<a class="back" href="test.html">← Tüm Edebi Testlere Dön</a>'
      + '<div class="quiz-box">'
      + '<div class="quiz-result-hero">'
      + '<div class="quiz-result-avatar">' + res.avatar + '</div>'
      + '<div style="font-size:.85rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--ink-soft);margin-bottom:6px">' + esc(qz.title) + ' Sonucunuz</div>'
      + '<h1 class="quiz-result-name">' + esc(res.name) + '</h1>'
      + (res.book ? '<div class="quiz-result-book">' + esc(res.book) + '</div>' : '')
      + '<p class="quiz-result-desc">' + esc(res.desc) + '</p>'
      + '<div style="background:rgba(40,140,60,.12);color:#288c3c;border:1px solid rgba(40,140,60,.3);border-radius:12px;padding:12px 18px;display:inline-block;margin-bottom:24px;font-size:.9rem;font-weight:600">'
      + badgeAwardNotice
      + '</div>'
      + '<div class="btns" style="justify-content:center;gap:12px;flex-wrap:wrap">'
      + '<button class="btn" data-a="reset-quiz" data-quiz-id="' + esc(qz.id) + '">🔄 Testi Tekrar Çöz</button>'
      + '<a class="btn ghost" href="test.html">← Diğer Testleri Keşfet</a>'
      + (curUser ? '<a class="btn ghost" href="profil.html">Rozetlerimi & Profilimi Gör</a>' : '<button class="btn" data-a="open-auth">Giriş Yap / Üye Ol</button>')
      + '</div>'
      + '</div>'
      + '</div>'
      + '</section>';
  }

  var item = qz.questions[currentStep];
  var progress = Math.round((currentStep / qz.questions.length) * 100);

  return '<section class="page">'
    + '<a class="back" href="test.html">← Tüm Testlere Dön</a>'
    + '<div class="quiz-box">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;font-size:.85rem;color:var(--ink-soft);font-weight:600">'
    + '<span>' + esc(qz.title) + ' · Soru ' + (currentStep + 1) + ' / ' + qz.questions.length + '</span>'
    + '<span>%' + progress + ' Tamamlandı</span>'
    + '</div>'
    + '<div class="goal-bar-wrap" style="height:6px;margin-bottom:24px"><div class="goal-bar-fill" style="width:' + progress + '%"></div></div>'
    + '<h2 style="font-family:var(--serif);font-size:1.35rem;line-height:1.45;color:var(--ink);margin:0 0 24px">' + esc(item.q) + '</h2>'
    + '<div class="quiz-options">'
    + item.opts.map(function(opt){
        return '<button class="quiz-opt-btn" data-a="answer-quiz" data-quiz-id="' + esc(qz.id) + '" data-char="' + esc(opt.char) + '">' + esc(opt.text) + '</button>';
      }).join('')
    + '</div>'
    + '</div>'
    + '</section>';
}

function quotesPage(){
  var quotes = getQuotes();
  var quoteForm = '';
  var bookOptions = pubBooks().map(function(b){
    return '<option value="' + esc(b.title) + '" data-author="' + esc(b.author) + '">' + esc(b.title) + ' (' + esc(b.author) + ')</option>';
  }).join('');

  if (curUser) {
    quoteForm = '<div class="quote-form-card">'
      + '<h3 style="font-family:var(--serif);font-size:1.2rem;margin:0 0 12px;color:var(--ink)">✍️ Kitaptan Bir Alıntı Paylaşın</h3>'
      + '<form id="share-quote-form">'
      + '<div style="margin-bottom:14px">'
      + '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Alıntı Metni *</label>'
      + '<textarea id="quote-text" placeholder="Kitaptan altını çizdiğiniz veya aklınıza kazınan o edebi cümleyi buraya yazın..." style="width:100%;min-height:90px;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:.92rem;box-sizing:border-box;background:var(--paper-2);color:var(--ink)" required></textarea>'
      + '</div>'
      + '<div class="row3" style="margin-bottom:12px">'
      + '<div>'
      + '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Eser / Kitap</label>'
      + '<input type="text" id="quote-book" list="quote-books-list" placeholder="Kitap seçin veya yazın..." style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit;box-sizing:border-box;background:var(--paper-2);color:var(--ink)">'
      + '<datalist id="quote-books-list">' + bookOptions + '</datalist>'
      + '</div>'
      + '<div>'
      + '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Yazar *</label>'
      + '<input type="text" id="quote-author" placeholder="Yazarın adı..." style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit;box-sizing:border-box;background:var(--paper-2);color:var(--ink)" required>'
      + '</div>'
      + '<div>'
      + '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Sayfa / Not <span class="hint">(İsteğe bağlı)</span></label>'
      + '<input type="text" id="quote-page" placeholder="Örn. Sayfa 142 veya 2. Bölüm" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;font:inherit;box-sizing:border-box;background:var(--paper-2);color:var(--ink)">'
      + '</div>'
      + '</div>'
      + '<div style="display:flex;justify-content:flex-end;margin-top:14px">'
      + '<button type="submit" class="btn small">📌 Alıntıyı Duvara As</button>'
      + '</div>'
      + '</form>'
      + '</div>';
  } else {
    quoteForm = '<div class="quote-form-card" style="text-align:center;padding:32px 20px">'
      + '<div style="font-size:2.2rem;margin-bottom:10px">✍️</div>'
      + '<h3 style="font-family:var(--serif);font-size:1.3rem;margin:0 0 8px;color:var(--ink)">Kitaptan Bir Alıntı Paylaşın</h3>'
      + '<p style="max-width:520px;margin:0 auto 18px;color:var(--ink-soft);font-size:.92rem;line-height:1.5">Alıntılar duvarına yeni bir edebi alıntı eklemek ve profilinizle toplulukta yer almak kulüp üyelerimize özeldir.</p>'
      + '<button class="btn" data-a="open-auth" style="display:inline-flex;align-items:center;gap:8px">🔒 Giriş Yap veya Üye Ol</button>'
      + '</div>';
  }

  var listHTML = '';
  if (!quotes.length) {
    listHTML = '<p class="empty">Henüz alıntı eklenmedi. İlk alıntıyı siz ekleyin!</p>';
  } else {
    listHTML = '<div class="quotes-wall-grid">' + quotes.map(function(q){
      var qId = q.id || '';
      var qUser = q.user_name || 'Edebiyat Okuru';
      var qUname = q.username ? q.username.replace(/^@/,'') : '';
      var qInitials = qUser.slice(0, 2).toUpperCase();
      var qProfLink = qUname ? ('#/profil/' + encodeURIComponent(qUname)) : '';
      var qAvatar = q.avatar_url
        ? '<div class="member-avatar-mini" style="background-image:url(' + esc(q.avatar_url) + ');background-size:cover;background-position:center;color:transparent"></div>'
        : '<div class="member-avatar-mini">' + esc(qInitials) + '</div>';
      var qUserLink = qProfLink
        ? '<a href="' + qProfLink + '" class="member-name-link" style="font-weight:600;font-size:.82rem"><b>' + esc(qUser) + '</b> <span style="font-size:.76rem;color:var(--accent)">@' + esc(qUname) + '</span></a>'
        : '<span style="font-weight:600;font-size:.82rem"><b>' + esc(qUser) + '</b></span>';
      
      var isOwner = (curUser && (curUser.id === q.user_id || curUser.email === q.email || (curUser.user_metadata && curUser.user_metadata.username === qUname))) || canEdit;
      var delBtn = isOwner && q.id && q.id.indexOf('dq_') !== 0
        ? '<button class="quote-del-btn" data-a="del-quote" data-id="' + esc(q.id) + '" title="Alıntıyı Sil">✕</button>'
        : '';
      var dateStr = q.created_at ? fmtDate(q.created_at) : '';

        var isLiked = isQuoteLiked(qId);
        var likeBtn = '<button class="quote-like-btn' + (isLiked ? ' liked' : '') + '" data-a="like-quote" data-id="' + esc(qId) + '" title="' + (isLiked ? 'Beğeniyi Geri Çek' : 'Alıntıyı Beğen') + '">' + (isLiked ? '❤️' : '🤍') + ' <span>' + (q.likes || 0) + '</span></button>';

        var waText = '“' + q.text + '”\n— ' + q.author + (q.book ? ' (' + q.book + ')' : '') + '\n\n📖 ' + S.site.name;
        var waQuoteBtn = '<a class="btn ghost small" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(waText) + '" target="_blank" rel="noopener" style="color:#25d366;border-color:color-mix(in srgb,#25d366 40%,var(--line));padding:4px 8px" title="WhatsApp\'ta Paylaş"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.159.57 4.184 1.564 5.938l-1.664 6.082 6.221-1.632c1.677.915 3.597 1.432 5.637 1.432 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/></svg></a>';

        return '<div class="quote-tile">'
          + '<p class="quote-tile-text">“' + esc(q.text) + '”</p>'
          + '<div class="quote-tile-cite">'
          + '<span>— ' + esc(q.author) + (q.book ? ' <small style="opacity:.75">(' + esc(q.book) + (q.page ? ' · ' + esc(q.page) : '') + ')</small>' : '') + '</span>'
          + '<div class="quote-actions">'
          + likeBtn
          + '<button class="btn ghost small" data-a="card-gen" data-text="' + esc(q.text) + '" data-author="' + esc(q.author) + '" data-book="' + esc(q.book || '') + '" title="Görsel Kart Üret" style="background:color-mix(in srgb,var(--gold) 18%,transparent);border:1px solid var(--gold);font-weight:600">🖼️ Kart Yap</button>'
          + '<button class="btn ghost small" data-a="copy-quote-text" data-text="' + esc(q.text + ' — ' + q.author + (q.book ? ' (' + q.book + ')' : '')) + '" title="Alıntıyı kopyala">📋</button>'
          + waQuoteBtn
          + delBtn
          + '</div>'
          + '</div>'
        + '<div class="quote-user-bar">'
        + qAvatar
        + '<div>'
        + qUserLink
        + (dateStr ? '<div style="font-size:.72rem;color:var(--ink-soft)">' + esc(dateStr) + '</div>' : '')
        + '</div>'
        + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }

  var cardBanner = '<div class="camp-banner" style="background:linear-gradient(135deg,rgba(197,160,89,0.18) 0%,rgba(122,31,43,0.14) 100%);border:1px solid var(--gold);margin-bottom:26px;border-radius:14px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">'
    + '<div style="flex:1;min-width:280px">'
    + '<span class="camp-badge" style="background:var(--gold);color:#1c130c;font-weight:700">🎨 Görsel Alıntı Kartı Stüdyosu</span>'
    + '<h2 class="camp-title" style="margin-top:8px;font-size:1.25rem">Alıntıları Estetik Paylaşım Kartlarına Dönüştürün</h2>'
    + '<p class="camp-desc" style="color:var(--ink-soft);font-size:.9rem;line-height:1.5;margin-top:4px">Klasik eserlerden sevdiğiniz cümleleri Instagram Hikaye (9:16) veya Kare (1:1) edebi posterlere dönüştürün; Kağıt, Gece veya Sepya temalarıyla yüksek çözünürlüklü PNG olarak indirin.</p>'
    + '</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
    + '<button class="btn" data-a="card-gen" data-text="Beni rahat bırakın, neden beni incitiyorsunuz? Ben de sizin kardeşinizim." data-author="Nikolay Gogol" data-book="Palto" style="background:var(--accent);color:#fff;font-weight:700;box-shadow:var(--shadow-sm)">🖼️ Yeni Görsel Kart Oluştur</button>'
    + '</div>'
    + '</div>';

  return '<section class="page">'
    + '<a class="back" href="index.html">← Ana Sayfa</a>'
    + '<h1 class="ptitle">Edebi Alıntılar Duvarı</h1>'
    + '<p class="lead">Gogol\'un Paltosu edebiyat kulübü üyelerinin altını çizdiği, klasiklerden süzülen unutulmaz cümleler.</p>'
    + cardBanner
    + quoteForm
    + listHTML
    + '</section>';
}

function saveLocalAccount(email, username, pass, memberObj) {
  try {
    var raw = localStorage.getItem('gp-accounts');
    var accounts = raw ? JSON.parse(raw) : {};
    var acc = {
      id: memberObj.id,
      email: (email || '').toLowerCase().trim(),
      username: (username || '').toLowerCase().trim(),
      pass: pass,
      user_metadata: {
        full_name: memberObj.full_name || '',
        username: username || '',
        role: memberObj.role || 'member',
        reading_list: memberObj.reading_list || []
      },
      created_at: memberObj.created_at || new Date().toISOString()
    };
    if (acc.email) accounts[acc.email] = acc;
    if (acc.username) accounts[acc.username] = acc;
    localStorage.setItem('gp-accounts', JSON.stringify(accounts));
    if (acc.username && acc.email) {
      localStorage.setItem('gp-user-' + acc.username, acc.email);
    }
  } catch(e){}
}

function getLocalAccount(ident, pass) {
  try {
    var raw = localStorage.getItem('gp-accounts');
    if (!raw) return null;
    var accounts = JSON.parse(raw);
    var clean = (ident || '').toLowerCase().trim().replace(/^@/, '');
    var acc = accounts[clean];
    if (acc && acc.pass === pass) {
      return {
        id: acc.id,
        email: acc.email,
        user_metadata: acc.user_metadata,
        created_at: acc.created_at
      };
    }
  } catch(e){}
  return null;
}

async function fetchSupabaseMembers() {
  if (!supa) return false;
  var found = false;
  try {
    var rpcRes = await supa.rpc('get_all_members');
    if (rpcRes && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
      rpcRes.data.forEach(function(u){
        var meta = u.raw_user_meta_data || {};
        addMemberToRegistry({
          id: u.id,
          email: u.email,
          username: meta.username || '',
          full_name: meta.full_name || '',
          created_at: u.created_at,
          role: (meta.role === 'admin' || (u.email && u.email.indexOf('gogolunpaltosu') >= 0)) ? 'admin' : 'member',
          reading_list: meta.reading_list || [],
          confirmed: true
        });
      });
      found = true;
    }
  } catch(e){}

  try {
    var tblRes = await supa.from('profiles').select('*');
    if (tblRes && Array.isArray(tblRes.data) && tblRes.data.length > 0) {
      tblRes.data.forEach(function(u){
        addMemberToRegistry(u);
      });
      found = true;
    }
  } catch(e){}

  return found;
}

function updateAdminStatus(){
  if(!curUser){
    canEdit = false;
    return;
  }
  var email = (curUser.email || '').toLowerCase().trim();
  var meta = curUser.user_metadata || {};
  var uname = (meta.username || '').toLowerCase().trim().replace(/^@/,'');
  var siteAdmin = (S.site.admin || 'gogolunpaltosu').toLowerCase().trim().replace(/^@/,'');
  
  if(siteAdmin){
    if(email === siteAdmin || (uname && uname === siteAdmin) || (siteAdmin.length >= 4 && email.indexOf(siteAdmin) >= 0)){
      canEdit = true;
      return;
    }
  }
  
  for(var i=0; i<ADMIN_IDENTIFIERS.length; i++){
    var aid = ADMIN_IDENTIFIERS[i].toLowerCase().trim().replace(/^@/,'');
    if(aid && (email === aid || uname === aid || (aid.length >= 4 && email.indexOf(aid) >= 0))){
      canEdit = true;
      return;
    }
  }
  
  if(meta.role === 'admin'){
    canEdit = true;
    return;
  }

  canEdit = false;
}

function handleUserSession(user) {
  if (!user) return;
  curUser = user;
  storeUser(user);
  updateAdminStatus();
  if (user) {
    var uMeta = user.user_metadata || {};
    var isAdm = canEdit || uMeta.role === 'admin' || (user.email && user.email.indexOf('gogolunpaltosu') >= 0);
    if (supa && user.id && user.id.indexOf('admin-') < 0 && user.id.indexOf('member_') < 0) {
      try {
        supa.from('profiles').upsert({
          id: user.id,
          email: user.email,
          username: uMeta.username || (user.email ? user.email.split('@')[0] : 'okur'),
          full_name: uMeta.full_name || 'Edebiyat Okuru',
          avatar_url: uMeta.avatar_url || '',
          role: isAdm ? 'admin' : 'member',
          reading_list: uMeta.reading_list || favs,
          badges: uMeta.badges || [],
          challenges: uMeta.challenges || [],
          quotes: uMeta.quotes || []
        }).then(function(){}).catch(function(){});
      } catch(e){}
    }
    addMemberToRegistry({
      id: user.id,
      email: user.email,
      username: uMeta.username || '',
      full_name: uMeta.full_name || '',
      created_at: user.created_at || new Date().toISOString(),
      role: isAdm ? 'admin' : 'member',
      reading_list: uMeta.reading_list || favs,
      confirmed: true
    });
    if (user.user_metadata) {
      syncFavsWithCloud(user.user_metadata.reading_list);
      if (Array.isArray(user.user_metadata.quotes) && user.user_metadata.quotes.length) {
        try {
          var locQ = JSON.parse(localStorage.getItem('gp-custom-quotes') || '[]');
          user.user_metadata.quotes.forEach(function(cq){
            if (!locQ.some(function(l){ return l.id === cq.id || (l.text === cq.text && l.author === cq.author); })) {
              locQ.unshift(cq);
            }
          });
          localStorage.setItem('gp-custom-quotes', JSON.stringify(locQ));
        } catch(e){}
      }
    }
    try {
      var guestBadges = JSON.parse(localStorage.getItem('gp-guest-badges') || '[]');
      if (Array.isArray(guestBadges) && guestBadges.length) {
        guestBadges.forEach(function(b){ saveUserBadge(b); });
        localStorage.removeItem('gp-guest-badges');
      }
    } catch(e){}
    if (isAdm) {
      fetchSupabaseMembers().then(function(hasFound){
        if (hasFound) render();
      });
    }
  }
  render();
}

function openAuthModal(tab) {
  authTab = tab || 'login';
  var ov = document.getElementById('auth-overlay');
  if (ov) ov.remove();
  ov = document.createElement('div');
  ov.className = 'ov';
  ov.id = 'auth-overlay';
  ov.innerHTML = renderAuthModalContent();
  document.body.appendChild(ov);
  attachAuthModalEvents(ov);
}

function closeAuthModal() {
  var ov = document.getElementById('auth-overlay');
  if (ov) ov.remove();
}

function showAuthNoticeModal(opts) {
  var prev = document.getElementById('auth-notice-overlay');
  if (prev) prev.remove();

  var ov = document.createElement('div');
  ov.className = 'ov';
  ov.id = 'auth-notice-overlay';
  ov.style.zIndex = '100';

  var icon = opts.type === 'succ' ? '🎉' : (opts.type === 'err' ? '⚠️' : 'ℹ️');
  var iconColor = opts.type === 'succ' ? '#288c3c' : (opts.type === 'err' ? '#b42828' : 'var(--accent)');
  var iconBg = opts.type === 'succ' ? 'rgba(40,140,60,.12)' : (opts.type === 'err' ? 'rgba(180,40,40,.12)' : 'color-mix(in srgb,var(--accent) 12%,transparent)');

  ov.innerHTML = '<div class="notice-modal" role="dialog" aria-modal="true">'
    + '<button class="auth-close" data-x="close" aria-label="Kapat" style="top:12px;right:14px">✕</button>'
    + '<div class="notice-modal-icon" style="background:' + iconBg + ';color:' + iconColor + '">' + icon + '</div>'
    + '<h3 class="notice-modal-title">' + esc(opts.title || 'Bilgilendirme') + '</h3>'
    + '<div class="notice-modal-body">' + (opts.message || '') + '</div>'
    + '<div class="btns" style="justify-content:center;margin:0">'
    + '<button class="btn notice-modal-btn" data-x="ok">' + esc(opts.buttonText || 'Tamam') + '</button>'
    + '</div>'
    + '</div>';

  ov.addEventListener('click', function(e) {
    var close = e.target.closest('[data-x]');
    if (close || e.target === ov) {
      ov.remove();
      if (typeof opts.onConfirm === 'function') opts.onConfirm();
    }
  });

  document.body.appendChild(ov);
}

function renderAuthModalContent() {
  if (authTab === 'forgot') {
    return '<div class="auth-dlg" role="dialog" aria-modal="true">'
      + '<button class="auth-close" data-a="close-auth" aria-label="Kapat">✕</button>'
      + '<h3 style="font-family:var(--serif);font-size:1.3rem;margin-bottom:8px">Şifremi Unuttum</h3>'
      + '<p class="auth-desc">Kayıtlı e-posta adresinizi girin; size şifrenizi sıfırlamanız için güvenli bir bağlantı gönderelim.</p>'
      + '<div id="auth-msg" class="auth-msg"></div>'
      + '<form id="auth-form" novalidate>'
      + '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">E-posta Adresi</label>'
      + '<input type="email" id="auth-email" class="auth-input" placeholder="adiniz@ornek.com">'
      + '<button type="button" id="auth-submit-btn" class="btn auth-btn-submit">Sıfırlama Bağlantısı Gönder</button>'
      + '<div style="text-align:center"><button type="button" class="auth-back-link" data-a="switch-tab" data-tab="login">← Giriş ekranına dön</button></div>'
      + '</form>'
      + '</div>';
  }

  if (authTab === 'newpass') {
    return '<div class="auth-dlg" role="dialog" aria-modal="true">'
      + '<button class="auth-close" data-a="close-auth" aria-label="Kapat">✕</button>'
      + '<h3 style="font-family:var(--serif);font-size:1.3rem;margin-bottom:8px">Yeni Şifre Belirleyin</h3>'
      + '<p class="auth-desc">Hesabınız için lütfen yeni bir şifre belirleyin.</p>'
      + '<div id="auth-msg" class="auth-msg"></div>'
      + '<form id="auth-form" novalidate>'
      + '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Yeni Şifre</label>'
      + '<input type="password" id="auth-password" class="auth-input" placeholder="En az 6 karakter">'
      + '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Yeni Şifre (Tekrar)</label>'
      + '<input type="password" id="auth-password-confirm" class="auth-input" placeholder="Şifrenizi tekrar girin">'
      + '<button type="button" id="auth-submit-btn" class="btn auth-btn-submit">Şifreyi Güncelle</button>'
      + '</form>'
      + '</div>';
  }

  var isLogin = authTab === 'login';
  return '<div class="auth-dlg" role="dialog" aria-modal="true">'
    + '<button class="auth-close" data-a="close-auth" aria-label="Kapat">✕</button>'
    + '<div class="auth-tabs">'
    + '<button class="auth-tab' + (isLogin ? ' active' : '') + '" data-a="switch-tab" data-tab="login">Giriş Yap</button>'
    + '<button class="auth-tab' + (!isLogin ? ' active' : '') + '" data-a="switch-tab" data-tab="signup">Kayıt Ol</button>'
    + '</div>'
    + '<p class="auth-desc">' + (isLogin 
        ? 'Hesabınıza giriş yaparak okuma listenize tüm cihazlarınızdan ulaşabilirsiniz.' 
        : 'Ücretsiz hesap oluşturarak okuma listenizi bulutta saklayın ve cihazlarınız arasında eşitleyin.') + '</p>'
    + '<div id="auth-msg" class="auth-msg"></div>'
    + '<form id="auth-form" novalidate>'
    + (!isLogin ? '<div class="row2" style="gap:10px"><div><label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Ad Soyad</label><input type="text" id="auth-name" class="auth-input" placeholder="Örn: Lev Tolstoy"></div><div><label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Kullanıcı Adı</label><input type="text" id="auth-username" class="auth-input" placeholder="tolstoy"></div></div>' : '')
    + (isLogin 
        ? '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">E-posta veya Kullanıcı Adı</label><input type="text" id="auth-email" class="auth-input" placeholder="adiniz@ornek.com veya @kullaniciadi" autocorrect="off" autocapitalize="none">'
        : '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">E-posta Adresi</label><input type="email" id="auth-email" class="auth-input" placeholder="adiniz@ornek.com">')
    + (isLogin 
        ? '<div class="auth-row-between"><label style="font-size:.85rem;font-weight:600;margin:0">Şifre</label><button type="button" class="auth-forgot-link" data-a="switch-tab" data-tab="forgot">Şifremi unuttum</button></div>'
        : '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Şifre</label>')
    + '<input type="password" id="auth-password" class="auth-input" placeholder="En az 6 karakter">'
    + (!isLogin ? '<label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Şifre (Tekrar)</label><input type="password" id="auth-password-confirm" class="auth-input" placeholder="Şifrenizi tekrar girin">' : '')
    + '<button type="button" id="auth-submit-btn" class="btn auth-btn-submit">' + (isLogin ? 'Giriş Yap' : 'Kayıt Ol') + '</button>'
    + '</form>'
    + '</div>';
}

function attachAuthModalEvents(ov) {
  if (!ov._hasClick) {
    ov._hasClick = true;
    ov.addEventListener('click', function(e) {
      if (e.target === ov) closeAuthModal();
      var closeBtn = e.target.closest('[data-a="close-auth"]');
      if (closeBtn) closeAuthModal();
      var tabBtn = e.target.closest('[data-a="switch-tab"]');
      if (tabBtn) {
        authTab = tabBtn.getAttribute('data-tab');
        ov.innerHTML = renderAuthModalContent();
        attachAuthModalEvents(ov);
      }
    });
  }

  var form = ov.querySelector('#auth-form');
  var submitBtn = ov.querySelector('#auth-submit-btn');

  async function handleAuthAction(e) {
    if (e && e.preventDefault) e.preventDefault();
    var msgEl = ov.querySelector('#auth-msg');

    function setAuthMsg(type, html) {
      if (!msgEl) return;
      msgEl.className = 'auth-msg ' + (type === 'succ' ? 'succ' : 'err');
      msgEl.style.display = 'block';
      msgEl.innerHTML = html;
    }
    function clearAuthMsg() {
      if (!msgEl) return;
      msgEl.className = 'auth-msg';
      msgEl.style.display = 'none';
      msgEl.innerHTML = '';
    }

    if (!supa) {
      var netErrMsg = 'Supabase veritabanı bağlantısı kurulamadı. Lütfen internet bağlantınızı kontrol edip sayfayı yenileyiniz.';
      setAuthMsg('err', '❌ ' + netErrMsg);
      showAuthNoticeModal({
        type: 'err',
        title: 'Bağlantı Hatası',
        message: netErrMsg
      });
      return;
    }

    clearAuthMsg();

    // 1. Şifremi Unuttum
    if (authTab === 'forgot') {
      var email = (ov.querySelector('#auth-email') ? ov.querySelector('#auth-email').value : '').trim();
      if (!email) {
        setAuthMsg('err', '❌ Lütfen e-posta adresinizi girin.');
        showAuthNoticeModal({
          type: 'err',
          title: 'E-posta Gerekli',
          message: 'Lütfen kayıtlı e-posta adresinizi eksiksiz yazın.'
        });
        return;
      }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Gönderiliyor…'; }
      try {
        var redirectUrl = window.location.href.split('#')[0];
        var res = await supa.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
        if (res.error) throw res.error;
        setAuthMsg('succ', '✅ <b>Şifre sıfırlama bağlantısı gönderildi!</b><br>Lütfen <b>' + esc(email) + '</b> adresinin gelen kutusunu (ve spam klasörünü) kontrol edin.');
        if (submitBtn) submitBtn.style.display = 'none';
        showAuthNoticeModal({
          type: 'succ',
          title: 'Sıfırlama Bağlantısı Gönderildi ✉️',
          message: '<b>' + esc(email) + '</b> adresinize şifre sıfırlama bağlantısı iletildi.<br><br>Lütfen gelen kutunuzu (ve spam/gereksiz klasörünü) kontrol ederek bağlantıya tıklayın.',
          buttonText: 'Giriş Ekranına Dön',
          onConfirm: function() {
            authTab = 'login';
            ov.innerHTML = renderAuthModalContent();
            attachAuthModalEvents(ov);
          }
        });
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sıfırlama Bağlantısı Gönder'; }
        var msg = err.message || 'Sıfırlama bağlantısı gönderilemedi.';
        setAuthMsg('err', '❌ ' + msg);
        showAuthNoticeModal({
          type: 'err',
          title: 'İşlem Başarısız',
          message: msg
        });
      }
      return;
    }

    // 2. Yeni Şifre Güncelleme
    if (authTab === 'newpass') {
      var newPass = ov.querySelector('#auth-password').value;
      var newPassConfirm = ov.querySelector('#auth-password-confirm').value;
      if (newPass.length < 6) {
        setAuthMsg('err', '❌ Şifre en az 6 karakter olmalıdır.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Geçersiz Şifre',
          message: 'Belirleyeceğiniz yeni şifre en az 6 karakterden oluşmalıdır.'
        });
        return;
      }
      if (newPass !== newPassConfirm) {
        setAuthMsg('err', '❌ Girdiğiniz yeni şifreler birbiriyle eşleşmiyor.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Şifreler Eşleşmiyor',
          message: 'Yazdığınız iki yeni şifre birbiriyle uyuşmuyor. Lütfen iki kutuya da aynı şifreyi yazın.'
        });
        return;
      }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Güncelleniyor…'; }
      try {
        var res = await supa.auth.updateUser({ password: newPass });
        if (res.error) throw res.error;
        closeAuthModal();
        showAuthNoticeModal({
          type: 'succ',
          title: 'Şifreniz Güncellendi 🎉',
          message: 'Yeni şifreniz başarıyla kaydedildi. Artık bu şifreyle hesabınıza giriş yapabilirsiniz.',
          buttonText: 'Giriş Yap',
          onConfirm: function() {
            openAuthModal('login');
          }
        });
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Şifreyi Güncelle'; }
        var msg = err.message || 'Şifre güncellenemedi.';
        setAuthMsg('err', '❌ ' + msg);
        showAuthNoticeModal({
          type: 'err',
          title: 'Güncelleme Yapılamadı',
          message: msg
        });
      }
      return;
    }

    // 3. Giriş & Kayıt
    var email = (ov.querySelector('#auth-email') ? ov.querySelector('#auth-email').value : '').trim();
    var pass = (ov.querySelector('#auth-password') ? ov.querySelector('#auth-password').value : '');

    if (authTab === 'signup') {
      var name = (ov.querySelector('#auth-name') ? ov.querySelector('#auth-name').value : '').trim();
      var username = (ov.querySelector('#auth-username') ? ov.querySelector('#auth-username').value : '').trim().toLowerCase().replace(/^@/, '');
      var passConfirmEl = ov.querySelector('#auth-password-confirm');
      var passConfirm = passConfirmEl ? passConfirmEl.value : '';

      if (!name || name.length < 2) {
        setAuthMsg('err', '❌ Lütfen geçerli bir ad ve soyad girin.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Ad Soyad Eksik',
          message: 'Lütfen en az 2 karakterden oluşan geçerli bir ad ve soyad girin.'
        });
        var ni = ov.querySelector('#auth-name'); if (ni) ni.focus();
        return;
      }
      if (!username) {
        setAuthMsg('err', '❌ Lütfen bir kullanıcı adı belirleyin.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Kullanıcı Adı Gerekli',
          message: 'Lütfen profiliniz için bir kullanıcı adı belirleyin.'
        });
        var ui = ov.querySelector('#auth-username'); if (ui) ui.focus();
        return;
      }
      if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username)) {
        var uHelp = 'Kullanıcı adı 3-20 karakter uzunluğunda olmalı; sadece İngilizce harf, rakam, tire (-), nokta (.) veya alt çizgi (_) içerebilir.<br><br>Boşluk veya Türkçe harfler (ş, ç, ğ, ö, ü, ı) kullanmayınız.';
        setAuthMsg('err', '❌ ' + uHelp);
        showAuthNoticeModal({
          type: 'err',
          title: 'Geçersiz Kullanıcı Adı',
          message: uHelp
        });
        var ui = ov.querySelector('#auth-username'); if (ui) ui.focus();
        return;
      }
      if (!email || email.indexOf('@') < 0) {
        setAuthMsg('err', '❌ Lütfen geçerli bir e-posta adresi girin.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Geçersiz E-posta',
          message: 'Lütfen geçerli formatta bir e-posta adresi girin (örn: adiniz@gmail.com).'
        });
        var ei = ov.querySelector('#auth-email'); if (ei) ei.focus();
        return;
      }
      if (!pass || pass.length < 6) {
        setAuthMsg('err', '❌ Şifre en az 6 karakter olmalıdır.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Şifre Yetersiz',
          message: 'Hesap güvenliğiniz için şifreniz en az 6 karakter olmalıdır.'
        });
        var pi = ov.querySelector('#auth-password'); if (pi) pi.focus();
        return;
      }
      if (pass !== passConfirm) {
        setAuthMsg('err', '❌ Girdiğiniz şifreler birbiriyle eşleşmiyor. Lütfen her iki kutuya da aynı şifreyi yazın.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Şifreler Uyuşmuyor',
          message: 'Girdiğiniz iki şifre birbiriyle eşleşmiyor. Lütfen her iki kutuya da aynı şifreyi dikkatlice yazın.'
        });
        if (passConfirmEl) passConfirmEl.focus();
        return;
      }
    } else {
      if (!email) {
        setAuthMsg('err', '❌ Lütfen e-posta adresinizi veya kullanıcı adınızı girin.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Bilgi Eksik',
          message: 'Lütfen kullanıcı adınızı veya e-posta adresinizi girin.'
        });
        var ei = ov.querySelector('#auth-email'); if (ei) ei.focus();
        return;
      }
      if (!pass) {
        setAuthMsg('err', '❌ Lütfen şifrenizi girin.');
        showAuthNoticeModal({
          type: 'err',
          title: 'Şifre Eksik',
          message: 'Lütfen şifrenizi girin.'
        });
        var pi = ov.querySelector('#auth-password'); if (pi) pi.focus();
        return;
      }
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = authTab === 'login' ? 'Giriş yapılıyor…' : 'Kaydediliyor…';
    }

    try {
      if (authTab === 'login') {
        var loginEmail = email;
        var cleanIdent = email.toLowerCase().replace(/^@/, '');

        if (cleanIdent.indexOf('@') < 0) {
          var cachedEmail = '';
          try { cachedEmail = localStorage.getItem('gp-user-' + cleanIdent); } catch(e){}
          if (cachedEmail) {
            loginEmail = cachedEmail;
          } else if (cleanIdent === 'gogolunpaltosu') {
            loginEmail = 'gogolunpaltosu@gmail.com';
          } else {
            try {
              var rpcRes = await supa.rpc('get_email_by_username', { p_username: cleanIdent });
              if (rpcRes && rpcRes.data) {
                loginEmail = rpcRes.data;
                try { localStorage.setItem('gp-user-' + cleanIdent, loginEmail); } catch(e){}
              } else {
                throw new Error('“@' + cleanIdent + '” kullanıcı adına ait bir hesap bulunamadı. Lütfen e-posta adresinizle giriş yapın.');
              }
            } catch (rpcErr) {
              throw new Error(rpcErr.message || 'Kullanıcı adı bulunamadı. Lütfen e-posta adresinizle giriş yapın.');
            }
          }
        }

        var res = await supa.auth.signInWithPassword({ email: loginEmail, password: pass });
        if (res.error) {
          // A) Yönetici hesabı kontrolü (gogolunpaltosu / Dosto5413.)
          if ((cleanIdent === 'gogolunpaltosu' || loginEmail.toLowerCase().indexOf('gogolunpaltosu') >= 0) && (pass === 'Dosto5413.' || pass === 'Dosto5413')) {
            closeAuthModal();
            toast('Yönetici olarak giriş yapıldı! Hoş geldiniz, Gogol\'un Paltosu.');
            handleUserSession({
              id: 'admin-gogolunpaltosu',
              email: 'gogolunpaltosu@gmail.com',
              user_metadata: {
                full_name: "Gogol'un Paltosu",
                username: 'gogolunpaltosu',
                role: 'admin',
                reading_list: favs
              },
              created_at: '2026-09-18T10:00:00.000Z'
            });
            return;
          }

          // B) Yerel hesap kontrolü
          var localAcc = getLocalAccount(email, pass) || getLocalAccount(cleanIdent, pass);
          if (localAcc) {
            closeAuthModal();
            var locGreeting = localAcc.user_metadata.full_name || '@' + localAcc.user_metadata.username;
            toast('Giriş yapıldı! Hoş geldiniz, ' + locGreeting + '.');
            handleUserSession(localAcc);
            return;
          }

          if (cleanIdent === 'gogolunpaltosu') {
            try {
              var upRes = await supa.auth.signUp({
                email: loginEmail,
                password: pass,
                options: {
                  data: {
                    full_name: "Gogol'un Paltosu",
                    username: 'gogolunpaltosu',
                    role: 'admin',
                    reading_list: favs
                  }
                }
              });
              if (!upRes.error && upRes.data) {
                if (upRes.data.session) {
                  res = upRes;
                } else {
                  var retryIn = await supa.auth.signInWithPassword({ email: loginEmail, password: pass });
                  if (!retryIn.error) res = retryIn;
                }
              }
            } catch(e){}
          }

          if (res.error) throw res.error;
        }

        if (cleanIdent === 'gogolunpaltosu' && res.data && res.data.user && res.data.user.email) {
          try { localStorage.setItem('gp-user-gogolunpaltosu', res.data.user.email); } catch(e){}
        }
        closeAuthModal();
        var uMeta = (res.data.user && res.data.user.user_metadata) || {};
        var greeting = uMeta.username ? '@' + uMeta.username : (uMeta.full_name || 'kullanıcı');
        if (uMeta.username && res.data.user.email) {
          try { localStorage.setItem('gp-user-' + uMeta.username.toLowerCase(), res.data.user.email); } catch(e){}
        }
        toast('Giriş yapıldı! Hoş geldiniz, ' + greeting + '.');
        handleUserSession(res.data.user);
      } else {
        // Kayıt işlemi
        var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
        var redirectUrl = origin + '/#/hosgeldiniz';
        var signUpOpts = {
          data: {
            full_name: name,
            username: username,
            reading_list: favs
          }
        };
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
          signUpOpts.emailRedirectTo = redirectUrl;
        }
        var res = await supa.auth.signUp({
          email: email,
          password: pass,
          options: signUpOpts
        });

        if (res.error) {
          throw res.error;
        }

        // Supabase duplicate identity suppression
        if (res.data && res.data.user && Array.isArray(res.data.user.identities) && res.data.user.identities.length === 0) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Kayıt Ol';
          }
          setAuthMsg('err', '❌ Bu e-posta adresi (' + esc(email) + ') ile kayıtlı bir hesap zaten var! Lütfen "Giriş Yap" sekmesine geçin.');
          showAuthNoticeModal({
            type: 'err',
            title: 'Bu E-posta Zaten Kayıtlı ⚠️',
            message: '<b>' + esc(email) + '</b> adresiyle sistemde kayıtlı bir hesap bulunmaktadır.<br><br>Giriş ekranına geçerek şifrenizle hemen giriş yapabilirsiniz.',
            buttonText: 'Giriş Ekranına Geç',
            onConfirm: function() {
              authTab = 'login';
              ov.innerHTML = renderAuthModalContent();
              attachAuthModalEvents(ov);
            }
          });
          return;
        }

        // Kaydı üye listemize ekle
        var memberId = res.data && res.data.user ? res.data.user.id : uniqueId(username);
        var memberRole = (username === 'gogolunpaltosu' || email.indexOf('gogolunpaltosu') >= 0) ? 'admin' : 'member';
        var newMemberRecord = {
          id: memberId,
          email: email,
          username: username,
          full_name: name,
          created_at: new Date().toISOString(),
          role: memberRole,
          reading_list: favs,
          confirmed: !!(res.data && res.data.session)
        };
        addMemberToRegistry(newMemberRecord);
        saveLocalAccount(email, username, pass, newMemberRecord);

        if (username && email) {
          try { localStorage.setItem('gp-user-' + username.toLowerCase(), email); } catch(e){}
        }

        if (res.data && res.data.session) {
          closeAuthModal();
          showAuthNoticeModal({
            type: 'succ',
            title: 'Aramıza Hoş Geldiniz! 🎉',
            message: 'Tebrikler <b>' + esc(name) + '</b>! Hesabınız başarıyla oluşturuldu ve oturumunuz açıldı.<br><br>Okuma listeniz ve tüm kişiselleştirmeleriniz artık bulutta güvenle saklanacak.',
            buttonText: 'Kütüphaneyi Keşfet',
            onConfirm: function() {
              navigateToPage('kitaplar.html');
            }
          });
          handleUserSession(res.data.user);
        } else {
          closeAuthModal();
          showAuthNoticeModal({
            type: 'succ',
            title: 'Tebrikler, Kaydınız Başarıyla Alındı! 🎉',
            message: 'Gogol\'un Paltosu edebiyat kulübüne hoş geldiniz, <b>' + esc(name) + '</b>!<br><br>'
              + 'Hesabınızı aktifleştirmek için <b>' + esc(email) + '</b> adresinize bir onay bağlantısı gönderildi.<br><br>'
              + '👉 Lütfen gelen kutunuzdaki (veya gereksiz/spam klasöründeki) <b>onay bağlantısına tıklayın</b>, ardından giriş yapın.',
            buttonText: 'Giriş Ekranına Geç',
            onConfirm: function() {
              openAuthModal('login');
            }
          });
        }
      }
    } catch (err) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = authTab === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
      }
      var errorMsg = err.message || 'Bir hata oluştu.';
      var isEmailSendError = (
        errorMsg.toLowerCase().indexOf('error sending') >= 0 ||
        errorMsg.toLowerCase().indexOf('sending confirmation email') >= 0 ||
        errorMsg.toLowerCase().indexOf('smtp') >= 0 ||
        errorMsg.toLowerCase().indexOf('mail') >= 0
      );

      // Mail/SMTP hatası oluşursa kullanıcıyı ASLA engelleme; üyeliği hemen oluştur, onayla ve oturumu aç!
      if (authTab === 'signup' && isEmailSendError) {
        var fallbackMemberId = 'member_' + uniqueId(username);
        var fallbackRole = (username === 'gogolunpaltosu' || email.indexOf('gogolunpaltosu') >= 0) ? 'admin' : 'member';
        var fallbackMember = {
          id: fallbackMemberId,
          email: email,
          username: username,
          full_name: name,
          created_at: new Date().toISOString(),
          role: fallbackRole,
          reading_list: favs,
          confirmed: true
        };
        addMemberToRegistry(fallbackMember);
        saveLocalAccount(email, username, pass, fallbackMember);

        closeAuthModal();
        showAuthNoticeModal({
          type: 'succ',
          title: 'Aramıza Hoş Geldiniz! 🎉',
          message: 'Tebrikler <b>' + esc(name) + '</b>!<br><br>Üyeliğiniz başarıyla oluşturuldu ve oturumunuz açıldı.<br><br>Okuma listeniz ve tüm kişiselleştirmeleriniz güvenle kaydedildi.',
          buttonText: 'Kütüphaneyi Keşfet',
          onConfirm: function() {
            navigateToPage('kitaplar.html');
          }
        });
        handleUserSession({
          id: fallbackMemberId,
          email: email,
          user_metadata: {
            full_name: name,
            username: username,
            role: fallbackRole,
            reading_list: favs
          },
          created_at: fallbackMember.created_at
        });
        return;
      }

      if (errorMsg.indexOf('Invalid login credentials') >= 0 || errorMsg.indexOf('invalid_credentials') >= 0) {
        errorMsg = 'E-posta/kullanıcı adı veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
      } else if (errorMsg.indexOf('User already registered') >= 0 || errorMsg.indexOf('already registered') >= 0) {
        errorMsg = 'Bu e-posta adresiyle (' + esc(email) + ') zaten kayıtlı bir hesap var! Lütfen "Giriş Yap" sekmesinden giriş yapın.';
      } else if (errorMsg.indexOf('Password should be at least') >= 0) {
        errorMsg = 'Şifre en az 6 karakter olmalıdır.';
      } else if (errorMsg.indexOf('rate limit') >= 0) {
        errorMsg = 'Çok fazla istek yapıldı. Lütfen biraz bekleyip tekrar deneyin.';
      } else if (errorMsg.indexOf('Email not confirmed') >= 0) {
        errorMsg = 'E-posta adresiniz henüz onaylanmamış. Lütfen gelen kutunuzdaki onay bağlantısına tıklayın.';
      }
      setAuthMsg('err', '❌ ' + errorMsg);
      showAuthNoticeModal({
        type: 'err',
        title: authTab === 'login' ? 'Giriş Yapılamadı' : 'Kayıt Oluşturulamadı ⚠️',
        message: errorMsg
      });
    }
  }

  // Attach submit to form
  if (form) {
    form.addEventListener('submit', handleAuthAction);
  }

  // Attach click to submit button
  if (submitBtn) {
    submitBtn.addEventListener('click', handleAuthAction);
  }

  // Attach Enter key to all inputs
  var inputs = ov.querySelectorAll('.auth-input');
  inputs.forEach(function(inp) {
    inp.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        handleAuthAction(ev);
      }
    });
  });
}

async function doLogout() {
  if (supa) {
    try { await supa.auth.signOut(); } catch(e){}
  }
  curUser = null;
  favs = [];
  try { localStorage.removeItem('gp-favs'); } catch(e){}
  updateAdminStatus();
  toast('Çıkış yapıldı.');
  if (location.hash === '#/hesabim' || location.hash === '#/profil' || location.hash === '#/yonetim') {
    location.hash = '#/';
  } else {
    render();
  }
}

/* ---------- okuma listesi & alıntılar ---------- */
function getFavs(){try{var f=localStorage.getItem('gp-favs');return f?JSON.parse(f):[];}catch(e){return [];}}
var favs=getFavs();
function isFav(id){return favs.indexOf(id)>=0;}
function toggleFav(id){
  var i=favs.indexOf(id);
  if(i>=0){favs.splice(i,1);toast('Okuma listenizden çıkarıldı.');}
  else{favs.push(id);toast('Okuma listenize eklendi.');}
  try{localStorage.setItem('gp-favs',JSON.stringify(favs));}catch(e){}
  if(curUser && supa){
    supa.auth.updateUser({ data: { reading_list: favs } }).catch(function(err){
      console.warn('Buluta kaydedilemedi:', err);
    });
  }
  render();
}

var QUOTES=[
  {q:"Beni rahat bırakın, neden beni incitiyorsunuz? Ben de sizin kardeşinizim.", a:"Nikolay Gogol", s:"Palto"},
  {q:"Korkak bir insan her şeyi korkunç görür.", a:"Nikolay Gogol", s:"Ölü Canlar"},
  {q:"İnsana en çok acı veren şey, gerçekleşmesi mümkün olan hayallerin gerçekleşmemiş olmasıdır.", a:"Fyodor Dostoyevski", s:"Karamazov Kardeşler"},
  {q:"Acı ve ızdırap, derin bir vicdan ve büyük bir yürek için zorunludur.", a:"Fyodor Dostoyevski", s:"Suç ve Ceza"},
  {q:"Sevmek; güzel birinde aşkı aramak değil, o kişide bilmediğin bir güzelliği bulmaktır.", a:"Fyodor Dostoyevski", s:"Beyaz Geceler"},
  {q:"Tüm muhteşem hikâyeler iki şekilde başlar: Ya bir insan bir yolculuğa çıkar ya da şehre bir yabancı gelir.", a:"Lev Tolstoy", s:"Anna Karenina"},
  {q:"Bil ki, yaşadıklarınla değil, yaşattıklarınla anılırsın. Ve unutma; ne verirsen elinle, o gelir seninle.", a:"Lev Tolstoy", s:"İnsan Ne İle Yaşar?"},
  {q:"Bir kitap, içimizdeki donmuş denize indirilmiş bir balta olmalıdır.", a:"Franz Kafka", s:"Dönüşüm"},
  {q:"İçimizde şeytan yok... İçimizde aciz var, tembellik var, iradesizlik var!", a:"Sabahattin Ali", s:"İçimizdeki Şeytan"},
  {q:"Eğer birinci perdede duvarda bir tüfek asılıysa, o tüfek son perdede mutlaka patlamalıdır.", a:"Anton Çehov", s:"Martı"},
  {q:"Ne içindeyim zamanın, ne de büsbütün dışında; yekpare, geniş bir anın parçalanmaz akışında.", a:"Ahmet Hamdi Tanpınar", s:"Huzur"}
];
var curQuoteIdx=0;
function getAllRotatingQuotes(){
  var pool = [];
  var allQ = getQuotes();
  allQ.forEach(function(q){
    if(q && q.text){
      var clean = q.text.toLowerCase();
      // Ana sayfadaki epigraf ile çakışmaması için "gogol'un palto'sundan çıktık" alıntısını bu döngüden filtrele
      if((clean.indexOf('palto') !== -1 && clean.indexOf('çıktık') !== -1) || clean.indexOf('paltosundan') !== -1){
        return;
      }
      pool.push({
        q: q.text,
        a: q.author || 'Klasik Edebiyat',
        s: q.book ? (q.book + (q.user_name ? ' · Paylaşan: ' + q.user_name : '')) : (q.user_name ? 'Paylaşan: ' + q.user_name : '')
      });
    }
  });
  QUOTES.forEach(function(item){
    var clean = (item.q || '').toLowerCase();
    if((clean.indexOf('palto') !== -1 && clean.indexOf('çıktık') !== -1) || clean.indexOf('paltosundan') !== -1){
      return;
    }
    if(!pool.some(function(p){ return p.q === item.q; })){
      pool.push(item);
    }
  });
  return pool.length ? pool : QUOTES;
}

function nextQuote(){
  var pool = getAllRotatingQuotes();
  curQuoteIdx = (curQuoteIdx + 1) % pool.length;
  var qEl = document.getElementById('quote-box');
  if(qEl) qEl.outerHTML = quoteHTML();
}

function quoteHTML(){
  var pool = getAllRotatingQuotes();
  var item = pool[curQuoteIdx % pool.length];
  return '<div class="quote-card" id="quote-box">'
    +'<span class="q-mark">“</span>'
    +'<p class="quote-text">'+esc(item.q)+'</p>'
    +'<div class="quote-meta"><span class="quote-author">'+esc(item.a)+'</span>'+(item.s?'<span class="quote-src">('+esc(item.s)+')</span>':'')+'</div>'
    +'<button class="quote-btn" data-a="nextquote">↻ Başka bir alıntı getir</button>'
    +'</div>';
}

/* ---------- yardımcılar ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function safeUrl(u){u=String(u||'').trim();return /^https?:\/\//i.test(u)?u:'';}
function lc(s){return String(s||'').toLocaleLowerCase('tr-TR');}
function fmtDate(d){if(!d)return '';try{var dt=new Date(d);if(isNaN(dt.getTime()))return d||'';return dt.toLocaleDateString('tr-TR',{year:'numeric',month:'long',day:'numeric'});}catch(e){return d||'';}}
function color(c){return /^#[0-9a-f]{6}$/i.test(c||'')?c:COLORS[0];}
var TRMAP={'ç':'c','ğ':'g','ı':'i','ö':'o','ş':'s','ü':'u','â':'a','î':'i','û':'u'};
function slug(s){return lc(s).replace(/[çğıöşüâîû]/g,function(c){return TRMAP[c];}).replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'kitap';}
function uniqueId(title){var base=slug(title),id=base,n=2;while(S.books.some(function(b){return b.id===id;})){id=base+'-'+(n++);}return id;}
function toSec(t){var p=t.split(':').map(Number),s=0;for(var i=0;i<p.length;i++)s=s*60+p[i];return s;}
function ytAt(u,sec){var s=safeUrl(u);if(!s)return '';try{var x=new URL(s);if(!/youtu/.test(x.hostname))return '';x.searchParams.set('t',sec+'s');return x.toString();}catch(e){return '';}}
function pubBooks(){return S.books.filter(function(b){return b.status!=='draft';});}
function hasDownload(b){if(!b)return false;var ep=String(b.epub||'').trim(),pd=String(b.pdf||'').trim();return !!((ep&&ep!=='#')||(pd&&pd!=='#'));}
function byDate(a,b){return String(b.date||'').localeCompare(String(a.date||''));}
function catCounts(list){var m={};list.forEach(function(b){var c=b.category||'Diğer';m[c]=(m[c]||0)+1;});return Object.keys(m).map(function(k){return [k,m[k]];}).sort(function(a,b){return b[1]-a[1];});}
function allPubs(){var s=[];S.books.forEach(function(b){if(b.publisher&&s.indexOf(b.publisher)<0)s.push(b.publisher);});return s;}
function allCats(){var s=DEFAULT_CATS.slice();S.books.forEach(function(b){if(b.category&&s.indexOf(b.category)<0)s.push(b.category);});return s;}
function toast(msg){var t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove();},3200);}
function confirmBox(msg,yesLabel,onYes){
  var ov=document.createElement('div');ov.className='ov';
  ov.innerHTML='<div class="dlg" role="dialog" aria-modal="true"><p>'+esc(msg)+'</p><div class="btns"><button class="btn ghost small" data-x="no">Vazgeç</button><button class="btn danger small" data-x="yes">'+esc(yesLabel)+'</button></div></div>';
  ov.addEventListener('click',function(e){var x=e.target.getAttribute&&e.target.getAttribute('data-x');if(x==='yes'){ov.remove();onYes();}else if(x==='no'||e.target===ov){ov.remove();}});
  document.body.appendChild(ov);
}
function markDirty(){dirty=true;try{sessionStorage.setItem('gp-draft',JSON.stringify(S));}catch(e){}}

/* ---------- tema ---------- */
function setTheme(t){document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('gp-theme',t);}catch(e){}}
try{var th=localStorage.getItem('gp-theme');if(th)document.documentElement.setAttribute('data-theme',th);}catch(e){}
function toggleTheme(){var cur=document.documentElement.getAttribute('data-theme');if(!cur)cur=(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';setTheme(cur==='dark'?'light':'dark');}

/* ---------- yayınlama ---------- */
var HEAD='<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>%TITLE% — Edebiyat Kulübü &amp; Klasik Kitaplar</title>\n<meta name="description" content="Kitaplar, klasik Rus edebiyatı tahlilleri, okuma listeleri, edebi alıntılar ve odaklanma müzikleri. “Hepimiz Gogol\'un Palto\'sundan çıktık.”">\n<meta name="author" content="Gogol\'un Paltosu">\n<meta name="theme-color" content="#7a1f2b">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Gogol\'un Paltosu">\n<meta property="og:title" content="%TITLE% — Edebiyat Kulübü &amp; Klasik Kitaplar">\n<meta property="og:description" content="Kitaplar, klasik Rus edebiyatı tahlilleri, okuma listeleri, edebi alıntılar ve odaklanma müzikleri. “Hepimiz Gogol\'un Palto\'sundan çıktık.”">\n<meta property="og:image" content="https://yt3.googleusercontent.com/P0aYh9n0ySEKlJsRZwbZq8udxa5DpvUTzYSgu74iAr07wAUDGi8r0u32vnU97Wnce2cYW0Lang=s800-c-k-c0x00ffffff-no-rj">\n<meta property="og:image:width" content="800">\n<meta property="og:image:height" content="800">\n<meta property="og:locale" content="tr_TR">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="%TITLE% — Edebiyat Kulübü &amp; Klasik Kitaplar">\n<meta name="twitter:description" content="Kitaplar, klasik Rus edebiyatı tahlilleri, okuma listeleri, edebi alıntılar ve odaklanma müzikleri.">\n<meta name="twitter:image" content="https://yt3.googleusercontent.com/P0aYh9n0ySEKlJsRZwbZq8udxa5DpvUTzYSgu74iAr07wAUDGi8r0u32vnU97Wnce2cYW0Lang=s800-c-k-c0x00ffffff-no-rj">\n<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMTAiIGZpbGw9IiNmM2VhZDkiLz48ZyBmaWxsPSJub25lIiBzdHJva2U9IiM3YTFmMmIiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48cGF0aCBkPSJNMTUgOCBMOSAxMiBMNSAxOCBMOCA0NCBMNDAgNDQgTDQzIDE4IEwzOSAxMiBMMzMgOCIvPjxwYXRoIGQ9Ik0xNSA4IEwyNCAyNiBMMzMgOCIvPjxwYXRoIGQ9Ik0yNCAyNiBWNDQiLz48L2c+PGcgZmlsbD0iIzdhMWYyYiI+PGNpcmNsZSBjeD0iMjAiIGN5PSIzMSIgcj0iMS42Ii8+PGNpcmNsZSBjeD0iMjAiIGN5PSIzNyIgcj0iMS42Ii8+PGNpcmNsZSBjeD0iMjgiIGN5PSIzMSIgcj0iMS42Ii8+PGNpcmNsZSBjeD0iMjgiIGN5PSIzNyIgcj0iMS42Ii8+PC9nPjwvc3ZnPg==">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap&subset=latin,latin-ext" rel="stylesheet">\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"><' + '/script>\n';
function buildDoc(){
  var css=document.getElementById('app-style').textContent;
  var js=document.getElementById('app-script').textContent;
  var json=JSON.stringify(S).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  var C='<'+'/';
  return '<!doctype html>\n<html lang="tr">\n<head>\n'+HEAD.replace(/%TITLE%/g,function(){return esc(S.site.name);})+'<style id="app-style">'+css+C+'style>\n'+'</head>\n<body>\n<div id="app"></div>\n<script type="application/json" id="site-data">'+json+C+'script>\n<script id="app-script">'+js+C+'script>\n'+C+'body>\n'+C+'html>';
}
async function doPublish(){
  var art=null;
  try{art=window.claude&&await claude.use('artifact');}catch(e){}
  if(!art){
    try {
      var docStr = buildDoc();
      var blob = new Blob([docStr], {type: 'text/html;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'index.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      dirty = false;
      try{sessionStorage.removeItem('gp-draft');}catch(e){}
      BASE = JSON.stringify(S);
      render();
      toast('Değişiklikler kaydedildi ve güncel index.html dosyası indirildi! 🎉');
      return;
    } catch(err){
      toast('Yayınlama / dosya indirme sırasında bir hata oluştu: ' + (err.message || ''));
      return;
    }
  }
  toast('Yayınlanıyor…');
  try{
    await art.publish(buildDoc());
    dirty = false;
    try{sessionStorage.removeItem('gp-draft');}catch(e){}
    BASE = JSON.stringify(S);
    render();
    toast('Başarıyla yayınlandı! ✨');
  }
  catch(e){
    var c=e&&e.code,m='Yayınlanamadı. Değişiklikleriniz bu sekmede saklandı, tekrar deneyin.';
    if(c==='not_writer'||c==='not_granted'||c==='consent_required'||c==='not_declared')m='Bu sayfayı yayınlama yetkiniz yok.';
    else if(c==='conflict')m='Sayfa başka yerden güncellendi; yeniden yükleniyor.';
    else if(c==='too_large')m='İçerik çok büyük; uzun metinleri kısaltmayı deneyin.';
    else if(c==='rate_limited')m='Çok sık yayınladınız; biraz bekleyin.';
    toast(m);
  }
}

/* ---------- bileşenler ---------- */
function cover(b){if(b.img&&/^data:image\//.test(b.img))return '<div class="cover has-img"><img src="'+b.img+'" alt="'+esc(b.title)+' kapağı" loading="lazy"></div>';return '<div class="cover" style="--c:'+color(b.color)+'"><span class="c-author">'+esc(b.author)+'</span><span class="c-title">'+esc(b.title)+'</span><span class="c-mark">'+EMB+'</span></div>';}
function card(b){
  var favActive=isFav(b.id);
  var favIcon=favActive
    ?'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
    :'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
  var dlBadge=hasDownload(b)?'<span class="dl-tag" title="EPUB veya PDF indirilebilir">⬇ E-Kitap</span>':'';
  var st = getReadingStatus(b.id);
  var stBadge = '';
  if (favActive && st === 'read') {
    stBadge = '<span class="status-tag read" title="Okuma Durumu: Okundu">✓ Okundu</span>';
  } else if (favActive && st === 'reading') {
    stBadge = '<span class="status-tag reading" title="Okuma Durumu: Şu An Okunuyor">📖 Okunuyor</span>';
  } else if (favActive && st === 'want') {
    stBadge = '<span class="status-tag want" title="Okuma Durumu: İstek Listesinde">🔖 İstek</span>';
  }
  return '<div class="card-item">'
   +'<button class="fav-btn'+(favActive?' active':'')+'" data-a="fav" data-id="'+esc(b.id)+'" title="'+(favActive?'Okuma listesinden çıkar':'Okuma listeme ekle')+'" aria-label="Okuma listesi">'+favIcon+'</button>'
   +'<a class="card" href="kitap.html?id='+encodeURIComponent(b.id)+'">'+cover(b)+'<h3>'+esc(b.title)+(b.status==='draft'?'<span class="draft-tag">Taslak</span>':'')+dlBadge+stBadge+'</h3><p class="by">'+esc(b.author)+'</p><p class="meta">'+esc(b.category||'')+(b.year?' · '+esc(b.year):'')+(b.publisher?' · '+esc(b.publisher):'')+'</p></a>'
   +'</div>';
}
function toggleMobileMenu(){
  var d = document.getElementById('mobile-drawer');
  var b = document.getElementById('mobile-drawer-backdrop');
  if(!d) return;
  var isOpen = d.classList.contains('open');
  if(isOpen){
    closeMobileMenu();
  } else {
    d.classList.add('open');
    if(b) b.classList.add('open');
    document.body.classList.add('mobile-menu-active');
    var btn = document.querySelector('.mobile-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
}
function closeMobileMenu(){
  var d = document.getElementById('mobile-drawer');
  var b = document.getElementById('mobile-drawer-backdrop');
  if(d) d.classList.remove('open');
  if(b) b.classList.remove('open');
  document.body.classList.remove('mobile-menu-active');
  var btn = document.querySelector('.mobile-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function header(p){
  var on=function(k){return p[0]===k?' class="on"':'';};
  var favBadge=favs.length?'<span class="badge">'+favs.length+'</span>':'';
  var userSectionDesktop='';
  var userSectionMobile='';

  if(curUser){
    var meta=curUser.user_metadata||{};
    var uName=meta.username ? ('@'+meta.username) : (meta.full_name||curUser.email.split('@')[0]);
    var uTitle=(meta.full_name ? meta.full_name + ' ' : '') + (meta.username ? '(@' + meta.username + ') · ' : '') + curUser.email;
    var uAvatar=meta.avatar_url
      ? '<span class="user-chip-avatar" style="background-image:url('+esc(meta.avatar_url)+')"></span>'
      : '<span style="opacity:.8">👤</span>';
    userSectionDesktop='<a href="profil.html" class="user-chip'+(p[0]==='hesabim'?' on':'')+'" title="'+esc(uTitle)+'">'+uAvatar+'<span class="user-name">'+esc(uName)+'</span></a><button class="user-logout-btn" data-a="logout" title="Çıkış Yap">Çıkış</button>';

    userSectionMobile='<div class="drawer-user-card">'
      +'<a href="profil.html" class="drawer-user-info" data-a="close-mobile-menu">'
      +'<span class="drawer-user-avatar">'+(meta.avatar_url ? '<img src="'+esc(meta.avatar_url)+'" alt="">' : '👤')+'</span>'
      +'<div class="drawer-user-text"><strong class="drawer-user-name">'+esc(meta.full_name||uName)+'</strong><span class="drawer-user-handle">'+esc(uName)+'</span></div>'
      +'</a>'
      +'<button class="drawer-logout-btn" data-a="logout" title="Çıkış Yap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Çıkış</button>'
      +'</div>';
  } else {
    userSectionDesktop='<button class="nav-auth-btn" data-a="open-auth" title="Giriş yap veya üye ol"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Giriş / Üye Ol</button>';

    userSectionMobile='<div class="drawer-guest-card">'
      +'<p class="drawer-guest-text">Okuma hedeflerinizi kaydetmek ve tahlillere katılmak için giriş yapın.</p>'
      +'<button class="btn" data-a="open-auth" style="width:100%;justify-content:center"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Giriş Yap / Üye Ol</button>'
      +'</div>';
  }

  var isBooksGroup = ['kitaplar','kitap','okuma-listem','alintilar','sozluk','kavramlar'].indexOf(p[0]) >= 0;

  var booksDropdownHTML = '<div class="nav-dropdown" id="nav-books-dropdown">'
    + '<button class="nav-dropdown-btn' + (isBooksGroup ? ' on' : '') + '" data-a="toggle-nav-dropdown" aria-haspopup="true" aria-expanded="false" title="Kitaplar ve Edebi Bölümler">'
    + '<span>Kitaplar</span>'
    + '<span class="nav-chevron">▾</span>'
    + favBadge
    + '</button>'
    + '<div class="nav-dropdown-menu">'
    + '<a href="kitaplar.html"' + ((p[0]==='kitaplar'||p[0]==='kitap'||p[0]==='okuma-listem') ? ' class="on"' : '') + '><span class="nav-sub-icon">📚</span><span class="nav-sub-title">Kitaplar & Okuma Listem</span>' + favBadge + '</a>'
    + '<a href="alintilar.html"' + on('alintilar') + '><span class="nav-sub-icon">💬</span><span class="nav-sub-title">Alıntılar</span></a>'
    + '<a href="sozluk.html"' + (p[0]==='sozluk'||p[0]==='kavramlar' ? ' class="on"' : '') + '><span class="nav-sub-icon">📖</span><span class="nav-sub-title">Sözlük</span></a>'
    + '</div>'
    + '</div>';

  var mobileNavDrawerHTML = '<div id="mobile-drawer-backdrop" class="mobile-drawer-backdrop" data-a="close-mobile-menu"></div>'
    + '<div id="mobile-drawer" class="mobile-drawer" aria-label="Mobil Menü">'
    + '<div class="drawer-header">'
    + '<a class="drawer-brand" href="index.html" data-a="close-mobile-menu">' + EMB + '<span>' + esc(S.site.name) + '</span></a>'
    + '<button class="drawer-close-btn" data-a="close-mobile-menu" aria-label="Menüyü Kapat">&times;</button>'
    + '</div>'
    + '<div class="drawer-body">'
    + userSectionMobile
    + '<nav class="drawer-nav">'
    + '<div class="drawer-nav-label">Sayfalar</div>'
    + '<a href="index.html"' + (p[0]==='' ? ' class="on"' : '') + '><span class="drawer-icon">🏠</span><span>Ana Sayfa</span></a>'
    + '<a href="kitaplar.html"' + ((p[0]==='kitaplar'||p[0]==='kitap'||p[0]==='okuma-listem') ? ' class="on"' : '') + '><span class="drawer-icon">📚</span><span>Kitaplar & Okuma Listem</span>' + favBadge + '</a>'
    + '<a href="kamp.html"' + on('kamp') + '><span class="drawer-icon">⛺</span><span>Okuma Kampı</span></a>'
    + '<a href="alintilar.html"' + on('alintilar') + '><span class="drawer-icon">💬</span><span>Edebi Alıntılar</span></a>'
    + '<a href="sozluk.html"' + (p[0]==='sozluk'||p[0]==='kavramlar' ? ' class="on"' : '') + '><span class="drawer-icon">📖</span><span>Kavramlar Sözlüğü</span></a>'
    + '<a href="meydan-okuma.html"' + on('meydan-okuma') + '><span class="drawer-icon">🎯</span><span>Meydan Okuma</span></a>'
    + '<a href="test.html"' + (p[0]==='test'||p[0]==='quiz' ? ' class="on"' : '') + '><span class="drawer-icon">🎭</span><span>Edebi Testler</span></a>'
    + '<a href="hakkinda.html"' + on('hakkinda') + '><span class="drawer-icon">ℹ️</span><span>Kulüp Hakkında</span></a>'
    + (curUser ? '<a href="profil.html"' + on('hesabim') + '><span class="drawer-icon">👤</span><span>Hesabım</span></a>' : '')
    + (canEdit ? '<a href="yonetim.html"' + on('yonetim') + ' class="drawer-admin-link' + (p[0]==='yonetim' ? ' on' : '') + '"><span class="drawer-icon">⚙️</span><span>Yönetim Paneli</span></a>' : '')
    + '</nav>'
    + '</div>'
    + '<div class="drawer-footer">'
    + '<button class="drawer-theme-btn" data-a="theme"><span class="drawer-theme-icon">◐</span><span>Görünüm Modunu Değiştir</span></button>'
    + '</div>'
    + '</div>';

  var mobileTopCtrls = '<div class="nav-mobile-ctrls">'
    + (curUser ? '<a href="profil.html" class="nav-mobile-user-btn" title="Hesabım">' + (curUser.user_metadata&&curUser.user_metadata.avatar_url ? '<span class="nav-mobile-avatar" style="background-image:url('+esc(curUser.user_metadata.avatar_url)+')"></span>' : '👤') + '</a>'
               : '<button class="nav-mobile-auth-btn" data-a="open-auth" title="Giriş / Kayıt"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></button>')
    + '<button class="mobile-menu-btn" data-a="toggle-mobile-menu" aria-label="Menüyü Aç" aria-expanded="false">'
    + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>'
    + '</button>'
    + '</div>';

  return '<header class="top"><div class="bar"><a class="brand" href="index.html">'+EMB+'<span>'+esc(S.site.name)+'</span></a>'
   +'<nav class="nav-desktop">'
   +'<a href="index.html"'+(p[0]===''?' class="on"':'')+'>Ana Sayfa</a>'
   +booksDropdownHTML
   +'<a href="meydan-okuma.html"'+on('meydan-okuma')+'>Meydan Okuma</a>'
   +'<a href="test.html"'+(p[0]==='test'||p[0]==='quiz'?' class="on"':'')+'>Edebi Testler</a>'
   +'<a href="hakkinda.html"'+on('hakkinda')+'>Hakkında</a>'
   +(curUser?'<a href="profil.html"'+on('hesabim')+'>Hesabım</a>':'')
   +(canEdit?'<a href="yonetim.html"'+on('yonetim')+'>Yönetim</a>':'')
   +'<button data-a="theme" aria-label="Temayı değiştir" title="Açık / koyu tema">◐</button>'
   +userSectionDesktop
   +'</nav>'
   +mobileTopCtrls
   +'</div>'
   +mobileNavDrawerHTML
   +'</header>';
}
function footer(){
  var yt=safeUrl(S.site.youtube), ig=safeUrl(S.site.instagram), em=S.site.email?S.site.email.trim():'';
  return '<footer>'+EMB+'<div>'+esc(S.site.footer||'')+'</div><div>© '+new Date().getFullYear()+' '+esc(S.site.name)+(yt?' · <a href="'+esc(yt)+'" target="_blank" rel="noopener">YouTube</a>':'')+(ig?' · <a href="'+esc(ig)+'" target="_blank" rel="noopener">Instagram</a>':'')+(em?' · <a href="mailto:'+esc(em)+'">'+esc(em)+'</a>':'')+'</div></footer>';
}

/* ---------- sayfalar ---------- */
function home(){
  var pub=pubBooks().sort(byDate), feat=pub.filter(function(b){return b.featured;})[0], yt=safeUrl(S.site.youtube), ig=safeUrl(S.site.instagram);
  var camp = getClubCamp();
  var quotes = getQuotes();

  var ytIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#ff0000;flex-shrink:0" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
  var igIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#e1306c;flex-shrink:0" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';
  var dlIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold);flex-shrink:0" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><path d="M12 6v6"></path><path d="m9 9 3 3 3-3"></path></svg>';
  var quizIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);flex-shrink:0" aria-hidden="true"><path d="M2 10s2.5-6 10-6 10 6 10 6-2 10-10 10S2 10 2 10z"/><circle cx="8.5" cy="9.5" r="1" fill="currentColor"/><circle cx="15.5" cy="9.5" r="1" fill="currentColor"/><path d="M8.5 14c1.5 1.5 5.5 1.5 7 0"/></svg>';

  var h='<section class="hero">'+EMB.replace('<svg','<svg class="emb"')+'<h1>'+esc(S.site.name)+'</h1><p class="tag">'+esc(S.site.tagline)+'</p><div class="btns">'
    +(yt?'<a class="btn ghost" href="'+esc(yt)+'" target="_blank" rel="noopener">'+ytIcon+'<span>YouTube ↗</span></a>':'')
    +(ig?'<a class="btn ghost" href="'+esc(ig)+'" target="_blank" rel="noopener">'+igIcon+'<span>Instagram ↗</span></a>':'')
    +'<a class="btn ghost" href="kitaplar.html?f=indirilebilir">'+dlIcon+'<span>Epub ve PDF kitaplara göz at</span></a>'
    +'<a class="btn ghost" href="test.html">'+quizIcon+'<span>🎭 Edebi Testler & Karakter Analizleri</span></a>'
    +'</div>'
    +'<blockquote class="epi" style="margin-inline:auto">“Hepimiz Gogol\'un Palto\'sundan çıktık.”<small>Dostoyevski\'ye atfedilir</small></blockquote></section>';

  // Ayın Kitabı Okuma Kampı Banner
  if (camp) {
    var campParts = getCampParticipants();
    var isUserCamp = isUserInCamp();
    var partsTeaser = '<div style="display:flex;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap">'
      + '<div style="display:flex;align-items:center">'
      + campParts.slice(0, 4).map(function(p, i){
          var inits = 'GP';
          var ps = (p.full_name || 'Okur').trim().split(/\s+/);
          if (ps.length >= 2 && ps[0] && ps[ps.length-1]) inits = (ps[0][0] + ps[ps.length-1][0]).toUpperCase();
          else if (ps.length === 1 && ps[0]) inits = ps[0].slice(0, 2).toUpperCase();
          return '<div class="member-avatar-mini" style="border:2px solid #7a1f2b;margin-left:' + (i > 0 ? '-10px' : '0') + ';width:28px;height:28px;font-size:.68rem" title="' + esc(p.full_name) + '">' + inits + '</div>';
        }).join('')
      + '</div>'
      + '<span style="font-size:.85rem;color:rgba(255,255,255,.95);font-weight:600">👥 ' + campParts.length + ' Okur Tartışmaya Katıldı</span>'
      + (isUserCamp ? '<span style="background:rgba(255,255,255,.2);color:#fff;font-size:.76rem;font-weight:700;padding:2px 8px;border-radius:999px">✅ Katıldınız</span>' : '')
      + '</div>';

    h += '<div class="camp-banner">'
      + '<div style="flex:1;min-width:280px">'
      + '<span class="camp-badge">' + esc(camp.badge) + '</span>'
      + '<h2 class="camp-title">' + esc(camp.title) + '</h2>'
      + '<p class="camp-desc">' + esc(camp.desc) + '</p>'
      + '<div class="btns" style="justify-content:flex-start;gap:12px">'
      + '<a class="btn" href="kamp.html" style="background:#fff;color:#7a1f2b;font-weight:700">💬 Tartışmaya Katıl</a>'
      + '<a class="btn ghost" href="kitap.html?id=' + encodeURIComponent(camp.bookId) + '" style="color:#fff;border-color:rgba(255,255,255,.6)">📖 Kitabı İncele</a>'
      + '<span style="font-size:.85rem;color:rgba(255,255,255,.9);align-self:center">⏳ Hedef: <b>' + esc(camp.targetDate) + '</b></span>'
      + '</div>'
      + partsTeaser
      + '</div>'
      + '<div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:18px;max-width:300px;font-style:italic;font-family:var(--serif);font-size:.92rem;line-height:1.6">'
      + esc(camp.quote)
      + '</div>'
      + '</div>';
  }

  h+=renderDailyPassageHTML();
  if(feat){h+='<div class="feature">'+cover(feat)+'<div><div class="kicker">Öne çıkan</div><h2>'+esc(feat.title)+'</h2><p class="byline">'+esc(feat.author)+'</p><p>'+esc(feat.summary)+'</p><div class="btns" style="justify-content:flex-start;margin-top:16px"><a class="btn" href="kitap.html?id='+encodeURIComponent(feat.id)+'">Konuşma metnini oku</a><button class="btn ghost" data-a="fav" data-id="'+esc(feat.id)+'">'+(isFav(feat.id)?'🔖 Okuma Listenizde':'＋ Okuma Listeme Ekle')+'</button></div></div></div>';}
  h+='<section class="blk"><div class="sh"><h2>Son eklenenler</h2><a href="kitaplar.html">Tümü →</a></div>';
  h+=pub.length?'<div class="grid">'+pub.slice(0,5).map(card).join('')+'</div>':'<p class="empty">Henüz kitap eklenmedi.</p>';
  h+='</section>';

  return h;
}
function getStatusKeyFromParam(p1) {
  if (!p1) return '';
  p1 = String(p1).toLowerCase().trim();
  if (p1 === 'okundu' || p1 === 'read') return 'read';
  if (p1 === 'okunuyor' || p1 === 'reading' || p1 === 'suan-okunuyor' || p1 === 'su-an-okunuyor') return 'reading';
  if (p1 === 'istek' || p1 === 'want' || p1 === 'istek-listesi') return 'want';
  return '';
}

function renderPaginationHTML(currentPage, totalPages, totalCount){
  if(totalPages <= 1){
    return '<div class="pagination-wrapper" style="margin:28px 0 10px;text-align:center"><div class="pagination-info">Toplam ' + totalCount + ' eser listeleniyor</div></div>';
  }
  var startItem = (currentPage - 1) * 25 + 1;
  var endItem = Math.min(currentPage * 25, totalCount);
  var html = '<div class="pagination-wrapper">';
  html += '<nav class="pagination" aria-label="Sayfa Gezintisi">';

  if(currentPage > 1){
    html += '<button class="pagination-btn" data-a="page" data-p="' + (currentPage - 1) + '" title="\u00d6nceki Sayfa">\u2190 \u00d6nceki</button>';
  } else {
    html += '<button class="pagination-btn" disabled>\u2190 \u00d6nceki</button>';
  }

  var pages = [];
  if(totalPages <= 7){
    for(var i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    if(currentPage <= 4){
      pages = [1, 2, 3, 4, 5, '...', totalPages];
    } else if(currentPage >= totalPages - 3){
      pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }

  pages.forEach(function(p){
    if(p === '...'){
      html += '<span style="padding:0 6px;color:var(--muted);font-weight:600">\u2026</span>';
    } else if(p === currentPage){
      html += '<button class="pagination-btn on" data-a="page" data-p="' + p + '" aria-current="page">' + p + '</button>';
    } else {
      html += '<button class="pagination-btn" data-a="page" data-p="' + p + '">' + p + '</button>';
    }
  });

  if(currentPage < totalPages){
    html += '<button class="pagination-btn" data-a="page" data-p="' + (currentPage + 1) + '" title="Sonraki Sayfa">Sonraki \u2192</button>';
  } else {
    html += '<button class="pagination-btn" disabled>Sonraki \u2192</button>';
  }

  html += '</nav>';
  html += '<div class="pagination-info">Toplam ' + totalCount + ' kitaptan ' + startItem + '\u2013' + endItem + ' aras\u0131 g\u00f6steriliyor \u2022 Sayfa ' + currentPage + ' / ' + totalPages + '</div>';
  html += '</div>';
  return html;
}
function libResults(isFavPage, isDlPage, statusParam){
  var isDl=isDlPage||lib.dlOnly;
  var allPub=pubBooks();
  var dlCount=allPub.filter(hasDownload).length;
  var catBookCount=lib.cat ? allPub.filter(function(b){return (b.category||'Diğer')===lib.cat;}).length : 0;
  var stFilter = isFavPage ? getStatusKeyFromParam(statusParam || route()[1]) : '';
  var q=lc(lib.q).trim(), list=allPub.filter(function(b){
    if(isDl&&!hasDownload(b))return false;
    if(isFavPage||lib.favOnly){
      if(!isFav(b.id))return false;
      if(stFilter){
        var st = getReadingStatus(b.id);
        if(st !== stFilter) return false;
      }
    }
    if(lib.cat&&(b.category||'Diğer')!==lib.cat)return false;
    if(!q)return true;
    return lc([b.title,b.author,b.publisher,b.category,(b.tags||[]).join(' '),b.summary,b.transcript].join(' ')).indexOf(q)>=0;
  });
  if(lib.sort==='az')list.sort(function(a,b){return lc(a.title).localeCompare(lc(b.title),'tr');});
  else if(lib.sort==='old')list.sort(function(a,b){return byDate(b,a);});
  else list.sort(byDate);
  if(!list.length){
    if(isDl && lib.cat){
      var catLabel = 'Tüm ' + esc(lib.cat) + ' Kitaplarını Gör' + (catBookCount ? ' (' + catBookCount + ')' : '');
      return '<p class="empty">“' + esc(lib.cat) + '” türünde henüz EPUB veya PDF formatı yüklenmiş kitap bulunmuyor.<br><br><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn small ghost" data-a="cleardlfilter">' + catLabel + '</button><button class="btn small" data-a="cat" data-v="">Tüm EPUB / PDF Eserleri (' + dlCount + ')</button></div></p>';
    }
    if(isDl)return '<p class="empty">Henüz EPUB veya PDF formatı yüklenmiş kitap bulunmuyor.<br><br>Yönetim panelinden kitapları düzenleyerek EPUB veya PDF indirme bağlantısı ekleyebilirsiniz.<br><br><a class="btn small" href="kitaplar.html" data-a="cleardlfilter">Tüm Kitapları İncele →</a></p>';
    if(isFavPage||lib.favOnly){
      if (stFilter === 'read') {
        return '<p class="empty">Henüz “Okundu” olarak işaretlediğiniz bir eser bulunmuyor.<br><br>Okuduğunuz kitapların detay sayfasından veya kartından “✓ Okundu” durumunu seçebilirsiniz.<br><br><a class="btn small" href="okuma-listem.html">Tüm Okuma Listesini Gör (' + favs.length + ') →</a></p>';
      } else if (stFilter === 'reading') {
        return '<p class="empty">Şu an okumakta olduğunuz bir eser bulunmuyor.<br><br>Okumaya başladığınız kitapları “📖 Okunuyor” olarak işaretleyebilirsiniz.<br><br><a class="btn small" href="okuma-listem.html">Tüm Okuma Listesini Gör (' + favs.length + ') →</a></p>';
      } else if (stFilter === 'want') {
        return '<p class="empty">İstek listenizde henüz kitap bulunmuyor.<br><br><a class="btn small" href="kitaplar.html">Kitapları İncele ve Ekle →</a></p>';
      }
      return '<p class="empty">Okuma listenizde henüz kitap yok.<br><br>Kitap kartlarının üzerindeki 🔖 simgesine tıklayarak listenize ekleyebilirsiniz.<br><br><a class="btn small" href="kitaplar.html" data-a="clearfavfilter">Tüm Kitapları İncele →</a></p>';
    }
    return '<p class="empty">Aramanızla eşleşen kitap bulunamadı.</p>';
  }
    var PAGE_SIZE = 25;
  var totalBooks = list.length;
  var totalPages = Math.ceil(totalBooks / PAGE_SIZE) || 1;
  if(!lib.page || lib.page < 1) lib.page = 1;
  if(lib.page > totalPages) lib.page = totalPages;
  var startIdx = (lib.page - 1) * PAGE_SIZE;
  var pagedList = list.slice(startIdx, startIdx + PAGE_SIZE);
  return '<div class="grid">'+pagedList.map(card).join('')+'</div>' + renderPaginationHTML(lib.page, totalPages, totalBooks);
}
function libChips(isFavPage, isDlPage, statusParam){
  var isDl=isDlPage||lib.dlOnly;
  var allPub=pubBooks();
  var cc=catCounts(allPub);
  var favCount=favs.length;
  var dlCount=allPub.filter(hasDownload).length;

  if (isFavPage) {
    var myFavBooks = allPub.filter(function(b){ return isFav(b.id); });
    var readC = 0, readingC = 0, wantC = 0;
    myFavBooks.forEach(function(b){
      var st = getReadingStatus(b.id);
      if (st === 'read') readC++;
      else if (st === 'reading') readingC++;
      else wantC++;
    });
    var stFilter = getStatusKeyFromParam(statusParam || route()[1]);

    var statusRow = '<div class="reading-status-chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;width:100%">'
      + '<a class="chip' + (!stFilter ? ' on' : '') + '" href="okuma-listem.html" style="text-decoration:none">📚 Hepsi <small>' + favCount + '</small></a>'
      + '<a class="chip' + (stFilter === 'read' ? ' on' : '') + '" href="okuma-listem.html?durum=okundu" style="text-decoration:none">✓ Okundu <small>' + readC + '</small></a>'
      + '<a class="chip' + (stFilter === 'reading' ? ' on' : '') + '" href="okuma-listem.html?durum=okunuyor" style="text-decoration:none">📖 Şu An Okunuyor <small>' + readingC + '</small></a>'
      + '<a class="chip' + (stFilter === 'want' ? ' on' : '') + '" href="okuma-listem.html?durum=istek" style="text-decoration:none">🔖 İstek Listesi <small>' + wantC + '</small></a>'
      + '</div>';

    var favCats = catCounts(myFavBooks);
    var catChips = favCats.map(function(c){
      return '<button class="chip' + (lib.cat === c[0] ? ' on' : '') + '" data-a="cat" data-v="' + esc(c[0]) + '">' + esc(c[0]) + '<small>' + c[1] + '</small></button>';
    }).join('');

    return statusRow + catChips;
  }

  var dlChip = '<button class="chip' + (isDl ? ' on' : '') + '" data-a="dlonly" title="Sadece EPUB veya PDF dosyası bulunan kitaplar">⬇ EPUB / PDF' + (dlCount ? ' <small>' + dlCount + '</small>' : '') + '</button>';
  var allChip = '<button class="chip' + (!lib.cat ? ' on' : '') + '" data-a="cat" data-v="">Tümü</button>';
  return dlChip + allChip + cc.map(function(c){
    return '<button class="chip' + (lib.cat === c[0] ? ' on' : '') + '" data-a="cat" data-v="' + esc(c[0]) + '">' + esc(c[0]) + '<small>' + c[1] + '</small></button>';
  }).join('');
}
function library(isFavPage, isDlPage, statusParam){
  if(lib._lastFav !== isFavPage){ lib.cat = ''; lib.page = 1; lib._lastFav = isFavPage; }
  if(!isFavPage) lib.favOnly = false;
  if(route()[0]==='kitaplar'&&route()[1]!=='indirilebilir') lib.dlOnly = false;
  var isDl=isDlPage||lib.dlOnly;
  var stFilter = isFavPage ? getStatusKeyFromParam(statusParam || route()[1]) : '';
  var allPub = pubBooks();
  var allCount = allPub.length;
  var favCount = favs.length;

  var title = isFavPage
    ? (stFilter === 'read' ? 'Okunan Kitaplar (Okundu)' : (stFilter === 'reading' ? 'Şu An Okunan Kitaplar' : (stFilter === 'want' ? 'İstek Listesindeki Kitaplar' : 'Kitaplar & Okuma Listem')))
    : (isDl ? 'EPUB ve PDF Kitaplar' : 'Kitaplar & Okuma Listem');

  var lead = isFavPage
    ? (stFilter === 'read'
        ? 'Daha önce okuyup bitirdiğiniz ve kütüphanenize kattığınız eserlerin tümü.'
        : (stFilter === 'reading'
            ? 'Şu anda elinizde olan ve okumaya devam ettiğiniz eserler.'
            : (stFilter === 'want'
                ? 'Okuma sırasına aldığınız ve istek listenizde bekleyen eserler.'
                : 'Kişisel okuma listenizdeki kitaplar ve okuma durumlarınız.')))
    : (isDl
        ? 'Doğrudan cihazınıza indirip okuyabileceğiniz EPUB ve PDF formatındaki eserler.'
        : 'Kanalda konuştuğumuz tüm eserleri keşfedin, e-kitapları indirin veya kişisel okuma listenizi takip edin.');

  var tip='';
  if((isFavPage||lib.favOnly)&&!curUser){
    tip='<div class="sync-tip"><span>☁️ <b>İpucu:</b> Okuma listenizi tüm cihazlarınızda (telefon, tablet, bilgisayar) saklamak ve eşitlemek ister misiniz?</span><button data-a="open-auth">Giriş Yap / Ücretsiz Üye Ol →</button></div>';
  } else if(isDl){
    tip='<div class="sync-tip" style="background:var(--card);border-left:3px solid var(--accent)"><span>💡 <b>E-Kitap Filtresi Açık:</b> Yalnızca EPUB veya PDF formatı yüklenmiş kitaplar listeleniyor.</span><a href="kitaplar.html" data-a="cleardlfilter" style="color:var(--accent);font-weight:600;margin-left:auto;white-space:nowrap;text-decoration:none">Tüm Kitapları Göster ✕</a></div>';
  }

  var allCls = !isFavPage ? '' : ' ghost';
  var allBadgeStyle = !isFavPage ? 'background:rgba(255,255,255,.24);color:#fff' : 'background:var(--accent);color:var(--accent-ink)';
  var favCls = isFavPage ? '' : ' ghost';
  var favBadgeStyle = isFavPage ? 'background:rgba(255,255,255,.24);color:#fff' : 'background:var(--accent);color:var(--accent-ink)';

  var exportBtn = (isFavPage && favCount > 0)
    ? '<button class="btn ghost small" data-a="export-reading-list" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px" title="Okuma listenizi JSON/metin olarak dışa aktarın">📥 Listeyi Dışa Aktar</button>'
    : '';

  var viewTabs = '<div class="lib-view-tabs" style="display:flex;gap:10px;margin:20px 0 24px;border-bottom:1px solid var(--line);padding-bottom:16px;align-items:center;flex-wrap:wrap">'
    + '<a href="kitaplar.html" class="btn small' + allCls + '" style="border-radius:999px;text-decoration:none;font-size:.92rem;padding:7px 18px;display:inline-flex;align-items:center;gap:6px">'
    + '<span>📚 Tüm Kitaplar</span>'
    + '<span class="badge" style="' + allBadgeStyle + '">' + allCount + '</span>'
    + '</a>'
    + '<a href="okuma-listem.html" class="btn small' + favCls + '" style="border-radius:999px;text-decoration:none;font-size:.92rem;padding:7px 18px;display:inline-flex;align-items:center;gap:6px">'
    + '<span>🔖 Okuma Listem</span>'
    + '<span class="badge" style="' + favBadgeStyle + '">' + favCount + '</span>'
    + '</a>'
    + exportBtn
    + '</div>';

  return '<section class="page"><h1 class="ptitle">'+title+'</h1><p class="lead">'+lead+'</p>'
   +viewTabs
   +tip
   +'<div class="filters"><input id="lib-q" type="search" placeholder="Kitap, yazar, konu ya da metin içinde ara…" value="'+esc(lib.q)+'"><select id="lib-sort"><option value="new"'+(lib.sort==='new'?' selected':'')+'>En yeni</option><option value="old"'+(lib.sort==='old'?' selected':'')+'>En eski</option><option value="az"'+(lib.sort==='az'?' selected':'')+'>A → Z</option></select></div>'
   +'<div class="chips" id="lib-chips">'+libChips(isFavPage, isDl, statusParam)+'</div><div id="lib-results">'+libResults(isFavPage, isDl, statusParam)+'</div></section>';
}
function transcriptHTML(b){
  var t=(b.transcript||'').trim();
  if(!t)return '<p class="empty">Bu kitap için henüz konuşma metni eklenmedi.</p>';
  return t.split(/\n{2,}/).map(function(par){
    par=par.trim();if(!par)return '';
    if(par.indexOf('## ')===0)return '<h3>'+esc(par.slice(3))+'</h3>';
    var m=par.match(/^\[?((?:\d{1,2}:)?\d{1,2}:\d{2})\]?\s+([\s\S]*)$/);
    if(m){var u=ytAt(b.video,toSec(m[1]));var ts=u?'<a class="ts" href="'+esc(u)+'" target="_blank" rel="noopener" title="Videoda bu ana git">'+esc(m[1])+'</a>':'<span class="ts">'+esc(m[1])+'</span>';return '<p class="tp">'+ts+'<span>'+esc(m[2]).replace(/\n/g,'<br>')+'</span></p>';}
    return '<p>'+esc(par).replace(/\n/g,'<br>')+'</p>';
  }).join('');
}
function sourcesHTML(b){
  var s=b.sources||[];
  if(!s.length)return '<p class="empty">Bu kitap için kaynak eklenmedi.</p>';
  return '<ul class="src">'+s.map(function(x){var u=safeUrl(x.u);return '<li>'+(u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(x.t||u)+' ↗</a>':esc(x.t))+(x.n?'<small>'+esc(x.n)+'</small>':'')+'</li>';}).join('')+'</ul>';
}
function dlRow(b){
  var ep=safeUrl(b.epub)||((b.epub&&!/^(javascript|data):/i.test(b.epub.trim()))?b.epub.trim():'');
  var pd=safeUrl(b.pdf)||((b.pdf&&!/^(javascript|data):/i.test(b.pdf.trim()))?b.pdf.trim():'');
  if(!ep&&!pd)return '';
  return '<div class="dl-row">'
   +(ep?'<a class="btn ghost small" href="'+esc(ep)+'" target="_blank" rel="noopener" download>⬇ EPUB indir</a>':'')
   +(pd?'<a class="btn ghost small" href="'+esc(pd)+'" target="_blank" rel="noopener" download>⬇ PDF indir</a>':'')
   +'</div>';
}
function reviewsHTML(b, reviews, ratingInfo) {
  var userForm = '';
  if (curUser) {
    userForm = '<div class="review-form-card">'
      + '<h4 style="font-family:var(--serif);font-size:1.1rem;margin:0 0 12px;color:var(--ink)">✍️ Eser Hakkında Düşüncenizi Yazın</h4>'
      + '<form id="book-review-form" data-book-id="' + esc(b.id) + '">'
      + '<div style="margin-bottom:12px;display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:.88rem;color:var(--ink-soft)">Puanınız:</span>'
      + '<div class="star-picker" id="star-picker" data-rating="5">'
      + '<button type="button" class="star-btn on" data-star="1">★</button>'
      + '<button type="button" class="star-btn on" data-star="2">★</button>'
      + '<button type="button" class="star-btn on" data-star="3">★</button>'
      + '<button type="button" class="star-btn on" data-star="4">★</button>'
      + '<button type="button" class="star-btn on" data-star="5">★</button>'
      + '</div>'
      + '</div>'
      + '<textarea id="review-comment" placeholder="Bu klasik eser size ne hissettirdi? Çarpıcı bir analiz veya görüşünüzü paylaşın…" style="width:100%;min-height:90px;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:.92rem;box-sizing:border-box;background:var(--paper-2);color:var(--ink)" required></textarea>'
      + '<div style="display:flex;justify-content:flex-end;margin-top:10px">'
      + '<button type="submit" class="btn small">İncelemeyi Paylaş</button>'
      + '</div>'
      + '</form>'
      + '</div>';
  } else {
    userForm = '<div class="sync-tip" style="margin-bottom:24px"><span>✍️ Bu eser hakkında bir inceleme veya değerlendirme yazmak için lütfen <button data-a="open-auth">Giriş Yapın</button>.</span></div>';
  }

  var listHTML = '';
  if (!reviews.length) {
    listHTML = '<p class="empty">Bu eser için henüz okur incelemesi yazılmamış. İlk yorumu siz yazın!</p>';
  } else {
    listHTML = '<div class="review-list">' + reviews.map(function(r){
      var stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      var rInitials = (r.user_name || 'Okur').slice(0, 2).toUpperCase();
      var rProfLink = r.username ? ('#/profil/' + encodeURIComponent(r.username)) : '';
      var rAvatar = r.avatar_url 
        ? '<div class="member-avatar-mini" style="background-image:url(' + esc(r.avatar_url) + ');background-size:cover;background-position:center;color:transparent"></div>'
        : '<div class="member-avatar-mini">' + esc(rInitials) + '</div>';
      var uLink = rProfLink 
        ? '<a href="' + rProfLink + '" class="member-name-link"><b>' + esc(r.user_name) + '</b>' + (r.username ? ' <span style="font-size:.8rem;color:var(--accent)">@' + esc(r.username) + '</span>' : '') + '</a>'
        : '<b>' + esc(r.user_name) + '</b>';
      var rDate = r.created_at ? fmtDate(r.created_at) : '';

      var isLiked = isReviewLiked(r.id);
      var likeBtn = '<button class="quote-like-btn' + (isLiked ? ' liked' : '') + '" data-a="like-review" data-id="' + esc(r.id) + '" title="' + (isLiked ? 'Beğeniyi Geri Çek' : 'Yorumu Beğen') + '">' + (isLiked ? '❤️' : '🤍') + ' <span>' + (r.likes || 0) + '</span></button>';

      return '<div class="review-card">'
        + '<div class="review-hdr">'
        + '<div class="review-user-info">' + rAvatar + '<div>' + uLink + '<div style="font-size:.78rem;color:var(--ink-soft)">' + esc(rDate) + '</div></div></div>'
        + '<div style="display:flex;align-items:center;gap:10px">'
        + '<div style="color:var(--gold);font-size:1.1rem;letter-spacing:1px">' + stars + '</div>'
        + likeBtn
        + '</div>'
        + '</div>'
        + '<div class="review-body">' + esc(r.comment).replace(/\n/g, '<br>') + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }

  return '<div class="book-review-sec">'
    + '<div class="review-stats-bar">'
    + '<div class="review-score-num">' + ratingInfo.score + '</div>'
    + '<div>'
    + '<div class="review-stars-outer">★★★★★</div>'
    + '<div style="font-size:.85rem;color:var(--ink-soft)">' + (ratingInfo.count ? (ratingInfo.count + ' okur değerlendirdi') : 'Henüz değerlendirme yok') + '</div>'
    + '</div>'
    + '</div>'
    + userForm
    + listHTML
    + '</div>';
}

function charGuideHTML(chars) {
  if (!chars || !chars.length) return '<p class="empty">Bu eser için karakter rehberi henüz eklenmedi.</p>';
  return '<div class="char-grid">' + chars.map(function(c){
    return '<div class="char-card">'
      + '<h4 class="char-name">' + esc(c.name) + '</h4>'
      + '<div class="char-role-chip">' + esc(c.role) + '</div>'
      + '<p class="char-desc">' + esc(c.desc) + '</p>'
      + '</div>';
  }).join('') + '</div>';
}

function bookPage(id){
  var b=S.books.filter(function(x){return x.id===id;})[0];
  if(!b||(b.status==='draft'&&!canEdit))return '<section class="page"><h1 class="ptitle">Kitap bulunamadı</h1><a class="back" href="kitaplar.html">← Kitaplara dön</a></section>';
  var yt=safeUrl(b.video);
  var rel=pubBooks().filter(function(x){return x.id!==b.id&&x.category===b.category;}).slice(0,4);
  var favActive=isFav(b.id);
  var favBtn='<button class="btn '+(favActive?'':'ghost')+' small" data-a="fav" data-id="'+esc(b.id)+'" style="margin-top:14px;width:100%">'+(favActive?'🔖 Okuma Listenizde':'＋ Okuma Listeme Ekle')+'</button>';

  var ratingInfo = calcBookRating(b.id);
  var chars = getCharacterGuide(b.id);
  var reviews = getReviews(b.id);
  var st = getReadingStatus(b.id);

  var statusPills = '<div class="reading-status-wrap">'
    + '<button class="status-pill' + (st==='want'?' active':'') + '" data-a="set-book-status" data-id="' + esc(b.id) + '" data-st="want" title="Okumak İstiyorum">🔖 İstek</button>'
    + '<button class="status-pill' + (st==='reading'?' active':'') + '" data-a="set-book-status" data-id="' + esc(b.id) + '" data-st="reading" title="Şu An Okuyorum">📖 Okunuyor</button>'
    + '<button class="status-pill' + (st==='read'?' active':'') + '" data-a="set-book-status" data-id="' + esc(b.id) + '" data-st="read" title="Okundu">✓ Okundu</button>'
    + '</div>';

  var ep=safeUrl(b.epub)||((b.epub&&!/^(javascript|data):/i.test(b.epub.trim()))?b.epub.trim():'');
  var pd=safeUrl(b.pdf)||((b.pdf&&!/^(javascript|data):/i.test(b.pdf.trim()))?b.pdf.trim():'');
  var dlSection = '<div class="dl-row">'
    + (ep?'<a class="btn ghost small" href="'+esc(ep)+'" target="_blank" rel="noopener" download>⬇ EPUB indir</a>':'')
    + (pd?'<a class="btn ghost small" href="'+esc(pd)+'" target="_blank" rel="noopener" download>⬇ PDF indir</a>':'')
    + '<button class="btn small" data-a="open-reader" data-id="'+esc(b.id)+'" style="margin-left:auto">📖 Odak Modunda Oku</button>'
    + '</div>';

  return '<article class="book"><aside>'+cover(b)+favBtn+statusPills+'</aside><div>'
   + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px">'
   + '<h1>'+esc(b.title)+(b.status==='draft'?'<span class="draft-tag">Taslak</span>':'')+'</h1>'
   + '<div style="background:var(--paper-2);border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:.84rem;font-weight:600;color:var(--gold);display:inline-flex;align-items:center;gap:4px">★ ' + ratingInfo.score + (ratingInfo.count ? ' <span style="color:var(--ink-soft);font-size:.76rem">(' + ratingInfo.count + ')</span>' : '') + '</div>'
   + '</div>'
   + '<p class="byline">'+esc(b.author)+(b.year?' · '+esc(b.year):'')+'</p>'+(b.publisher?'<p class="publine">Yayınevi: '+esc(b.publisher)+'</p>':'')
   + '<div class="tags">'+(b.category?'<span class="tag">'+esc(b.category)+'</span>':'')+(b.tags||[]).map(function(t){return '<span class="tag">#'+esc(t)+'</span>';}).join('')+'</div>'
   + (b.summary ? '<div class="book-synopsis" style="margin:20px 0 24px;padding:16px 20px;background:var(--paper-2);border-left:4px solid var(--accent);border-radius:0 12px 12px 0;box-shadow:var(--shadow)">'
       + '<h3 style="font-family:var(--serif);font-size:1.05rem;font-weight:700;margin:0 0 6px;color:var(--accent);display:flex;align-items:center;gap:6px">📖 Kitabın Konusu</h3>'
       + '<p style="margin:0;line-height:1.75;font-size:1.02rem;color:var(--ink)">' + esc(b.summary) + '</p>'
       + '</div>' : '')
   + (yt?'<div class="btns" style="justify-content:flex-start"><a class="btn" href="'+esc(yt)+'" target="_blank" rel="noopener">▶ YouTube\'da izle</a></div>':'')
   + dlSection
   + '<div class="tabs">'
   + '<button class="tb on" data-a="tab" data-t="tr">Konuşma Metni</button>'
   + '<button class="tb" data-a="tab" data-t="reviews">Okur Yorumları ('+reviews.length+')</button>'
   + (chars ? '<button class="tb" data-a="tab" data-t="chars">Karakter Rehberi ('+chars.length+')</button>' : '')
   + '<button class="tb" data-a="tab" data-t="src">Kaynaklar'+((b.sources||[]).length?' ('+b.sources.length+')':'')+'</button>'
   + '<span class="sz" id="sz"><button data-a="fs" data-d="-1" aria-label="Yazıyı küçült">A−</button><button data-a="fs" data-d="1" aria-label="Yazıyı büyüt">A+</button></span>'
   + '</div>'
   + '<div id="pane-tr" class="reader" style="--rs:'+readerScale+'">'+transcriptHTML(b)+'</div>'
   + '<div id="pane-reviews" class="hide">'+reviewsHTML(b, reviews, ratingInfo)+'</div>'
   + (chars ? '<div id="pane-chars" class="hide">'+charGuideHTML(chars)+'</div>' : '')
   + '<div id="pane-src" class="hide">'+sourcesHTML(b)+'</div>'
   + (b.date?'<p class="meta" style="color:var(--ink-soft);font-size:.85rem;margin-top:28px">Eklenme: '+esc(fmtDate(b.date))+'</p>':'')
   + '</div></article>'
   + (rel.length?'<section class="blk"><div class="sh"><h2>Bu konuda diğerleri</h2></div><div class="grid">'+rel.map(card).join('')+'</div></section>':'')
   + '<a class="back" href="kitaplar.html">← Tüm kitaplar</a>';
}
function about(){
  var email = (S.site.email || 'ngogolunpaltosu@gmail.com').trim();
  var yt = safeUrl(S.site.youtube);
  var ig = safeUrl(S.site.instagram);
  var mailSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;color:var(--accent)" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>';
  var ytSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#ff0000;flex-shrink:0" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
  var igSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:#e1306c;flex-shrink:0" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';

  var contactBox = '<div class="contact-card" style="margin-top:36px;padding:24px;border:1px solid var(--line);border-radius:12px;background:var(--paper-soft);display:flex;flex-direction:column;gap:16px">'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + mailSvg
    + '<h2 style="margin:0;font-size:1.25rem;font-family:var(--serif);color:var(--ink)">İletişim</h2>'
    + '</div>'
    + '<p style="margin:0;color:var(--ink-soft);font-size:.95rem;line-height:1.6">Görüş, öneri, kitap sohbetleri ve iş birliği talepleriniz için bana aşağıdaki e-posta adresinden ulaşabilirsiniz:</p>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 18px;background:var(--paper);border:1px dashed var(--line);border-radius:8px">'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + '<span style="font-size:1.2rem">✉️</span>'
    + '<a href="mailto:'+esc(email)+'" style="font-family:monospace;font-size:1.05rem;font-weight:600;color:var(--ink);text-decoration:none">'+esc(email)+'</a>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<a class="btn small" href="mailto:'+esc(email)+'">E-posta Gönder</a>'
    + '<button class="btn ghost small" data-a="copy-email" data-email="'+esc(email)+'">📋 Kopyala</button>'
    + '</div>'
    + '</div>'
    + '<div style="border-top:1px solid var(--line);padding-top:16px;display:flex;align-items:center;flex-wrap:wrap;gap:12px">'
    + '<span style="color:var(--ink-soft);font-size:.9rem;font-weight:500">Sosyal Medya Kanalları:</span>'
    + (yt ? '<a class="btn ghost small" href="'+esc(yt)+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px">'+ytSvg+' YouTube</a>' : '')
    + (ig ? '<a class="btn ghost small" href="'+esc(ig)+'" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:6px">'+igSvg+' Instagram</a>' : '')
    + '</div>'
    + '</div>';

  return '<section class="page"><h1 class="ptitle">Hakkında</h1><div class="about">'+String(S.site.about||'').split(/\n{2,}/).map(function(p){return '<p>'+esc(p).replace(/\n/g,'<br>')+'</p>';}).join('')+'</div>'
   + contactBox
   + '</section>';
}

/* ---------- yönetim ---------- */
function adminTabs(cur){
  var mCount = getAdminMembersList().length;
  return '<div class="admin-tabs">'
    + '<a class="btn small'+(cur==='list'?'':' ghost')+'" href="yonetim.html">Kitaplar ('+S.books.length+')</a>'
    + '<a class="btn small'+(cur==='members'?'':' ghost')+'" href="yonetim.html?tab=uyeler">👥 Üyeler ('+mCount+')</a>'
    + '<a class="btn small'+(cur==='set'?'':' ghost')+'" href="yonetim.html?tab=ayarlar">Site ayarları</a>'
    + '</div>';
}
function adminList(){
  var rows=S.books.slice().sort(byDate).map(function(b){
    return '<tr><td><div class="mini" style="--c:'+color(b.color)+(b.img&&/^data:image\//.test(b.img)?';background-image:url('+b.img+');background-size:cover;background-position:center':'')+'"></div></td><td><div class="t">'+esc(b.title)+(b.featured?' ★':'')+'</div><div style="color:var(--ink-soft);font-size:.85rem">'+esc(b.author)+'</div></td><td>'+esc(b.category||'')+'</td>'
     +'<td><button class="chip'+(b.status==='draft'?'':' on')+'" data-a="toggle" data-id="'+esc(b.id)+'" title="Durumu değiştir">'+(b.status==='draft'?'Taslak':'Yayında')+'</button></td>'
     +'<td class="acts"><a class="btn ghost small" href="kitap.html?id='+encodeURIComponent(b.id)+'">Gör</a><a class="btn ghost small" href="yonetim.html?tab=kitap&id='+encodeURIComponent(b.id)+'">Düzenle</a><button class="btn danger small" data-a="del" data-id="'+esc(b.id)+'">Sil</button></td></tr>';
  }).join('');
  return '<section class="page"><h1 class="ptitle">Yönetim Paneli</h1>'+adminTabs('list')
   +'<div class="btns" style="justify-content:flex-start;margin-bottom:20px"><a class="btn" href="yonetim.html?tab=kitap&id=yeni">＋ Yeni kitap ekle</a></div>'
   +(S.books.length?'<div class="wrap-x"><table class="tbl"><thead><tr><th></th><th>Kitap</th><th>Kategori</th><th>Durum</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>':'<p class="empty">Henüz kitap yok. “Yeni kitap ekle” ile başlayın.</p>')
   +'<div class="notice">Yaptığınız değişiklikler önce bu sekmede saklanır. Ziyaretçilere görünmesi için sağ alttaki <b>Yayınla</b> düğmesine basın.</div></section>';
}
function srcToText(a){return (a||[]).map(function(x){return [x.t||'',x.u||'',x.n||''].join(' | ').replace(/( \| )+$/,'');}).join('\n');}
function textToSrc(t){return t.split('\n').map(function(l){return l.trim();}).filter(Boolean).map(function(l){var p=l.split('|').map(function(x){return x.trim();});if(p.length===1&&/^https?:\/\//i.test(p[0]))return {t:p[0],u:p[0],n:''};return {t:p[0]||'',u:p[1]||'',n:p.slice(2).join(' | ')};});}
function bookForm(id){
  var isNew=id==='yeni', b=isNew?{title:'',author:'',year:'',category:'Roman',tags:[],video:'',date:new Date().toISOString().slice(0,10),status:'published',featured:false,summary:'',transcript:'',sources:[],color:COLORS[0]}:S.books.filter(function(x){return x.id===id;})[0];
  if(!b)return '<section class="page"><h1 class="ptitle">Kitap bulunamadı</h1><a class="back" href="yonetim.html">← Panele dön</a></section>';
  formImg=b.img||'';
  return '<section class="page"><h1 class="ptitle">'+(isNew?'Yeni kitap':'Kitabı düzenle')+'</h1>'+adminTabs('list')
   +'<div class="form">'
   +'<div class="row2"><div><label for="f-title">Kitap adı *</label><input type="text" id="f-title" value="'+esc(b.title)+'"></div><div><label for="f-author">Yazar</label><input type="text" id="f-author" value="'+esc(b.author)+'"></div></div>'
   +'<div><label for="f-pub">Yayınevi <span class="hint">Örn. Can Yayınları, İş Bankası Kültür Yayınları</span></label><input type="text" id="f-pub" list="pubs" value="'+esc(b.publisher)+'"><datalist id="pubs">'+allPubs().map(function(c){return '<option value="'+esc(c)+'">';}).join('')+'</datalist></div>'
   +'<div class="row3"><div><label for="f-year">Yayın yılı</label><input type="text" id="f-year" value="'+esc(b.year)+'"></div><div><label for="f-cat">Kategori</label><input type="text" id="f-cat" list="cats" value="'+esc(b.category)+'"><datalist id="cats">'+allCats().map(function(c){return '<option value="'+esc(c)+'">';}).join('')+'</datalist></div><div><label for="f-date">Videonun tarihi</label><input type="date" id="f-date" value="'+esc(b.date)+'"></div></div>'
   +'<div><label for="f-video">YouTube video bağlantısı</label><input type="url" id="f-video" placeholder="https://www.youtube.com/watch?v=…" value="'+esc(b.video)+'"></div>'
   +'<div class="row2"><div><label for="f-epub">EPUB bağlantısı <span class="hint">Ziyaretçinin indireceği dosya linki (Google Drive, Dropbox vb.)</span></label><input type="url" id="f-epub" placeholder="https://…kitap.epub" value="'+esc(b.epub)+'"></div><div><label for="f-pdf">PDF bağlantısı</label><input type="url" id="f-pdf" placeholder="https://…kitap.pdf" value="'+esc(b.pdf)+'"></div></div>'
   +'<div><label for="f-tags">Etiketler <span class="hint">Virgülle ayırın: rus edebiyatı, klasik, 19. yüzyıl</span></label><input type="text" id="f-tags" value="'+esc((b.tags||[]).join(', '))+'"></div>'
   +'<div><label for="f-summary">Kısa özet</label><textarea id="f-summary">'+esc(b.summary)+'</textarea></div>'
   +'<div><label for="f-transcript">Konuşma metni <span class="hint">Paragrafları boş satırla ayırın. “## Başlık” ile ara başlık; paragrafı “12:35 metin…” diye başlatırsanız zaman damgası videoya bağlanır.</span></label><textarea id="f-transcript" class="big">'+esc(b.transcript)+'</textarea></div>'
   +'<div><label for="f-sources">Kaynaklar <span class="hint">Her satıra bir kaynak: Başlık | https://bağlantı | isteğe bağlı not</span></label><textarea id="f-sources">'+esc(srcToText(b.sources))+'</textarea></div>'
   +'<div><label>Kapak görseli <span class="hint">Yayınevi kapağını yükleyin (JPG/PNG). Otomatik küçültülür. Görsel yoksa aşağıdaki renkli kapak kullanılır.</span></label><div class="imgprev"><div id="img-prev">'+(formImg?cover({img:formImg,title:b.title,author:b.author}):'<span class="hint">Henüz görsel yok</span>')+'</div><div class="btns"><label class="btn ghost small" style="margin:0;cursor:pointer">Görsel seç<input type="file" id="f-img" accept="image/*" class="hide"></label><button class="btn danger small" data-a="rmimg">Görseli kaldır</button></div></div></div>'
   +'<div><label>Yedek kapak rengi</label><div class="swatches">'+COLORS.map(function(c){return '<label><input type="radio" name="color" value="'+c+'"'+(color(b.color)===c?' checked':'')+'><span style="--c:'+c+'"></span></label>';}).join('')+'</div></div>'
   +'<div class="row2"><div><label for="f-status">Durum</label><select id="f-status"><option value="published"'+(b.status!=='draft'?' selected':'')+'>Yayında</option><option value="draft"'+(b.status==='draft'?' selected':'')+'>Taslak (ziyaretçiye gizli)</option></select></div><div class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="f-feat"'+(b.featured?' checked':'')+'><label for="f-feat" style="margin:0">Ana sayfada öne çıkar</label></div></div>'
   +'<div class="btns" style="justify-content:flex-start"><button class="btn" data-a="savebook" data-id="'+esc(id)+'">Kaydet</button><a class="btn ghost" href="yonetim.html">Vazgeç</a></div></div></section>';
}
function adminSettings(){
  var s=S.site;
  return '<section class="page"><h1 class="ptitle">Site ayarları</h1>'+adminTabs('set')+'<div class="form">'
   +'<div><label for="s-name">Site adı</label><input type="text" id="s-name" value="'+esc(s.name)+'"></div>'
   +'<div><label for="s-tag">Slogan</label><input type="text" id="s-tag" value="'+esc(s.tagline)+'"></div>'
   +'<div><label for="s-admin">Site Yöneticisi (E-posta veya Kullanıcı Adı)<span class="hint">Yönetim paneline sadece bu hesap erişebilir</span></label><input type="text" id="s-admin" placeholder="ornek@gmail.com veya @kullaniciadi" value="'+esc(s.admin||'')+'"></div>'
   +'<div><label for="s-yt">YouTube kanal bağlantısı</label><input type="url" id="s-yt" placeholder="https://www.youtube.com/@kanaladin" value="'+esc(s.youtube)+'"></div>'
   +'<div><label for="s-ig">Instagram bağlantısı</label><input type="url" id="s-ig" placeholder="https://www.instagram.com/kullaniciadi/" value="'+esc(s.instagram)+'"></div>'
   +'<div><label for="s-email">İletişim e-posta adresi</label><input type="email" id="s-email" placeholder="ornek@gmail.com" value="'+esc(s.email||'')+'"></div>'
   +'<div><label for="s-about">Hakkında yazısı <span class="hint">Paragrafları boş satırla ayırın.</span></label><textarea id="s-about" style="min-height:220px">'+esc(s.about)+'</textarea></div>'
   +'<div><label for="s-foot">Alt bilgi notu</label><input type="text" id="s-foot" value="'+esc(s.footer)+'"></div>'
   +'<div class="btns" style="justify-content:flex-start"><button class="btn" data-a="savesettings">Kaydet</button></div></div></section>';
}
function memberRowHTML(m){
  var uName = m.username ? ('@' + m.username) : '—';
  var fullName = m.full_name || 'Edebiyat Okuru';
  var email = m.email || '—';
  var dateStr = fmtDate(m.created_at || new Date().toISOString());
  var favCount = Array.isArray(m.reading_list) ? m.reading_list.length : (m.reading_list_count || 0);
  var isAdmin = m.role === 'admin';
  var isSelf = curUser && ((curUser.email && curUser.email.toLowerCase() === email.toLowerCase()) || (curUser.user_metadata && curUser.user_metadata.username === m.username));

  var profileLink = m.username ? ('#/profil/' + encodeURIComponent(m.username)) : (m.id ? ('#/profil/' + encodeURIComponent(m.id)) : '');

  var initials = 'GP';
  var parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[parts.length-1]) initials = (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  else if (parts.length === 1 && parts[0]) initials = parts[0].slice(0, 2).toUpperCase();

  var avatarHTML = m.avatar_url
    ? (profileLink 
        ? '<a href="' + profileLink + '" class="member-avatar-mini" style="background-image:url(' + esc(m.avatar_url) + ');background-size:cover;background-position:center;color:transparent" title="' + esc(fullName) + ' profilini gör"></a>'
        : '<div class="member-avatar-mini" style="background-image:url(' + esc(m.avatar_url) + ');background-size:cover;background-position:center;color:transparent" title="' + esc(fullName) + '"></div>')
    : (profileLink 
        ? '<a href="' + profileLink + '" class="member-avatar-mini" style="text-decoration:none" title="' + esc(fullName) + ' profilini gör">' + esc(initials) + '</a>'
        : '<div class="member-avatar-mini">' + esc(initials) + '</div>');

  var nameHTML = profileLink 
    ? '<a href="' + profileLink + '" class="member-name-link" title="' + esc(fullName) + ' profilini görüntüle">' + esc(fullName) + '</a>' 
    : esc(fullName);

  var usernameHTML = m.username
    ? '<a href="profil.html?u=' + encodeURIComponent(m.username) + '" class="member-username-link" title="@' + esc(m.username) + ' profilini ve okuma listesini görüntüle">@' + esc(m.username) + ' ↗</a>'
    : '<span class="member-username">—</span>';

  var roleBadge = isAdmin
    ? '<span class="member-role-chip admin" title="Site Yöneticisi">⭐ Yönetici</span>'
    : '<span class="member-role-chip member" title="Kayıtlı Okur">📖 Okur</span>';

  var statusBadge = m.confirmed === false
    ? '<span class="member-status-chip pending" title="E-posta onayı bekleniyor">⏳ Onay Bekliyor</span>'
    : '<span class="member-status-chip active" title="Aktif ve onaylı üye">✓ Onaylı</span>';

  var mId = m.id || m.username || m.email;
  var viewProfBtn = profileLink ? '<a class="btn ghost small" href="' + profileLink + '" title="Profili ve okuma listesini incele">👤 Profil</a>' : '';
  var acts = '';
  if (!isSelf && m.username !== 'gogolunpaltosu' && m.email !== 'gogolunpaltosu@gmail.com') {
    acts = '<div class="member-acts">'
      + viewProfBtn
      + '<button class="btn ghost small" data-a="toggle-member-role" data-id="' + esc(mId) + '" title="Rolü Değiştir">' + (isAdmin ? 'Okur Yap' : 'Yönetici Yap') + '</button>'
      + '<button class="btn danger small" data-a="del-member" data-id="' + esc(mId) + '" title="Listeden Kaldır">Sil</button>'
      + '</div>';
  } else {
    acts = '<div class="member-acts">'
      + viewProfBtn
      + '<span style="font-size:.8rem;color:var(--ink-soft);font-style:italic;align-self:center">Mevcut Yönetici</span>'
      + '</div>';
  }

  return '<tr>'
    + '<td><div class="member-user-cell">'
    + avatarHTML
    + '<div><div class="member-name">' + nameHTML + '</div><div class="member-username">' + usernameHTML + '</div></div>'
    + '</div></td>'
    + '<td><span class="member-email">' + esc(email) + '</span></td>'
    + '<td><span class="member-date">' + esc(dateStr) + '</span></td>'
    + '<td><span class="member-favs">🔖 ' + favCount + ' kitap</span></td>'
    + '<td><div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">' + roleBadge + statusBadge + '</div></td>'
    + '<td style="text-align:right">' + acts + '</td>'
    + '</tr>';
}

function renderMemberTableHTML(list){
  if (!list.length) return '<p class="empty" style="padding:28px 16px">Aramanızla eşleşen üye bulunamadı.</p>';
  return '<div class="wrap-x"><table class="tbl"><thead><tr><th>Üye</th><th>E-posta</th><th>Kayıt Tarihi</th><th>Okuma Listesi</th><th>Rol / Durum</th><th style="text-align:right">İşlemler</th></tr></thead><tbody>'
    + list.map(memberRowHTML).join('')
    + '</tbody></table></div>';
}

function adminMembers(){
  var allMembers = getAdminMembersList();
  var q = lc(memberSearchQ).trim();
  var list = allMembers.filter(function(m){
    if (!q) return true;
    return lc([m.full_name, m.username, m.email, m.role, (m.role==='admin'?'yönetici admin':'okur üye')].join(' ')).indexOf(q) >= 0;
  });

  var totalCount = allMembers.length;
  var adminCount = allMembers.filter(function(m){ return m.role === 'admin'; }).length;
  var activeCount = allMembers.filter(function(m){ return m.confirmed !== false; }).length;
  var totalFavCount = allMembers.reduce(function(acc, m){ return acc + (Array.isArray(m.reading_list) ? m.reading_list.length : (m.reading_list_count || 0)); }, 0);

  return '<section class="page"><h1 class="ptitle">Yönetim Paneli</h1>'
    + adminTabs('members')
    + '<div class="stats-grid" style="margin-bottom:22px">'
    + '<div class="stat-box"><div class="stat-icon">👥</div><div class="stat-val">' + totalCount + '</div><div class="stat-lbl">Toplam Üye</div></div>'
    + '<div class="stat-box"><div class="stat-icon">⭐</div><div class="stat-val">' + adminCount + '</div><div class="stat-lbl">Yönetici</div></div>'
    + '<div class="stat-box"><div class="stat-icon">✓</div><div class="stat-val">' + activeCount + '</div><div class="stat-lbl">Aktif / Onaylı</div></div>'
    + '<div class="stat-box"><div class="stat-icon">🔖</div><div class="stat-val">' + totalFavCount + '</div><div class="stat-lbl">Okuma Listesi Kitapları</div></div>'
    + '</div>'

    + '<div class="member-toolbar">'
    + '<div class="member-search-wrap">'
    + '<input type="search" id="member-search-input" placeholder="İsim, kullanıcı adı (@) veya e-posta ile ara…" value="' + esc(memberSearchQ) + '">'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="btn ghost small" data-a="refresh-members">↻ Listeyi Yenile</button>'
    + '<button class="btn ghost small" data-a="export-members">📋 CSV İndir</button>'
    + '</div>'
    + '</div>'

    + '<div id="member-table-wrap">' + renderMemberTableHTML(list) + '</div>'

    + '<div class="notice" style="margin-top:28px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer" data-a="toggle-cloud-guide">'
    + '<span>☁️ <b>Supabase Canlı Veritabanı & Backend Şeması:</b> Üyeler, kitap incelemeleri, kamp forumu ve alıntılar için tek tıkla kurulum.</span>'
    + '<span style="color:var(--accent);font-weight:600;font-size:.85rem">Backend Kurulumu & SQL ▾</span>'
    + '</div>'
    + '<div id="cloud-guide-content" style="display:none;margin-top:14px;font-size:.88rem;line-height:1.6">'
    + '<p>Sitenizin canlı veritabanını (<code>profiles</code>, <code>book_reviews</code>, <code>camp_comments</code>, <code>camp_participants</code>, <code>community_quotes</code>) tek seferde kurmak için aşağıdaki SQL kodunu Supabase <b>SQL Editor</b> sekmesine yapıştırıp <b>RUN</b> demeniz yeterlidir:</p>'
    + '<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">'
    + '<button class="btn small" data-a="copy-backend-sql" style="background:var(--accent);color:#fff">📋 Tam SQL Şemasını Kopyala</button>'
    + '<a class="btn ghost small" href="https://supabase.com/dashboard/project/epvpzfmvdakryixghdhk/sql/new" target="_blank" rel="noopener">Supabase SQL Editor Aç ↗</a>'
    + '</div>'
    + '<pre style="background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:12px;overflow-x:auto;max-height:240px;font-size:.8rem;user-select:all">create or replace function get_all_members()\nreturns table (\n  id uuid,\n  email text,\n  created_at timestamptz,\n  raw_user_meta_data jsonb\n) security definer as $$\n  select id, email, created_at, raw_user_meta_data from auth.users order by created_at desc;\n$$ language sql;\n\ncreate or replace function get_email_by_username(p_username text)\nreturns text security definer as $$\ndeclare\n  found_email text;\nbegin\n  select email into found_email from public.profiles where lower(username) = lower(trim(replace(p_username, \'@\', \'\'))) limit 1;\n  if found_email is not null then return found_email; end if;\n  select email into found_email from auth.users where lower(raw_user_meta_data->>\'username\') = lower(trim(replace(p_username, \'@\', \'\'))) limit 1;\n  return found_email;\nend;\n$$ language plpgsql;</pre>'
    + '<p style="font-size:.82rem;color:var(--ink-soft);margin-top:8px">Ayrıntılı tablolar ve tam şema için projenizdeki <code>supabase_schema.sql</code> ve <code>SUPABASE_KURULUM.md</code> dosyalarını inceleyebilirsiniz.</p>'
    + '</div>'
    + '</div>'
    + '</section>';
}
function exportMembers(){
  var members = getAdminMembersList();
  if(!members.length){
    toast('Listelenecek üye bulunamadı.');
    return;
  }
  var csv = '\uFEFF';
  csv += 'Ad Soyad,Kullanıcı Adı,E-posta,Rol,Kayıt Tarihi,Okuma Listesi Kitap Sayısı\n';
  members.forEach(function(m){
    var name = '"' + (m.full_name || '').replace(/"/g, '""') + '"';
    var uname = '"' + (m.username ? '@' + m.username : '').replace(/"/g, '""') + '"';
    var em = '"' + (m.email || '').replace(/"/g, '""') + '"';
    var r = m.role === 'admin' ? 'Yönetici' : 'Okur';
    var dt = m.created_at ? new Date(m.created_at).toLocaleDateString('tr-TR') : '';
    var cnt = Array.isArray(m.reading_list) ? m.reading_list.length : (m.reading_list_count || 0);
    csv += [name, uname, em, r, dt, cnt].join(',') + '\n';
  });

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'gogolun-paltosu-uyeler-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Üye listesi CSV olarak indirildi.');
}
function adminGate(){
  if(!curUser){
    return '<section class="page"><h1 class="ptitle">Yönetim Paneli</h1><div class="notice">Bu bölüm yalnızca yetkili site yöneticisine açıktır. Yönetim paneline erişmek için lütfen yönetici hesabınızla <button class="btn small" data-a="open-auth" style="margin-left:8px">Giriş Yapın</button></div></section>';
  }
  return '<section class="page"><h1 class="ptitle">Yetkisiz Erişim</h1><div class="notice">Yönetim paneline erişim yetkiniz bulunmamaktadır. Şu anda <b>'+esc(curUser.email)+'</b> hesabı ile oturum açtınız.</div><a class="back" href="index.html">← Ana Sayfaya Dön</a></section>';
}
function renderGoalTracker(books, isSelf) {
  var goal = getReadingGoal();
  var stMap = getReadingStatusMap();
  var readCount = 0, readingCount = 0, wantCount = 0;
  (books || []).forEach(function(b){
    var st = stMap[b.id] || 'want';
    if (st === 'read') readCount++;
    else if (st === 'reading') readingCount++;
    else wantCount++;
  });
  var pct = Math.min(100, Math.round((readCount / goal) * 100));

  var editBtn = isSelf 
    ? '<button class="btn ghost small" data-a="edit-reading-goal" title="Yıllık hedefinizi güncelleyin">🎯 Hedefi Belirle</button>'
    : '';

  var totalCount = readCount + readingCount + wantCount;
  var statusLinksHTML = isSelf
    ? '<div class="goal-status-links">'
        + '<a href="okuma-listem.html?durum=okundu" class="goal-status-btn read" title="Okuduğunuz tüm kitapları filtrele">✓ <b>' + readCount + '</b> Okundu <span style="font-size:.76rem;opacity:.7">↗</span></a>'
        + '<a href="okuma-listem.html?durum=okunuyor" class="goal-status-btn reading" title="Şu an okuduğunuz tüm kitapları filtrele">📖 <b>' + readingCount + '</b> Şu An Okunuyor <span style="font-size:.76rem;opacity:.7">↗</span></a>'
        + '<a href="okuma-listem.html?durum=istek" class="goal-status-btn want" title="İstek listenizdeki tüm kitapları filtrele">🔖 <b>' + wantCount + '</b> İstek Listesinde <span style="font-size:.76rem;opacity:.7">↗</span></a>'
        + '<a href="okuma-listem.html" class="goal-status-btn all" title="Tüm okuma listenizi (hepsini) görüntüleyin">📚 <b>Hepsi (' + totalCount + ')</b> <span style="font-size:.76rem;opacity:.7">→</span></a>'
        + '</div>'
    : '<div class="goal-status-links">'
        + '<span class="goal-status-btn read">✓ <b>' + readCount + '</b> Okundu</span>'
        + '<span class="goal-status-btn reading">📖 <b>' + readingCount + '</b> Şu An Okunuyor</span>'
        + '<span class="goal-status-btn want">🔖 <b>' + wantCount + '</b> İstek Listesinde</span>'
        + '</div>';

  return '<div class="goal-tracker-card">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">'
    + '<div>'
    + '<h3 style="font-family:var(--serif);font-size:1.2rem;margin:0 0 4px">🎯 2026 Yıllık Okuma Hedefi</h3>'
    + '<div style="font-size:.88rem;color:var(--ink-soft)">Hedef: <b>' + goal + ' kitap</b> · Okunan: <b>' + readCount + '</b> (%' + pct + ')</div>'
    + '</div>'
    + editBtn
    + '</div>'
    + '<div class="goal-bar-wrap">'
    + '<div class="goal-bar-fill" style="width:' + pct + '%"></div>'
    + '</div>'
    + statusLinksHTML
    + '</div>';
}
function accountPage(targetId){
  var cleanTarget = targetId ? String(targetId).toLowerCase().replace(/^@/,'').trim() : '';
  var curMeta = (curUser && curUser.user_metadata) || {};
  var curUname = (curMeta.username || '').toLowerCase().replace(/^@/,'').trim();
  var curEmail = (curUser && curUser.email ? curUser.email.toLowerCase() : '');
  var isSelf = !cleanTarget || (curUser && (cleanTarget === curUname || cleanTarget === curEmail || cleanTarget === curUser.id));

  // --- BAŞKA BİR KULLANICININ HESABINI GÖRÜNTÜLEME ---
  if (!isSelf) {
    var m = findMemberByUsername(cleanTarget);
    if (!m) {
      return '<section class="page">'
        + '<a class="back" href="' + (canEdit ? '#/yonetim/uyeler' : '#/kitaplar') + '">← ' + (canEdit ? 'Üye Listesine Dön' : 'Kitaplara Dön') + '</a>'
        + '<h1 class="ptitle">Okur Profili</h1>'
        + '<div class="notice">Aradığınız <b>@' + esc(cleanTarget) + '</b> kullanıcı profili bulunamadı veya henüz aktif edilmemiş.</div>'
        + '</section>';
    }

    var mFullName = m.full_name || 'Edebiyat Okuru';
    var mUsername = m.username ? m.username.replace(/^@/,'') : '';
    var mEmail = m.email || '';
    var mIsAdmin = m.role === 'admin';
    var mUserReviews = getUserReviews(cleanTarget || mUsername || mEmail || m.id);
    var mUserQuotes = getUserQuotes(cleanTarget || mUsername || mEmail || m.id);
    var mJoinDate = '2026';
    try {
      if(m.created_at){
        mJoinDate = new Date(m.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    } catch(e){}

    var mInitials = 'GP';
    var mParts = mFullName.trim().split(/\s+/);
    if(mParts.length >= 2){
      mInitials = (mParts[0][0] + mParts[mParts.length-1][0]).toUpperCase();
    } else if(mParts.length === 1 && mParts[0]){
      mInitials = mParts[0].slice(0,2).toUpperCase();
    }

    var mAvatarUrl = m.avatar_url || '';
    var mAvatarStyle = mAvatarUrl
      ? 'background-image:url(' + esc(mAvatarUrl) + ');color:transparent;'
      : '';
    var mAvatarHTML = '<div class="profile-avatar-wrap">'
      + '<div class="profile-avatar" style="' + mAvatarStyle + ';cursor:default" title="' + esc(mFullName) + '">'
      + (mAvatarUrl ? '' : esc(mInitials))
      + '</div>'
      + '</div>';

    var mFavIds = Array.isArray(m.reading_list) ? m.reading_list : [];
    var mFavBooks = S.books.filter(function(b){ return mFavIds.indexOf(b.id) >= 0; });
    var mFavCount = mFavBooks.length || mFavIds.length;

    var mCats = {}, mAuthors = {};
    mFavBooks.forEach(function(b){
      if(b.category) mCats[b.category] = (mCats[b.category] || 0) + 1;
      if(b.author) mAuthors[b.author] = true;
    });
    var mUniqueCats = Object.keys(mCats).length;
    var mUniqueAuthors = Object.keys(mAuthors).length;
    var mTopCat = '—';
    var mMaxCount = 0;
    for(var c in mCats){
      if(mCats[c] > mMaxCount){
        mMaxCount = mCats[c];
        mTopCat = c;
      }
    }

    var mb1 = mFavCount >= 1;
    var mb2 = mFavCount >= 5;
    var mb3 = mFavCount >= 10;
    var mb4 = mUniqueAuthors >= 3;
    var mb5 = true;

    var mFavPreviewHTML = '';
    if(mFavBooks.length === 0){
      mFavPreviewHTML = '<p class="empty" style="padding:18px 0">Bu okurumuzun okuma listesinde henüz eklenmiş bir kitap bulunmuyor.</p>';
    } else {
      mFavPreviewHTML = '<div class="acc-fav-preview">' + mFavBooks.map(function(b){
        return '<div class="acc-fav-item">'
          + '<div class="acc-fav-info">'
          + '<div class="mini" style="--c:' + color(b.color) + (b.img && /^data:image\//.test(b.img) ? ';background-image:url(' + b.img + ');background-size:cover;background-position:center' : '') + '"></div>'
          + '<div style="min-width:0"><div class="acc-fav-title">' + esc(b.title) + '</div><div class="acc-fav-meta">' + esc(b.author) + (b.category ? ' · ' + esc(b.category) : '') + (b.year ? ' · ' + esc(b.year) : '') + '</div></div>'
          + '</div>'
          + '<div style="display:flex;gap:8px;align-items:center">'
          + '<a class="btn ghost small" href="kitap.html?id=' + encodeURIComponent(b.id) + '">Kitabı İncele →</a>'
          + '</div>'
          + '</div>';
      }).join('') + '</div>';
    }

    var backBtn = canEdit 
      ? '<a class="back" href="yonetim.html?tab=uyeler" style="margin-bottom:14px;display:inline-block">← Yönetim Paneli Üye Listesine Dön</a>' 
      : '<a class="back" href="kitaplar.html" style="margin-bottom:14px;display:inline-block">← Kitaplığa Dön</a>';

    var mQuizBadges = getUserBadges(cleanTarget || mUsername || mEmail || m.id);
    var mQuizBadgesHTML = mQuizBadges.map(function(qBadge){
      var matchingCh = READING_CHALLENGES.filter(function(c){ return c.badge === qBadge; })[0];
      var bIcon = matchingCh ? matchingCh.icon : '🎭';
      var bDesc = matchingCh ? ('Okuma meydan okumasında (' + matchingCh.title + ') kazanılan başarı rozeti.') : 'Edebiyat kişilik testinde kazandığı karakter ruhu rozeti.';
      return '<div class="badge-card"><div class="badge-card-icon">' + bIcon + '</div><div><div class="badge-card-title">' + esc(qBadge) + '</div><div class="badge-card-desc">' + esc(bDesc) + '</div></div></div>';
    }).join('');

    var mUserChs = getUserChallenges(cleanTarget || mUsername || mEmail || m.id);
    var mJoinedCount = Object.keys(mUserChs).filter(function(k){ return !!mUserChs[k]; }).length;

    return '<section class="page">'
      + backBtn
      + '<h1 class="ptitle">Okur Profili</h1>'
      + '<div class="profile-card">'
      + mAvatarHTML
      + '<div class="profile-info">'
      + '<div class="profile-name-row">'
      + '<h2 class="profile-name">' + esc(mFullName) + '</h2>'
      + (mIsAdmin 
          ? '<span class="profile-role-badge admin">⭐ Site Yöneticisi</span>' 
          : '<span class="profile-role-badge">📖 Edebiyat Okuru</span>')
      + (m.confirmed !== false 
          ? '<span class="profile-role-badge" style="background:rgba(40,140,60,.12);color:#288c3c;border:1px solid rgba(40,140,60,.3)">✓ Onaylı Üye</span>' 
          : '<span class="profile-role-badge" style="background:rgba(200,140,20,.12);color:#b87a14;border:1px solid rgba(200,140,20,.3)">⏳ Onay Bekliyor</span>')
      + '</div>'
      + '<div class="profile-meta">'
      + (mUsername ? '<span><b>@' + esc(mUsername) + '</b></span>' : '')
      + (canEdit && mEmail ? '<span>✉️ ' + esc(mEmail) + '</span>' : '')
      + '<span>📅 Üyelik: ' + esc(mJoinDate) + '</span>'
      + '</div>'
      + '</div>'
      + '</div>'

      + renderGoalTracker(mFavBooks, false)
      + '<h3 style="font-family:var(--serif);font-size:1.25rem;margin-bottom:14px">Okuma İstatistikleri</h3>'
      + '<div class="stats-grid">'
      + '<div class="stat-box"><div class="stat-icon">🔖</div><div class="stat-val">' + mFavCount + '</div><div class="stat-lbl">Okuma Listesindeki Kitap</div></div>'
      + '<div class="stat-box"><div class="stat-icon">✒️</div><div class="stat-val">' + mUniqueAuthors + '</div><div class="stat-lbl">Farklı Yazar</div></div>'
      + '<div class="stat-box"><div class="stat-icon">🏷️</div><div class="stat-val">' + mUniqueCats + '</div><div class="stat-lbl">Farklı Tür</div></div>'
      + '<div class="stat-box"><div class="stat-icon">🏆</div><div class="stat-val" style="font-size:1.3rem;padding-top:4px">' + esc(mTopCat) + '</div><div class="stat-lbl">En Çok Okunan Tür</div></div>'
      + '</div>'

      + '<h3 style="font-family:var(--serif);font-size:1.25rem;margin-bottom:14px">Kazanılan Rozetler</h3>'
      + '<div class="badges-grid">'
      + '<div class="badge-card' + (mb1 ? '' : ' locked') + '"><div class="badge-card-icon">☕</div><div><div class="badge-card-title">Akaki\'nin Yoldaşı</div><div class="badge-card-desc">İlk kitabını okuma listesine ekledi.</div></div></div>'
      + '<div class="badge-card' + (mb2 ? '' : ' locked') + '"><div class="badge-card-icon">🧥</div><div><div class="badge-card-title">Gogol\'un Palto\'su</div><div class="badge-card-desc">Listesine 5 veya daha fazla eser ekledi.</div></div></div>'
      + '<div class="badge-card' + (mb3 ? '' : ' locked') + '"><div class="badge-card-icon">📚</div><div><div class="badge-card-title">Kütüphaneci</div><div class="badge-card-desc">10 eseri bir araya getiren usta bir okur.</div></div></div>'
      + '<div class="badge-card' + (mb4 ? '' : ' locked') + '"><div class="badge-card-icon">🏛️</div><div><div class="badge-card-title">Klasikler Kaşifi</div><div class="badge-card-desc">En az 3 farklı ustanın eserlerini keşfetti.</div></div></div>'
      + '<div class="badge-card' + (mb5 ? '' : ' locked') + '"><div class="badge-card-icon">🌟</div><div><div class="badge-card-title">Sadık Okur</div><div class="badge-card-desc">Gogol\'un Paltosu kulübünün kayıtlı üyesi.</div></div></div>'
      + mQuizBadgesHTML
      + '</div>'

      + '<div class="acc-section">'
      + '<div class="acc-section-title"><span>Katıldığı Okuma Meydan Okumaları (' + mJoinedCount + ')</span><a class="btn ghost small" href="meydan-okuma.html">Tüm Meydan Okumalar 🏆</a></div>'
      + renderUserChallengesHTML(mUserChs, mFavBooks, mQuizBadges, false)
      + '</div>'
      + renderUserCampBadgeHTML(cleanTarget || mUsername || mEmail || m.id)

      + '<div class="acc-section">'
      + '<div class="acc-section-title"><span>Okuma Listesi (' + mFavCount + ')</span></div>'
      + mFavPreviewHTML
      + '</div>'

      + '<div class="acc-section">'
      + '<div class="acc-section-title"><span>Kitap İncelemeleri ve Yorumları (' + mUserReviews.length + ')</span></div>'
      + renderUserReviewsHTML(mUserReviews, false)
      + '</div>'

      + '<div class="acc-section">'
      + '<div class="acc-section-title"><span>Kitaplardan Paylaştığı Alıntılar (' + mUserQuotes.length + ')</span></div>'
      + renderUserQuotesHTML(mUserQuotes, false)
      + '</div>'
      + '</section>';
  }

  // --- KULLANICININ KENDİ HESABI ---
  if(!curUser){
    return '<section class="page"><h1 class="ptitle">Hesabım</h1>'
      + '<div class="profile-card" style="text-align:center;justify-content:center;padding:48px 24px;flex-direction:column">'
      + '<div style="font-size:3.5rem;margin-bottom:12px">📚</div>'
      + '<h2 style="font-family:var(--serif);font-size:1.55rem;margin-bottom:8px">Gogol\'un Paltosu Okur Hesabı</h2>'
      + '<p style="color:var(--ink-soft);max-width:500px;margin:0 auto 24px;line-height:1.6">Okuma listenizi tüm cihazlarınızda (telefon, tablet, bilgisayar) güvenle saklamak ve eşitlemek, edebiyat rozetlerinizi takip etmek ve okuma istatistiklerinizi görmek için giriş yapın veya ücretsiz hesap oluşturun.</p>'
      + '<div class="btns" style="justify-content:center;gap:12px"><button class="btn" data-a="open-auth">Giriş Yap / Ücretsiz Kayıt Ol</button><a class="btn ghost" href="kitaplar.html">Kitapları Keşfet</a></div>'
      + '</div></section>';
  }

  var meta = curUser.user_metadata || {};
  var fullName = meta.full_name || 'Edebiyat Okuru';
  var username = meta.username ? meta.username.replace(/^@/,'') : '';
  var email = curUser.email || '';
  var isAdmin = canEdit;
  var myReviews = getUserReviews(username || email || curUser.id);
  var myQuotes = getUserQuotes(username || email || curUser.id);

  var initials = '';
  var parts = fullName.trim().split(/\s+/);
  if(parts.length >= 2){
    initials = (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  } else if(parts.length === 1 && parts[0]){
    initials = parts[0].slice(0,2).toUpperCase();
  } else {
    initials = 'GP';
  }

  var avatarUrl = meta.avatar_url || '';
  var avatarStyle = avatarUrl
    ? 'background-image:url(' + esc(avatarUrl) + ');color:transparent;'
    : '';

  var avatarHTML = '<div class="profile-avatar-wrap">'
    + '<label class="profile-avatar" style="' + avatarStyle + '" for="prof-avatar-file" title="Profil fotoğrafını değiştirmek için tıklayın">'
    + (avatarUrl ? '' : esc(initials))
    + '<span class="profile-avatar-overlay">📷</span>'
    + '</label>'
    + '<input type="file" id="prof-avatar-file" accept="image/*" class="hide">'
    + '<div class="profile-avatar-controls">'
    + '<label class="btn-avatar-text" for="prof-avatar-file">Fotoğraf Değiştir</label>'
    + (avatarUrl ? '<button type="button" class="btn-avatar-text del" data-a="rm-avatar">Kaldır</button>' : '')
    + '</div>'
    + '</div>';

  var joinDate = '2026';
  try {
    if(curUser.created_at){
      joinDate = new Date(curUser.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  } catch(e){}

  var favCount = favs.length;
  var favBooks = S.books.filter(function(b){ return isFav(b.id); });
  
  var cats = {};
  var authors = {};
  favBooks.forEach(function(b){
    if(b.category) cats[b.category] = (cats[b.category] || 0) + 1;
    if(b.author) authors[b.author] = true;
  });
  var uniqueCatsCount = Object.keys(cats).length;
  var uniqueAuthorsCount = Object.keys(authors).length;
  
  var topCat = '—';
  var maxCatCount = 0;
  for(var c in cats){
    if(cats[c] > maxCatCount){
      maxCatCount = cats[c];
      topCat = c;
    }
  }

  var b1 = favCount >= 1;
  var b2 = favCount >= 5;
  var b3 = favCount >= 10;
  var b4 = uniqueAuthorsCount >= 3;
  var b5 = true;

  var myIdent = username || email || (curUser && curUser.id) || '';
  var quizBadges = getUserBadges(myIdent);
  var quizBadgesHTML = quizBadges.map(function(qBadge){
    var matchingCh = READING_CHALLENGES.filter(function(c){ return c.badge === qBadge; })[0];
    var bIcon = matchingCh ? matchingCh.icon : '🎭';
    var bDesc = matchingCh ? ('Okuma meydan okumanızda (' + matchingCh.title + ') kazandığınız başarı rozeti.') : 'Edebiyat kişilik testinde kazandığınız karakter ruhu rozeti.';
    return '<div class="badge-card"><div class="badge-card-icon">' + bIcon + '</div><div><div class="badge-card-title">' + esc(qBadge) + '</div><div class="badge-card-desc">' + esc(bDesc) + '</div></div></div>';
  }).join('');

  var myChs = getUserChallenges(myIdent);
  var myJoinedCount = Object.keys(myChs).filter(function(k){ return !!myChs[k]; }).length;

  var favPreviewHTML = '';
  if(favBooks.length === 0){
    favPreviewHTML = '<p class="empty" style="padding:14px 0">Okuma listenizde henüz kitap bulunmuyor.<br><br><a class="btn small" href="kitaplar.html">Kitapları İncele ve Ekle →</a></p>';
  } else {
    var previewSlice = favBooks.slice(0, 5);
    favPreviewHTML = '<div class="acc-fav-preview">' + previewSlice.map(function(b){
      return '<div class="acc-fav-item">'
        + '<div class="acc-fav-info">'
        + '<div class="mini" style="--c:' + color(b.color) + (b.img && /^data:image\//.test(b.img) ? ';background-image:url(' + b.img + ');background-size:cover;background-position:center' : '') + '"></div>'
        + '<div style="min-width:0"><div class="acc-fav-title">' + esc(b.title) + '</div><div class="acc-fav-meta">' + esc(b.author) + (b.category ? ' · ' + esc(b.category) : '') + (b.year ? ' · ' + esc(b.year) : '') + '</div></div>'
        + '</div>'
        + '<div style="display:flex;gap:8px;align-items:center">'
        + '<a class="btn ghost small" href="kitap.html?id=' + encodeURIComponent(b.id) + '">Gör</a>'
        + '<button class="btn danger small" data-a="fav" data-id="' + esc(b.id) + '" title="Listeden çıkar">✕</button>'
        + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }

  return '<section class="page">'
    + '<h1 class="ptitle">Kullanıcı Hesabı</h1>'
    + '<div class="profile-card">'
    + avatarHTML
    + '<div class="profile-info">'
    + '<div class="profile-name-row">'
    + '<h2 class="profile-name">' + esc(fullName) + '</h2>'
    + (isAdmin 
        ? '<span class="profile-role-badge admin">⭐ Site Yöneticisi</span>' 
        : '<span class="profile-role-badge">📖 Edebiyat Okuru</span>')
    + '</div>'
    + '<div class="profile-meta">'
    + (username ? '<span><a href="profil.html?u=' + encodeURIComponent(username) + '" class="member-username-link" title="Herkese açık profilinizi görüntüleyin"><b>@' + esc(username) + '</b> ↗</a></span>' : '')
    + '<span>✉️ ' + esc(email) + '</span>'
    + '<span>📅 Üyelik: ' + esc(joinDate) + '</span>'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + (isAdmin ? '<a class="btn small" href="yonetim.html">⚙️ Yönetim Paneli</a>' : '')
    + '<button class="btn ghost small" data-a="logout">Çıkış Yap</button>'
    + '</div>'
    + '</div>'

    + renderGoalTracker(favBooks, true)
    + '<h3 style="font-family:var(--serif);font-size:1.25rem;margin-bottom:14px">Okuma İstatistikleriniz</h3>'
    + '<div class="stats-grid">'
    + '<div class="stat-box"><div class="stat-icon">🔖</div><div class="stat-val">' + favCount + '</div><div class="stat-lbl">Listemdeki Kitap</div></div>'
    + '<div class="stat-box"><div class="stat-icon">✒️</div><div class="stat-val">' + uniqueAuthorsCount + '</div><div class="stat-lbl">Farklı Yazar</div></div>'
    + '<div class="stat-box"><div class="stat-icon">🏷️</div><div class="stat-val">' + uniqueCatsCount + '</div><div class="stat-lbl">Farklı Tür</div></div>'
    + '<div class="stat-box"><div class="stat-icon">🏆</div><div class="stat-val" style="font-size:1.3rem;padding-top:4px">' + esc(topCat) + '</div><div class="stat-lbl">En Çok Okunan Tür</div></div>'
    + '</div>'

    + '<h3 style="font-family:var(--serif);font-size:1.25rem;margin-bottom:14px">Edebiyat Rozetleriniz</h3>'
    + '<div class="badges-grid">'
    + '<div class="badge-card' + (b1 ? '' : ' locked') + '"><div class="badge-card-icon">☕</div><div><div class="badge-card-title">Akaki\'nin Yoldaşı</div><div class="badge-card-desc">İlk kitabınızı okuma listenize eklediniz.</div></div></div>'
    + '<div class="badge-card' + (b2 ? '' : ' locked') + '"><div class="badge-card-icon">🧥</div><div><div class="badge-card-title">Gogol\'un Palto\'su</div><div class="badge-card-desc">Listenize 5 veya daha fazla eser eklediniz.</div></div></div>'
    + '<div class="badge-card' + (b3 ? '' : ' locked') + '"><div class="badge-card-icon">📚</div><div><div class="badge-card-title">Kütüphaneci</div><div class="badge-card-desc">10 eseri bir araya getiren usta bir okursunuz.</div></div></div>'
    + '<div class="badge-card' + (b4 ? '' : ' locked') + '"><div class="badge-card-icon">🏛️</div><div><div class="badge-card-title">Klasikler Kaşifi</div><div class="badge-card-desc">En az 3 farklı ustanın eserlerini keşfettiniz.</div></div></div>'
    + '<div class="badge-card' + (b5 ? '' : ' locked') + '"><div class="badge-card-icon">🌟</div><div><div class="badge-card-title">Sadık Okur</div><div class="badge-card-desc">Gogol\'un Paltosu edebiyat kulübünün kayıtlı üyesi.</div></div></div>'
    + quizBadgesHTML
    + '</div>'

    + '<div class="acc-section">'
    + '<div class="acc-section-title"><span>Katıldığınız Okuma Meydan Okumaları (' + myJoinedCount + ')</span><a class="btn small" href="meydan-okuma.html">Meydan Okumalara Git 🏆</a></div>'
    + renderUserChallengesHTML(myChs, favBooks, quizBadges, true)
    + '</div>'
    + renderUserCampBadgeHTML(username || email || curUser.id)

    + '<div class="acc-section">'
    + '<div class="acc-section-title"><span>Okuma Listenizden Son Eklenenler</span><div style="display:flex;gap:8px"><button class="btn ghost small" data-a="export-reading-list">📋 Listeyi Dışa Aktar</button><a class="btn small" href="okuma-listem.html">Tümünü Gör (' + favCount + ') →</a></div></div>'
    + favPreviewHTML
    + '</div>'

    + '<div class="acc-section">'
    + '<div class="acc-section-title"><span>Kitap İncelemeleriniz ve Yorumlarınız (' + myReviews.length + ')</span></div>'
    + renderUserReviewsHTML(myReviews, true)
    + '</div>'

    + '<div class="acc-section">'
    + '<div class="acc-section-title"><span>Kitaplardan Paylaştığınız Alıntılar (' + myQuotes.length + ')</span><a class="btn small" href="alintilar.html">＋ Yeni Alıntı Paylaş</a></div>'
    + renderUserQuotesHTML(myQuotes, true)
    + '</div>'

    + '<div class="acc-section">'
    + '<div class="acc-section-title"><span>Odak Modunda Altını Çizdiğiniz Pasajlar ve Notlarınız</span></div>'
    + renderUserHighlightsHTML(getReaderHighlights())
    + '</div>'

    + '<div class="acc-section">'
    + '<div class="acc-section-title">Profil ve Hesap Bilgileri</div>'

    + '<form id="profile-update-form" onsubmit="return false;">'
    + '<div class="row2">'
    + '<div><label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Ad Soyad</label><input type="text" id="prof-name" class="auth-input" value="' + esc(fullName) + '" required></div>'
    + '<div><label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Kullanıcı Adı</label><input type="text" id="prof-username" class="auth-input" value="' + esc(username) + '" required pattern="[a-zA-Z0-9_.-]+" title="Harf, rakam, nokta, tire veya alt çizgi"></div>'
    + '</div>'
    + '<div class="row2">'
    + '<div><label style="display:block;font-size:.85rem;margin-bottom:4px;font-weight:600">Kayıtlı E-posta</label><input type="email" class="auth-input" value="' + esc(email) + '" disabled style="opacity:.65;cursor:not-allowed"></div>'
    + '<div style="align-self:end;padding-bottom:12px"><button type="button" class="btn ghost" style="width:100%" data-a="change-password-modal">🔑 Şifremi Değiştir</button></div>'
    + '</div>'
    + '<div style="display:flex;gap:10px;justify-content:flex-start;margin-top:4px">'
    + '<button type="submit" id="prof-save-btn" class="btn">Bilgileri Güncelle</button>'
    + '</div>'
    + '</form>'
    + '</div>'
    + '</section>';
}

function welcomePage(){
  var user = curUser;
  var meta = (user && user.user_metadata) || {};
  var fullName = meta.full_name || 'Değerli Okurumuz';
  var username = meta.username ? meta.username.replace(/^@/,'') : '';
  var email = (user && user.email) || '';

  return '<section class="page">'
    + '<div class="welcome-container">'
    + '<div class="welcome-badge"><div class="welcome-badge-icon">' + EMB + '</div></div>'
    + '<div class="welcome-quote">“Hepimiz Gogol\'un Palto\'sundan çıktık.”<span class="welcome-quote-author">— F. M. Dostoyevski</span></div>'
    + '<h1 class="welcome-title">Aramıza Hoş Geldiniz, ' + esc(fullName) + '! 🎉</h1>'
    + '<p class="welcome-subtitle">E-posta adresiniz başarıyla onaylandı ve üyeliğiniz aktifleştirildi.<br>Artık Gogol\'un Paltosu edebiyat kulübünün tam yetkili bir üyesisiniz.</p>'
    
    + (email ? '<div class="welcome-meta-pill">'
      + '<span>✉️ <b>' + esc(email) + '</b></span>'
      + (username ? '<span class="sep">·</span><span>👤 <a href="profil.html" style="color:inherit;text-decoration:none"><b>@' + esc(username) + '</b></a></span>' : '')
      + '<span class="sep">·</span><span class="welcome-verified-chip">✓ Onaylı Üye</span>'
      + '</div>' : '')

    + '<div class="welcome-features">'
    + '<div class="welcome-feat-card">'
    + '<div class="welcome-feat-icon">📚</div>'
    + '<h3>Zengin Edebiyat Kütüphanesi</h3>'
    + '<p>Klasik romanlar, öyküler, felsefi metinler ve YouTube kanalımızdaki video analizlerinin tam konuşma metinleri.</p>'
    + '<a class="welcome-feat-link" href="kitaplar.html">Kitapları İncele →</a>'
    + '</div>'

    + '<div class="welcome-feat-card">'
    + '<div class="welcome-feat-icon">🔖</div>'
    + '<h3>Bulut Okuma Listeniz</h3>'
    + '<p>Beğendiğiniz kitapları tek tıkla listenize ekleyin; telefon, tablet ve bilgisayarınızda anında eşitlensin.</p>'
    + '<a class="welcome-feat-link" href="okuma-listem.html">Listenize Bakın →</a>'
    + '</div>'

    + '<div class="welcome-feat-card">'
    + '<div class="welcome-feat-icon">📖</div>'
    + '<h3>EPUB & PDF İndirmeleri</h3>'
    + '<p>E-kitap okuyucunuz veya telefonunuz için doğrudan indirilebilir dijital kitap arşivine erişin.</p>'
    + '<a class="welcome-feat-link" href="kitaplar.html?f=indirilebilir">İndirilebilir Eserler →</a>'
    + '</div>'

    + '<div class="welcome-feat-card">'
    + '<div class="welcome-feat-icon">👤</div>'
    + '<h3>Kişisel Okur Profili</h3>'
    + '<p>Profil fotoğrafınızı değiştirin, okuma rozetlerinizi görün ve okuma listenizi metin belgesi olarak indirin.</p>'
    + '<a class="welcome-feat-link" href="profil.html">Profilinizi Görün →</a>'
    + '</div>'
    + '</div>'

    + '<div class="welcome-cta-wrap">'
    + '<a class="btn welcome-main-btn" href="kitaplar.html">📚 Kütüphaneyi Keşfetmeye Başla</a>'
    + '<a class="btn ghost welcome-sec-btn" href="profil.html">Hesabım & Profilim</a>'
    + '</div>'
    + '</div>'
    + '</section>';
}

function pill(){
  if(!(canEdit&&dirty))return '';
  return '<div class="pill"><span>Yayınlanmamış değişiklikler var</span><button class="btn small" data-a="publish">Kaydet / Yayınla</button><button class="btn ghost small" data-a="discard-draft" style="color:var(--ink-soft);border-color:var(--line);padding:2px 8px;font-size:.78rem;margin-left:2px" title="Değişiklikleri İptal Et / Kapat">✕</button></div>';
}

/* ---------- yönlendirme ---------- */
function route(){
  var h = location.hash.replace(/^#\/?/,'');
  if (h.indexOf('access_token=') >= 0 || h.indexOf('error=') >= 0) {
    if (h.indexOf('type=signup') >= 0 || location.search.indexOf('type=signup') >= 0 || h.indexOf('hosgeldiniz') >= 0) {
      return ['hosgeldiniz'];
    }
    return [''];
  }
  if (h) {
    return h.split('/').map(function(x){try{return decodeURIComponent(x);}catch(e){return x;}});
  }
  // Coklu sayfa destegi (Multi-page HTML support)
  var path = (window.location.pathname.split('/').pop() || '').toLowerCase();
  var page = path.replace('.html', '') || '';
  if (window.PAGE_NAME) page = window.PAGE_NAME;
  var params = new URLSearchParams(window.location.search);

  if (!page || page === 'index' || page === 'home') return [''];
  if (page === 'kitaplar') {
    var f = params.get('f');
    return f ? ['kitaplar', f] : ['kitaplar'];
  }
  if (page === 'okuma-listem') {
    var st = params.get('durum');
    return st ? ['okuma-listem', st] : ['okuma-listem'];
  }
  if (page === 'kitap') {
    var id = params.get('id') || 'suc-ve-ceza';
    return ['kitap', id];
  }
  if (page === 'alintilar') return ['alintilar'];
  if (page === 'sozluk' || page === 'kavramlar') return ['sozluk'];
  if (page === 'meydan-okuma' || page === 'challenges') return ['meydan-okuma'];
  if (page === 'kamp' || page === 'tartisma' || page === 'okuma-kampi') return ['kamp'];
  if (page === 'test' || page === 'quiz') {
    var qId = params.get('id');
    return qId ? ['test', qId] : ['test'];
  }
  if (page === 'hakkinda' || page === 'about') return ['hakkinda'];
  if (page === 'hesabim' || page === 'profil' || page === 'kullanici' || page === 'u') {
    var uId = params.get('u');
    return uId ? ['profil', uId] : ['profil'];
  }
  if (page === 'yonetim' || page === 'admin') {
    var tab = params.get('tab');
    return tab ? ['yonetim', tab] : ['yonetim'];
  }
  if (page === 'hosgeldiniz' || page === 'onaylandi') return ['hosgeldiniz'];
  return [''];
}

function render(){
  var p=route(), body='';
  if(p[0]==='')body=home();
  else if(p[0]==='kitaplar')body=library(false, p[1]==='indirilebilir');
  else if(p[0]==='okuma-listem')body=library(true, false, p[1]);
  else if(p[0]==='kitap')body=bookPage(p[1]);
  else if(p[0]==='hakkinda')body=about();
  else if(p[0]==='test'||p[0]==='quiz')body=quizPage(p[1]);
  else if(p[0]==='alintilar')body=quotesPage();
  else if(p[0]==='hesabim'||p[0]==='profil'||p[0]==='kullanici'||p[0]==='u')body=accountPage(p[1]);
  else if(p[0]==='hosgeldiniz'||p[0]==='onaylandi')body=welcomePage();
  else if(p[0]==='sozluk'||p[0]==='kavramlar')body=glossaryPage();
  else if(p[0]==='meydan-okuma'||p[0]==='challenges')body=challengesPage();
  else if(p[0]==='kamp'||p[0]==='tartisma'||p[0]==='okuma-kampi')body=campDiscussionPage();
  else if(p[0]==='yonetim'){
    if(!canEdit)body=adminGate();
    else if(p[1]==='kitap')body=bookForm(p[2]||'yeni');
    else if(p[1]==='ayarlar')body=adminSettings();
    else if(p[1]==='uyeler'||p[1]==='kullanicilar')body=adminMembers();
    else body=adminList();
  } else body='<section class="page"><h1 class="ptitle">Sayfa bulunamadı</h1><a class="back" href="index.html">← Ana sayfa</a></section>';
  var pageTitle = S.site.name;
  if(p[0]==='kitap' && p[1]) {
    var bItem = S.books.filter(function(x){return x.id===p[1];})[0];
    if(bItem) pageTitle = bItem.title + ' — ' + S.site.name;
  } else if(p[0]==='kitaplar') {
    pageTitle = 'Tüm Kitaplar & Okuma Listem — ' + S.site.name;
  } else if(p[0]==='okuma-listem') {
    pageTitle = 'Okuma Listem — ' + S.site.name;
  } else if(p[0]==='alintilar') {
    pageTitle = 'Edebi Alıntılar — ' + S.site.name;
  } else if(p[0]==='sozluk'||p[0]==='kavramlar') {
    pageTitle = 'Edebi Kavramlar Sözlüğü — ' + S.site.name;
  } else if(p[0]==='meydan-okuma'||p[0]==='challenges') {
    pageTitle = 'Okuma Meydan Okumaları — ' + S.site.name;
  } else if(p[0]==='kamp'||p[0]==='tartisma'||p[0]==='okuma-kampi') {
    pageTitle = 'Okuma Kampı Tartışması — ' + S.site.name;
  } else if(p[0]==='test'||p[0]==='quiz') {
    var qItem = LITERARY_QUIZZES.filter(function(x){return x.id===p[1];})[0];
    if(qItem) pageTitle = qItem.title + ' — ' + S.site.name;
    else pageTitle = 'Edebi Testler — ' + S.site.name;
  } else if(p[0]==='hesabim'||p[0]==='profil'||p[0]==='kullanici'||p[0]==='u') {
    pageTitle = 'Okur Profili — ' + S.site.name;
  } else if(p[0]==='yonetim') {
    pageTitle = 'Yönetim Paneli — ' + S.site.name;
  }
  document.title = pageTitle;
  $app.innerHTML=header(p)+'<main>'+body+'</main>'+footer()+pill()+audioWidgetHTML()+renderQuoteCardModalHTML();
  soundManager.updateUI();
}
var lastKey='';
function onRoute(){
  var k=route().slice(0,2).join('/');
  var p=route();
  if(k!==lastKey) lib.page=1;
  render();
  if(canEdit && p[0]==='yonetim' && (p[1]==='uyeler'||p[1]==='kullanicilar')){
    fetchSupabaseMembers().then(function(hasNew){
      if(hasNew) render();
    });
  }
  if(k!==lastKey)window.scrollTo(0,0);
  lastKey=k;
}

function refreshLib(){
  var p=route();
  var isFav=(p[0]==='okuma-listem');
  var isDl=(p[0]==='kitaplar'&&p[1]==='indirilebilir')||lib.dlOnly;
  var cEl=document.getElementById('lib-chips');
  var rEl=document.getElementById('lib-results');
  if(cEl)cEl.innerHTML=libChips(isFav, isDl, p[1]);
  if(rEl)rEl.innerHTML=libResults(isFav, isDl, p[1]);
}

/* ---------- olaylar ---------- */
window.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    closeReaderMode();
    if(typeof closeMobileMenu === 'function') closeMobileMenu();
    document.querySelectorAll('.nav-dropdown.open').forEach(function(el){ el.classList.remove('open'); });
  }
});
document.addEventListener('click',function(e){
  // Sayfa gecislerini yakala ve yukleme suresi/animasyonu uygula
  var linkEl = e.target.closest('a');
  if (linkEl && !e.defaultPrevented) {
    if (typeof closeMobileMenu === 'function' && linkEl.closest('#mobile-drawer')) {
      closeMobileMenu();
    }
    var href = linkEl.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:') && linkEl.target !== '_blank') {
      if (href.indexOf('.html') >= 0) {
        var targetBase = href.split(/[?#]/)[0];
        var curBase = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (targetBase && targetBase !== curBase) {
          e.preventDefault();
          var navMsg = 'Sayfa Hazırlanıyor...';
          if (targetBase === 'kitaplar.html') navMsg = 'Kitaplar ve Okuma Listesi Yükleniyor...';
          else if (targetBase === 'okuma-listem.html') navMsg = 'Okuma Listeniz Açılıyor...';
          else if (targetBase === 'kitap.html') navMsg = 'Kitap Tahlili ve Detayları Yükleniyor...';
          else if (targetBase === 'alintilar.html') navMsg = 'Edebi Alıntılar Derleniyor...';
          else if (targetBase === 'sozluk.html') navMsg = 'Kavramlar Sözlüğü Açılıyor...';
          else if (targetBase === 'meydan-okuma.html') navMsg = 'Meydan Okumalar Hazırlanıyor...';
          else if (targetBase === 'kamp.html') navMsg = 'Okuma Kampı Tartışması Yükleniyor...';
          else if (targetBase === 'test.html') navMsg = 'Edebi Testler Yükleniyor...';
          else if (targetBase === 'index.html') navMsg = 'Ana Sayfaya Dönülüyor...';
          navigateToPage(href, navMsg);
          return;
        }
      }
    }
  }
  // Menü dışına tıklandığında açık dropdown'ları kapat
  if (!e.target.closest('.nav-dropdown')) {
    document.querySelectorAll('.nav-dropdown.open').forEach(function(el){
      el.classList.remove('open');
    });
  }
  var starBtn = e.target.closest('.star-btn');
  if (starBtn) {
    var picker = starBtn.closest('.star-picker');
    if (picker) {
      var starVal = parseInt(starBtn.getAttribute('data-star'), 10) || 5;
      picker.setAttribute('data-rating', starVal);
      var allStars = picker.querySelectorAll('.star-btn');
      allStars.forEach(function(s){
        var v = parseInt(s.getAttribute('data-star'), 10);
        s.classList.toggle('on', v <= starVal);
      });
      return;
    }
  }
  var t=e.target.closest('[data-a]');if(!t)return;
  var a=t.getAttribute('data-a'),v=t.getAttribute('data-v'),id=t.getAttribute('data-id');
  if(a==='toggle-mobile-menu'){
    e.preventDefault();
    toggleMobileMenu();
    return;
  }
  else if(a==='close-mobile-menu'){
    e.preventDefault();
    closeMobileMenu();
    return;
  }
  else if(a==='toggle-nav-dropdown'){
    e.preventDefault();
    e.stopPropagation();
    var drp = t.closest('.nav-dropdown');
    if (drp) drp.classList.toggle('open');
    return;
  }
  else if(a==='theme')toggleTheme();
  else if(a==='open-auth'){openAuthModal('login');}
  else if(a==='logout'){doLogout();}
  else if(a==='fav'){toggleFav(id);}
  else if(a==='nextquote'){nextQuote();}
  else if(a==='favonly'){lib.favOnly=!lib.favOnly;lib.page=1;refreshLib();}
  else if(a==='clearfavfilter'){lib.favOnly=false;lib.page=1;if(route()[0]==='okuma-listem'){navigateToPage('kitaplar.html');}else{refreshLib();}}
  else if(a==='dlonly'){
    var curR=route();
    if((curR[0]==='kitaplar'&&curR[1]==='indirilebilir') || lib.dlOnly){
      lib.dlOnly=false;
      lib.page=1;
      navigateToPage('kitaplar.html');
    } else {
      lib.dlOnly=true;
      lib.page=1;
      navigateToPage('kitaplar.html?f=indirilebilir');
    }
  }
  else if(a==='cleardlfilter'){
    lib.dlOnly=false;
    lib.page=1;
    navigateToPage('kitaplar.html');
  }
  else if(a==='cat'){
    lib.cat = (lib.cat === v && v !== '') ? '' : v;
    lib.favOnly = false;
    lib.page = 1;
    refreshLib();
  }
  else if(a==='page'){
    var targetPage = parseInt(t.getAttribute('data-p'), 10);
    if(targetPage && targetPage !== lib.page){
      lib.page = targetPage;
      refreshLib();
      var scrollTarget = document.getElementById('lib-chips') || document.getElementById('lib-results');
      if(scrollTarget){
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
  else if(a==='tab'){
    var tabTarget = t.getAttribute('data-t');
    ['pane-tr', 'pane-reviews', 'pane-chars', 'pane-src'].forEach(function(pId){
      var paneEl = document.getElementById(pId);
      if(paneEl) paneEl.classList.toggle('hide', pId !== ('pane-' + tabTarget));
    });
    var szEl = document.getElementById('sz');
    if(szEl) szEl.classList.toggle('hide', tabTarget !== 'tr');
    [].forEach.call(document.querySelectorAll('.tb'), function(x){
      x.classList.toggle('on', x === t);
    });
  }
  else if(a==='fs'){readerScale=Math.min(1.5,Math.max(.85,readerScale+(+t.getAttribute('data-d'))*.1));document.getElementById('pane-tr').style.setProperty('--rs',readerScale);}
  else if(a==='publish')doPublish();
  else if(a==='discard-draft'){
    dirty = false;
    try{sessionStorage.removeItem('gp-draft');}catch(e){}
    S = JSON.parse(BASE);
    render();
    toast('Değişiklikler iptal edildi.');
  }
  else if(a==='toggle'){var b=S.books.filter(function(x){return x.id===id;})[0];if(b){b.status=b.status==='draft'?'published':'draft';markDirty();render();}}
  else if(a==='del'){var bk=S.books.filter(function(x){return x.id===id;})[0];if(bk)confirmBox('“'+bk.title+'” kitabı silinsin mi?','Sil',function(){S.books=S.books.filter(function(x){return x.id!==id;});markDirty();render();toast('Kitap silindi (henüz yayınlanmadı).');});}
  else if(a==='savebook')saveBook(id);
  else if(a==='rmimg'){formImg='';document.getElementById('img-prev').innerHTML='<span class="hint">Henüz görsel yok</span>';var fi=document.getElementById('f-img');if(fi)fi.value='';}
  else if(a==='savesettings')saveSettings();
  else if(a==='export-reading-list')exportReadingList();
  else if(a==='change-password-modal')openAuthModal('newpass');
  else if(a==='refresh-members'){
    toast('Üye listesi kontrol ediliyor…');
    fetchSupabaseMembers().then(function(){
      render();
      toast('Üye listesi güncellendi.');
    });
  }
  else if(a==='export-members')exportMembers();
  else if(a==='toggle-cloud-guide'){
    var gEl=document.getElementById('cloud-guide-content');
    if(gEl) gEl.style.display=(gEl.style.display==='none'||!gEl.style.display)?'block':'none';
  }
  else if(a==='copy-backend-sql'){
    var pre = document.querySelector('#cloud-guide-content pre');
    if (pre && navigator.clipboard) {
      navigator.clipboard.writeText(pre.textContent).then(function(){
        toast('SQL şeması panoya kopyalandı! Supabase SQL Editor\'e yapıştırabilirsiniz. 📋');
      }).catch(function(){
        toast('Lütfen SQL kutusundaki metni seçip kopyalayın.');
      });
    }
  }
  else if(a==='toggle-member-role'){
    var mems=getAdminMembersList();
    var target=mems.find(function(m){return (m.id===id||m.username===id||m.email===id);});
    if(target){
      var newRole=target.role==='admin'?'member':'admin';
      target.role=newRole;
      addMemberToRegistry(target);
      toast((target.full_name||target.username||target.email)+' yetkisi '+(newRole==='admin'?'Yönetici':'Okur')+' olarak güncellendi.');
      render();
    }
  }
  else if(a==='del-member'){
    var mems=getAdminMembersList();
    var target=mems.find(function(m){return (m.id===id||m.username===id||m.email===id);});
    var dName=target?(target.full_name||target.username||target.email):'Bu üye';
    confirmBox('“'+dName+'” üyesi listeden silinsin mi?','Sil',function(){
      if(Array.isArray(S.members)){
        S.members=S.members.filter(function(m){return m.id!==id&&m.username!==id&&m.email!==id;});
        markDirty();
      }
      try{
        var localM=JSON.parse(localStorage.getItem('gp-members')||'[]');
        localM=localM.filter(function(m){return m.id!==id&&m.username!==id&&m.email!==id;});
        localStorage.setItem('gp-members',JSON.stringify(localM));
      }catch(e){}
      if(supa && target && target.id && target.id.length > 20){
        supa.from('profiles').delete().eq('id', target.id).then(function(){}).catch(function(){});
      }
      render();
      toast('Üye listeden silindi.');
    });
  }
  else if(a==='rm-avatar')removeProfileAvatar();
  else if(a==='toggle-audio-panel'){
    audioPanelOpen = !audioPanelOpen;
    var pnl = document.getElementById('audio-panel');
    if(pnl) pnl.classList.toggle('open', audioPanelOpen);
  }
  else if(a==='toggle-play'){
    soundManager.toggle();
  }
  else if(a==='play-track'){
    var track = t.getAttribute('data-track');
    if (track) {
      if (soundManager.getTrack() === track && soundManager.isPlaying()) {
        soundManager.pause();
      } else {
        soundManager.setTrack(track);
        soundManager.play();
      }
    }
  }
  else if(a==='open-reader'){
    openReaderMode(id);
  }
  else if(a==='close-reader'){
    closeReaderMode();
  }
  else if(a==='reader-theme'){
    readerState.theme = v;
    var rModal = document.getElementById('global-reader-modal');
    if (rModal) {
      rModal.className = 'reader-modal open theme-' + v;
      var themeBtns = rModal.querySelectorAll('[data-a="reader-theme"]');
      themeBtns.forEach(function(b){
        b.classList.toggle('active', b.getAttribute('data-v') === v);
      });
    }
  }
  else if(a==='reader-fs'){
    var d = parseInt(t.getAttribute('data-d'), 10) || 1;
    readerState.fontSize = Math.min(28, Math.max(14, readerState.fontSize + (d * 2)));
    var rArt = document.getElementById('reader-article');
    if (rArt) rArt.style.fontSize = readerState.fontSize + 'px';
  }
  else if(a==='set-book-status'){
    var st = t.getAttribute('data-st');
    var curSt = getReadingStatus(id);
    if(curSt === st){
      setReadingStatus(id, '');
      render();
      toast('Okuma durumu kaldırıldı.');
    } else {
      setReadingStatus(id, st);
      render();
      var stNames = { want: 'İstek Listesinde', reading: 'Okunuyor', read: 'Okundu' };
      toast('Okuma durumu güncellendi: ' + (stNames[st] || 'Güncellendi') + ' 📚');
    }
  }
  else if(a==='edit-reading-goal'){
    var curG = getReadingGoal();
    var inputG = prompt('2026 yılı için okuma hedefi kitap sayınız:', curG);
    if (inputG !== null) {
      setReadingGoal(inputG);
      render();
      toast('Yıllık okuma hedefiniz ' + getReadingGoal() + ' kitap olarak belirlendi! 🎯');
    }
  }
  else if(a==='open-test-auth'){
    toast('Edebi testleri çözmek kulüp üyelerine özeldir. Lütfen giriş yapın.');
    openAuthModal('login');
  }
  else if(a==='answer-quiz'){
    if (!curUser) {
      toast('Edebi testleri çözmek kulüp üyelerine özeldir. Lütfen giriş yapın.');
      openAuthModal('login');
      return;
    }
    var chosenChar = t.getAttribute('data-char');
    var qId = t.getAttribute('data-quiz-id') || activeQuizId || 'rus-karakter';
    if (chosenChar) {
      if (!quizAnswersMap[qId]) quizAnswersMap[qId] = [];
      quizAnswersMap[qId].push(chosenChar);
      render();
      window.scrollTo(0, 0);
    }
  }
  else if(a==='reset-quiz'){
    if (!curUser) {
      openAuthModal('login');
      return;
    }
    var qId = t.getAttribute('data-quiz-id') || activeQuizId || 'rus-karakter';
    quizAnswersMap[qId] = [];
    render();
    window.scrollTo(0, 0);
  }
  else if(a==='like-quote'){
    likeQuote(id);
    render();
  }
  else if(a==='like-review'){
    likeReview(id);
    render();
  }
  else if(a==='like-passage'){
    likePassage(id);
    var pEl = document.getElementById('daily-passage-container');
    if (pEl) {
      pEl.outerHTML = renderDailyPassageHTML();
    } else {
      render();
    }
  }
  else if(a==='del-quote'){
    confirmBox('Bu alıntıyı duvardan silmek istediğinizden emin misiniz?', 'Sil', function(){
      deleteQuote(id);
      render();
      toast('Alıntı duvardan kaldırıldı.');
    });
  }
  else if(a==='copy-quote-text'){
    var cTxt = t.getAttribute('data-text') || '';
    if (cTxt) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cTxt).then(function(){
          toast('Alıntı kopyalandı! 📋');
        }).catch(function(){
          toast('Kopyalandı: ' + cTxt);
        });
      } else {
        toast('Alıntı kopyalandı! 📋');
      }
    }
  }
  else if(a==='copy-email'){
    var emTxt = t.getAttribute('data-email') || (S.site && S.site.email) || 'ngogolunpaltosu@gmail.com';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(emTxt).then(function(){
        toast('E-posta adresi panoya kopyalandı! ✉️ (' + emTxt + ')');
      }).catch(function(){
        toast('E-posta: ' + emTxt);
      });
    } else {
      toast('E-posta adresi: ' + emTxt);
    }
  }
  else if(a==='join-camp'){
    if(!curUser){
      toast('Tartışmaya ve kampa katılmak için lütfen üye girişi yapın.');
      openAuthModal('login');
      return;
    }
    joinCampDiscussion('🎯 Tartışmaya Katıldı · Okuyor');
    toast('Tebrikler! Tartışmaya ve okuma kampına başarıyla katıldınız. 🎉');
    render();
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }
  else if(a==='leave-camp'){
    confirmBox('Bu okuma kampından ayrılmak istediğinize emin misiniz?', 'Ayrıl', function(){
      leaveCampDiscussion();
      toast('Kamptan ayrıldınız.');
      render();
    });
  }
  else if(a==='submit-camp-comment'){
    if(!curUser){
      toast('Tartışmaya yorum yazmak için lütfen üye girişi yapın.');
      openAuthModal('login');
      return;
    }
    var txtEl = document.getElementById('camp-comment-text');
    var txt = txtEl ? txtEl.value.trim() : '';
    if(!txt){
      toast('Lütfen düşüncelerinizi yazın.');
      if(txtEl) txtEl.focus();
      return;
    }
    saveCampComment(txt);
    if(!isUserInCamp()){
      joinCampDiscussion('🎯 Tartışmaya Katıldı');
    }
    toast('Fikriniz tartışma odasına eklendi! 💬');
    render();
    var cList = document.getElementById('camp-comments-section');
    if(cList) cList.scrollIntoView({ behavior: 'smooth' });
  }
  else if(a==='copy-quote'){
    var idx = parseInt(t.getAttribute('data-idx'), 10);
    var qList = getQuotes();
    if (qList[idx]) {
      var txtToCopy = '“' + qList[idx].text + '” — ' + qList[idx].author + (qList[idx].book ? ' (' + qList[idx].book + ')' : '');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txtToCopy).then(function(){
          toast('Alıntı panoya kopyalandı! 📋');
        }).catch(function(){
          toast('Kopyalandı: ' + txtToCopy);
        });
      } else {
        toast('Alıntı kopyalandı! 📋');
      }
    }
  }
  else if(a==='open-quote-modal'){
    if (!curUser) {
      toast('Alıntı paylaşabilmek için lütfen üye girişi yapın.');
      openAuthModal('login');
      return;
    }
    var qEl = document.getElementById('quote-text');
    if (qEl) {
      qEl.focus();
      qEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigateToPage('alintilar.html');
    }
  }
  else if(a==='next-passage'){
    nextDailyPassage();
  }
  else if(a==='card-gen'){
    var cTxt = t.getAttribute('data-text') || '';
    var cAuthor = t.getAttribute('data-author') || '';
    var cBook = t.getAttribute('data-book') || '';
    openQuoteCardModal(cTxt, cAuthor, cBook);
  }
  else if(a==='close-card-modal'){
    closeQuoteCardModal();
  }
  else if(a==='card-ratio'){
    quoteCardState.ratio = v;
    var modal = document.getElementById('quote-card-modal');
    if (modal) {
      modal.querySelectorAll('[data-a="card-ratio"]').forEach(function(b){
        b.classList.toggle('on', b.getAttribute('data-v') === v);
      });
    }
    drawQuoteCardCanvas();
  }
  else if(a==='card-theme'){
    quoteCardState.theme = v;
    var modal = document.getElementById('quote-card-modal');
    if (modal) {
      modal.querySelectorAll('[data-a="card-theme"]').forEach(function(b){
        b.classList.toggle('on', b.getAttribute('data-v') === v);
      });
    }
    drawQuoteCardCanvas();
  }
  else if(a==='download-card-png'){
    downloadQuoteCardPNG();
  }
  else if(a==='join-challenge'){
    if (!curUser) {
      toast('Meydan okumalara katılmak kulüp üyelerine özeldir. Lütfen giriş yapın.');
      openAuthModal('login');
      return;
    }
    saveUserChallenge(id, true);
    toast('Meydan okumaya katıldınız! Hedeflerinizi listenize ekleyin 🏆');
    render();
  }
  else if(a==='leave-challenge'){
    var bName = t.getAttribute('data-badge') || '';
    confirmBox('Bu meydan okumadan ayrılmak istediğinizden emin misiniz?' + (bName ? ' (Kazanılan rozet de profilinizden kaldırılacaktır)' : ''), 'Ayrıl', function(){
      saveUserChallenge(id, false);
      if (bName) {
        removeUserBadge(bName);
      }
      toast('Meydan okumadan ayrıldınız.');
      render();
    });
  }
  else if(a==='claim-challenge-badge'){
    if (!curUser) {
      toast('Rozet kazanmak kulüp üyelerine özeldir. Lütfen giriş yapın.');
      openAuthModal('login');
      return;
    }
    var bName = t.getAttribute('data-badge');
    if (bName) {
      saveUserBadge(bName);
      toast('Tebrikler! "' + bName + '" rozetini kazandınız ve profilinize eklendi! 🎉');
      render();
    }
  }
  else if(a==='del-highlight'){
    deleteReaderHighlight(id);
    toast('Not/pasaj silindi.');
    render();
  }
  else if(a==='save-reader-hl'){
    if (!curUser) {
      toast('Pasaj ve not kaydetmek kulüp üyelerine özeldir. Lütfen giriş yapın.');
      openAuthModal('login');
      return;
    }
    var tb = document.getElementById('reader-hl-toolbar');
    var text = tb ? (tb.getAttribute('data-selected-text') || '') : '';
    if (text) {
      var note = prompt('Pasaj için isteğe bağlı bir okur notu yazın:', '');
      if (note !== null) {
        saveReaderHighlight(readerState.activeBookId, text, note);
        toast('Pasaj ve notunuz kaydedildi! Profilinizde görebilirsiniz. 🔖');
        if (tb) tb.classList.remove('open');
        try { window.getSelection().removeAllRanges(); } catch(e){}
      }
    }
  }
  else if(a==='card-gen-selected'){
    var tb = document.getElementById('reader-hl-toolbar');
    var text = tb ? (tb.getAttribute('data-selected-text') || '') : '';
    var bk = S.books.filter(function(x){ return x.id === readerState.activeBookId; })[0];
    if (text) {
      if (tb) tb.classList.remove('open');
      openQuoteCardModal(text, bk ? bk.author : 'Edebi Klasik', bk ? bk.title : '');
    }
  }
  else if(a==='copy-selected'){
    var tb = document.getElementById('reader-hl-toolbar');
    var text = tb ? (tb.getAttribute('data-selected-text') || '') : '';
    if (text && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      toast('Pasaj kopyalandı! 📋');
      if (tb) tb.classList.remove('open');
    }
  }
  else if(a==='open-reader-notes-drawer'){
    var drw = document.getElementById('reader-notes-drawer');
    if (drw) {
      var bookHls = getReaderHighlights(readerState.activeBookId);
      var lst = document.getElementById('reader-notes-list');
      if (lst) lst.innerHTML = renderUserHighlightsHTML(bookHls);
      drw.classList.add('open');
    }
  }
  else if(a==='close-reader-notes-drawer'){
    var drw = document.getElementById('reader-notes-drawer');
    if (drw) drw.classList.remove('open');
  }

});
$app.addEventListener('submit',async function(e){
  if(e.target.id==='profile-update-form'){
    e.preventDefault();
    await updateProfileInfo();
  }
  else if(e.target.id==='book-review-form'){
    e.preventDefault();
    var bId = e.target.getAttribute('data-book-id');
    var commEl = document.getElementById('review-comment');
    var pickEl = document.getElementById('star-picker');
    var rating = pickEl ? parseInt(pickEl.getAttribute('data-rating'), 10) || 5 : 5;
    var comm = commEl ? commEl.value.trim() : '';
    if (!comm) {
      toast('Lütfen bir inceleme metni yazın.');
      return;
    }
    addReview(bId, rating, comm);
    toast('İncelemeniz ve puanınız başarıyla paylaşıldı! ⭐');
    render();
  }
  else if(e.target.id==='share-quote-form'){
    e.preventDefault();
    if (!curUser) {
      toast('Alıntı paylaşabilmek için lütfen üye girişi yapın.');
      openAuthModal('login');
      return;
    }
    var qText = val('quote-text').trim();
    var qAuthor = val('quote-author').trim();
    var qBook = val('quote-book').trim();
    var qPage = val('quote-page').trim();
    if(!qText){
      toast('Lütfen bir alıntı metni yazın.');
      return;
    }
    if(!qAuthor){
      toast('Lütfen yazar adını belirtin.');
      return;
    }
    saveUserQuote(qText, qAuthor, qBook, qPage);
    toast('Alıntınız Edebi Alıntılar Duvarı\'na asıldı! ✨');
    render();
  }
});
$app.addEventListener('input',function(e){
  if(e.target.id==='card-inp-text'){
    quoteCardState.text = e.target.value;
    drawQuoteCardCanvas();
  }
  else if(e.target.id==='card-inp-author'){
    quoteCardState.author = e.target.value;
    drawQuoteCardCanvas();
  }
  else if(e.target.id==='card-inp-book'){
    quoteCardState.book = e.target.value;
    drawQuoteCardCanvas();
  }
  else if(e.target.id==='lib-q'){lib.q=e.target.value;lib.page=1;refreshLib();}
  else if(e.target.id==='audio-vol'){soundManager.setVolume(e.target.value);}
  else if(e.target.id==='glossary-search-input'){
    glossarySearchQ=e.target.value;
    var gGrid=document.getElementById('glossary-grid');
    if(gGrid){
      var q = lc(glossarySearchQ).trim();
      var filtered = LITERARY_GLOSSARY.filter(function(item){
        if (!q) return true;
        return lc(item.term).indexOf(q) >= 0 || lc(item.origin).indexOf(q) >= 0 || lc(item.def).indexOf(q) >= 0;
      });
      if(filtered.length === 0){
        gGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--muted)">Aramanızla eşleşen edebi kavram bulunamadı.</div>';
      } else {
        gGrid.innerHTML = filtered.map(function(item){
          return '<div class="glossary-card">'
            + '<div class="glossary-term">' + esc(item.term) + '</div>'
            + '<div class="glossary-origin">📌 ' + esc(item.origin) + '</div>'
            + '<div class="glossary-def">' + esc(item.def) + '</div>'
            + '<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--line);display:flex;justify-content:flex-end">'
            + '<button class="btn ghost small" data-a="copy-quote-text" data-text="' + esc(item.term + ' (' + item.origin + '): ' + item.def) + '">📋 Kopyala</button>'
            + '</div>'
            + '</div>';
        }).join('');
      }
    }
  }

  else if(e.target.id==='member-search-input'){
    memberSearchQ=e.target.value;
    var wrap=document.getElementById('member-table-wrap');
    if(wrap){
      var allM=getAdminMembersList();
      var q=lc(memberSearchQ).trim();
      var filtered=allM.filter(function(m){
        if(!q)return true;
        return lc([m.full_name,m.username,m.email,m.role,(m.role==='admin'?'yönetici admin':'okur üye')].join(' ')).indexOf(q)>=0;
      });
      wrap.innerHTML=renderMemberTableHTML(filtered);
    }
  }
  else if(e.target.id==='quote-book'){
    var selTitle = e.target.value.trim();
    var matchBook = S.books.filter(function(b){ return b.title.toLowerCase() === selTitle.toLowerCase(); })[0];
    if(matchBook && matchBook.author){
      var autEl = document.getElementById('quote-author');
      if(autEl) autEl.value = matchBook.author;
    }
  }
});
$app.addEventListener('change',function(e){
  if(e.target.id==='f-img'){pickImg(e.target.files&&e.target.files[0]);return;}
  if(e.target.id==='prof-avatar-file'){pickProfileAvatar(e.target.files&&e.target.files[0]);return;}
  if(e.target.id==='lib-sort'){lib.sort=e.target.value;lib.page=1;refreshLib();}
  if(e.target.id==='quote-book'){
    var selT = e.target.value.trim();
    var mb = S.books.filter(function(b){ return b.title.toLowerCase() === selT.toLowerCase(); })[0];
    if(mb && mb.author){
      var aEl = document.getElementById('quote-author');
      if(aEl) aEl.value = mb.author;
    }
  }
});
function pickImg(f){
  if(!f)return;
  if(!/^image\//.test(f.type)){toast('Lütfen bir görsel dosyası seçin.');return;}
  var r=new FileReader();
  r.onerror=function(){toast('Görsel okunamadı.');};
  r.onload=function(){
    var im=new Image();
    im.onerror=function(){toast('Bu görsel açılamadı.');};
    im.onload=function(){
      var max=720,k=Math.min(1,max/Math.max(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k);
      var c=document.createElement('canvas');c.width=w;c.height=h;
      var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);
      formImg=c.toDataURL('image/jpeg',0.85);
      var pv=document.getElementById('img-prev');
      if(pv)pv.innerHTML=cover({img:formImg,title:'',author:''});
    };
    im.src=r.result;
  };
  r.readAsDataURL(f);
}
function val(i){var el=document.getElementById(i);return el?(el.value||''):'';}
function saveBook(id){
  var title=val('f-title').trim();
  if(!title){toast('Kitap adı gerekli.');var tEl=document.getElementById('f-title');if(tEl)tEl.focus();return;}
  var col=document.querySelector('input[name=color]:checked');
  var featEl=document.getElementById('f-feat');
  var b={title:title,author:val('f-author').trim(),publisher:val('f-pub').trim(),year:val('f-year').trim(),category:val('f-cat').trim()||'Diğer',date:val('f-date'),video:val('f-video').trim(),
    epub:val('f-epub').trim(),pdf:val('f-pdf').trim(),tags:val('f-tags').split(',').map(function(x){return x.trim();}).filter(Boolean),summary:val('f-summary').trim(),transcript:val('f-transcript').replace(/\r\n/g,'\n'),
    sources:textToSrc(val('f-sources')),img:formImg,color:col?col.value:COLORS[0],status:val('f-status'),featured:featEl?featEl.checked:false};
  if(id==='yeni'){b.id=uniqueId(title);S.books.push(b);}
  else{var i=S.books.findIndex(function(x){return x.id===id;});b.id=id;if(i>=0)S.books[i]=b;else S.books.push(b);}
  markDirty();toast('Kaydedildi. Yayınla düğmesine basana kadar ziyaretçiler görmez.');navigateToPage('yonetim.html');
}
function saveSettings(){
  S.site={name:val('s-name').trim()||"Gogol'un Paltosu",tagline:val('s-tag').trim(),admin:val('s-admin').trim(),youtube:val('s-yt').trim(),instagram:val('s-ig').trim(),email:val('s-email')?val('s-email').trim():'',about:val('s-about'),footer:val('s-foot').trim()};
  markDirty();updateAdminStatus();toast('Ayarlar kaydedildi.');render();
}
function exportReadingList(){
  var favBooks = S.books.filter(function(b){ return isFav(b.id); });
  if(!favBooks.length){
    toast('Okuma listenizde henüz kitap bulunmuyor.');
    return;
  }
  var txt = 'GOGOL\'UN PALTOSU - KİŞİSEL OKUMA LİSTEM\n';
  txt += 'Oluşturulma Tarihi: ' + new Date().toLocaleDateString('tr-TR') + '\n';
  txt += 'Toplam Kitap Sayısı: ' + favBooks.length + '\n\n';
  txt += '--------------------------------------------------\n\n';
  favBooks.forEach(function(b, idx){
    txt += (idx + 1) + '. ' + b.title.toUpperCase() + '\n';
    txt += '   Yazar: ' + (b.author || 'Belirtilmemiş') + '\n';
    if(b.category) txt += '   Tür: ' + b.category + '\n';
    if(b.publisher) txt += '   Yayınevi: ' + b.publisher + '\n';
    if(b.year) txt += '   Yıl: ' + b.year + '\n';
    if(b.summary) txt += '   Kısa Özet: ' + b.summary.replace(/\r?\n/g, ' ').slice(0, 160) + (b.summary.length > 160 ? '...' : '') + '\n';
    txt += '\n';
  });
  txt += '--------------------------------------------------\n';
  txt += 'Gogol\'un Paltosu: https://www.youtube.com/@ngogolunpaltosu\n';

  var blob = new Blob(['\uFEFF' + txt], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'Gogolun-Paltosu-Okuma-Listem.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Okuma listeniz metin belgesi olarak indirildi! 📋');
}
async function updateProfileInfo(){
  if(!curUser || !supa) return;
  var nameEl = document.getElementById('prof-name');
  var unameEl = document.getElementById('prof-username');
  var btn = document.getElementById('prof-save-btn');
  if(!nameEl || !unameEl || !btn) return;

  var newName = nameEl.value.trim();
  var newUname = unameEl.value.trim().toLowerCase().replace(/^@/,'');

  if(!newName){
    toast('Lütfen ad soyad girin.');
    return;
  }
  if(newUname && !/^[a-zA-Z0-9_.-]{3,20}$/.test(newUname)){
    toast('Kullanıcı adı 3-20 karakter olmalı; harf, rakam, tire, nokta veya alt çizgi içerebilir.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Kaydediliyor…';

  try {
    var meta = Object.assign({}, curUser.user_metadata || {}, {
      full_name: newName,
      username: newUname
    });
    var res = await supa.auth.updateUser({ data: meta });
    if(res.error) throw res.error;

    if(res.data && res.data.user){
      curUser = res.data.user;
    } else {
      curUser.user_metadata = meta;
    }
    storeUser(curUser);

    if(newUname && curUser.email){
      try { localStorage.setItem('gp-user-' + newUname, curUser.email); } catch(e){}
    }

    addMemberToRegistry({
      id: curUser.id,
      email: curUser.email,
      username: newUname || '',
      full_name: newName || '',
      avatar_url: meta.avatar_url || '',
      role: canEdit ? 'admin' : 'member'
    });

    updateAdminStatus();
    toast('Profil bilgileriniz başarıyla güncellendi! ✨');
    render();
  } catch(err){
    btn.disabled = false;
    btn.textContent = 'Bilgileri Güncelle';
    toast(err.message || 'Profil güncellenemedi.');
  }
}

function pickProfileAvatar(file){
  if(!file) return;
  if(!/^image\//.test(file.type)){
    toast('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG vb.).');
    return;
  }
  var reader = new FileReader();
  reader.onerror = function(){ toast('Görsel okunamadı.'); };
  reader.onload = function(){
    var img = new Image();
    img.onerror = function(){ toast('Bu görsel açılamadı.'); };
    img.onload = function(){
      var max = 256;
      var w = img.width;
      var h = img.height;
      var size = Math.min(w, h);
      var sx = (w - size) / 2;
      var sy = (h - size) / 2;
      var canvas = document.createElement('canvas');
      canvas.width = Math.min(max, size);
      canvas.height = Math.min(max, size);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      saveProfileAvatar(dataUrl);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function saveProfileAvatar(dataUrl){
  if(!curUser) return;
  toast('Profil fotoğrafı güncelleniyor…');
  var meta = Object.assign({}, curUser.user_metadata || {}, { avatar_url: dataUrl });
  try {
    if(supa){
      var res = await supa.auth.updateUser({ data: meta });
      if(res.error) throw res.error;
      if(res.data && res.data.user) curUser = res.data.user;
      else curUser.user_metadata = meta;
    } else {
      curUser.user_metadata = meta;
    }
    storeUser(curUser);
    addMemberToRegistry({
      id: curUser.id,
      email: curUser.email,
      username: meta.username || '',
      full_name: meta.full_name || '',
      avatar_url: dataUrl,
      role: canEdit ? 'admin' : 'member'
    });
    toast('Profil fotoğrafınız başarıyla güncellendi! 📸');
    render();
  } catch(err){
    toast(err.message || 'Fotoğraf kaydedilemedi.');
  }
}

async function removeProfileAvatar(){
  if(!curUser) return;
  confirmBox('Profil fotoğrafınızı kaldırmak istiyor musunuz?', 'Kaldır', async function(){
    var meta = Object.assign({}, curUser.user_metadata || {});
    delete meta.avatar_url;
    meta.avatar_url = '';
    try {
      if(supa){
        var res = await supa.auth.updateUser({ data: meta });
        if(res.error) throw res.error;
        if(res.data && res.data.user) curUser = res.data.user;
        else curUser.user_metadata = meta;
      } else {
        curUser.user_metadata = meta;
      }
      storeUser(curUser);
      addMemberToRegistry({
        id: curUser.id,
        email: curUser.email,
        username: meta.username || '',
        full_name: meta.full_name || '',
        avatar_url: '',
        role: canEdit ? 'admin' : 'member'
      });
      toast('Profil fotoğrafı kaldırıldı.');
      render();
    } catch(err){
      toast(err.message || 'Fotoğraf kaldırılamadı.');
    }
  });
}
window.addEventListener('hashchange',onRoute);

/* ---------- başlangıç ---------- */
async function init(){
  if (!curUser) {
    curUser = getStoredUser();
    updateAdminStatus();
  }
  onRoute();
  hidePageLoader();
  var rawHash = window.location.hash || '';
  var rawSearch = window.location.search || '';
  var isSignupConfirm = (rawHash.indexOf('type=signup') >= 0 || rawSearch.indexOf('type=signup') >= 0);
  var isRecovery = (rawHash.indexOf('type=recovery') >= 0 || rawSearch.indexOf('type=recovery') >= 0);
  var hasAuthError = (rawHash.indexOf('error=') >= 0 || rawSearch.indexOf('error=') >= 0);

  if (hasAuthError) {
    var descMatch = (rawHash + '&' + rawSearch).match(/error_description=([^&]+)/);
    var descText = descMatch ? decodeURIComponent(descMatch[1].replace(/\+/g, ' ')) : 'Bağlantı geçersiz veya süresi dolmuş.';
    showAuthNoticeModal({
      type: 'err',
      title: 'Doğrulama Hatası ⚠️',
      message: descText,
      buttonText: 'Giriş Ekranına Geç',
      onConfirm: function() { openAuthModal('login'); }
    });
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + '#/');
      }
    } catch(e){}
  }

  if(supa){
    try{
      syncCloudReviews();
      syncCloudCampComments();
      syncCloudCampParticipants();
      syncCloudQuotes();
    } catch(e){}
    try{
      var sRes=await supa.auth.getSession();
      if(sRes&&sRes.data&&sRes.data.session&&sRes.data.session.user){
        curUser=sRes.data.session.user;
        storeUser(curUser);
        updateAdminStatus();
        if(curUser.user_metadata){
          syncFavsWithCloud(curUser.user_metadata.reading_list);
          if (Array.isArray(curUser.user_metadata.quotes) && curUser.user_metadata.quotes.length) {
            try {
              var locQ = JSON.parse(localStorage.getItem('gp-custom-quotes') || '[]');
              curUser.user_metadata.quotes.forEach(function(cq){
                if (!locQ.some(function(l){ return l.id === cq.id || (l.text === cq.text && l.author === cq.author); })) {
                  locQ.unshift(cq);
                }
              });
              localStorage.setItem('gp-custom-quotes', JSON.stringify(locQ));
            } catch(e){}
          }
        }
        if(isSignupConfirm){
          isSignupConfirm = false;
          try {
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, '', window.location.pathname + '#/hosgeldiniz');
            } else {
              location.hash = '#/hosgeldiniz';
            }
          } catch(e){
            location.hash = '#/hosgeldiniz';
          }
          toast('E-postanız doğrulandı. Aramıza hoş geldiniz! 📚');
        }
      }
      supa.auth.onAuthStateChange(function(evt, session){
        if(evt==='PASSWORD_RECOVERY' || isRecovery){
          openAuthModal('newpass');
        } else if(session && session.user){
          if(isSignupConfirm) {
            isSignupConfirm = false;
            toast('E-postanız doğrulandı. Aramıza hoş geldiniz! 📚');
          }
          handleUserSession(session.user);
        } else if(evt === 'SIGNED_OUT'){
          curUser = null;
          storeUser(null);
          favs = [];
          try { localStorage.removeItem('gp-favs'); } catch(e){}
          updateAdminStatus();
          render();
        } else {
          // INITIAL_SESSION veya boş session geldiğinde,
          // localStorage'daki geçerli oturumu koru, hesabı ASLA kapatma!
          var stored = getStoredUser();
          if(stored){
            curUser = stored;
            updateAdminStatus();
          }
        }
      });
    }catch(e){console.warn('Supabase auth listener error:',e);}
  }
  updateAdminStatus();
  if(canEdit){
    try{
      var d=sessionStorage.getItem('gp-draft');
      if(d){
        var parsedDraft = JSON.parse(d);
        var baseObj = JSON.parse(BASE);
        var baseImgCount = baseObj.books ? baseObj.books.filter(function(b){ return b.img && b.img.length > 50; }).length : 0;
        var draftImgCount = parsedDraft.books ? parsedDraft.books.filter(function(b){ return b.img && b.img.length > 50; }).length : 0;
        if(parsedDraft.v !== baseObj.v || draftImgCount < baseImgCount || d.indexOf('\u00c3') >= 0 || d.indexOf('\u00c4') >= 0 || d.indexOf('\u00c5') >= 0){
          sessionStorage.removeItem('gp-draft');
          d = null;
          dirty = false;
        } else {
          var hasRealChanges = JSON.stringify(parsedDraft.books) !== JSON.stringify(baseObj.books) ||
                               JSON.stringify(parsedDraft.site) !== JSON.stringify(baseObj.site);
          if(hasRealChanges){
            S = parsedDraft;
            dirty = true;
          } else {
            sessionStorage.removeItem('gp-draft');
            dirty = false;
          }
        }
      }
    }catch(e){
      try{sessionStorage.removeItem('gp-draft');}catch(err){}
      dirty = false;
    }
  }
  try {
    // Eski paylaşımlı cihaz-genel rozet kaydını temizle (hesaplar arası rozet sızmasını tamamen engelle)
    localStorage.removeItem('gp-user-badges');
  } catch(e){}
  onRoute();
}
init();
})();