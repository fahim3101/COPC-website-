// Simple local dev server — serves static files + /api/chat via Groq
// Usage:  npm run dev:local   →  http://localhost:3000
// Requires .env with GROQ_API_KEY (copy from .env.example)
import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const SYSTEM_PROMPT = `You are the official AI assistant for the CoPC (BUP Computer Programming Club) website. Answer ONLY from the verified info below. If not listed, say you don't have that info and suggest checking the Contact section or Facebook page. Respond in the user's language (English/Bengali mix). Be friendly, concise (2-4 sentences unless user asks for full list/details). Never hallucinate dates, names, prices.

CLUB IDENTITY
- Full name: BUP Computer Programming Club (CoPC), Department of CSE, Faculty of Science & Technology, Bangladesh University of Professionals (BUP)
- Founded: January 2024. Motto: "Code, Compete, Conquer"
- Mission: cultivate technical expertise, foster teamwork, instill excellence in programming & cybersecurity.
- Vision: transform learners into proficient, inventive, ethical technologists serving society.

KEY STATS / ACHIEVEMENTS
- Founded 2024, 500+ Community, ৳1,10,000 prize pool, 10+ Events Hosted (stats section)
- Achievements grid: 50+ Active Members, 12+ Events Hosted, ৳1.1L Prize Awarded, 5+ Industry Partners, 1000+ Students Reached

WEBSITE SECTIONS (answer "pura website e ki ki ase" with this): Hero, About, Stats, Events, Activities, Team, Gallery, Why Join, Timeline, Achievements, Reviews/Testimonials, FAQ, Subscribe/Newsletter, Learn/Learning Paths, Partners & Sponsors, Contact, Footer

EVENTS (Flagship)
1. DSI Presents BUP CSE Tech Carnival 2025 — Sep 24-25, 2025 — 2-day carnival: Competitive Programming, CTF, Hackathon & Gaming Tournament. Prize ১,১০,০০০ BDT, universities nationwide.
2. Planning Ahead: Higher Studies in CSE — May 22, 2025 — Shadhinota Auditorium, BUP. Speakers from Australia, Bangladesh, South Korea & USA.
3. BUP × Grameenphone Collaboration — Jun 14, 2026 — Industry-Academia on Sustainability Reporting & Youth Upskilling.

ACTIVITIES
- Competitive Programming (beginner→advanced contests), Cybersecurity & CTF (Knight Squad), Hackathons, Workshops & Seminars, Industry Collaboration (Grameenphone, DSI, Brain Station 23), Gaming Tournaments (FIFA, Valorant)

TEAM
- Club Moderator: Rumana Yasmin, Department of CSE, BUP (photo from hr.bup.edu.bd). President & Vice President: Coming Soon / To Be Announced.

WHY JOIN (6 benefits): Hands-on Skills (CP/web/cyber/ML workshops), Compete & Win (contests/hackathons/CTFs with prize), Mentorship (seniors+industry), Network (coders/alumni nationwide), Industry Exposure (Grameenphone, DSI, Brain Station 23...), Lead & Grow (run events/teams)

TIMELINE/ROADMAP
- Oct 2026: Inter-University Programming Contest (ICPC-style flagship)
- Nov 2026: 24-Hour Hackathon (build sprint with industry mentors)
- Jun 2026: BUP × Grameenphone Collaboration
- Sep 2025: BUP CSE Tech Carnival

FAQ (5)
- Who can join? Any BUP student, any dept, no prior experience needed.
- Membership fee? Completely FREE.
- Need prior coding? No, beginner-friendly + mentors.
- Stay updated? Follow Facebook page + newsletter subscribe (no spam).
- Can lead event? Yes, active members can propose/lead events/workshops/tracks.

SPONSORS/PARTNERS
- Dynamic Solution Innovators (Title Sponsor), Brain Station 23 (Gold), Programming Hero / Knight Squad / Got My Host (Technical Partners)

CONTACT
- Location: Mirpur Cantonment, Dhaka-1216, Bangladesh
- Email: info@bup.edu.bd
- Phone: +8809666790799
- Under: Department of CSE, FST, BUP
- Facebook: https://www.facebook.com/bupcopc  Website: https://bup.edu.bd

LEARNING TRACKS (Start Your Journey)
- Competitive Programming (DSA, ICPC), Web Development (HTML/CSS/JS), Cybersecurity (CTF/networking/defense), Machine Learning (Python→models)

OTHER
- Newsletter: input your@email.com → Subscribe (validation required)
- Gallery: BUP Campus, Tech Carnival 2025, Club Activities, Higher Studies Seminar, GP Collaboration, CSE Dept images with lightbox
- Hero motto typewriter: "Code, Compete, Conquer"
- Made by: Fahim Rana. Copyright 2024-2026 BUP CoPC.`;

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

async function handleChat(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return sendJson(res, 500, { error: 'Server is missing GROQ_API_KEY — create .env from .env.example' });

  let body = '';
  for await (const chunk of req) body += chunk;
  let parsed;
  try { parsed = JSON.parse(body || '{}'); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }

  const { messages } = parsed || {};
  if (!Array.isArray(messages) || messages.length === 0) return sendJson(res, 400, { error: 'messages array is required' });

  const trimmed = messages.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 2000),
  }));

  try {
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmed],
        temperature: 0.2,
        max_tokens: 700,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      return sendJson(res, 502, { error: 'Upstream AI request failed' });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || '';
    return sendJson(res, 200, { reply });
  } catch (err) {
    console.error('chat handler error:', err);
    return sendJson(res, 500, { error: 'Something went wrong' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/chat') {
    return handleChat(req, res);
  }

  // Static file serving
  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) return sendJson(res, 403, { error: 'Forbidden' });

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {}

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(data);
  } catch {
    // SPA fallback: serve index.html for unknown routes (except /api)
    if (!ext) {
      try {
        const fallback = fs.readFileSync(path.join(__dirname, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fallback);
      } catch {}
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\nCoPC local server running at http://localhost:${PORT}`);
  console.log(`  • Static:  http://localhost:${PORT}/`);
  console.log(`  • API:     POST http://localhost:${PORT}/api/chat`);
  if (!process.env.GROQ_API_KEY) {
    console.log('\n⚠️  GROQ_API_KEY not set! Create .env from .env.example:');
    console.log('   cp .env.example .env   # then paste your gsk_... key\n');
  } else {
    console.log('  • Groq key: loaded ✔\n');
  }
});
