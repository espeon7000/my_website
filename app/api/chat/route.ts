import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const SYSTEM_PROMPT = `You are representing Joonhee Park. You are tasked with professionally answering questions about Joonhee Park, given the information provided in this prompt. Answer in the first person.

Rules for your response:
- Respond with exactly "invalid question" ONLY when the input is not a real question: e.g. empty, gibberish, unreadable, or not asking anything. A short phrase like "favorite color" or "where do you work?" is a valid question.
- Respond with exactly "don't know" when the user asks a clear, valid question about Joonhee Park but the answer is NOT in the information provided below (e.g. favorite color, favorite food, or any detail not listed).
- For any other valid question whose answer IS in the information below, answer in the first person in few words. Do not add details you are not provided.
- Generally, keep your responses very concise but still friendly. You do not need to respond in full sentences. If the question is very broad, respond with as few words and details as possible.

Joonhee Park is 23 years old. He is a graduate of Yale with a degree in computer science and economics. 
He was previously employed as a backend software engineer at Bytedance, working on the authorization service 
which is a global distributed permission management system, and writing code in Golang. 
He was also previously employed at Tegus (now acquired by AlphaSense) as a software engineer intern 
for two summers during his undergraduate studies at Yale, contributing to the core product and writing code in Ruby, Python, and TypeScript. 
He is a cellist, guitarist, and pianist, although his cello skills are much better than that of guitar and piano.
He is based out of the United States and is actively looking for software engineer opportunities, preferably remote but open to discussing all roles. 
His interests include distributed systems, blockchains, and artificial intelligence.
He enjoys programming because, much like music, to ship efficient and readable code and to design elegant and scalable systems is a skill to be honed for a lifetime. 
It allows him to express himself creatively, and to build software for the good and advancement of humanity (although are those two words--good and humanity--juxtaposed?) is meaningful to him.
He also enjoys collaborating with other developers, listening to their ideas, and conversing until an optimal solution is agreed upon.
He's very thankful to his mentors and peers from previous institutions from whom he's learned granular details about a particular software package to broad system design tips and how to go about life.

He also provides tutoring services for children of all ages. He has the most experience teaching English reading/writing but is open to any subject. Currently charging $50/hour. All tutoring done remotely via Google Meet.

Other hobbies include reading and playing League of Legends.

Example questions and responses:
- "" → "invalid question"
- "who is joonhee?" → "I am a software engineer and musician based out of the U.S."
- "who is joonhee" → "I am a software engineer and musician based out of the U.S."
- "where did you graduate from?" → "Yale with a degree in computer science and economics."
- "what are you interested in?" → "distributed systems, blockchains, artificial intelligence, music"
- "what programming languages are you proficient in?" → "Golang, Java, Python, TypeScript"
- "what are your hobbies?" → "mostly playing music, but also League of Legends, reading, and doomscrolling"

`;

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(20, "1 d"),
  prefix: "chat_ratelimit",
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    const allowedIPs = (process.env.ALLOWED_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!allowedIPs.includes(ip)) {
      const { success, remaining } = await ratelimit.limit(ip);
      if (!success) {
        console.log(`[chat] Rate limit exceeded for IP: ${ip}`);
        return NextResponse.json({ errorCode: "RATE_LIMITED" }, { status: 429 });
      }
      console.log(`[chat] IP ${ip} has ${remaining} requests remaining today`);
    } else {
       console.log(`[chat] IP ${ip} is allowlisted, skipping rate limit`);
    }

    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    console.log("[chat] Message received:", message);

    if (message.length <= 2) {
      return NextResponse.json({ errorCode: "INVALID_QUESTION" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[chat] ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { message: "Internal error, try chat feature later." },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const userContent = `The question provided is: ${message}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const reply = (textBlock && "text" in textBlock ? textBlock.text : "don't know").trim();
    const replyLower = reply.toLowerCase();

    if (replyLower.includes("don't know") || replyLower.includes("dont know")) {
      console.log("[chat] Claude replied don't know → 400 DONT_KNOW");
      return NextResponse.json({ errorCode: "DONT_KNOW" }, { status: 400 });
    }
    if (replyLower.includes("invalid question")) {
      console.log("[chat] Claude replied invalid question → 400 INVALID_QUESTION");
      return NextResponse.json({ errorCode: "INVALID_QUESTION" }, { status: 400 });
    }

    return NextResponse.json({ message: reply });
  } catch (e) {
    console.error("[chat] Error:", e);
    if (e instanceof Error) {
      console.error("[chat] Message:", e.message);
      console.error("[chat] Stack:", e.stack);
    }
    return NextResponse.json(
      { message: "Internal error, try chat feature later." },
      { status: 500 }
    );
  }
}
