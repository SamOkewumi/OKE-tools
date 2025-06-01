// content_script.js (v0.2.3 - TimerDebug - with sendMessage re-enabled)
console.log("QuickMark: Content Script Attempting to Load (v0.2.3 - TimerDebug SM)");

const CAPTURE_KEY = 'c';
const PRESS_TIMEOUT_MS = 400;
const FEEDBACK_DISPLAY_MS = 2200;

let singlePressTimer = null;
let feedbackElement = null;
let feedbackClearTimer = null;

function ensureFeedbackElement() {
    if (!document.body) {
        console.warn("QuickMark-TimerDebugSM: Document body not ready.");
        return false;
    }
    if (!feedbackElement || !document.body.contains(feedbackElement)) {
        feedbackElement = document.createElement('div');
        feedbackElement.id = 'quickmark-feedback-element';
        feedbackElement.className = 'quickmark-feedback';
        document.body.prepend(feedbackElement);
        console.log("QuickMark-TimerDebugSM: Feedback element CREATED.");
    }
    return true;
}

function showFeedback(message, duration = FEEDBACK_DISPLAY_MS) {
    console.log(`QuickMark-TimerDebugSM: showFeedback - "${message}"`);
    if (!ensureFeedbackElement()) return;
    feedbackElement.textContent = message;
    feedbackElement.classList.add('visible');
    if (feedbackClearTimer) clearTimeout(feedbackClearTimer);
    feedbackClearTimer = setTimeout(() => {
        if (feedbackElement) feedbackElement.classList.remove('visible');
    }, duration);
}

function handleKeyDown(event) {
    const targetElement = event.target;
    const isTypingArea = targetElement.isContentEditable ||
                          targetElement.tagName === 'INPUT' ||
                          targetElement.tagName === 'TEXTAREA' ||
                          targetElement.tagName === 'SELECT';

    if (isTypingArea && event.key.toLowerCase() === CAPTURE_KEY && (targetElement.id === 'input' && targetElement.closest('#chat'))) {
        return;
    }
    if (isTypingArea && !event.ctrlKey && !event.altKey && !event.metaKey) {
        return;
    }

    if (event.key.toLowerCase() === CAPTURE_KEY) {
        console.log(`QuickMark-TimerDebugSM: '${CAPTURE_KEY}' key pressed. Event timestamp: ${event.timeStamp}`);
        event.preventDefault();
        event.stopPropagation();

        showFeedback("Key pressed. Waiting for timer...");

        if (singlePressTimer) {
            console.log("QuickMark-TimerDebugSM: Clearing existing singlePressTimer:", singlePressTimer);
            clearTimeout(singlePressTimer);
        }

        const timeoutValue = PRESS_TIMEOUT_MS;
        console.log(`QuickMark-TimerDebugSM: BEFORE setTimeout. Delay value: ${timeoutValue}ms. performance.now(): ${performance.now()}`);

        singlePressTimer = setTimeout(() => {
            console.log(`QuickMark-TimerDebugSM: INSIDE setTimeout CALLBACK. performance.now(): ${performance.now()}`);
            processCaptureFromTimer(1); // Pass a fixed grade level (e.g., 1 for "Good")
            singlePressTimer = null;
        }, timeoutValue);

        console.log(`QuickMark-TimerDebugSM: AFTER setTimeout. Timer ID: ${singlePressTimer}. performance.now(): ${performance.now()}`);
    }
}

function processCaptureFromTimer(gradeLevelForTest) {
    console.log(`QuickMark-TimerDebugSM: processCaptureFromTimer called with gradeLevelForTest: ${gradeLevelForTest}. performance.now(): ${performance.now()}`);
    const grade = gradeLevelForTest === 1 ? "Good (Timer Test)" : "Other (Timer Test)";
    
    showFeedback(`Processing: ${grade}`);

    // --- Re-enable video detail extraction and sendMessage ---
    const videoElement = document.querySelector('video.html5-main-video');
    if (!videoElement) {
        console.error("QuickMark-TimerDebugSM: Video element not found.");
        showFeedback("Error: Video player not found.");
        return;
    }
    const currentTime = videoElement.currentTime;
    let videoId = '';
    let videoTitle = "Untitled YouTube Video";

    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('v')) {
            videoId = urlParams.get('v');
        } else { /* ... other ID extraction ... */
            const path = window.location.pathname;
            const shortsMatch = path.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
            const embedMatch = path.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
            if (shortsMatch) videoId = shortsMatch[1];
            else if (embedMatch) videoId = embedMatch[1];
        }
        const titleElement = document.querySelector('h1.ytd-watch-metadata .title, h1.title.ytd-video-primary-info-renderer, #title h1 yt-formatted-string, #video-title.ytd-watch-flexy, .title.style-scope.ytd-video-primary-info-renderer');
        if (titleElement && titleElement.textContent) {
            videoTitle = titleElement.textContent.trim();
        } else if (document.title) {
            let potentialTitle = document.title;
            if (potentialTitle.toLowerCase().endsWith(" - youtube")) {
                potentialTitle = potentialTitle.substring(0, potentialTitle.toLowerCase().lastIndexOf(" - youtube"));
            }
            if (potentialTitle.trim() !== "") videoTitle = potentialTitle.trim();
        }
         if ((!videoId || videoTitle === "Untitled YouTube Video") && window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
            if (!videoId && window.ytInitialPlayerResponse.videoDetails.videoId) videoId = window.ytInitialPlayerResponse.videoDetails.videoId;
            if ((videoTitle === "Untitled YouTube Video" || !videoTitle) && window.ytInitialPlayerResponse.videoDetails.title) videoTitle = window.ytInitialPlayerResponse.videoDetails.title;
        }
    } catch (e) {
        console.error("QuickMark-TimerDebugSM: Error extracting video details:", e);
    }

     if (!videoId && (window.location.href.includes("youtube.com/watch*") || window.location.href.includes("youtube.com/watch"))) {
       console.warn("QuickMark-TimerDebugSM: Could not determine Video ID on a YouTube watch/shorts/embed page. URL:", window.location.href);
       showFeedback("Warning: Could not get Video ID.");
    }
    
    const captureData = {
        type: "QUICKMARK_CAPTURE",
        originalCaptureTime: currentTime,
        videoId: videoId || "testVideoID_fallback", // Ensure videoId is not empty for background script
        videoTitle: videoTitle,
        grade: grade // Send the test grade
    };

    console.log("QuickMark-TimerDebugSM: Sending test data to background:", captureData);
    try {
        chrome.runtime.sendMessage(captureData, (response) => {
            if (chrome.runtime.lastError) {
                const errorMsg = `QuickMark-TimerDebugSM: sendMessage callback - chrome.runtime.lastError: ${chrome.runtime.lastError.message}`;
                console.error(errorMsg);
                alert(`DEBUG (Timer Test SM): Error during sendMessage - ${chrome.runtime.lastError.message}. Check page console.`);
                showFeedback("Error sending (SM)");
            } else if (response) {
                console.log("QuickMark-TimerDebugSM: sendMessage callback - Background responded:", response);
                // No alert here if successful, rely on UI feedback
                if (response.status === "success") {
                    showFeedback(`Test Saved: ${grade} (${formatTimestampSimple(response.adjustedTimestamp)})`);
                } else {
                     showFeedback(response.message || "Test Save Error (BG)");
                }
            } else {
                console.warn("QuickMark-TimerDebugSM: sendMessage callback - No response.");
                alert("DEBUG (Timer Test SM): No response from background. Check background script & service worker console.");
                showFeedback("Test Saved (no confirm)");
            }
        });
    } catch (e) {
        console.error(`QuickMark-TimerDebugSM: Exception during sendMessage: ${e.message}`, e);
        alert(`DEBUG (Timer Test SM): CRITICAL EXCEPTION sending - ${e.message}. Check page console.`);
    }
}

function formatTimestampSimple(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

if (!window.quickMarkListenerAttachedMain_v2_3_TimerDebugSM) { // New guard name
    document.addEventListener('keydown', handleKeyDown, true);
    window.quickMarkListenerAttachedMain_v2_3_TimerDebugSM = true;
    console.log("QuickMark: Content Script Loaded (v0.2.3 - TimerDebugSM) and Listener Attached.");
} else {
    console.log("QuickMark: Content Script (v0.2.3 - TimerDebugSM) already loaded.");
}