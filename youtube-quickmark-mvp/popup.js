// popup.js

document.addEventListener('DOMContentLoaded', async () => {
    const timestampsList = document.getElementById('timestamps-list');
    const noMarksMessage = document.getElementById('no-marks-message');

    // Get the current active tab to find its URL and Video ID
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    let currentVideoId = null;
    if (tab && tab.url) {
        try {
            const url = new URL(tab.url);
            if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
                if (url.pathname === '/watch') {
                    currentVideoId = url.searchParams.get('v');
                } else if (url.pathname.startsWith('/shorts/')) {
                    currentVideoId = url.pathname.split('/shorts/')[1];
                } else if (url.pathname.startsWith('/embed/')) {
                    currentVideoId = url.pathname.split('/embed/')[1];
                }
                // Add more conditions if YouTube has other video URL structures you encounter
            }
        } catch (e) {
            console.error("Error parsing tab URL:", e);
            // Fallback or error display for popup could be here
            timestampsList.innerHTML = '<li>Error identifying YouTube video.</li>';
            return;
        }
    }

    if (!currentVideoId) {
        timestampsList.innerHTML = '<li>Not a recognized YouTube video page.</li>';
        // Or hide the list and show a specific message
        noMarksMessage.textContent = 'Please navigate to a YouTube video page.';
        noMarksMessage.style.display = 'block';
        return;
    }

    // Fetch all stored marks
    chrome.storage.local.get({ videoMarks: [] }, (data) => {
        const allMarks = data.videoMarks;
        const relevantMarks = allMarks.filter(mark => mark.videoId === currentVideoId);

        if (relevantMarks.length === 0) {
            noMarksMessage.style.display = 'block'; // Show the "no marks" message
            timestampsList.innerHTML = ''; // Clear any previous list items
        } else {
            noMarksMessage.style.display = 'none'; // Hide the "no marks" message
            timestampsList.innerHTML = ''; // Clear any previous list items

            // Sort marks by timestamp (ascending)
            relevantMarks.sort((a, b) => a.timestamp - b.timestamp);

            relevantMarks.forEach(mark => {
                const listItem = document.createElement('li');
                const timestampFormatted = formatTimestamp(mark.timestamp);
                
                // For MVP, we'll display the timestamp.
                // Title is likely redundant here as it's "for this video"
                // but good to have the data if we want to add it.
                listItem.textContent = `${timestampFormatted}`; 
                
                // Bonus: Make timestamp clickable to seek in video (more advanced, for later)
                // listItem.title = `Click to seek to ${timestampFormatted} in video (Captured at: ${formatTimestamp(mark.originalCaptureTime)})`;
                // listItem.addEventListener('click', () => {
                //   chrome.scripting.executeScript({
                //     target: { tabId: tab.id },
                //     func: (timeToSeek) => {
                //       const video = document.querySelector('video');
                //       if (video) video.currentTime = timeToSeek;
                //     },
                //     args: [mark.timestamp]
                //   });
                //   window.close(); // Close popup after clicking
                // });

                timestampsList.appendChild(listItem);
            });
        }
    });
});

function formatTimestamp(totalSeconds) {
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