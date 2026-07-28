# ChatGPT OAuth Advanced (Standalone)

A highly polished, standalone web interface for ChatGPT using official OAuth PKCE authentication. It provides a seamless, ChatGPT-like UI experience and supports advanced features like file attachments, vision processing, live web search, streaming markdown responses, and model switching.

**Repository:** [https://github.com/kushalkumarj2006/chatgpt-oauth-advanced/](https://github.com/kushalkumarj2006/chatgpt-oauth-advanced/)

![Features](https://img.shields.io/badge/Features-OAuth%20%7C%20Vision%20%7C%20Files%20%7C%20Web%20Search-blue)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Key Features

- **Official OAuth Flow:** Securely log in using your ChatGPT account via PKCE (no API keys required).
- **Model Switching:** Dynamic dropdown to switch between `gpt-5.6-terra`, `gpt-4o`, and `gpt-4o-mini` on the fly.
- **Multi-Modal Support:** Upload images (Vision), PDFs, code files, and text documents directly in the chat.
- **Agentic Tools:** Toggleable Web Search tool to let the AI fetch real-time information.
- **Streaming Markdown:** Real-time rendering of markdown responses with syntax highlighting and one-click code copying.
- **Mobile Responsive:** Designed with a mobile-first approach, including dynamic viewport heights and iOS-safe input handling.
- **Self-Hosted CORS Proxy:** Includes a Cloudflare Worker script so you don't have to rely on rate-limited, public CORS proxies.

---

## 🚀 Setup Instructions

### Step 1: Clone the Repository
```bash
git clone https://github.com/kushalkumarj2006/chatgpt-oauth-advanced.git
cd chatgpt-oauth-advanced
```

### Step 2: Deploy Your Own CORS Proxy (Required)
Because browsers block cross-origin requests, you need a proxy to forward requests to OpenAI. This repo includes a ready-to-deploy Cloudflare Worker.

1. Go to [Cloudflare Workers](https://workers.cloudflare.com/) and create a free account.
2. Create a new Worker.
3. Copy the code from [`worker/cors-proxy.js`](./worker/cors-proxy.js) in this repository and paste it into the Cloudflare editor.
4. Deploy the worker. Cloudflare will give you a URL like:
   `https://cors-proxy.your-name.workers.dev`

### Step 3: Configure the App
Open `index.html` and find the configuration section (around line 415):

```javascript
// CHANGE THIS TO YOUR CLOUDFLARE WORKER URL
const PROXY = 'https://cors-proxy.your-name.workers.dev/'; 
```
*(Note: Make sure to include the trailing slash `/` at the end of your URL)*

### Step 4: Run the App Locally
Because the app uses an OAuth redirect set to `http://localhost:1455`, you must run a local server on that exact port.

If you have Python installed:
```bash
# Python 3
python -m http.server 1455
```
Then, open `http://localhost:1455` in your browser.

---

## 🔑 How to Log In

1. Click the **"Sign in with ChatGPT"** button on the welcome screen.
2. A new tab will open to the official OpenAI login page. Log in with your ChatGPT account.
3. After logging in, the page will try to redirect to `http://localhost:1455/auth/callback?code=...`. **This page will not load (this is normal).**
4. Copy the entire URL from your browser's address bar.
5. Paste it into the **"Paste the redirect URL after login"** input box.
6. Click **"Exchange Code for Token"**. 

You are now authenticated and can start chatting!

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Markdown:** `marked.js`
- **Syntax Highlighting:** `highlight.js`
- **Backend/Proxy:** Cloudflare Workers (Serverless)
- **Fonts:** Inter & JetBrains Mono (Google Fonts)

---

## ⚠️ Disclaimer

This project interfaces with unofficial ChatGPT backend endpoints to provide a standalone client experience. It is intended for educational and personal use. Use it responsibly and at your own risk. The author is not affiliated with OpenAI.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
