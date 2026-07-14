# MockFrame Capture Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this directory.
4. Pin MockFrame Capture, open any public page, and click **Capture visible tab**.

The extension stores a capture temporarily in `chrome.storage.local`, opens
MockFrame, hands it to the editor through the content script, then deletes the
temporary value. Before Chrome Web Store submission, add 16/32/48/128 PNG icons,
store screenshots, and the final privacy disclosure.
