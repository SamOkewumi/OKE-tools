// background.js

// Define the fixed look-back offset in seconds (for MVP)
const LOOK_BACK_SECONDS = 10;

// Listener for when a command is executed
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "capture_timestamp") {
    console.log("Capture timestamp command triggered!");

    // Get the currently active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url && (tab.url.includes("youtube.com/watch*") || tab.url.includes("youtube.com/watch"))) {
      console.log("Current tab is a YouTube page:", tab.url);

      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getVideoDetailsAndTimestamp, // Function to execute in the content script context
        });

        if (results && results[0] && results[0].result) {
          const videoDetails = results[0].result;
          if (videoDetails.error) {
            console.error("Error from content script:", videoDetails.error);
            return;
          }

          console.log("Video details from content:", videoDetails);

          const adjustedTimestamp = Math.max(0, videoDetails.currentTime - LOOK_BACK_SECONDS);
          const videoId = videoDetails.videoId;
          const videoTitle = videoDetails.videoTitle || "Untitled YouTube Video"; // Fallback title

          const newMark = {
            videoId: videoId,
            title: videoTitle,
            timestamp: adjustedTimestamp, // This is the adjusted start time for the clip
            originalCaptureTime: videoDetails.currentTime, // Actual time button was pressed
            lookBackOffset: LOOK_BACK_SECONDS,
            capturedAt: new Date().toISOString(),
          };

          // Store the new mark
          chrome.storage.local.get({ videoMarks: [] }, (data) => {
            const marks = data.videoMarks;
            marks.push(newMark);
            chrome.storage.local.set({ videoMarks: marks }, () => {
              console.log("Timestamp mark saved:", newMark);
              // Optional: Send a notification or update popup if it's open
              // For MVP, console log is sufficient feedback here.
            });
          });

        } else {
          console.error("Could not get video details from the page. No results from executeScript.");
        }
      } catch (e) {
        console.error("Error executing script or processing results:", e);
      }
    } else {
      console.log("Not a YouTube video page or no active tab found.");
      if(tab && tab.url) {
        console.log("Current URL:", tab.url);
      }
    }
  }
});

// This function will be injected into the YouTube page
// It runs in the context of the page, not the background script
function getVideoDetailsAndTimestamp() {
  try {
    const videoElement = document.querySelector('video');
    if (!videoElement) {
      return { error: "Video element not found on page." };
    }

    const currentTime = videoElement.currentTime;
    let videoId = '';
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('v')) {
      videoId = urlParams.get('v');
    } else {
      // Fallback for potentially different URL structures (shorts, embeds)
      // Regex tries to find video ID in common YouTube URL patterns
      const path = window.location.pathname;
      const V_PARAM_REGEX = /[?&]v=([^&]+)/; // Standard v= parameter
      const SHORTS_REGEX = /^\/shorts\/([a-zA-Z0-9_-]+)/;
      const EMBED_REGEX = /^\/embed\/([a-zA-Z0-9_-]+)/;
      const WATCH_PATH_REGEX = /^\/watch/; // Often implies v= is present

      let match;
      if (V_PARAM_REGEX.test(window.location.search)) {
        match = window.location.search.match(V_PARAM_REGEX);
        if (match) videoId = match[1];
      } else if (SHORTS_REGEX.test(path)) {
        match = path.match(SHORTS_REGEX);
        if (match) videoId = match[1];
      } else if (EMBED_REGEX.test(path)) {
        match = path.match(EMBED_REGEX);
        if (match) videoId = match[1];
      } else if (WATCH_PATH_REGEX.test(path) && urlParams.has('v')) {
        // This case should have been caught by the first check, but as a fallback
        videoId = urlParams.get('v');
      }
    }


    // Attempt to get video title
    // Prioritize specific title elements, then fall back to document.title
    let videoTitle = "Untitled YouTube Video"; // Default
    const titleElementSelectors = [
        'h1.ytd-watch-metadata .title', // Common on desktop
        '#title h1 yt-formatted-string', // Another common one
        '#video-title', // Often used in older or different layouts
        '.title.ytd-video-primary-info-renderer' // Yet another possibility
    ];

    for (const selector of titleElementSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent && element.textContent.trim() !== "") {
            videoTitle = element.textContent.trim();
            break;
        }
    }

    if (videoTitle === "Untitled YouTube Video" && document.title) {
         // Fallback to document.title if no specific element was found or was empty
        let potentialTitle = document.title;
        if (potentialTitle.toLowerCase().endsWith(" - youtube")) {
            potentialTitle = potentialTitle.substring(0, potentialTitle.toLowerCase().lastIndexOf(" - youtube"));
        }
        if (potentialTitle.trim() !== "") {
            videoTitle = potentialTitle.trim();
        }
    }


    if (!videoId) {
        console.warn("Could not automatically determine Video ID from URL:", window.location.href);
        // videoId might still be empty if it's an unusual YouTube page structure
    }

    return {
      currentTime: currentTime,
      videoId: videoId,
      videoTitle: videoTitle
    };
  } catch (e) {
    // It's good to return the error message string for easier debugging from background
    return { error: "Error in content script function: " + e.message, stack: e.stack };
  }
}

// Optional: Log when the extension is installed or updated (for debugging)
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("YouTube QuickMark MVP installed.");
    // Initialize storage if it's the first install
    chrome.storage.local.get('videoMarks', (data) => {
      if (!data.videoMarks) {
        chrome.storage.local.set({ videoMarks: [] });
      }
    });
  } else if (details.reason === "update") {
    const thisVersion = chrome.runtime.getManifest().version;
    console.log(`YouTube QuickMark MVP updated from ${details.previousVersion} to ${thisVersion}.`);
  }
});