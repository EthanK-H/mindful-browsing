function renderSites() {
  chrome.storage.local.get(['sites'], (data) => {
    const sites = data.sites || {};
    const list = document.getElementById('site-list');
    list.innerHTML = '';
    
    Object.entries(sites).forEach(([domain, config]) => {
      const item = document.createElement('div');
      item.className = 'site-item';
      item.innerHTML = `
        <span class="site-name">${domain}</span>
        <span class="site-tier tier-${config.tier}">${config.tier}</span>
        <button class="btn-remove" data-domain="${domain}">×</button>
      `;
      list.appendChild(item);
    });
    
    document.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => removeSite(btn.dataset.domain));
    });
  });
}

function removeSite(domain) {
  chrome.storage.local.get(['sites'], (data) => {
    const sites = data.sites || {};
    delete sites[domain];
    chrome.storage.local.set({ sites }, renderSites);
  });
}

function addSite() {
  const domain = document.getElementById('new-site').value.trim().toLowerCase();
  const tier = document.getElementById('new-tier').value;
  
  if (!domain) return;
  
  chrome.storage.local.get(['sites'], (data) => {
    const sites = data.sites || {};
    sites[domain] = {
      tier: tier,
      timerMinutes: 10,
      waitMinutes: tier === 'friction' ? 30 : 0
    };
    chrome.storage.local.set({ sites }, () => {
      document.getElementById('new-site').value = '';
      renderSites();
    });
  });
}

function updateStats() {
  chrome.runtime.sendMessage({ type: 'getNuclearSkips' }, (response) => {
    document.getElementById('stats').textContent = 
      `Nuclear skips remaining today: ${response?.remaining ?? 1}`;
  });
}

document.getElementById('add-btn').addEventListener('click', addSite);
document.getElementById('new-site').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addSite();
});

renderSites();
updateStats();