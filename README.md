# AI Travel Charming Chat (Chatbot-as-a-Service & RAG Embed Platform)

A full-stack, enterprise-grade **Chatbot-as-a-Service (CaaS)** and **RAG (Retrieval-Augmented Generation)** platform designed for travel companies, tourism businesses, hotels, and online service providers.

Allows website owners to train custom AI agents on private knowledge bases (PDF, TXT, DOCX), manage scoped API keys with strict domain whitelisting, and deploy intelligent floating chat widgets onto external websites using a single line of HTML script.

---

## 🌟 Key Features

- **Document Ingestion & RAG Pipeline:**
  - Automated semantic chunking with boundary overlap.
  - High-dimensional vector embeddings powered by Google Gemini.
  - Cosine similarity matching to strictly ground AI responses in business facts and prevent hallucinations.

- **Plug-and-Play Shadow DOM Widget:**
  - Ultra-lightweight Vanilla JavaScript client script (`< 15KB`).
  - Encapsulated inside a closed **Shadow DOM** to guarantee 100% style isolation and prevent CSS conflicts with host websites.
  - Embeddable on any website with a single snippet:
    ```html
    <script 
      src="https://your-domain.com/widget.js" 
      data-bot-key="pk_live_your_key_here" 
      defer>
    </script>
    ```

- **Enterprise API Key Security (Slip2Go Architecture):**
  - Plain API secrets are never stored in the database; keys are hashed using **SHA-256**.
  - **Domain Whitelisting:** Validates `Origin` and `Referer` headers to prevent unauthorized key theft on third-party domains.
  - Atomic database transactions for rate limiting and message credit balances.

- **Multi-Model LLM Failover:**
  - Resilient failover pool across Google Gemini models (`gemini-3.5-flash`, `gemini-flash-latest`, `gemini-3.5-flash-lite`).
  - Seamlessly survives 503 high-demand spikes or model deprecations without user-facing interruptions.

- **Developer Management Dashboard:**
  - Real-time token consumption telemetry and message logging.
  - Bot persona configuration, custom system prompts, and temperature controls.
  - Scoped API key management (`Read`, `Write`, `Admin`) with prefix masking and instant revocation.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Language:** TypeScript & JavaScript
- **Styling:** Tailwind CSS (Custom Sage theme & topographic aesthetics)
- **Database & ORM:** PostgreSQL / SQLite via [Prisma ORM](https://www.prisma.io/)
- **AI Inference & Embeddings:** [Google Generative AI SDK](https://github.com/google-gemini/generative-ai-js) (`gemini-3.5-flash`, `gemini-embedding-001`)
- **Validation:** Zod schemas
- **Client Widget:** Pure Vanilla JavaScript with Shadow DOM encapsulation

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/peetb2/ai-charming-chatbot.git
cd ai-charming-chatbot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```
Ensure you provide a valid `GEMINI_API_KEY`:
```env
DATABASE_URL="file:./prisma/dev.db"
GEMINI_API_KEY="your-google-gemini-api-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Setup Database
```bash
npx prisma db push
node prisma/seed.js
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Embedding the Widget

Add the script tag before the closing `</body>` tag on any client HTML page:

```html
<!-- AI Travel Charming Chat Widget -->
<script 
  src="http://localhost:3000/widget.js" 
  data-bot-key="pk_live_your_public_key" 
  defer>
</script>
```

---

## 📄 License
This project is open-source and available under the MIT License.
