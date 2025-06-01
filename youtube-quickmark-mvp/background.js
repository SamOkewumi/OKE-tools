// background.js (v0.2.0 - For multi-press grading via content script)
console.log("QuickMark: Background Service Worker Started (v0.2.0)");

const LOOK_BACK_SECONDS = 10; // Still hardcoded for now

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("QuickMark: Extension installed.");
    chrome.storage.local.set({ videoMarks: [] }); // Initialize storage
  } else if (details.reason === "update") {
    const thisVersion = chrome.runtime.getManifest().version;
    console.log(`QuickMark: Extension updated from ${details.previousVersion} to ${thisVersion}.`);
    // Potential migration logic here if storage structure changes
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "QUICKMARK_CAPTURE") {
    console.log("QuickMark: Received capture data from content script:", message);

    if (!message.videoId && (sender.tab && sender.tab.url && (sender.tab.url.includes("youtube.com/watch") || sender.tab.url.includes("youtube.com/shorts")))) {
        console.warn("QuickMark: VideoId was missing from content script message for a YouTube page. Attempting to extract from sender tab.");
        // Attempt to extract from sender.tab.url as a last resort if content script failed
        try {
            const url = new URL(sender.tab.url);
            if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
                if (url.pathname === '/watch') {
                    message.videoId = url.searchParams.get('v') || message.videoId;
                } else if (url.pathname.startsWith('/shorts/')) {
                    message.videoId = url.pathname.split('/shorts/')[1] || message.videoId;
                }
            }
            if (message.videoId) console.log("QuickMark: Fallback VideoId extraction in background:", message.videoId);
        } catch(e) {
            console.error("QuickMark: Error in fallback VideoId extraction in background:", e);
        }
    }
    
    if (!message.videoId) {
        console.error("QuickMark: VideoId is missing. Cannot save mark reliably.");
        sendResponse({ status: "error", message: "Error: Missing Video ID." });
        return true; // Indicate async response
    }


    const adjustedTimestamp = Math.max(0, message.originalCaptureTime - LOOK_BACK_SECONDS);

    const newMark = {
      videoId: message.videoId,
      title: message.videoTitle || "Untitled YouTube Video",
      timestamp: adjustedTimestamp, // Adjusted start time for the clip
      grade: message.grade,       // The new grade from content script
      originalCaptureTime: message.originalCaptureTime,
      lookBackOffset: LOOK_BACK_SECONDS,
      capturedAt: new Date().toISOString(),
    };

    chrome.storage.local.get({ videoMarks: [] }, (data) => {
      if (chrome.runtime.lastError) {
        console.error("QuickMark: Error fetching marks from storage:", chrome.runtime.lastError);
        sendResponse({ status: "error", message: "Storage read error." });
        return;
      }
      
      const marks = data.videoMarks || []; // Ensure marks is an array
      marks.push(newMark);

      chrome.storage.local.set({ videoMarks: marks }, () => {
        if (chrome.runtime.lastError) {
          console.error("QuickMark: Error saving mark to storage:", chrome.runtime.lastError);
          sendResponse({ status: "error", message: "Storage write error." });
        } else {
          console.log("QuickMark: Timestamp mark saved with grade:", newMark);
          sendResponse({ status: "success", message: "Mark saved!", adjustedTimestamp: newMark.timestamp });
        }
      });
    });

    return true; // Crucial for async sendResponse
  }
  // Handle other message types if any in the future
  return false; // Indicate not handling this message type synchronously
});

console.log("QuickMark: Background Service Worker Event Listeners Attached (v0.2.0).");