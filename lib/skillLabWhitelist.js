export const DOMAIN_WHITELIST = {
  BLOCKCHAIN_DEV: {
    label: 'Blockchain Development',
    keywords: ['smart contract', 'solidity', 'web3', 'dapp', 'nft erstellen', 'token launchen', 'memecoin erstellen', 'erc-20', 'hardhat', 'remix'],
    sources: ['cryptozombies.io', 'updraft.cyfrin.io', 'docs.soliditylang.org', 'docs.openzeppelin.com', 'ethereum.org/developers', 'YouTube: Patrick Collins', 'YouTube: Moralis Web3'],
    youtubeQueries: ['{skill} solidity tutorial beginner', '{skill} smart contract deploy step by step'],
  },
  CRYPTO_TRADING: {
    label: 'Crypto Trading & Spekulation',
    keywords: ['memecoins traden', 'krypto kaufen', 'altcoins', 'pump', 'on-chain', 'wallet tracken', 'handeln', 'crypto trading'],
    sources: ['glassnode.com', 'dune.com', 'defillama.com', 'coingecko.com', 'YouTube: Coin Bureau', 'YouTube: InvestAnswers', 'YouTube: Bankless'],
    youtubeQueries: ['{skill} crypto trading beginner guide', 'on-chain analysis tutorial {skill}'],
  },
  TRADING_TA: {
    label: 'Technische Analyse & Charts',
    keywords: ['charts lesen', 'candlestick', 'support resistance', 'rsi', 'macd', 'elliott wave', 'pattern recognition', 'technische analyse', 'chart pattern'],
    sources: ['tradingview.com/education', 'babypips.com/learn', 'investopedia.com/technical-analysis', 'YouTube: Trading Rush', 'YouTube: The Chart Guys'],
    youtubeQueries: ['{skill} technical analysis tutorial', 'candlestick patterns beginner {skill}'],
  },
  INVESTING: {
    label: 'Aktien & Investieren',
    keywords: ['aktien', 'etf', 'dividenden', 'value investing', 'warren buffett', 'börse', 'passives einkommen', 'vermögensaufbau'],
    sources: ['finanztip.de', 'justetf.com', 'investopedia.com', 'YouTube: Ben Felix', 'YouTube: The Plain Bagel', 'YouTube: Patrick Boyle'],
    youtubeQueries: ['ETF investing beginner {skill}', 'value investing fundamentals {skill}'],
  },
  PROGRAMMING: {
    label: 'Programmieren & Software',
    keywords: ['programmieren', 'coding', 'python', 'javascript', 'web development', 'app bauen', 'algorithmen', 'backend', 'frontend', 'full stack', 'software'],
    sources: ['theodinproject.com', 'cs50.harvard.edu', 'developer.mozilla.org', 'docs.python.org', 'roadmap.sh', 'YouTube: Fireship', 'YouTube: Traversy Media', 'YouTube: freeCodeCamp', 'YouTube: Kevin Powell'],
    youtubeQueries: ['{skill} programming tutorial beginner', '{skill} step by step project build'],
  },
  ML_AI: {
    label: 'Machine Learning & AI',
    keywords: ['machine learning', 'ki bauen', 'neural network', 'deep learning', 'data science', 'pytorch', 'tensorflow', 'llm', 'ai engineer', 'fine-tuning'],
    sources: ['fast.ai', 'huggingface.co/docs', 'kaggle.com/learn', 'YouTube: Andrej Karpathy', 'YouTube: 3Blue1Brown', 'YouTube: StatQuest'],
    youtubeQueries: ['{skill} machine learning tutorial beginner', 'neural network explained {skill}'],
  },
  DRAWING: {
    label: 'Zeichnen & Illustration',
    keywords: ['zeichnen', 'illustrieren', 'portrait', 'figure drawing', 'digital art', 'procreate', 'character design', 'comic', 'manga', 'concept art', 'skizzieren'],
    sources: ['ctrlpaint.com', 'drawabox.com', 'line-of-action.com', 'YouTube: Proko', 'YouTube: Marco Bucci', 'YouTube: Will Weston', 'YouTube: Sinix Design'],
    youtubeQueries: ['how to draw {skill} beginner tutorial Proko', '{skill} drawing fundamentals step by step'],
  },
  MUSIC_PRODUCTION: {
    label: 'Musik Produktion',
    keywords: ['musik produzieren', 'beats machen', 'ableton', 'fl studio', 'mixing', 'mastering', 'sound design', 'sampling', 'daw', 'produzieren'],
    sources: ['learningmusic.ableton.com', 'YouTube: In The Mix', 'YouTube: Produce Like A Pro', 'YouTube: Underbelly', 'YouTube: You Suck At Producing'],
    youtubeQueries: ['{skill} music production tutorial beginner', '{skill} beat making fl studio ableton'],
  },
  INSTRUMENTS: {
    label: 'Instrumente spielen',
    keywords: ['gitarre', 'klavier', 'bass', 'schlagzeug', 'ukulele', 'musiktheorie', 'noten lesen', 'akkorde', 'instrument lernen'],
    sources: ['justinguitar.com', 'musictheory.net', 'YouTube: Paul Davids', 'YouTube: Signals Music Studio', 'YouTube: Rick Beato', 'YouTube: Pianote'],
    youtubeQueries: ['{skill} beginner tutorial complete lesson', 'how to play {skill} step by step'],
  },
  LANGUAGES: {
    label: 'Sprachen lernen',
    keywords: ['spanisch', 'japanisch', 'chinesisch', 'französisch', 'englisch', 'sprache', 'vokabeln', 'fließend', 'b2', 'c1', 'language learning'],
    sources: ['languagetransfer.org', 'refold.la', 'apps.ankiweb.net', 'YouTube: Dreaming Spanish', 'YouTube: Matt vs Japan'],
    youtubeQueries: ['{skill} comprehensible input beginner', 'how to learn {skill} fluent guide'],
  },
  MARKETING: {
    label: 'Marketing & Content',
    keywords: ['marketing', 'social media', 'copywriting', 'content creation', 'youtube kanal', 'personal brand', 'viral', 'email marketing', 'tiktok', 'instagram wachsen'],
    sources: ['copyhackers.com', 'ship30for30.com', 'perell.com', 'seths.blog', 'YouTube: Alex Hormozi', 'YouTube: Creator Science'],
    youtubeQueries: ['{skill} marketing strategy tutorial', 'how to grow {skill} beginners guide'],
  },
  BUSINESS: {
    label: 'Business & Unternehmertum',
    keywords: ['startup', 'gründen', 'business idee', 'produkt launchen', 'saas', 'freelancer', 'online business', 'ecommerce', 'dropshipping', 'unternehmertum'],
    sources: ['paulgraham.com', 'indiehackers.com', 'starterstory.com', 'YouTube: Y Combinator'],
    youtubeQueries: ['{skill} startup guide how to start', '{skill} business model explained'],
  },
  FITNESS: {
    label: 'Fitness & Bewegung',
    keywords: ['krafttraining', 'muskeln aufbauen', 'abnehmen', 'calisthenics', 'kampfsport', 'laufen', 'mobilität', 'stretching', 'yoga', 'powerlifting', 'fitness'],
    sources: ['examine.com', 'startingstrength.com', 'YouTube: Jeff Nippard', 'YouTube: Alan Thrall', 'YouTube: Renaissance Periodization', 'YouTube: Tom Merrick'],
    youtubeQueries: ['{skill} workout tutorial beginner full guide', 'how to train {skill} properly'],
  },
  DESIGN: {
    label: 'Design (UI/UX, Grafik, Video)',
    keywords: ['figma', 'ui design', 'ux', 'logo erstellen', 'grafik design', 'video schneiden', 'after effects', 'premiere', 'motion design', 'canva'],
    sources: ['help.figma.com', 'nngroup.com', 'motiondesign.school', 'YouTube: Juxtopposed', 'YouTube: DesignCourse', 'YouTube: The Futur'],
    youtubeQueries: ['{skill} design tutorial beginner figma', 'how to {skill} step by step'],
  },
  SCIENCE_MATH: {
    label: 'Wissenschaft & Mathematik',
    keywords: ['mathe', 'statistik', 'biologie', 'physik', 'chemie', 'calculus', 'datenanalyse', 'sql', 'excel', 'python daten', 'algebra'],
    sources: ['khanacademy.org', 'ocw.mit.edu', 'mode.com/sql-tutorial', 'YouTube: 3Blue1Brown', 'YouTube: StatQuest', 'YouTube: Khan Academy'],
    youtubeQueries: ['{skill} explained beginners 3blue1brown', '{skill} math tutorial visual'],
  },
  PSYCHOLOGY: {
    label: 'Psychologie & Kognition',
    keywords: ['psychologie', 'verhaltensökonomik', 'habits', 'motivation', 'biases', 'kognition', 'lernen lernen', 'gedächtnis', 'manipulationen'],
    sources: ['YouTube: Huberman Lab', 'YouTube: Veritasium', 'YouTube: Sprouts', 'coursera.org (Learning How to Learn)', 'ncase.me'],
    youtubeQueries: ['{skill} psychology science explained', 'how to {skill} neuroscience evidence'],
  },
};

export function detectDomain(input) {
  if (!input) return null;
  const lower = input.toLowerCase();
  for (const [domainKey, domain] of Object.entries(DOMAIN_WHITELIST)) {
    if (domain.keywords.some(kw => lower.includes(kw))) {
      return domainKey;
    }
  }
  return null;
}
