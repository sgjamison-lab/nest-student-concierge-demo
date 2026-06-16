const { seedArticles } = require("./seed");
const { studentRetentionSupport } = require("./support");

const privatePatterns = [
  /\b(my|individual|personal)\s+(grades?|gpa|balances?|sap|awards?|accounts?|holds?|conduct|records?|schedules?|status)\b/i,
  /\bhow much (do i owe|aid did i get)\b/i,
  /\bshow( me)?\b.*\b(grades?|balances?|records?|schedules?|status|awards?)\b/i,
  /\b(have i|did i|am i)\b.*\b(met|completed|eligible|graduate|graduation requirements?)\b/i,
  /\b(disability records?|advising notes?|conduct records?)\b/i
];

const urgentPatterns = [/\bsuicid/i, /\bself[- ]?harm\b/i, /\b(kill|hurt|harm) myself\b/i, /\blife[- ]threatening\b/i];
const stopWords = new Set(["a", "an", "and", "are", "about", "can", "do", "does", "for", "how", "i", "in", "is", "it", "me", "my", "of", "on", "the", "to", "what", "when", "where", "who", "with"]);

function tokenize(text) {
  return [...new Set(String(text).toLowerCase().match(/[a-z0-9]+/g) || [])]
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function searchKnowledgeBase(query, articles = seedArticles, limit = 3) {
  const terms = tokenize(query);
  return articles
    .filter((article) => article.status === "published")
    .map((article) => {
      const title = article.title.toLowerCase();
      const category = article.category.toLowerCase();
      const summary = article.summary.toLowerCase();
      const haystack = `${article.title} ${article.category} ${article.summary} ${article.content} ${article.office}`.toLowerCase();
      const score = terms.reduce((total, term) => {
        if (!haystack.includes(term)) return total;
        return total + (title.includes(term) ? 4 : 0) + (category.includes(term) ? 2 : 0) + (summary.includes(term) ? 2 : 0) + 1;
      }, 0);
      return { ...article, score };
    })
    .filter((article) => article.score >= 3)
    .sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

function classifyQuestion(question) {
  if (urgentPatterns.some((pattern) => pattern.test(question))) return "urgent";
  if (privatePatterns.some((pattern) => pattern.test(question))) return "private";
  return "general";
}

function buildAnswer(question, articles = seedArticles) {
  const classification = classifyQuestion(question);
  if (classification === "urgent") {
    return {
      status: "safety",
      answer: "If you or someone else may be in immediate danger, call 911 now. For urgent mental health support, call or text 988. I can also help you find campus support resources, but I cannot provide medical or mental health advice.",
      sources: [],
      contact: { office: "Emergency Support", url: "tel:911" },
      escalate: true
    };
  }
  if (classification === "private") {
    return {
      status: "private",
      answer: "I cannot access or display private student records. Please use the secure area of The Nest or contact the responsible office for help with your individual information.",
      sources: [],
      contact: { office: "The Nest Help Desk", url: "/nest/help" },
      escalate: true
    };
  }

  let results = searchKnowledgeBase(question, articles);
  if (/\b(phone number|contact number|email address|call|reach)\b/i.test(question)) {
    const directory = articles.find((article) => article.id === "kb-campus-office-directory" && article.status === "published");
    if (directory) {
      results = [directory, ...results.filter((article) => article.id !== directory.id)];
    }
  }
  if (!results.length) {
    return {
      status: "unknown",
      answer: "I could not find a reliable answer in the approved Nest resources. I can connect you with Student Retention Services.",
      sources: [],
      contact: { office: studentRetentionSupport.office, url: studentRetentionSupport.emailUrl },
      supportOptions: studentRetentionSupport,
      escalate: true
    };
  }

  const best = results[0];
  return {
    status: "answered",
    answer: best.content,
    sources: results.map(({ id, title, sourceUrl, updatedAt }) => ({ id, title, sourceUrl, updatedAt })),
    contact: { office: best.office, url: best.contactUrl },
    escalate: false
  };
}

module.exports = { buildAnswer, classifyQuestion, searchKnowledgeBase, tokenize };
