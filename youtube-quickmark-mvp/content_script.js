// content_script.js
console.log("QuickMark: Content Script Attempting to Load (v0.2.0)");

const CAPTURE_KEY = 'c';
const PRESS_TIMEOUT_MS = 400;
const FEEDBACK_DISPLAY_MS = 2000; // Increased display time slightly

let pressCount = 0;
let pressTimer = null;
let feedbackElement = null;
let feedbackClearTimer = null;

function ensureFeedbackElement() {
    if (!feedbackElement) {
        feedbackElement = document.createElement('div');
        feedbackElement.className = 'quickmark-feedback';
        // Prepend to body to reduce chances of being overwritten by dynamic page loads
        document.body.prepend(feedbackElement);
        console.log("QuickMark: Feedback element created.");
    }
}

function showFeedback(message, duration = FEEDBACK_DISPLAY_MS) {
    ensureFeedbackElement();
    feedbackElement.textContent = message;
    feedbackElement.classList.add('visible');

    if (feedbackClearTimer) {
        clearTimeout(feedbackClearTimer);
    }
    feedbackClearTimer = setTimeout(() => {
        if (feedbackElement) { // Check if element still exists
          feedbackElement.classList.remove('visible');
        }
    }, duration);
}

function handleKeyDown(event) {
    const targetElement = event.target;
    const isTypingArea = targetElement.isContentEditable ||
                          targetElement.tagName === 'INPUT' ||
                          targetElement.tagName === 'TEXTAREA' ||
                          targetElement.tagName === 'SELECT';

    if (isTypingArea && targetElement.closest && targetElement.closest('#chat') && event.key.toLowerCase() === CAPTURE_KEY) {
        // Specifically allow 'c' in YouTube chat input
        // If YouTube chat input has an ID or unique class, use it here. For now, using generic #chat
        console.log("QuickMark: 'c' pressed in YouTube chat, allowing default.");
        return;
    }
    
    if (isTypingArea && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // If it's a simple key press in a typing area (not a modifier combo), ignore for our hotkey
        console.log("QuickMark: Key press in typing area, ignored for capture.");
        return;
    }


    if (event.key.toLowerCase() === CAPTURE_KEY) {
        console.log(`QuickMark: '${CAPTURE_KEY}' key pressed. Count: ${pressCount + 1}`);
        event.preventDefault();
        event.stopPropagation(); // Stop event from bubbling further

        pressCount++;

        if (pressTimer) {
            clearTimeout(pressTimer);
        }

        let feedbackMessage = "";
        switch (pressCount) {
            case 1: feedbackMessage = "Mark: Good"; break;
            case 2: feedbackMessage = "Mark: Great!"; break;
            case 3: feedbackMessage = "Mark: Wonderful!!"; break;
            default:
                pressCount = 3; // Cap at 3
                feedbackMessage = "Mark: Wonderful!! (Max)";
                break;
        }
        showFeedback(feedbackMessage);

        pressTimer = setTimeout(() => {
            processCapture(pressCount);
            pressCount = 0;
        }, PRESS_TIMEOUT_MS);
    }
}

function processCapture(gradeLevel) {
    let grade;
    switch (gradeLevel) {
        case 1: grade = "Good"; break;
        case 2: grade = "Great"; break;
        case 3: grade = "Wonderful"; break;
        default:
            console.warn("QuickMark: Invalid grade level:", gradeLevel);
            showFeedback("Error: Invalid grade.");
            return;
    }
    console.log(`QuickMark: Processing capture for grade: ${grade}`);

    const videoElement = document.querySelector('video.html5-main-video'); // More specific selector
    if (!videoElement) {
        console.error("QuickMark: Video element not found.");
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
        } else {
            const path = window.location.pathname;
            const shortsMatch = path.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
            const embedMatch = path.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
            if (shortsMatch) videoId = shortsMatch[1];
            else if (embedMatch) videoId = embedMatch[1];
        }

        const titleElement = document.querySelector('h1.ytd-watch-metadata .title, h1.title.ytd-video-primary-info-renderer, #title h1 yt-formatted-string, #video-title.ytd-watch-flexy');
        if (titleElement && titleElement.textContent) {
            videoTitle = titleElement.textContent.trim();
        } else if (document.title) {
            let potentialTitle = document.title;
            if (potentialTitle.toLowerCase().endsWith(" - youtube")) {
                potentialTitle = potentialTitle.substring(0, potentialTitle.toLowerCase().lastIndexOf(" - youtube"));
            }
            if (potentialTitle.trim() !== "") videoTitle = potentialTitle.trim();
        }
    } catch (e) {
        console.error("QuickMark: Error extracting video details:", e);
    }
    
    if (!videoId && (window.location.href.includes("youtube.com/watch*") || window.location.href.includes("youtube.com/watch"))) {
       console.warn("QuickMark: Could not determine Video ID on a YouTube watch/shorts/embed page. URL:", window.location.href);
       // Attempt to pull from ytInitialPlayerResponse if available (more advanced)
       if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails && window.ytInitialPlayerResponse.videoDetails.videoId) {
           videoId = window.ytInitialPlayerResponse.videoDetails.videoId;
           if (window.ytInitialPlayerResponse.videoDetails.title) {
               videoTitle = window.ytInitialPlayerResponse.videoDetails.title;
           }
           console.log("QuickMark: Extracted Video ID/Title from ytInitialPlayerResponse.");
       } else {
            showFeedback("Error: Could not get Video ID.");
       }
    }


    const captureData = {
        type: "QUICKMARK_CAPTURE",
        originalCaptureTime: currentTime,
        videoId: videoId,
        videoTitle: videoTitle,
        grade: grade
    };

    console.log("QuickMark: Sending data to background:", captureData);
    try {
        chrome.runtime.sendMessage(captureData, (response) => {
            if (chrome.runtime.lastError) {
                console.error("QuickMark: Error sending message:", chrome.runtime.lastError.message);
                showFeedback("Error saving mark (send fail).");
            } else if (response) {
                if (response.status === "success") {
                    console.log("QuickMark: Background responded success.", response);
                    showFeedback(`Mark Saved: ${grade} (${formatTimestampSimple(response.adjustedTimestamp)})`);
                } else {
                    console.error("QuickMark: Background responded with error:", response.message);
                    showFeedback(response.message || "Error saving mark (bg error).");
                }
            } else {
                console.warn("QuickMark: No response from background script.");
                showFeedback("Mark saved (no confirmation).");
            }
        });
    } catch (e) {
        console.error("QuickMark: Exception while sending message:", e);
        showFeedback("Critical error sending mark.");
    }
}

function formatTimestampSimple(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Attach listener only if not already attached (simple guard)
if (!window.quickMarkListenerAttached) {
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    window.quickMarkListenerAttached = true;
    console.log("QuickMark: Content Script Loaded and Keydown Listener Attached in Capture Phase (v0.2.0).");
}