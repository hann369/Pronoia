export const TEXTBOOKS = [
  {
    id: 'newton-motion',
    title: "Newton's Third Law of Motion",
    category: "Physics",
    sections: [
      {
        id: 'sec-1',
        title: "1. Das Wechselwirkungsprinzip",
        paragraphIdx: 0,
        questionId: "q-embed-1"
      },
      {
        id: 'sec-2',
        title: "2. Alltägliche Kräfte (Zehenstoß)",
        paragraphIdx: 1,
        questionId: "q-embed-1-2"
      },
      {
        id: 'sec-3',
        title: "3. Beschleunigung beim Schwimmen",
        paragraphIdx: 2,
        questionId: "q-embed-1-3"
      }
    ],
    originalText: `Newton's third law of motion states that whenever one body exerts a force on a second body, the first body experiences a force that is equal in magnitude and opposite in direction to the force that it exerts. This law is often stated as "for every action, there is an equal and opposite reaction."

If you have ever stubbed your toe, you have noticed that although your toe initiates the impact, the surface that you stub it on exerts a force back on your toe. Although the first thought that crosses your mind is probably "ouch, that hurts" rather than "this is a great example of Newton's third law," both statements are true.

When a swimmer pushes off from the wall of a pool, she accelerates in the direction opposite to that of her push. The swimmer exerts a force on the wall, and the wall exerts an equal and opposite force on the swimmer, causing her to accelerate.`,
    timeline: {
      title: "Schritt-für-Schritt: Kraft & Gegenkraft beim Schwimmen",
      steps: [
        { id: "step-1", label: "Schwimmer drückt aktiv gegen die Poolwand (Aktion)", order: 1 },
        { id: "step-2", label: "Die Wand erfährt eine mechanische Kraft nach hinten", order: 2 },
        { id: "step-3", label: "Die Wand übt eine gleiche Gegenkraft nach vorne aus (Reaktion)", order: 3 },
        { id: "step-4", label: "Schwimmer beschleunigt vorwärts durch das Wasser", order: 4 }
      ]
    },
    memoryAid: {
      title: "Mnemonic für Kräftepaare (Aktion & Reaktion)",
      mnemonic: "A.R.M.S.",
      meaning: "Aktion und Reaktion sind Gleich (Match) und in Gegenüberliegende Richtungen (Split)."
    },
    illustrations: {
      gaming: {
        title: "Schild-Reflektion im Spiel",
        description: "Wenn ein Projektil auf einen Energieschild prallt, übt das Projektil eine Kraft auf den Schild aus, und der Schild übt eine gleiche und entgegengesetzte Kraft aus, die das Projektil ablenkt.",
        url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400"
      },
      soccer: {
        title: "Kopfball-Kräfteverhältnis",
        description: "Der Kopf des Spielers übt eine Vorwärtskraft auf den Ball aus. Gleichzeitig übt der Ball eine gleiche Kraft nach hinten auf den Kopf aus (deshalb spürt man den Aufprall!).",
        url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400"
      },
      art: {
        title: "Spachtel & Leinwand-Interaktion",
        description: "Wenn das Malmesser Farbe auf die Leinwand drückt, biegt sich das Messer. Die Leinwand drückt mit gleicher Kraft gegen das Messer zurück und erzeugt den Widerstand.",
        url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400"
      }
    },
    personalizations: {
      gaming: {
        grade5: `Wenn du jemals ein Videospiel gespielt hast, bei dem dein Charakter einen Schild benutzt, hast du Newtons drittes Gesetz in Aktion gesehen. Wenn ein Projektil deinen Schild trifft, prallt es ab. Warum? Weil der Aufprall des Projektils (Aktion) eine Kraft auf den Schild ausübt, und dein Schild drückt mit genau der gleichen Kraft zurück (Reaktion), wodurch das Projektil abgelenkt wird!`,
        grade11: `Im Kontext von Spiele-Engines und Physik-Simulationen wird Newtons drittes Gesetz ständig berechnet. Wenn ein elastischer Ball gegen einen massiven Block prallt, übt der Ball eine Impulskraft auf die Kollisionsbox des Blocks aus. Die Engine berechnet sofort die gleiche Gegenkraft des Blocks auf den Ball, was zur Richtungsumkehr des Geschwindigkeitsvektors des Balls führt.`
      },
      soccer: {
        grade5: `Wenn du einen Fußball dribbelst, drückst du den Ball mit deinem Fuß nach unten, und der Boden drückt ihn wieder nach oben in deine Richtung! Deine Aktion ist das Kicken nach unten, und die Reaktion ist die Gegenkraft des Bodens, die den Ball abprallen lässt. Ohne dieses Gesetz würde der Ball einfach auf dem Boden liegen bleiben.`,
        grade11: `Bei der kinematischen Analyse eines Torschusses drückt der Fuß des Stürmers mit hoher Beschleunigung gegen das Leder. Nach dem dritten Axiom wirkt die Trägheit des Fußes gegen den Ball, während der Ball mit exakt der gleichen Kraft entgegen der Truss-Richtung auf den Fuß des Spielers wirkt, was die Fußbewegung leicht verzögert.`
      },
      art: {
        grade5: `Wenn du jemals einen Pinsel fest gegen eine Leinwand gedrückt hast, hast du bemerkt, dass er sich biegt! Dein Pinsel drückt auf die Leinwand, und die Leinwand drückt zurück auf deinen Pinsel. Du versuchst vielleicht nur, einen fetten Strich zu ziehen, aber es ist auch ein großartiges Beispiel für Newtons drittes Gesetz.`,
        grade11: `In der Bildhauerei oder Malerei mit Spachteltechniken ist die Materialspannung ein perfektes Beispiel für Kräftepaare. Wenn das Malmesser einen zähflüssigen Farbauftrag auf der Leinwand verteilt, erzeugt den ausgeübten Druck eine Scherspannung. Die Leinwand reagiert mit einer Normalkraft gleicher Stärke, die das Messer elastisch biegt.`
      }
    },
    slides: [
      {
        title: "1. Das Gesetz der Wechselwirkung",
        bullets: [
          "Kräfte treten immer paarweise auf.",
          "Es gibt keine isolierte Kraft im Universum.",
          "Aktion = Reaktion (Action = Reaction)."
        ],
        narration: "Willkommen zur Lektion über Newtons drittes Gesetz. Wichtig ist zu verstehen: Jede Kraft ist Teil einer Interaktion zwischen zwei Körpern. Es gibt niemals nur eine Kraft allein."
      },
      {
        title: "2. Richtung und Stärke",
        bullets: [
          "Die Gegenkraft ist exakt gleich stark (Magnitude).",
          "Die Gegenkraft wirkt in die entgegengesetzte Richtung.",
          "Die Kräfte heben sich nicht auf, da sie auf verschiedene Körper wirken."
        ],
        narration: "Wenn du gegen eine Wand drückst, drückt die Wand mit exakt derselben Stärke zurück. Da die Wand auf dich drückt und du auf die Wand, wirken die Kräfte auf verschiedene Objekte und heben sich nicht auf."
      }
    ],
    audioLesson: [
      { speaker: "Lehrer", text: "Hallo! Heute schauen wir uns Newtons drittes Gesetz an. Hast du schon mal einen Ball gedribbelt?" },
      { speaker: "Schüler", text: "Ja, klar. Er kommt immer wieder hoch." },
      { speaker: "Lehrer", text: "Genau. Du übst eine Kraft nach unten aus, und der Ball (bzw. der Boden) drückt mit derselben Kraft nach oben. Das ist Aktion und Reaktion." },
      { speaker: "Schüler", text: "Ah, verstehe! Also erfährt meine Hand auch einen Druck beim Dribbeln?" },
      { speaker: "Lehrer", text: "Exakt. Das ist die Gegenkraft, die du in deiner Handfläche spürst." }
    ],
    mindmap: {
      name: "Newtons 3. Gesetz",
      children: [
        {
          name: "Wechselwirkung",
          children: [
            { name: "Kräftepaare" },
            { name: "Keine Einzelkräfte" }
          ]
        },
        {
          name: "Eigenschaften",
          children: [
            { name: "Gleiche Stärke" },
            { name: "Gegenüberliegende Richtung" },
            { name: "Wirken auf verschiedene Körper" }
          ]
        }
      ]
    },
    embeddedQuestions: [
      {
        id: "q-embed-1",
        question: "Welche Aussage beschreibt Newtons drittes Gesetz korrekt?",
        options: [
          "Kräfte wirken immer unabhängig voneinander.",
          "Jede Aktion erzeugt eine gleich große, entgegengesetzte Reaktion.",
          "Schwere Objekte reagieren langsamer auf Kräfte als leichte.",
          "Reaktionskräfte treten erst nach einer kurzen Verzögerung auf."
        ],
        answerIdx: 1,
        explanation: "Newtons drittes Gesetz besagt, dass Kräfte immer paarweise auftreten. Eine Kraft (Aktion) erzeugt immer eine gleich große, entgegengesetzte Gegenkraft (Reaktion)."
      },
      {
        id: "q-embed-1-2",
        question: "Was passiert aus physikalischer Sicht, wenn du dir den Zeh an einer harten Oberfläche stößt?",
        options: [
          "Nur dein Zeh übt eine Kraft auf die Oberfläche aus.",
          "Die Oberfläche übt eine gleiche Gegenkraft auf deinen Zeh aus.",
          "Die Kraft der Oberfläche ist größer als die Kraft deines Zehs.",
          "Es wirkt überhaupt keine Kraft, sondern nur Druck."
        ],
        answerIdx: 1,
        explanation: "Wenn du deinen Zeh anstößt, übt dein Zeh eine Kraft auf die Oberfläche aus. Nach dem Wechselwirkungsprinzip übt die Oberfläche eine gleich große, entgegengesetzte Kraft auf deinen Zeh aus, was den Schmerz verursacht."
      },
      {
        id: "q-embed-1-3",
        question: "Wie bewegt sich ein Schwimmer vorwärts, wenn er sich von der Wand abdrückt?",
        options: [
          "Indem er die Wand nach vorne zieht.",
          "Die Wand drückt den Schwimmer vorwärts (Reaktionskraft).",
          "Durch die Verringerung des Wasserwiderstands.",
          "Die Kraft des Schwimmers überwindet die Schwerkraft der Wand."
        ],
        answerIdx: 1,
        explanation: "Der Schwimmer übt eine kraft nach hinten auf die Wand aus. Die Wand übt eine gleich große Kraft nach vorne auf den Schwimmer aus, was seine Vorwärtsbeschleunigung bewirkt."
      }
    ],
    quiz: [
      {
        question: "Ein Schwimmer drückt sich von einer Poolwand ab. Welche Kraft beschleunigt den Schwimmer nach vorne?",
        options: [
          "Die Kraft, die der Schwimmer auf die Wand ausübt.",
          "Die Reibung des Wassers.",
          "Die Gegenkraft, die die Wand auf den Schwimmer ausübt.",
          "Die Schwerkraft, die ihn nach unten zieht."
        ],
        answerIdx: 2,
        explanation: "Die Wand drückt den Schwimmer nach vorne als Reaktion auf den Druck des Schwimmers gegen die Wand."
      },
      {
        question: "Wenn Aktion und Reaktion gleich und entgegengesetzt sind, warum heben sie sich nicht gegenseitig auf?",
        options: [
          "Weil sie zu unterschiedlichen Zeiten auftreten.",
          "Weil sie auf zwei verschiedene Objekte wirken.",
          "Weil die Aktion immer ein kleines bisschen stärker ist.",
          "Weil die Reaktion im Vakuum nicht existiert."
        ],
        answerIdx: 1,
        explanation: "Da die Kräfte auf unterschiedliche Körper wirken (z. B. eine Kraft auf die Wand, eine Kraft auf den Schwimmer), können sie sich nicht gegenseitig aufheben."
      }
    ]
  },
  {
    id: 'immune-disruption',
    title: "Disruptions in the Immune System",
    category: "Biology",
    sections: [
      {
        id: 'sec-1',
        title: "1. Hypersensitivität & Allergien",
        paragraphIdx: 0,
        questionId: "q-embed-2"
      },
      {
        id: 'sec-2',
        title: "2. Autoimmunität",
        paragraphIdx: 1,
        questionId: "q-embed-2-2"
      },
      {
        id: 'sec-3',
        title: "3. Immundefekte",
        paragraphIdx: 2,
        questionId: "q-embed-2-3"
      }
    ],
    originalText: `An overactive immune response can be just as harmful as a weak one. Hypersensitivities are maladaptive immune responses to harmless environmental substances or self-antigens. Allergies are a common form of hypersensitivity.

Autoimmunity is another form of immune system disruption. It occurs when the immune system mistakenly attacks the body's own cells, tissues, and organs, treating them as if they were foreign invaders. This leads to chronic inflammation and tissue destruction.

Immunodeficiencies occur when the immune system is compromised, leaving the body vulnerable to infections. These can be primary (genetic) or secondary (caused by external factors like HIV or medical treatments).`,
    timeline: {
      title: "Allergische Reaktion (Typ I Hypersensitivität)",
      steps: [
        { id: "step-1", label: "Erstkontakt mit dem Allergen (z.B. Pollen)", order: 1 },
        { id: "step-2", label: "B-Zellen produzieren IgE-Antikörper", order: 2 },
        { id: "step-3", label: "IgE bindet stabil an Mastzellen", order: 3 },
        { id: "step-4", label: "Zweitkontakt: Allergen bindet an IgE auf Mastzellen", order: 4 },
        { id: "step-5", label: "Mastzellen schütten Histamin aus (Symptome treten auf)", order: 5 }
      ]
    },
    memoryAid: {
      title: "Mnemonic für Immun-Disruptionen",
      mnemonic: "A.A.I.",
      meaning: "Allergie (Überreaktion), Autoimmunität (Selbstangriff), Immundefekt (Unterfunktion)."
    },
    illustrations: {
      gaming: {
        title: "Fehlfunktion der Gilden-Wachen (Autoimmunität)",
        description: "Wie Wachen in einem Schloss, die plötzlich die eigenen Bewohner als feindliche Monster angreifen, attackiert das Immunsystem bei der Autoimmunität gesunde Zellen des eigenen Körpers.",
        url: "https://images.unsplash.com/photo-1519074069444-1ba4e666440e?auto=format&fit=crop&q=80&w=400"
      },
      soccer: {
        title: "Rote Karte gegen das eigene Team",
        description: "Es ist, als würde der Schiedsrichter (Immunsystem) fälschlicherweise die eigenen Spieler (Körperzellen) mit einer roten Karte vom Platz stellen und so das eigene Spiel sabotieren.",
        url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=400"
      },
      art: {
        title: "Verwischte Gemälde-Strukturen",
        description: "Es ist, als würde ein Künstler sein eigenes, frisch gemaltes Kunstwerk mit einem nassen Schwamm verwischen und zerstören, weil er glaubt, es handele sich um eine schlechte Skizze.",
        url: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=400"
      }
    },
    personalizations: {
      gaming: {
        grade5: `Stell dir dein Immunsystem wie die Verteidigungseinheiten in einem Tower-Defense-Spiel vor. Bei Autoimmunität fangen deine eigenen Türme plötzlich an, deine eigene Basis anzugreifen, weil sie glauben, es seien feindliche NPC-Gegner. Das führt zu großem Schaden an deiner eigenen Festung!`,
        grade11: `In biologischen Systemen entspricht Autoimmunität einem fehlerhaften Targeting-Algorithmus der Abwehrzellen. Ähnlich wie eine KI-Gegner-Erkennung, die falsche Signaturen (Self-Antigens) als Bedrohung (Foreign Invaders) einstuft und Friendly Fire auslöst, starten T-Killerzellen eine zerstörerische Kaskade gegen autologe Gewebe.`
      },
      soccer: {
        grade5: `Es ist, als ob das Verteidigungsteam in einem Fußballspiel verwirrt ist und anfängt, Eigentore zu schießen, indem es die eigenen Mitspieler attackiert und den Ball ins eigene Tor kickt. Genau das passiert bei Autoimmunität: Dein Immunsystem greift die eigenen gesunden Zellen an!`,
        grade11: `Bei Autoimmunerkrankungen kommt es zu einem Verlust der Toleranz gegenüber körpereigenen Strukturen. Physiologisch verhält sich dies wie eine Abwehrreihe, die die Zuordnung verliert und den eigenen Torwart attackiert. Die Lymphozyten interpretieren MHC-Klasse-I-Moleküle fälschlicherweise als fremde pathogene Antigene.`
      },
      art: {
        grade5: `Denk an ein wunderschönes Gemälde, auf dem das Immunsystem der Schutzlack ist. Bei Autoimmunität verhält sich der Schutzlack wie Säure: Er greift die darunter liegenden Farbpigmente an und zerstört das Kunstwerk von innen heraus, weil er die Farben fälschlicherweise für Schmutz hält.`,
        grade11: `Autoimmunität zerstört das zelluläre Kunstwerk des Körpers. Durch den Abbruch der klonalen Deletion im Thymus dringen autoreaktive T-Zell-Rezeptoren in den Kreislauf ein. Sie greifen Gewebeepithelzellen an, was dem mutwilligen Übermalen und Zersetzen einer feinen Ölmalerei durch aggressive Lösungsmittel gleicht.`
      }
    },
    slides: [
      {
        title: "1. Störungen des Immunsystems",
        bullets: [
          "Überreaktion: Allergien & Hypersensitivität.",
          "Fehlfunktion: Autoimmunität (Körper greift sich selbst an).",
          "Unterfunktion: Immundefekte (z.B. HIV, genetisch)."
        ],
        narration: "Das Immunsystem schützt uns, kann aber auch gestört sein. Wir unterscheiden zwischen Überfunktion, bei der harmlose Dinge attackiert werden, und Autoimmunität, bei der sich das System gegen den eigenen Körper richtet."
      },
      {
        title: "2. Autoimmunerkrankungen",
        bullets: [
          "Verlust der Toleranz gegenüber körpereigenen Antigenen.",
          "Chronische Entzündungen und Gewebeschäden.",
          "Beispiele: Typ-1-Diabetes, Multiple Sklerose."
        ],
        narration: "Normalerweise lernt das Immunsystem, eigene Zellen nicht anzugreifen. Wenn diese Toleranz verloren geht, sprechen wir von Autoimmunität. Das führt zu dauerhaften Entzündungen und Gewebeschäden."
      }
    ],
    audioLesson: [
      { speaker: "Lehrer", text: "Hallo! Lass uns über Immunsystem-Störungen sprechen. Hast du Allergien?" },
      { speaker: "Schüler", text: "Ja, Heuschnupfen im Frühling." },
      { speaker: "Lehrer", text: "Das ist eine Hypersensitivität. Dein Körper stuft die eigentlich harmlosen Pollen als gefährlich ein und startet eine massive Abwehraktion." },
      { speaker: "Schüler", text: "Und was ist dann Autoimmunität?" },
      { speaker: "Lehrer", text: "Das ist noch ernster. Dabei verwechselt der Körper eigene gesunde Zellen mit Eindringlingen und attackiert sie direkt." }
    ],
    mindmap: {
      name: "Immun-Störungen",
      children: [
        {
          name: "Allergien",
          children: [
            { name: "Hypersensitivität" },
            { name: "Reaktion auf Pollen/Staub" }
          ]
        },
        {
          name: "Autoimmunität",
          children: [
            { name: "Fehlsteuerung" },
            { name: "Körper attackiert sich selbst" }
          ]
        },
        {
          name: "Immundefekte",
          children: [
            { name: "Primär (genetisch)" },
            { name: "Sekundär (z.B. HIV)" }
          ]
        }
      ]
    },
    embeddedQuestions: [
      {
        id: "q-embed-2",
        question: "Was geschieht bei einer Autoimmunerkrankung?",
        options: [
          "Das Immunsystem schläft ein und reagiert gar nicht mehr.",
          "Der Körper produziert zu viele rote Blutkörperchen.",
          "Das Immunsystem greift fälschlicherweise gesunde körpereigene Zellen an.",
          "Das Immunsystem wehrt Viren besonders effektiv ab."
        ],
        answerIdx: 2,
        explanation: "Bei der Autoimmunität greift das Immunsystem körpereigene Zellen und Gewebe an, da es sie fälschlicherweise als fremde Eindringlinge einstuft."
      },
      {
        id: "q-embed-2-2",
        question: "Welches zelluläre Ereignis beschreibt die Autoimmunität am besten?",
        options: [
          "Abwehrzellen ignorieren fremde Krankheitserreger.",
          "Das Immunsystem stuft körpereigene Moleküle als Bedrohung ein.",
          "B-Zellen hören auf, Antikörper zu produzieren.",
          "Das System wird durch Impfungen geschwächt."
        ],
        answerIdx: 1,
        explanation: "Bei Autoimmunerkrankungen verliert das Immunsystem die Toleranz gegenüber körpereigenen Antigenen und attackiert gesunde Körperzellen."
      },
      {
        id: "q-embed-2-3",
        question: "Was unterscheidet primäre von sekundären Immundefekten?",
        options: [
          "Primäre Defekte betreffen nur rote Blutkörperchen.",
          "Sekundäre Defekte sind genetisch bedingt, primäre erworben.",
          "Primäre Defekte sind genetisch bedingt, sekundäre erworben (z.B. durch HIV).",
          "Sekundäre Defekte treten nur im Alter auf."
        ],
        answerIdx: 2,
        explanation: "Primäre Immundefekte sind angeboren bzw. genetisch bedingt. Sekundäre Immundefekte werden durch äußere Faktoren wie Krankheiten (z.B. HIV) oder Behandlungen erworben."
      }
    ],
    quiz: [
      {
        question: "Was ist ein Beispiel für eine maladaptive Überreaktion auf harmlose Umweltstoffe?",
        options: [
          "Eine Allergie (Hypersensitivität).",
          "Ein primärer Immundefekt.",
          "Eine virusbedingte Grippe.",
          "Die normale Wundheilung."
        ],
        answerIdx: 0,
        explanation: "Allergien sind Überreaktionen des Immunsystems auf an sich harmlose Stoffe wie Pollen oder Nahrungsmittel."
      },
      {
        question: "Welche Art von Immundefekt liegt vor, wenn er durch eine Infektion wie HIV ausgelöst wird?",
        options: [
          "Ein primärer Immundefekt.",
          "Ein sekundärer Immundefekt.",
          "Ein autoimmuner Immundefekt.",
          "Ein allergischer Defekt."
        ],
        answerIdx: 1,
        explanation: "HIV verursacht einen sekundären Immundefekt, da er durch einen äußeren Faktor (das Virus) erworben wurde, nicht durch Genetik."
      }
    ]
  }
];
