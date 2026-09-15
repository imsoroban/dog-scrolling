const feed = document.getElementById('feed');
const sentinel = document.getElementById('sentinel');
const dogCountEl = document.getElementById('dog-count');
const resetBtn = document.getElementById('reset-btn');
const toast = document.getElementById('toast');

let isLoading = false;

let totalSeen = parseInt(localStorage.getItem('dogscroll_seen')) || 0;
let savedLikes = JSON.parse(localStorage.getItem('dogscroll_likes')) || [];

dogCountEl.textContent = `${totalSeen} Seen`;

function updateSeenCount() {
  totalSeen++;
  localStorage.setItem('dogscroll_seen', totalSeen);
  dogCountEl.textContent = `${totalSeen} Seen`;
}

function toggleSavedLike(url) {
  if (savedLikes.includes(url)) {
    savedLikes = savedLikes.filter(item => item !== url);
  } else {
    savedLikes.push(url);
  }
  localStorage.setItem('dogscroll_likes', JSON.stringify(savedLikes));
}

resetBtn.addEventListener('click', () => {
  if (confirm('Reset your total seen count and saved likes?')) {
    totalSeen = 0;
    savedLikes = [];
    localStorage.removeItem('dogscroll_seen');
    localStorage.removeItem('dogscroll_likes');
    dogCountEl.textContent = '0 Seen';
    showToast('Stats reset!');
  }
});

function parseBreed(url) {
  const match = url.match(/breeds\/([^/]+)/);
  if (!match) return 'Good Boy';
  
  const parts = match[1].split('-');
  return parts.reverse().map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function getHeartSVG() {
  return `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
}

function getShareSVG() {
  return `<svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>`;
}

async function fetchDogs(count = 4) {
  if (isLoading) return;
  isLoading = true;

  try {
    const res = await fetch(`https://dog.ceo/api/breeds/image/random/${count}`);
    const data = await res.json();

    if (data.status === 'success') {
      data.message.forEach(url => createCard(url));
    }
  } catch (err) {
    console.error('Fetch error:', err);
  } finally {
    isLoading = false;
  }
}

function createCard(url) {
  const breedName = parseBreed(url);
  const isAlreadyLiked = savedLikes.includes(url);

  const card = document.createElement('article');
  card.className = 'card';

  card.innerHTML = `
    <div class="card-header">
      <span class="breed-tag">🐾 ${breedName}</span>
    </div>
    <div class="media-container">
      <div class="skeleton"></div>
      <img src="${url}" alt="${breedName}" loading="lazy" />
      <div class="heart-pop">❤️</div>
    </div>
    <div class="card-actions">
      <button class="action-btn like-btn ${isAlreadyLiked ? 'liked' : ''}" aria-label="Like">
        ${getHeartSVG()}
        <span class="like-count">${isAlreadyLiked ? 1 : 0}</span>
      </button>
      <button class="action-btn share-btn" aria-label="Share">
        ${getShareSVG()}
      </button>
    </div>
  `;

  const img = card.querySelector('img');
  const skeleton = card.querySelector('.skeleton');
  const mediaContainer = card.querySelector('.media-container');
  const heartPop = card.querySelector('.heart-pop');
  const likeBtn = card.querySelector('.like-btn');
  const likeCount = card.querySelector('.like-count');
  const shareBtn = card.querySelector('.share-btn');

  let isLiked = isAlreadyLiked;

  img.onload = () => {
    img.classList.add('loaded');
    skeleton.style.display = 'none';
  };

  const toggleLike = () => {
    isLiked = !isLiked;
    likeCount.textContent = isLiked ? 1 : 0;
    likeBtn.classList.toggle('liked', isLiked);
    toggleSavedLike(url);
  };

  let lastTap = 0;
  mediaContainer.addEventListener('click', () => {
    const now = new Date().getTime();
    const timesince = now - lastTap;

    if (timesince < 300 && timesince > 0) {
      if (!isLiked) toggleLike();
      heartPop.classList.add('active');
      setTimeout(() => heartPop.classList.remove('active'), 800);
    }
    lastTap = now;
  });

  likeBtn.addEventListener('click', toggleLike);

  shareBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(url);
    showToast('Direct image link copied!');
  });

  feed.appendChild(card);

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        updateSeenCount();
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });

  cardObserver.observe(card);
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

const scrollObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    fetchDogs(4);
  }
}, { rootMargin: '400px' });

scrollObserver.observe(sentinel);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === 'j') {
    e.preventDefault();
    const cards = document.querySelectorAll('.card');
    const scrollPos = window.scrollY + 100;

    for (let card of cards) {
      if (card.offsetTop > scrollPos) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  }
});
