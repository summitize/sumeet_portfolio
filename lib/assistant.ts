import profileData from "../data/profile-data.json";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SystemMessage = {
  role: "system";
  content: string;
};

function buildProfileSummary(): string {
  const segments: string[] = [];
  segments.push(`${profileData.name} — ${profileData.headline}`);
  segments.push(profileData.summary);
  segments.push(`Contact: ${profileData.contact.email}, ${profileData.contact.phone}, ${profileData.contact.linkedin}`);
  segments.push(`Domains: ${profileData.domains.join(", ")}`);
  segments.push(`Certifications: ${profileData.certifications.join(" | ")}`);
  segments.push(`Education: ${profileData.education.map((e) => `${e.degree} (${e.year}) at ${e.institution}`).join("; ")}`);
  segments.push(`Patent: ${profileData.patent.title} — ${profileData.patent.number} (${profileData.patent.jurisdiction})`);
  segments.push(`Highlights: ${profileData.highlights.join("; ")}`);
  segments.push("Experience details:");
  for (const item of profileData.experience) {
    segments.push(`${item.company} | ${item.title} | ${item.period}`);
    segments.push(item.responsibilities.join("; "));
    if (item.accounts) {
      segments.push(`Accounts: ${item.accounts.join(", ")}`);
    }
  }
  return segments.join("\n\n");
}

export function buildAssistantMessages(
  chatHistory: ChatMessage[] = [],
  prompt: string
): Array<SystemMessage | ChatMessage> {
  const systemInstructions: SystemMessage[] = [
    {
      role: "system",
      content: `You are Sumeet Boob's professional portfolio assistant. Answer only from the provided profile JSON data and the candidate's resume content. Do not hallucinate, invent qualifications, or make up accomplishments. If the answer is not directly available in the resume or profile data, say: "I don't have enough information from the resume to answer that." Use concise, readable formatting with short paragraphs and bullet lists when helpful.`
    },
    {
      role: "system",
      content: `Use only the facts below for responses. Treat the resume as the single authoritative source.

${buildProfileSummary()}`
    }
  ];

  const historyMessages: ChatMessage[] = (chatHistory || []).map((message) => ({
    role: message.role,
    content: message.content
  }));

  return [
    ...systemInstructions,
    ...historyMessages,
    {
      role: "user",
      content: prompt
    }
  ];
}
