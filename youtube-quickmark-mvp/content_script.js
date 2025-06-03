// content_script.js (v0.3.3 - Aggressive Video Discovery)
console.log("QuickMark: Content Script Attempting to Load (v0.3.3 - AggressiveVidDiscovery)");

const KEY_GOOD = 'b';
const KEY_GREAT = 'n';
const KEY_WONDERFUL = 'm';
const FEEDBACK_DISPLAY_MS = 2500;
const PRE_SEND_DELAY_MS = 50;

let feedbackElement = null;
let feedbackClearTimer = null;

function ensureFeedbackElement() { /* ... same as v0.3.2 ... */ 
    if (!document.body) { console.warn("QuickMark-AVD3: Document body not ready."); return false; }
    if (!feedbackElement || !document.body.contains(feedbackElement)) {
        feedbackElement = document.createElement('div');
        feedbackElement.id = 'quickmark-feedback-element';
        feedbackElement.className = 'quickmark-feedback';
        document.body.prepend(feedbackElement);
        console.log("QuickMark-AVD3: Feedback element CREATED.");
    }
    return true;
}

function showFeedback(message, duration = FEEDBACK_DISPLAY_MS) { /* ... same as v0.3.2 ... */
    console.log(`QuickMark-AVD3: showFeedback - "${message}"`);
    if (!ensureFeedbackElement()) return;
    feedbackElement.textContent = message;
    feedbackElement.classList.add('visible');
    if (feedbackClearTimer) clearTimeout(feedbackClearTimer);
    feedbackClearTimer = setTimeout(() => { if (feedbackElement) feedbackElement.classList.remove('visible'); }, duration);
}

function findActiveVideoElement() {
    const allVideos = Array.from(document.querySelectorAll('video'));
    console.log(`QuickMark-AVD3: Found ${allVideos.length} video element(s) on the page initially.`);

    if (allVideos.length === 0) {
        console.warn("QuickMark-AVD3: No video elements found.");
        return null;
    }

    // Log details of all videos found
    allVideos.forEach((video, index) => {
        const rect = video.getBoundingClientRect();
        console.log(`QuickMark-AVD3: Video[${index}]: src=${video.currentSrc}, paused=${video.paused}, duration=${video.duration}, readyState=${video.readyState}, currentTime=${video.currentTime}, volume=${video.volume}, width=${rect.width}, height=${rect.height}, visible=${getComputedStyle(video).visibility}, display=${getComputedStyle(video).display}`);
    });

    // Attempt to find the best candidate
    let bestCandidate = null;
    let maxArea = 0;

    for (const video of allVideos) {
        const rect = video.getBoundingClientRect();
        const isVisibleStyle = getComputedStyle(video).visibility !== 'hidden' && getComputedStyle(video).display !== 'none';
        const hasAudio = video.volume > 0 && !video.muted; // Check if it might be the one with audio
        const decentDuration = video.duration > 16; // Longer than typical ad/preview duration
        const area = rect.width * rect.height;

        // Prioritize videos that are playing, visible, have a decent duration, and are reasonably sized
        // The "paused" state might be tricky, so we might need to be flexible
        // Let's try to find the largest, playing video with a good duration
        if (isVisibleStyle && decentDuration && area > 10000 && !video.paused) { // 10000 pixels = 100x100
             if (area > maxArea) {
                 maxArea = area;
                 bestCandidate = video;
                 console.log(`QuickMark-AVD3: New best playing candidate by area: Video with src=${video.currentSrc}, area=${area}`);
             }
        }
    }
    
    // If no strictly "playing" large video was found, broaden search for largest visible video with duration
    if (!bestCandidate) {
        maxArea = 0; // Reset maxArea
        for (const video of allVideos) {
            const rect = video.getBoundingClientRect();
            const isVisibleStyle = getComputedStyle(video).visibility !== 'hidden' && getComputedStyle(video).display !== 'none';
            const decentDuration = video.duration > 16; // Longer than typical ad/preview
            const area = rect.width * rect.height;

            if (isVisibleStyle && decentDuration && area > 10000) {
                 if (area > maxArea) {
                     maxArea = area;
                     bestCandidate = video;
                     console.log(`QuickMark-AVD3: New best visible (potentially paused) candidate by area: Video with src=${video.currentSrc}, area=${area}, paused=${video.paused}`);
                 }
            }
        }
    }


    if (bestCandidate) {
        console.log("QuickMark-AVD3: Selected best candidate video:", bestCandidate);
        return bestCandidate;
    }

    // Last resort fallbacks (less reliable)
    const mainPlayerVideo = document.querySelector('video.html5-main-video');
    if (mainPlayerVideo) {
        console.log("QuickMark-AVD3: Fallback to 'video.html5-main-video' selector.", mainPlayerVideo);
        return mainPlayerVideo;
    }
    if (allVideos.length > 0) {
        console.log("QuickMark-AVD3: Final fallback to the first video element found on page.", allVideos[0]);
        return allVideos[0];
    }

    console.warn("QuickMark-AVD3: No suitable video element could be determined.");
    return null;
}


function handleKeyDown(event) { /* ... same as v0.3.2 ... */ 
    const targetElement = event.target;
    const isTypingArea = targetElement.isContentEditable || targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'SELECT';
    if (isTypingArea && (targetElement.id === 'input' && targetElement.closest('#chat'))) { if ([KEY_GOOD, KEY_GREAT, KEY_WONDERFUL].includes(event.key.toLowerCase())) return; }
    if (isTypingArea && !event.ctrlKey && !event.altKey && !event.metaKey) return;

    const keyPressed = event.key.toLowerCase();
    let grade = null;
    if (keyPressed === KEY_GOOD) grade = "Good";
    else if (keyPressed === KEY_GREAT) grade = "Great";
    else if (keyPressed === KEY_WONDERFUL) grade = "Wonderful";

    if (grade) {
        console.log(`QuickMark-AVD3: Key '${keyPressed}' pressed. Grade: ${grade}.`);
        event.preventDefault(); event.stopPropagation();
        showFeedback(`Mark: ${grade}`, FEEDBACK_DISPLAY_MS / 2);
        processCapture(grade);
    }
}

function processCapture(grade) { /* ... processCapture from v0.3.2 BUT uses this script's findActiveVideoElement ... */
    console.log(`QuickMark-AVD3: processCapture called. Grade: ${grade}.`);
    const videoElement = findActiveVideoElement(); // Uses the new function

    if (!videoElement) {
        console.error("QuickMark-AVD3: No suitable video element found by findActiveVideoElement().");
        showFeedback("Error: Active video player not found.");
        return;
    }
    
    console.log("QuickMark-AVD3: Using video element:", videoElement);
    console.log(`QuickMark-AVD3: Video src: ${videoElement.src || 'N/A'}`);
    console.log(`QuickMark-AVD3: Video currentSrc: ${videoElement.currentSrc || 'N/A'}`);
    console.log(`QuickMark-AVD3: Video readyState: ${videoElement.readyState}`);
    console.log(`QuickMark-AVD3: Video paused: ${videoElement.paused}`); // CRITICAL LOG
    console.log(`QuickMark-AVD3: Video duration: ${videoElement.duration}`); // CRITICAL LOG
    console.log(`QuickMark-AVD3: Document hidden: ${document.hidden}`);
    
    const finalCurrentTime = videoElement.currentTime;
    console.log(`QuickMark-AVD3: CAPTURED finalCurrentTime FOR SENDING: ${finalCurrentTime}.`); // CRITICAL LOG
    
    const checkTimeLaterTimeout = setTimeout(() => {
        if(videoElement && document.body.contains(videoElement)) {
             console.log(`QuickMark-AVD3: videoElement.currentTime (100ms after capture): ${videoElement.currentTime}`);
        } else { console.log("QuickMark-AVD3: videoElement no longer valid for 100ms check."); }
    }, 100);

    let videoId = '', videoTitle = "Untitled YouTube Video";
    try { /* ... same ID/title extraction as v0.3.2 ... */ 
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('v')) videoId = urlParams.get('v'); else { const path = window.location.pathname; const shortsMatch = path.match(/^\/shorts\/([a-zA-Z0-9_-]+)/); const embedMatch = path.match(/^\/embed\/([a-zA-Z0-9_-]+)/); if (shortsMatch) videoId = shortsMatch[1]; else if (embedMatch) videoId = embedMatch[1];}
        const titleElement = document.querySelector('h1.ytd-watch-metadata .title, h1.title.ytd-video-primary-info-renderer, #title h1 yt-formatted-string, #video-title.ytd-watch-flexy, .title.style-scope.ytd-video-primary-info-renderer');
        if (titleElement && titleElement.textContent) videoTitle = titleElement.textContent.trim(); else if (document.title) { let potentialTitle = document.title; if (potentialTitle.toLowerCase().endsWith(" - youtube")) potentialTitle = potentialTitle.substring(0, potentialTitle.toLowerCase().lastIndexOf(" - youtube")); if (potentialTitle.trim() !== "") videoTitle = potentialTitle.trim(); }
        if ((!videoId || videoTitle === "Untitled YouTube Video") && window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) { if (!videoId && window.ytInitialPlayerResponse.videoDetails.videoId) videoId = window.ytInitialPlayerResponse.videoDetails.videoId; if ((videoTitle === "Untitled YouTube Video" || !videoTitle) && window.ytInitialPlayerResponse.videoDetails.title) videoTitle = window.ytInitialPlayerResponse.videoDetails.title; }
    } catch (e) { console.error("QuickMark-AVD3: Error extracting video details:", e); }
    if (!videoId && (window.location.href.includes("youtube.com/watch*") || window.location.href.includes("youtube.com/watch"))) { console.warn("QuickMark-AVD3: Could not determine Video ID.");}
    
    const captureData = { type: "QUICKMARK_CAPTURE", originalCaptureTime: finalCurrentTime, videoId: videoId || "unknownVideoID_" + Date.now(), videoTitle: videoTitle, grade: grade };
    console.log("QuickMark-AVD3: Data prepared for sending:", JSON.parse(JSON.stringify(captureData)));

    setTimeout(() => { // PRE_SEND_DELAY_MS
        console.log(`QuickMark-AVD3: Attempting sendMessage after ${PRE_SEND_DELAY_MS}ms delay.`);
        try { /* ... same sendMessage logic as v0.3.2 ... */ 
            chrome.runtime.sendMessage(captureData, (response) => {
                if (chrome.runtime.lastError) { console.error(`QuickMark-AVD3: sendMessage callback - chrome.runtime.lastError: ${chrome.runtime.lastError.message}`); showFeedback(`Error: Send failed (${chrome.runtime.lastError.message})`);
                } else if (response) { console.log("QuickMark-AVD3: sendMessage callback - Background responded:", response); if (response.status === "success") { showFeedback(`Saved: ${grade} (${formatTimestampSimple(response.adjustedTimestamp)})`); } else { showFeedback(response.message || "Error: Save failed (BG)"); }
                } else { console.warn("QuickMark-AVD3: sendMessage callback - No response from background script."); showFeedback("Saved (no confirmation)."); }
            });
        } catch (e) { console.error(`QuickMark-AVD3: Exception during actual chrome.runtime.sendMessage call: ${e.message}`, e); showFeedback(`Critical Error: ${e.message}`); }
    }, PRE_SEND_DELAY_MS);
}

function formatTimestampSimple(totalSeconds) { /* ... same as v0.3.2 ... */ 
    if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00"; const minutes = Math.floor(totalSeconds / 60); const seconds = Math.floor(totalSeconds % 60); return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

if (!window.quickMarkListenerAttachedMain_v0_3_3_AVD) { // Updated guard name
    document.addEventListener('keydown', handleKeyDown, true);
    window.quickMarkListenerAttachedMain_v0_3_3_AVD = true;
    console.log("QuickMark: Content Script Loaded (v0.3.3 - AggressiveVideoDiscovery) and Listener Attached.");
} else {
    console.log("QuickMark: Content Script (v0.3.3 - AggressiveVideoDiscovery) already loaded.");
}