// popup.js (v0.2.0 - Displaying Grades)

document.addEventListener('DOMContentLoaded', async () => {
    const timestampsList = document.getElementById('timestamps-list');
    const noMarksMessage = document.getElementById('no-marks-message');
    const popupTitleElement = document.getElementById('popup-title');

    console.log("Popup (v0.2.0) opened. Loading marks.");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let currentVideoId = null;
    let currentVideoTitle = "Current Video";

    if (tab && tab.url) {
        try {
            const url = new URL(tab.url);
            if (tab.title && tab.title !== "YouTube") { // Get a more specific title if available
                currentVideoTitle = tab.title.replace(/ - YouTube$/, "").trim(); // Remove " - YouTube" suffix
            }
            if (popupTitleElement) {
                 // Truncate title if too long for the popup
                popupTitleElement.textContent = `Marks for: ${currentVideoTitle.substring(0, 40)}${currentVideoTitle.length > 40 ? '...' : ''}`;
                popupTitleElement.title = currentVideoTitle; // Full title on hover
            }

            if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
                if (url.pathname === '/watch') {
                    currentVideoId = url.searchParams.get('v');
                } else if (url.pathname.startsWith('/shorts/')) {
                    currentVideoId = url.pathname.split('/shorts/')[1];
                } else if (url.pathname.startsWith('/embed/')) {
                    currentVideoId = url.pathname.split('/embed/')[1];
                }
            }
        } catch (e) {
            console.error("Popup: Error parsing tab URL or title:", e);
            if (timestampsList) timestampsList.innerHTML = '<li>Error identifying video.</li>';
            return;
        }
    }

    if (!currentVideoId) {
        console.log("Popup: Not a recognized YouTube video page or no Video ID.");
        if (timestampsList) timestampsList.innerHTML = '';
        if (noMarksMessage) {
            noMarksMessage.textContent = 'Navigate to a YouTube video page.';
            noMarksMessage.style.display = 'block';
        }
        if (popupTitleElement) popupTitleElement.textContent = "QuickMark"; // Generic title
        return;
    }

    console.log(`Popup: Current Video ID: ${currentVideoId}, Title: ${currentVideoTitle}`);

    chrome.storage.local.get({ videoMarks: [] }, (data) => {
        if (chrome.runtime.lastError) {
            console.error("Popup: Error fetching marks from storage:", chrome.runtime.lastError);
            if (timestampsList) timestampsList.innerHTML = '<li>Error loading marks.</li>';
            return;
        }

        const allMarks = data.videoMarks || [];
        const relevantMarks = allMarks.filter(mark => mark.videoId === currentVideoId);
        console.log(`Popup: Found ${relevantMarks.length} relevant marks for this video.`);

        if (!timestampsList) {
            console.error("Popup: timestampsList element not found.");
            return;
        }

        if (relevantMarks.length === 0) {
            if (noMarksMessage) noMarksMessage.style.display = 'block';
            timestampsList.innerHTML = '';
        } else {
            if (noMarksMessage) noMarksMessage.style.display = 'none';
            timestampsList.innerHTML = '';

            relevantMarks.sort((a, b) => a.timestamp - b.timestamp); // Sort by adjusted timestamp

            relevantMarks.forEach((mark, index) => {
                const listItem = document.createElement('li');

                const timestampSpan = document.createElement('span');
                timestampSpan.className = 'timestamp-entry';
                timestampSpan.textContent = formatTimestamp(mark.timestamp);

                const gradeSpan = document.createElement('span');
                gradeSpan.className = 'grade-entry';
                const gradeText = mark.grade || "N/A"; // Default if grade is missing
                gradeSpan.textContent = gradeText;
                // Add specific class for styling based on grade
                gradeSpan.classList.add(`grade-${gradeText.toLowerCase().replace(/\s+/g, '-')}`);


                // ----- DEBUGGING LOG for each mark -----
                console.log(`Popup: Displaying Mark ${index + 1}: AdjTime=${mark.timestamp}, OrigTime=${mark.originalCaptureTime}, Grade=${gradeText}, FormattedTime=${timestampSpan.textContent}`);
                // ----- END DEBUGGING LOG -----


                listItem.appendChild(timestampSpan);
                listItem.appendChild(gradeSpan);
                
                // Optional: Add title attribute for more info on hover
                listItem.title = `Captured at original time: ${formatTimestamp(mark.originalCaptureTime)}\nLooked back: ${mark.lookBackOffset}s\nSaved on: ${new Date(mark.capturedAt).toLocaleString()}`;

                timestampsList.appendChild(listItem);
            });
        }
    });
});

function formatTimestamp(totalSeconds) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds)) {
        return "00:00";
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const paddedSeconds = seconds.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');

    if (hours > 0) {
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    } else {
        return `${paddedMinutes}:${paddedSeconds}`;
    }
}