const DEFAULT_SETTINGS = {
  sites: {
    'youtube.com': { tier: 'mindful', timerMinutes: 10 },
    'twitter.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 },
    'x.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 },
    'snapchat.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 },
    'linkedin.com': { tier: 'mindful', timerMinutes: 10 },
    'facebook.com': { tier: 'friction', timerMinutes: 10, waitMinutes: 30 }
  },
  siteSkips: {},  // { siteName: { count: 0, date: null } }
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
  
  const matchedSite = Object.keys(sites).find(site => hostname === site || hostname.endsWith('.' + site));
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
    const site = message.site;
    chrome.storage.local.get(['siteSkips'], (data) => {
      const today = new Date().toDateString();
      const siteSkips = data.siteSkips || {};
      const siteData = siteSkips[site] || { count: 0, date: null };

      if (siteData.date !== today) {
        siteData.count = 0;
      }

      if (siteData.count < 1) {
        siteData.count = 1;
        siteData.date = today;
        siteSkips[site] = siteData;
        chrome.storage.local.set({ siteSkips });
        sendResponse({ success: true, remaining: 0 });
      } else {
        sendResponse({ success: false, remaining: 0 });
      }
    });
    return true;
  }

  if (message.type === 'getNuclearSkips') {
    const site = message.site;
    chrome.storage.local.get(['siteSkips'], (data) => {
      const today = new Date().toDateString();
      const siteSkips = data.siteSkips || {};
      const siteData = siteSkips[site] || { count: 0, date: null };

      if (siteData.date !== today) {
        sendResponse({ remaining: 1 });
      } else {
        sendResponse({ remaining: Math.max(0, 1 - siteData.count) });
      }
    });
    return true;
  }
});