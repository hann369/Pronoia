// lib/compoundData.js — Centralized Nootropics Database (Migrated from Metacognition)

export const CATEGORIES = {
  Racetams: '🧠 Racetams',
  Cholinergics: '⚡ Cholinergics',
  Stimulants: '🔋 Stimulants',
  Adaptogens: '🌿 Adaptogens',
  Miscellaneous: '🧩 Misc',
  GABAergics: '💤 GABAergics',
  Neurosteroids: '🪐 Neurosteroids',
  NovelStimulants: '⚡ Novel Stimulants',
  NovelCompounds: '🧪 Novel Compounds',
  MetabolismModulators: '🧬 Metabolism',
  VestibularAgents: '🦻 Vestibular'
};

export const compounds = [
  // === RACETAMS ===
  {
    name: "Piracetam",
    cid: 4843,
    category: "Racetams",
    description: "The original racetam. Enhances memory formation and learning ability.",
    benefits: ["Memory", "Learning", "Neuroprotection", "Cognitive enhancement"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=4843&t=l",
    dosage: "Standard: 1200–2400 mg daily (3 doses)\nTypical: 800 mg 2–3 times daily\nLoading: 4800 mg for first 2 weeks",
    mechanisms: "Modulates membrane fluidity and enhances synaptic plasticity. Improves blood flow and oxygen utilization in the brain. Exact mechanism still being researched.",
    sideEffects: ["Headache", "Nervousness", "Insomnia (rare)", "Weight gain (rare)"],
    halfLife: "5 hours",
    onsetTime: "1–2 weeks (builds up gradually)",
    duration: "Repeated dosing required",
    warnings: [
      "⚠️ Takes 2–4 weeks to notice benefits",
      "⚠️ Limited FDA approval — approved as nootropic in Europe",
      "⚠️ Generally well-tolerated; minimal side effects",
      "⚠️ Interacts with anticoagulants — consult doctor",
      "⚠️ Not recommended during lactation"
    ],
    researchLinks: [
      { title: "Piracetam: Clinical use cases and evidence review", url: "https://pubmed.ncbi.nlm.nih.gov/16007238/", type: "review" },
      { title: "Piracetam compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/4843", type: "review" },
      { title: "Meta-analysis on Piracetam efficacy in cognitive decline", url: "https://www.sciencedirect.com/science/article/abs/pii/S0303846724002452", type: "review" }
    ]
  },
  {
    name: "Aniracetam",
    cid: 2250,
    category: "Racetams",
    description: "Fast-acting ampakine racetam with anxiolytic properties.",
    benefits: ["Enhanced cognition", "Reduced anxiety", "Improved memory consolidation", "Mood enhancement"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=2250&t=l",
    dosage: "Standard: 750–1500 mg (2–3× daily)\nMax: 3000 mg/day",
    mechanisms: "AMPA receptor positive allosteric modulator, weak mGluR2 agonist, PDE inhibition.",
    sideEffects: ["Headache (cholinergic)", "GI upset", "Insomnia (high doses)"],
    halfLife: "1–2 hours",
    onsetTime: "30–60 minutes",
    duration: "2–4 hours",
    warnings: [
      "⚠️ Short half-life requires multiple daily doses",
      "⚠️ May cause insomnia if taken late in day",
      "⚠️ Often stacked with choline source",
      "⚠️ Limited human studies despite decades of use",
      "⚠️ Fat-soluble — take with food for better absorption"
    ],
    researchLinks: [
      { title: "Aniracetam: Novel therapeutic potential in cerebral dysfunctional disorders", url: "https://pubmed.ncbi.nlm.nih.gov/12070527/", type: "review" },
      { title: "Clinical efficacy of aniracetam in patients with cognitive impairment (276-patient study)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6493642/", type: "rct" },
      { title: "Aniracetam: Evidence-based model for Alzheimer's prevention (PMC)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11091568/", type: "review" },
      { title: "Aniracetam compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/2250", type: "review" }
    ]
  },
  {
    name: "Coluracetam",
    cid: 2729,
    category: "Racetams",
    description: "Potent racetam with unique high-affinity choline uptake enhancement properties.",
    benefits: ["Memory enhancement", "Mood improvement", "Visual acuity", "Neuroprotection"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=2729&t=l",
    dosage: "Standard: 20–80 mg daily (divided doses)\nMax: 240 mg daily (split into 3 doses)",
    mechanisms: "Enhances high-affinity choline uptake (HACU) in neurons — the rate-limiting step of acetylcholine synthesis. Also modulates AMPA receptors.",
    sideEffects: ["Headache (cholinergic)", "GI upset", "Insomnia (high doses)"],
    halfLife: "1–2 hours",
    onsetTime: "30–60 minutes",
    duration: "4–6 hours",
    warnings: [
      "⚠️ Potent cholinergic — start with low dose",
      "⚠️ Possible unpleasant taste",
      "⚠️ Stack with a choline source to prevent depletion"
    ],
    researchLinks: [
      { title: "MKC-231 enhances HACU and ameliorates memory deficits in AF64A-treated rats", url: "https://pubmed.ncbi.nlm.nih.gov/8740080/", type: "animal" },
      { title: "Coluracetam — Wikipedia (mechanism, clinical trials overview)", url: "https://en.wikipedia.org/wiki/Coluracetam", type: "review" },
      { title: "Coluracetam compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/2729", type: "review" }
    ]
  },
  
  // === CHOLINERGICS ===
  {
    name: "Alpha-GPC",
    cid: 71920,
    category: "Cholinergics",
    description: "Highly bioavailable choline source that boosts acetylcholine levels.",
    benefits: ["Memory", "Power output", "Growth hormone", "Learning capacity"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=71920&t=l",
    dosage: "Standard: 600 mg daily (2 × 300 mg)\nPerformance: 600–1200 mg daily\nTypical timing: Morning and pre-workout",
    mechanisms: "Provides choline that crosses blood-brain barrier for acetylcholine synthesis. Enhances neuroplasticity and cognitive function. Athletes report improved power output.",
    sideEffects: ["Headache (from increased acetylcholine)", "Insomnia (if taken late)", "Nausea (rare)"],
    halfLife: "4 hours",
    onsetTime: "30–60 minutes",
    duration: "4–6 hours",
    warnings: [
      "⚠️ Monitor acetylcholine sensitivity — some experience headaches",
      "⚠️ Take in morning/early afternoon to avoid sleep disruption",
      "⚠️ May interact with acetylcholinesterase inhibitors",
      "✓ SAFE: Generally well-tolerated with minimal side effects"
    ],
    researchLinks: [
      { title: "Alpha-GPC and motivation/cognitive performance (PMC)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8235064/", type: "rct" },
      { title: "Alpha-GPC cognitive performance enhancement — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/39683633/", type: "rct" },
      { title: "Alpha-GPC compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/71920", type: "review" }
    ]
  },
  {
    name: "Citicoline Sodium",
    cid: 169272,
    category: "Cholinergics",
    description: "Precursor to phosphatidylcholine and acetylcholine, supporting brain health and cognition.",
    benefits: ["Cognitive enhancement", "Neuroprotection", "Memory support", "Increased focus"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=169272&t=l",
    dosage: "Standard: 250–500 mg daily\nTherapeutic: up to 2000 mg daily (divided doses)",
    mechanisms: "Provides choline for acetylcholine synthesis, supports phospholipid production for neuronal membranes, enhances cerebral blood flow and increases SIRT1 expression.",
    sideEffects: ["GI upset", "Headache", "Insomnia (rare)", "Dizziness (rare)"],
    halfLife: "56 hours (choline metabolites)",
    onsetTime: "30–60 minutes",
    duration: "4–6 hours",
    warnings: [
      "⚠️ Possible diarrhea at high doses",
      "⚠️ Possible abdominal pain",
      "✓ One of the safest and best-studied choline sources"
    ],
    researchLinks: [
      { title: "Citicoline improves episodic memory in healthy older adults — RCT (n=100)", url: "https://pubmed.ncbi.nlm.nih.gov/33978188/", type: "rct" },
      { title: "Role of citicoline in mild cognitive impairment (PMC review)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9936398/", type: "review" },
      { title: "CDP-choline for cognitive disturbances in the elderly — Cochrane review", url: "https://pubmed.ncbi.nlm.nih.gov/15106147/", type: "review" },
      { title: "Citicoline compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/169272", type: "review" }
    ]
  },
  
  // === STIMULANTS ===
  {
    name: "Caffeine",
    cid: 2519,
    category: "Stimulants",
    description: "Central nervous system stimulant that temporarily wards off drowsiness and restores alertness.",
    benefits: ["Increased alertness", "Improved focus", "Enhanced physical performance"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=2519&t=l",
    dosage: "Single dose: 50–200 mg\nDaily limit: 400 mg (healthy adults)\nOptimal: 100–200 mg for focus",
    mechanisms: "Antagonizes adenosine receptors in the brain, blocking the accumulation of adenosine which promotes sleep. Also increases dopamine and norepinephrine release.",
    sideEffects: ["Jitteriness", "Anxiety", "Sleep disruption", "Increased heart rate", "Dependency with regular use"],
    halfLife: "5–6 hours",
    onsetTime: "15–45 minutes",
    duration: "4–6 hours",
    warnings: [
      "⚠️ Max 400 mg daily (healthy adults) — WHO guidance",
      "⚠️ Avoid after 2 PM to prevent sleep issues",
      "⚠️ Can increase anxiety in sensitive individuals",
      "⚠️ Not recommended with heart conditions",
      "⚠️ Withdrawal headaches possible after regular use"
    ],
    researchLinks: [
      { title: "Caffeine and cognitive performance — comprehensive review (PMC)", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8277884/", type: "review" },
      { title: "Caffeine compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/2519", type: "review" },
      { title: "How much caffeine is too much? — Mayo Clinic", url: "https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating/in-depth/caffeine/art-20045678", type: "review" }
    ]
  },
  {
    name: "Modafinil",
    cid: 4236,
    category: "Stimulants",
    description: "Prescription wakefulness-promoting agent used for narcolepsy and cognitive enhancement.",
    benefits: ["Wakefulness", "Focus", "Executive function", "Sustained energy"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=4236&t=l",
    dosage: "Medical: 100–200 mg daily (prescription only)\nOff-label cognitive: 100 mg\nNote: Requires prescription in most countries",
    mechanisms: "Selective dopamine reuptake inhibitor with wakefulness-promoting properties. Increases hypothalamic histamine and orexin levels. Mechanism distinct from amphetamines.",
    sideEffects: ["Headache", "Nausea", "Insomnia", "Anxiety", "Tolerance develops"],
    halfLife: "12–15 hours",
    onsetTime: "30–60 minutes",
    duration: "12–15 hours",
    warnings: [
      "⚠️ PRESCRIPTION REQUIRED — not OTC in most countries",
      "⚠️ Risk of tolerance with daily use — consider cycling",
      "⚠️ Can cause anxiety and insomnia in sensitive individuals",
      "⚠️ Cardiovascular effects possible — monitor heart rate",
      "⚠️ Avoid combining with other stimulants (caffeine, amphetamines)",
      "⚠️ Not recommended for people with hypertension or cardiac arrhythmias"
    ],
    researchLinks: [
      { title: "Modafinil and orexin neurotransmitter systems — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/30468674/", type: "review" },
      { title: "Modafinil compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/4236", type: "review" },
      { title: "Modafinil cognitive effects in healthy non-sleep-deprived subjects", url: "https://pubmed.ncbi.nlm.nih.gov/31828767/", type: "rct" }
    ]
  },
  {
    name: "4F-Phenibut",
    cid: 71680,
    category: "GABAergics",
    description: "Fluorinated derivative of Phenibut with stronger anxiolytic and nootropic effects.",
    benefits: ["Anxiety reduction", "Social confidence", "Enhanced mood", "Improved sleep"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=71680&t=l",
    dosage: "Start: 100–250 mg\nStandard: 250–500 mg\nMax: 1000 mg (careful — long half-life)",
    mechanisms: "GABA-B receptor agonist with higher lipophilicity than Phenibut. Crosses blood-brain barrier more effectively.",
    sideEffects: ["Tolerance development", "Withdrawal symptoms", "Dependence risk", "Morning grogginess"],
    halfLife: "8–12 hours",
    onsetTime: "45–90 minutes",
    duration: "6–10 hours",
    warnings: [
      "⚠️ HIGH DEPENDENCE RISK — limit use to occasional",
      "⚠️ TOLERANCE BUILDS QUICKLY — requires breaks",
      "⚠️ WITHDRAWAL CAN BE SEVERE — taper slowly",
      "⚠️ NOT APPROVED FOR MEDICAL USE ANYWHERE",
      "⚠️ AVOID ALCOHOL COMPLETELY"
    ],
    researchLinks: [
      { title: "Phenibut: Pharmacology and toxicology review — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/27261727/", type: "review" },
      { title: "4F-Phenibut compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/71680", type: "review" }
    ]
  },
  {
    name: "9-Me-BC",
    cid: "9MeBC_placeholder",
    category: "NovelStimulants",
    description: "9-Methyl-β-carboline, a beta-carboline derivative with dopaminergic and neuroprotective properties.",
    benefits: ["Dopaminergic stimulation", "Enhanced focus", "Potential neuroprotection", "Increased energy"],
    image: "https://placehold.co/300x200/1A1A18/F5F0E8?text=9-Me-BC",
    dosage: "Warning: Extremely potent!\nThreshold: 5–10 mg\nLight: 10–20 mg\nStrong: 20–40 mg",
    mechanisms: "Inhibits MAO-A and MAO-B. Promotes dopaminergic neuron differentiation and may enhance BDNF. Research primarily preclinical.",
    sideEffects: ["Cardiovascular stress", "Anxiety", "Insomnia", "Potential neurotoxicity at high doses"],
    halfLife: "Unknown",
    onsetTime: "15–30 minutes",
    duration: "2–4 hours",
    warnings: [
      "⚠️ EXTREMELY POTENT — start with microdoses",
      "⚠️ CARDIOVASCULAR RISK — monitor heart rate/blood pressure",
      "⚠️ LEGAL STATUS VARIES BY COUNTRY",
      "⚠️ LIMITED RESEARCH — primarily animal models",
      "⚠️ MAO inhibitory activity — avoid tyramine-rich foods"
    ],
    researchLinks: [
      { title: "9-Methyl-β-carboline: Dopaminergic neuroprotection in vitro — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/19545594/", type: "animal" },
      { title: "Beta-carboline neuropharmacology review — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/17499863/", type: "review" }
    ]
  },
  {
    name: "Bromantane",
    cid: "bromantane_placeholder",
    category: "Adaptogens",
    description: "Russian nootropic/adaptogen with mild stimulant and anabolic properties.",
    benefits: ["Physical performance", "Mental clarity", "Stress resistance", "Immune support"],
    image: "https://placehold.co/300x200/1A1A18/F5F0E8?text=Bromantane",
    dosage: "Standard: 50–100 mg daily\nAthletic: 100–200 mg (split doses)",
    mechanisms: "Dopamine/serotonin system modulation, weak MAO inhibition, adaptogenic stress response. Enhances synthesis of dopamine via tyrosine hydroxylase upregulation.",
    sideEffects: ["GI upset", "Insomnia", "Increased heart rate", "Potential liver stress"],
    halfLife: "Unknown",
    onsetTime: "30–60 minutes",
    duration: "4–6 hours",
    warnings: [
      "⚠️ LEGAL STATUS VARIES BY COUNTRY",
      "⚠️ LIMITED WESTERN RESEARCH AVAILABLE",
      "⚠️ MAY CAUSE INSOMNIA — AVOID EVENING USE",
      "⚠️ QUALITY CONTROL ISSUES WITH SUPPLEMENTS",
      "⚠️ NOT SUITABLE FOR THOSE WITH HEART CONDITIONS"
    ],
    researchLinks: [
      { title: "Bromantane pharmacological effects and toxicity — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/9463785/", type: "animal" },
      { title: "Adamantane derivatives as CNS stimulants — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/9884868/", type: "review" }
    ]
  },
  
  // === ADAPTOGENS ===
  {
    name: "L-Theanine",
    cid: 228398,
    category: "Adaptogens",
    description: "Found in green tea. Promotes calm, focused energy without drowsiness.",
    benefits: ["Calm Focus", "Relaxation", "Better sleep", "Reduced anxiety"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=228398&t=l",
    dosage: "Standard: 100–200 mg (1–3× daily)\nWith caffeine: 100 mg L-theanine + 50–100 mg caffeine\nEvening: 200 mg for sleep",
    mechanisms: "Increases alpha brain wave activity promoting relaxation. Modulates glutamate and GABA neurotransmission. Works synergistically with caffeine for 'smooth' focus.",
    sideEffects: ["Mild headache (rare)", "Nausea (high doses)", "Dizziness (rare)"],
    halfLife: "1 hour",
    onsetTime: "30–60 minutes",
    duration: "8–10 hours",
    warnings: [
      "✓ SAFE: One of the safest nootropics available",
      "✓ NO WITHDRAWAL OR DEPENDENCY RISK",
      "⚠️ BEST COMBINED WITH CAFFEINE (2:1 ratio theanine:caffeine)",
      "⚠️ SLIGHT NAUSEA POSSIBLE AT DOSES >500 MG",
      "✓ SAFE DURING PREGNANCY (verified by FDA)"
    ],
    researchLinks: [
      { title: "L-Theanine effect on mental state and stress response — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/18296328/", type: "rct" },
      { title: "L-Theanine effects on stress-related symptoms and cognitive function", url: "https://pubmed.ncbi.nlm.nih.gov/31623400/", type: "rct" },
      { title: "L-Theanine compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/439378", type: "review" }
    ]
  },
  {
    name: "Bacopa Monnieri",
    cid: 119032,
    category: "Adaptogens",
    description: "Ayurvedic herb used for centuries to enhance memory and reduce anxiety.",
    benefits: ["Memory", "Neuroprotection", "Reduced anxiety", "Processing speed"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=119032&t=l",
    dosage: "Standard extract: 300–600 mg daily (50% bacosides)\nTypical: 300 mg 2× daily\nDuration: 12+ weeks for full benefits",
    mechanisms: "Enhances neurotransmitter signaling via bacosides content. Reduces acetylcholinesterase activity. Antioxidant and anti-inflammatory neuroprotection. Improves dendritic growth.",
    sideEffects: ["Nausea (mild)", "Fatigue (initially)", "Digestive issues (rare)", "Diarrhea (with high doses)"],
    halfLife: "Variable — herbal compound",
    onsetTime: "2–4 weeks (gradual buildup)",
    duration: "Cumulative benefits over months",
    warnings: [
      "✓ SAFE: Used traditionally for 3000+ years",
      "⚠️ REQUIRES 12+ WEEKS FOR FULL MEMORY BENEFITS — be patient",
      "⚠️ TAKE WITH MEALS TO REDUCE GI IRRITATION",
      "⚠️ MAY INCREASE THYROID HORMONE LEVELS — monitor if hypothyroid",
      "✓ NO DEPENDENCY OR WITHDRAWAL RISK",
      "⚠️ PREGNANCY/LACTATION — consult healthcare provider"
    ],
    researchLinks: [
      { title: "Bacopa monnieri: Preclinical and clinical evidence of neuroactive effects — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/40507208/", type: "review" },
      { title: "Effects of standardized Bacopa extract on cognitive performance — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/18611150/", type: "rct" },
      { title: "Bacopa monnieri compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/119032", type: "review" }
    ]
  },
  
  // === MISCELLANEOUS ===
  {
    name: "Agmatine Sulfate",
    cid: 441792,
    category: "Miscellaneous",
    description: "Endogenous polyamine with NMDA antagonist and imidazoline receptor agonist properties.",
    benefits: ["Pain relief", "Neuroprotection", "Improved recovery", "Mood enhancement"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=441792&t=l",
    dosage: "Standard: 500–750 mg daily\nTherapeutic: 1000–2500 mg (divided doses)",
    mechanisms: "NMDA antagonist, imidazoline receptor agonist, nitric oxide modulator. Antioxidant, anti-apoptotic, and anti-inflammatory. Crosses the blood-brain barrier.",
    sideEffects: ["GI upset (high doses)", "Blood pressure changes", "Dizziness"],
    halfLife: "2–4 hours",
    onsetTime: "30–60 minutes",
    duration: "4–6 hours",
    warnings: [
      "✓ GENERALLY SAFE AT MODERATE DOSES",
      "⚠️ CAN LOWER BLOOD PRESSURE SIGNIFICANTLY",
      "⚠️ MAY INTERACT WITH MAOIs",
      "⚠️ EFFECT VARIES GREATLY BETWEEN INDIVIDUALS",
      "⚠️ BEST TAKEN AWAY FROM PROTEIN (arginine competition)"
    ],
    researchLinks: [
      { title: "Neuroprotective role of agmatine in neurological diseases — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/28786346/", type: "review" },
      { title: "Pharmacological profile of agmatine: comprehensive overview — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/38608401/", type: "review" },
      { title: "Agmatine neuroprotection — antioxidant and anti-inflammatory (Parkinson's model)", url: "https://pubmed.ncbi.nlm.nih.gov/30001633/", type: "animal" },
      { title: "Agmatine compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/441792", type: "review" }
    ]
  },
  {
    name: "Allopregnanolone",
    cid: 5994,
    category: "Neurosteroids",
    description: "Endogenous neurosteroid with potent GABA-A positive allosteric modulation.",
    benefits: ["Anti-anxiety", "Antidepressant", "Neurogenesis", "Stress resilience"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=5994&t=l",
    dosage: "Prescription only (Zuranolone/Zulresso): clinical dosing only.\nResearch use: experimental",
    mechanisms: "Positive allosteric modulator of GABA-A receptors, especially delta-subunit containing ones. Promotes neurogenesis in the hippocampus.",
    sideEffects: ["Sedation", "Dizziness", "Headache", "Potential paradoxical reactions"],
    halfLife: "Hours (varies by route)",
    onsetTime: "Minutes (IV/IM) to hours (oral)",
    duration: "Varies by formulation",
    warnings: [
      "⚠️ PRESCRIPTION MEDICATION ONLY",
      "⚠️ PARADOXICAL REACTIONS POSSIBLE (increased anxiety/depression)",
      "⚠️ SEDATING — avoid driving/operating machinery",
      "⚠️ PREGNANCY CATEGORY X — contraindicated in pregnancy",
      "⚠️ EXPENSIVE AND DIFFICULT TO OBTAIN LEGALLY"
    ],
    researchLinks: [
      { title: "FDA approval announcement for Zulresso (brexanolone/allopregnanolone)", url: "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/fda-approves-first-treatment-postpartum-depression", type: "review" },
      { title: "Allopregnanolone and neurogenesis — PubMed review", url: "https://pubmed.ncbi.nlm.nih.gov/16631126/", type: "review" },
      { title: "Allopregnanolone compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/5994", type: "review" }
    ]
  },
  {
    name: "Aticaprant",
    cid: "aticaprant_placeholder",
    category: "NovelCompounds",
    description: "Investigational kappa-opioid receptor antagonist for depression and anhedonia.",
    benefits: ["Antidepressant", "Anxiolytic", "Reduced anhedonia", "Improved resilience"],
    image: "https://placehold.co/300x200/1A1A18/F5F0E8?text=Aticaprant",
    dosage: "Clinical trial doses: 10–40 mg daily",
    mechanisms: "Kappa-opioid receptor (KOR) antagonist. Blocks the dynorphin/KOR pathway associated with stress-induced depression and anhedonia.",
    sideEffects: ["Headache", "Nausea", "Somnolence", "Dry mouth"],
    halfLife: "~8 hours",
    onsetTime: "1–2 hours",
    duration: "Once daily dosing",
    warnings: [
      "⚠️ NOT APPROVED FOR SALE — investigational only",
      "⚠️ LIMITED HUMAN DATA AVAILABLE",
      "⚠️ MAY INTERFERE WITH NORMAL STRESS ADAPTATION",
      "⚠️ EXPENSIVE AND DIFFICULT TO OBTAIN"
    ],
    researchLinks: [
      { title: "Aticaprant Phase 2 trial in MDD with anhedonia — ClinicalTrials.gov", url: "https://clinicaltrials.gov/study/NCT04445792", type: "rct" },
      { title: "Kappa-opioid antagonists for depression — PubMed review", url: "https://pubmed.ncbi.nlm.nih.gov/31356898/", type: "review" }
    ]
  },
  {
    name: "Betahistine Mesylate",
    cid: 3928,
    category: "VestibularAgents",
    description: "Histamine H3 receptor antagonist used for vertigo and Ménière's disease.",
    benefits: ["Reduces vertigo episodes", "Improves balance", "Decreases tinnitus", "Enhances cerebral circulation"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=3928&t=l",
    dosage: "Standard: 16–48 mg daily (divided doses)\nAcute: up to 144 mg/day under supervision",
    mechanisms: "H3 receptor antagonist increases histamine release in the vestibular nuclei; H1 agonist effects improve cochlear blood flow.",
    sideEffects: ["GI upset", "Headache", "Drowsiness", "Itching"],
    halfLife: "3–4 hours",
    onsetTime: "30–60 minutes",
    duration: "4–6 hours",
    warnings: [
      "✓ GENERALLY SAFE AND WELL-TOLERATED",
      "⚠️ CONTAINS MESYLATE SALT — sulfite-sensitive individuals beware",
      "⚠️ CAN CAUSE DROWSINESS — avoid driving initially",
      "⚠️ MAY INTERACT WITH MAOIs",
      "⚠️ NOT EFFECTIVE FOR EVERYONE — genetic factors involved"
    ],
    researchLinks: [
      { title: "Betahistine for Ménière's disease — Cochrane review", url: "https://pubmed.ncbi.nlm.nih.gov/27578267/", type: "review" },
      { title: "Betahistine compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/3928", type: "review" }
    ]
  },
  {
    name: "Brexpiprazole",
    cid: 9870407,
    category: "NovelCompounds",
    description: "Partial dopamine D2/D3 and serotonin 5-HT1A agonist with antipsychotic and antidepressant properties.",
    benefits: ["Antipsychotic", "Antidepressant adjunct", "Anxiolytic", "Improved motivation"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=9870407&t=l",
    dosage: "Starting: 0.5–1 mg daily\nMaintenance: 2–4 mg daily\nMax: 4 mg daily",
    mechanisms: "Partial D2/D3 agonist, 5-HT1A partial agonist, 5-HT2A antagonist, α1/α2 adrenergic antagonist.",
    sideEffects: ["Akathisia", "Weight gain", "Sedation", "Hyperprolactinemia"],
    halfLife: "96 hours (long acting)",
    onsetTime: "1–2 weeks for full effect",
    duration: "Once daily",
    warnings: [
      "⚠️ PRESCRIPTION MEDICATION ONLY",
      "⚠️ RISK OF TARDIVE DYSKINESIA WITH LONG-TERM USE",
      "⚠️ CAN INCREASE MORTALITY IN ELDERLY WITH DEMENTIA",
      "⚠️ MAY WORSEN DEPRESSION INITIALLY",
      "⚠️ REQUIRES GRADUAL TITRATION"
    ],
    researchLinks: [
      { title: "Brexpiprazole clinical efficacy and tolerability — PubMed review", url: "https://pubmed.ncbi.nlm.nih.gov/26696182/", type: "review" },
      { title: "Brexpiprazole compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/9870407", type: "review" }
    ]
  },
  {
    name: "Cerebrolysin",
    cid: "cerebrolysin_placeholder",
    category: "NovelCompounds",
    description: "Neurotrophic peptide mixture derived from pig brain, promoting neuronal growth and repair.",
    benefits: ["Neuroprotection", "Cognitive enhancement", "Stroke recovery", "Neuroplasticity"],
    image: "https://placehold.co/300x200/1A1A18/F5F0E8?text=Cerebrolysin",
    dosage: "Clinical: 10–30 mL IV/IM daily for 10–20 days\nResearch: 5–10 mL subcutaneous",
    mechanisms: "Contains neurotrophic factors (BDNF, NGF, GDNF mimetics), enhances neuronal metabolism and protects against oxidative stress.",
    sideEffects: ["Injection site reactions", "Flushing", "Metallic taste", "Rare allergic reactions"],
    halfLife: "Hours (peptide degradation)",
    onsetTime: "Days to weeks (cumulative)",
    duration: "Multiple injections needed",
    warnings: [
      "⚠️ PRESCRIPTION/CLINICAL USE ONLY",
      "⚠️ EXPENSIVE AND DIFFICULT TO OBTAIN LEGALLY",
      "⚠️ MUST BE ADMINISTERED BY INJECTION",
      "⚠️ RISK OF CONTAMINATION WITH GREY MARKET PRODUCTS",
      "⚠️ EFFECTS VARY GREATLY BETWEEN INDIVIDUALS"
    ],
    researchLinks: [
      { title: "Cerebrolysin for acute ischemic stroke — systematic review (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/34156130/", type: "review" },
      { title: "Cerebrolysin in traumatic brain injury — RCT evidence", url: "https://pubmed.ncbi.nlm.nih.gov/20976350/", type: "rct" }
    ]
  },
  {
    name: "Chlodantan",
    cid: "chlodantan_placeholder",
    category: "NovelCompounds",
    description: "Derivative of Bromantane with enhanced stimulant and anxiolytic properties.",
    benefits: ["Stimulant effects", "Anxiolytic properties", "Improved focus"],
    image: "https://placehold.co/300x200/1A1A18/F5F0E8?text=Chlodantan",
    dosage: "Orally or sublingually: 50 mg once daily",
    mechanisms: "Modulates dopaminergic and serotonergic neurotransmitter systems, enhancing alertness and reducing anxiety. Shares structural features with Bromantane.",
    sideEffects: ["Mild headaches", "Gum irritation (sublingual)"],
    halfLife: "Likely 10–15 h (estimated)",
    onsetTime: "30–90 minutes",
    duration: "8–12 hours (estimated)",
    warnings: [
      "⚠️ RESEARCH CHEMICAL — not approved anywhere",
      "⚠️ VERY LITTLE HUMAN RESEARCH",
      "⚠️ UNKNOWN TOXICITY PROFILE"
    ],
    researchLinks: [
      { title: "Bromantane pharmacology (parent compound reference) — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/9463785/", type: "animal" }
    ]
  },
  {
    name: "Cetilistat",
    cid: 5311111,
    category: "MetabolismModulators",
    description: "Pancreatic lipase inhibitor reducing fat absorption for weight management.",
    benefits: ["Weight loss", "Fat malabsorption", "Cholesterol improvement", "Glycemic control"],
    image: "https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=5311111&t=l",
    dosage: "Standard: 60 mg three times daily with meals\nMax: 120 mg three times daily",
    mechanisms: "Reversible pancreatic lipase inhibitor preventing triglyceride hydrolysis in intestines.",
    sideEffects: ["GI distress", "Oily spotting", "Flatulence", "Fat-soluble vitamin deficiency (long-term)"],
    halfLife: "1–2 hours",
    onsetTime: "Immediately with meal",
    duration: "Meal-dependent action",
    warnings: [
      "⚠️ PRESCRIPTION MEDICATION in most countries",
      "⚠️ REQUIRES FAT-SOLUBLE VITAMIN SUPPLEMENTATION",
      "⚠️ GI SIDE EFFECTS COMMON — dietary fat reduction helps",
      "⚠️ MAY INTERFERE WITH OTHER MEDICATION ABSORPTION",
      "⚠️ NOT EFFECTIVE WITHOUT DIETARY CHANGES"
    ],
    researchLinks: [
      { title: "Cetilistat vs orlistat for obesity — Phase II RCT (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/17978390/", type: "rct" },
      { title: "Cetilistat compound entry — PubChem", url: "https://pubchem.ncbi.nlm.nih.gov/compound/5311111", type: "review" }
    ]
  },
  {
    name: "Dihexa",
    cid: "dihexa_placeholder",
    category: "NovelCompounds",
    description: "Experimental peptide with potent neurotrophic effects, derived from angiotensin IV.",
    benefits: ["Neuroprotection", "Cognitive enhancement", "Synaptogenesis", "Memory improvement"],
    image: "https://placehold.co/300x200/1A1A18/F5F0E8?text=Dihexa",
    dosage: "Experimental: 1–10 mg daily (research use only)",
    mechanisms: "Binds to hepatocyte growth factor (HGF) receptor c-Met, promoting synaptogenesis and neuroplasticity. Estimated to be 1 million× more potent than BDNF in vitro.",
    sideEffects: ["Unknown — very limited human data"],
    halfLife: "Unknown (potentially long)",
    onsetTime: "1–3 hours",
    duration: "Potentially 24+ hours",
    warnings: [
      "⚠️ RESEARCH CHEMICAL — not FDA approved",
      "⚠️ VERY LIMITED RESEARCH, PRIMARILY PRECLINICAL",
      "⚠️ POWERFUL GROWTH FACTOR MODULATION — unknown long-term risks",
      "⚠️ ONCOGENIC POTENTIAL NOT FULLY EVALUATED"
    ],
    researchLinks: [
      { title: "Dihexa (HGF/c-Met agonist) improves spatial learning — preclinical study (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/22057432/", type: "animal" },
      { title: "HGF/c-Met signaling in synaptic plasticity and cognitive function — PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/22033345/", type: "review" }
    ]
  },
  {
    name: "Didesoymodafinil",
    cid: "didesoymodafinil_placeholder",
    category: "NovelStimulants",
    description: "Modafinil derivative with potentially longer-lasting wakefulness-promoting effects.",
    benefits: ["Extended wakefulness", "Improved focus", "Enhanced cognitive performance"],
    image: "https://placehold.co/300x200/1A1A18/F5F0E8?text=Didesoymodafinil",
    dosage: "Experimental: 25 mg, max 150 mg",
    mechanisms: "Similar to Modafinil but with structural modifications that may extend duration of action. Dopamine reuptake inhibition suspected.",
    sideEffects: ["Headache", "Nausea", "Insomnia", "Anxiety"],
    halfLife: "Unknown (potentially longer than Modafinil)",
    onsetTime: "30–60 minutes",
    duration: "Potentially 12–24 hours",
    warnings: [
      "⚠️ RESEARCH CHEMICAL — not FDA approved",
      "⚠️ VERY LITTLE RESEARCH",
      "⚠️ UNKNOWN TOXICITY PROFILE"
    ],
    researchLinks: [
      { title: "Modafinil analogue pharmacology — reference (PubMed)", url: "https://pubmed.ncbi.nlm.nih.gov/18077224/", type: "review" }
    ]
  }
];

export const interactions = {
  "2519_228398": {
    safety: "synergy", type: "cognitive", score: 5,
    title: "Caffeine × L-Theanine",
    message: "The golden duo. L-Theanine smooths the caffeine edge, extends focus duration and eliminates jitteriness. Optimal at a 2:1 ratio (e.g. 200 mg Caffeine + 400 mg L-Theanine).",
    tag: "Classic Stack"
  },
  "4843_71920": {
    safety: "synergy", type: "cognitive", score: 5,
    title: "Piracetam × Alpha-GPC",
    message: "Racetams increase acetylcholine consumption — Alpha-GPC replenishes the choline needed. Significantly reduces racetam-typical headaches. Always pair racetams with a choline source.",
    tag: "Essential Combo"
  },
  "2250_71920": {
    safety: "synergy", type: "cognitive", score: 4,
    title: "Aniracetam × Alpha-GPC",
    message: "Same logic as Piracetam + Alpha-GPC. Aniracetam is fat-soluble — take both with a fatty meal for maximum absorption and bioavailability.",
    tag: "Recommended"
  },
  "228398_119032": {
    safety: "synergy", type: "cognitive", score: 4,
    title: "L-Theanine × Bacopa Monnieri",
    message: "Excellent combo for deep, sustained focus. L-Theanine acts immediately by promoting alpha waves, while Bacopa builds long-term cognitive capacity over weeks.",
    tag: "Focus Stack"
  },
  "228398_4843": {
    safety: "safe", type: "cognitive", score: 3,
    title: "L-Theanine × Piracetam",
    message: "Good pairing. L-Theanine dampens any restlessness from Piracetam and promotes alpha brainwaves for calm, relaxed focus. Ensure adequate choline in your stack.",
    tag: "Compatible"
  },
  "2519_119032": {
    safety: "safe", type: "cognitive", score: 3,
    title: "Caffeine × Bacopa Monnieri",
    message: "Works well together. Caffeine provides a short-term boost while Bacopa works long-term on memory consolidation. No known interaction risk between the two.",
    tag: "Compatible"
  },
  "4843_119032": {
    safety: "synergy", type: "neuroprotective", score: 4,
    title: "Piracetam × Bacopa Monnieri",
    message: "Strong neuroprotective synergy. Both promote neuronal plasticity via distinct pathways — AMPA modulation (Piracetam) combined with antioxidant adaptogenic effects (Bacopa).",
    tag: "Neuroprotective"
  },
  "2519_4843": {
    safety: "safe", type: "cognitive", score: 2,
    title: "Caffeine × Piracetam",
    message: "Functional but not a power combo. Caffeine provides energy and alertness, Piracetam handles cognition. Make sure you have enough choline in your stack.",
    tag: "Neutral"
  },
  "2519_441792": {
    safety: "warning", type: "stimulant", score: null,
    title: "Caffeine × Agmatine",
    message: "Agmatine modulates blood pressure via nitric oxide pathways. Combined with caffeine's vasoconstrictive effects, unpredictable blood pressure swings are possible. Monitor your response carefully.",
    tag: "Use Caution"
  },
  "4236_2519": {
    safety: "danger", type: "stimulant", score: null,
    title: "Modafinil × Caffeine",
    message: "High overstimulation risk. Modafinil alone is already very potent — adding caffeine significantly elevates heart rate, blood pressure and anxiety symptoms. Avoid or drastically reduce caffeine dose.",
    tag: "High Risk"
  },
  "4236_2250": {
    safety: "danger", type: "stimulant", score: null,
    title: "Modafinil × Aniracetam",
    message: "Modafinil is a powerful wakefulness promoter. Aniracetam as an AMPA modulator can increase excitatory load further. Insomnia, agitation and overstimulation are likely outcomes.",
    tag: "Avoid"
  },
  "4236_119032": {
    safety: "warning", type: "cognitive", score: null,
    title: "Modafinil × Bacopa Monnieri",
    message: "Bacopa is an adaptogen, Modafinil a strong stimulant. Individual response varies greatly. Bacopa may theoretically blunt some stimulant effects — still monitor your reaction closely.",
    tag: "Individual"
  },
  "71680_2519": {
    safety: "warning", type: "anxiolytic", score: null,
    title: "4F-Phenibut × Caffeine",
    message: "4F-Phenibut acts GABAergically and is sedating, while caffeine is stimulating. The combination can falsely reduce the subjective sense of risk (stimulation + euphoria). Watch for dependency potential.",
    tag: "Caution"
  },
  "71680_4236": {
    safety: "warning", type: "stimulant", score: null,
    title: "4F-Phenibut × Modafinil",
    message: "Interesting but risky combo: GABAergic relaxation meets a wakefulness promoter. May lead to underestimating the stimulant load. Not recommended for beginners.",
    tag: "Experienced Users"
  },
  "441792_119032": {
    safety: "safe", type: "neuroprotective", score: 3,
    title: "Agmatine × Bacopa Monnieri",
    message: "Both have neuroprotective properties via different mechanisms. Agmatine as an NMDA antagonist, Bacopa through antioxidant activity. Good foundation for a neuroprotection-focused stack.",
    tag: "Neuroprotective"
  },
  "228398_4236": {
    safety: "warning", type: "anxiolytic", score: null,
    title: "L-Theanine × Modafinil",
    message: "L-Theanine can take the edge off Modafinil slightly, but not enough to fully compensate for its stimulant load — Modafinil remains dominant. Marginally useful at best.",
    tag: "Limited Benefit"
  },
  "4843_2250": {
    safety: "warning", type: "cognitive", score: null,
    title: "Piracetam × Aniracetam",
    message: "Both are racetams — combining them significantly increases total acetylcholine demand. Without adequate choline supplementation (Alpha-GPC or CDP-Choline), severe headaches are likely.",
    tag: "Choline Required"
  },
  "71920_119032": {
    safety: "synergy", type: "cognitive", score: 4,
    title: "Alpha-GPC × Bacopa Monnieri",
    message: "Alpha-GPC boosts acetylcholine short-term, while Bacopa improves memory consolidation long-term. Ideal combination for focused learning sessions.",
    tag: "Study Stack"
  },
  "bromantane_placeholder_2519": {
    safety: "safe", type: "stimulant", score: 2,
    title: "Bromantane × Caffeine",
    message: "Bromantane acts as an adaptogenic stimulant via dopamine synthesis, caffeine via adenosine blockade. Different mechanisms — moderate synergy possible with no known adverse interaction.",
    tag: "Compatible"
  },
  "441792_4843": {
    safety: "safe", type: "neuroprotective", score: 3,
    title: "Agmatine × Piracetam",
    message: "Agmatine as an NMDA antagonist can help balance the synaptic excitatory load from Piracetam. Good pairing for a neuroprotective focus stack.",
    tag: "Compatible"
  }
};

export function searchCompounds(query) {
  if (!query) return compounds;
  const q = query.toLowerCase().trim();
  return compounds.filter(c => 
    c.name.toLowerCase().includes(q) || 
    c.category.toLowerCase().includes(q) || 
    c.benefits.some(b => b.toLowerCase().includes(q))
  );
}

export function getCompoundByCid(cid) {
  return compounds.find(c => String(c.cid) === String(cid));
}

export function getInteraction(cidA, cidB) {
  return interactions[`${cidA}_${cidB}`] || interactions[`${cidB}_${cidA}`] || null;
}
