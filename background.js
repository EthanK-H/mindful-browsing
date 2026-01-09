const DEFAULT_SETTINGS = {
  sites: {
    'youtube.com': { tier: 'mindful', timerMinutes: 10 },
    'twitter.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 },
    'x.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 },
    'snapchat.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 },
    'linkedin.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 },
    'facebook.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 }
  },
  nuclearSkipsToday: 0,
  nuclearSkipDate: null,
  unlockedUrls: {}
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set(DEFAULT_SETTINGS);
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  
  const url = new URL(details.url);
  const hostname = url.hostname.replace('www.', '');
  
  const data = await chrome.storage.local.get(['sites', 'unlockedUrls']);
  const sites = data.sites || DEFAULT_SETTINGS.sites;
  const unlockedUrls = data.unlockedUrls || {};
  
  const matchedSite = Object.keys(sites).find(site => hostname.includes(site));
  if (!matchedSite) return;
  
  const fullUrl = details.url;
  const now = Date.now();
  
  if (unlockedUrls[fullUrl] && (now - unlockedUrls[fullUrl]) < 3600000) {
    return;
  }
  
  const siteConfig = sites[matchedSite];
  const timerUrl = chrome.runtime.getURL('timer.html') + 
    `?target=${encodeURIComponent(fullUrl)}` +
    `&site=${encodeURIComponent(matchedSite)}` +
    `&tier=${siteConfig.tier}` +
    `&timerMinutes=${siteConfig.timerMinutes}` +
    `&waitMinutes=${siteConfig.waitMinutes || 0}`;
  
  chrome.tabs.update(details.tabId, { url: timerUrl });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'unlockUrl') {
    chrome.storage.local.get(['unlockedUrls'], (data) => {
      const unlockedUrls = data.unlockedUrls || {};
      unlockedUrls[message.url] = Date.now();
      chrome.storage.local.set({ unlockedUrls });
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.type === 'useNuclearSkip') {
    chrome.storage.local.get(['nuclearSkipsToday', 'nuclearSkipDate'], (data) => {
      const today = new Date().toDateString();
      let skipsToday = data.nuclearSkipsToday || 0;
      
      if (data.nuclearSkipDate !== today) {
        skipsToday = 0;
      }
      
      if (skipsToday < 1) {
        chrome.storage.local.set({ 
          nuclearSkipsToday: skipsToday + 1, 
          nuclearSkipDate: today 
        });
        sendResponse({ success: true, remaining: 0 });
      } else {
        sendResponse({ success: false, remaining: 0 });
      }
    });
    return true;
  }
  
  if (message.type === 'getNuclearSkips') {
    chrome.storage.local.get(['nuclearSkipsToday', 'nuclearSkipDate'], (data) => {
      const today = new Date().toDateString();
      if (data.nuclearSkipDate !== today) {
        sendResponse({ remaining: 1 });
      } else {
        sendResponse({ remaining: Math.max(0, 1 - (data.nuclearSkipsToday || 0)) });
      }
    });
    return true;
  }
});