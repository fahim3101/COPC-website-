// /api/chat.js — Vercel serverless function (Node.js runtime)
// Keeps GROQ_API_KEY on the server. The browser never sees it.
import 'dotenv/config';

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

export default async function handler(req, res) {
  // CORS for local preview (Vercel handles separately)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GROQ_API_KEY" });
  }

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    // Only keep the last 10 turns to control token usage / cost.
    const trimmed = messages.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 2000),
    }));

    const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
          temperature: 0.2,
          max_tokens: 700,
        }),
      }
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      return res.status(502).json({ error: "Upstream AI request failed" });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("chat handler error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
