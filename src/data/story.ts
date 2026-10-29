// Story data: the cast, Ravana's ten faces, and the places on the road.
// Narrative follows Vālmīki; later or regional traditions are flagged in the copy.

export interface Character {
  id: string;
  name: string;
  deva: string;
  epithet: string;
  essence: string;
  accent: string;
  /** Footage clip id, or the rendered sea where the footage has nothing to show. */
  clip?: string;
  illum?: "sea";
  fx?: string;
  titles: string;
  text: string;
  moments: string[];
  note?: string;
}

export const CAST: Character[] = [
  {
    id: "rama",
    name: "Rāma",
    deva: "रामः",
    epithet: "Prince of Ayodhyā · Seventh avatar of Viṣṇu",
    essence: "Duty before desire",
    accent: "#8fb0d6",
    clip: "rama_arrow",
    fx: "38%",
    titles: "Eldest son of Daśaratha · Maryādā Puruṣottama, the ideal man",
    text:
      "Offered a crown in the morning and exile by evening, he chose his father's word over his own claim. Vālmīki's Rama is not a god who never doubts. He grieves, he rages at the ocean that blocks his way, and still he holds to dharma.",
    moments: [
      "Breaks the bow of Śiva at Mithilā",
      "Accepts fourteen years of exile without protest",
      "Vows to find Sītā wherever she has been taken",
      "Faces Rāvaṇa at Laṅkā",
    ],
  },
  {
    id: "sita",
    name: "Sītā",
    deva: "सीता",
    epithet: "Daughter of the Earth · Princess of Mithilā",
    essence: "Steadfast, unbending, free",
    accent: "#d7687a",
    clip: "sita_diya",
    fx: "50%",
    titles: "Daughter of Janaka · Queen of Ayodhyā",
    text:
      "King Janaka found her in a furrow of the earth as he ploughed. Her name means 'furrow'. She chose the forest over the palace. In Rāvaṇa's own city, through months of captivity, she refused him again and again.",
    moments: [
      "Weds Rama after the breaking of the bow",
      "Insists on following him into exile",
      "Refuses Rāvaṇa in the aśoka grove",
      "In the Uttara Kāṇḍa, returns to the earth that bore her",
    ],
  },
  {
    id: "lakshmana",
    name: "Lakṣmaṇa",
    deva: "लक्ष्मणः",
    epithet: "Brother · Guardian · Shadow",
    essence: "Where you go, I go",
    accent: "#e08a4a",
    clip: "brothers_fire",
    fx: "58%",
    titles: "Son of Sumitrā · Younger brother of Rama",
    text:
      "Nobody asked Lakṣmaṇa to go into exile. He went anyway, and for fourteen years he guarded the door of their forest home. In the war he was struck down, revived by the herbs Hanumān carried through the night, and went on to slay Indrajit.",
    moments: [
      "Follows Rama into the forest unasked",
      "Struck down in battle by Indrajit",
      "Revived by the healing mountain",
      "Slays Indrajit",
    ],
    note: "The 'Lakṣmaṇa rekhā', the line he draws around the hut, comes from later tellings, not Vālmīki.",
  },
  {
    id: "bharata",
    name: "Bharata",
    deva: "भरतः",
    epithet: "Brother · Regent · The throne refused",
    essence: "The crown is not mine",
    accent: "#d9c08e",
    clip: "sunset_palace",
    fx: "55%",
    titles: "Son of Kaikeyī",
    text:
      "His mother won him a kingdom, and he would not take it. He carried Rama's sandals back to Ayodhyā, set them on the throne, and governed as their servant from a hermit's hut outside the city for fourteen years.",
    moments: [
      "Refuses the throne won by Kaikeyī's boon",
      "Walks to Citrakūṭa to bring Rama home",
      "Rules in the name of Rama's sandals",
    ],
    note: "Bharata does not appear in Part One's footage. His card shows the palace at dusk, the city he kept for his brother.",
  },
  {
    id: "hanuman",
    name: "Hanumān",
    deva: "हनुमान्",
    epithet: "Son of the Wind · Messenger · Devotee",
    essence: "Strength in service",
    accent: "#f09a4a",
    illum: "sea",
    titles: "Minister of Sugrīva · Son of Vāyu",
    text:
      "He leapt the ocean to Laṅkā, found Sītā in the aśoka grove and set the golden city alight. When Lakṣmaṇa lay dying, he flew north and brought back a whole mountain of healing herbs. His devotion made him one of the epic's most beloved figures.",
    moments: [
      "Meets Rama and Lakṣmaṇa at Ṛṣyamūka",
      "Leaps the ocean from Mount Mahendra",
      "Sets Laṅkā ablaze",
      "Carries the mountain of herbs",
    ],
    note: "Hanumān does not appear in Part One's footage, so his leap is rendered here as light crossing the sea.",
  },
  {
    id: "jatayu",
    name: "Jaṭāyu",
    deva: "जटायुः",
    epithet: "King of Vultures · Friend of Daśaratha",
    essence: "The first to fight for her",
    accent: "#e6b155",
    clip: "jatayu_gold",
    fx: "45%",
    titles: "Son of Aruṇa · Brother of Sampāti",
    text:
      "An aged king of vultures and an old friend of Daśaratha. When Rāvaṇa carried Sītā across the sky, Jaṭāyu flew at him alone. He lost his wings and then his life, but first he told Rama which way she had been taken. Rama performed his funeral rites as he would a father's.",
    moments: ["Attacks Rāvaṇa's chariot in the sky", "Falls with his wings cut", "Tells Rama where Sītā was taken", "Receives a son's rites from Rama"],
  },
  {
    id: "parashurama",
    name: "Paraśurāma",
    deva: "परशुरामः",
    epithet: "Warrior-sage · Sixth avatar of Viṣṇu",
    essence: "The axe meets the bow",
    accent: "#cf9a52",
    clip: "parashurama",
    fx: "40%",
    titles: "Son of Jamadagni · Bearer of the axe",
    text:
      "A Brahmin who had cleared the earth of tyrant kings many times over. Hearing that Śiva's bow was broken, he blocked Rama's road home and demanded he string the bow of Viṣṇu. Rama did, and the elder avatar stepped aside for the younger.",
    moments: ["Confronts the wedding party on the road", "Hands Rama the bow of Viṣṇu", "Withdraws to the mountains"],
  },
  {
    id: "ravana",
    name: "Rāvaṇa",
    deva: "रावणः",
    epithet: "King of Laṅkā · Daśānana, the Ten-Headed",
    essence: "Ten heads, one pride",
    accent: "#e2573f",
    clip: "ravana_snow",
    fx: "58%",
    titles: "Son of Viśravas · Grandson of Pulastya · Devotee of Śiva",
    text:
      "A master of the Vedas and of music, a devotee whose hymns to Śiva are still sung, a king who made Laṅkā shine with gold. His boon made him unconquerable by every power he feared and blind to the one he did not. His desire for Sītā undid him.",
    moments: [
      "Offers nine heads to win Brahmā's boon",
      "Tries to lift Mount Kailāsa and is named Rāvaṇa, 'he who roars', by Śiva",
      "Takes Laṅkā and the Puṣpaka from Kubera",
      "Carries Sītā away from Pañcavaṭī",
      "Falls at Laṅkā",
    ],
    note: "That his ten heads stand for the four Vedas and six śāstras is a popular later reading.",
  },
];

export interface Face {
  title: string;
  text: string;
}

export const FACES: Face[] = [
  { title: "The King", text: "Under him Laṅkā was a city of gold, wealth and order. His people roared his name." },
  { title: "The Scholar", text: "He was learned in the Vedas. Later tradition credits him with treatises on astrology and medicine." },
  { title: "The Devotee", text: "His cry beneath Kailāsa earned him his name from Śiva. The Śiva Tāṇḍava Stotram is traditionally ascribed to him." },
  { title: "The Musician", text: "He is remembered as a master of the vīṇā. A folk tradition names the bowed rāvaṇahatha after him." },
  { title: "The Ascetic", text: "No one surpassed his penance: ten thousand years, and nine heads offered to the fire." },
  { title: "The Conqueror", text: "He humbled Kubera, the nāgas and the devas. The three worlds paid him tribute." },
  { title: "The Brother", text: "Brother of Kumbhakarṇa, Vibhīṣaṇa and Śūrpaṇakhā. He went to Pañcavaṭī to avenge her humiliation." },
  { title: "The Father", text: "Father of Meghanāda, who defeated Indra in battle and was named Indrajit." },
  { title: "Desire", text: "He desired Sītā and would not let her go, even as his city burned around him." },
  { title: "Pride", text: "He scorned men as too small to fear. A man came." },
];

export interface Place {
  id: string;
  name: string;
  deva: string;
  kanda: string;
  lon: number;
  lat: number;
  text: string;
  clip?: string;
  side?: "left" | "right";
}

export const PLACES: Place[] = [
  { id: "mithila", name: "Mithilā", deva: "मिथिला", kanda: "Bāla Kāṇḍa", lon: 85.9, lat: 26.7, clip: "bow_lift",
    text: "Capital of Videha and King Janaka. Here Rama strung and broke the bow of Śiva, and married Sītā." },
  { id: "ayodhya", name: "Ayodhyā", deva: "अयोध्या", kanda: "Bāla · Ayodhyā Kāṇḍa", lon: 82.2, lat: 26.8, clip: "city", side: "left",
    text: "Capital of Kosala on the Sarayu, seat of the solar dynasty. Rama was born here, left it, and came back to it." },
  { id: "shringavera", name: "Śṛṅgaverapura", deva: "शृङ्गवेरपुर", kanda: "Ayodhyā Kāṇḍa", lon: 81.6, lat: 25.6, side: "left",
    text: "On the Gaṅgā. Guha, king of the Niṣādas, welcomed the exiles and ferried them across the river." },
  { id: "chitrakuta", name: "Citrakūṭa", deva: "चित्रकूट", kanda: "Ayodhyā Kāṇḍa", lon: 80.9, lat: 25.0,
    text: "Their first forest home. Bharata came here to bring Rama back, and left carrying his sandals." },
  { id: "panchavati", name: "Pañcavaṭī", deva: "पञ्चवटी", kanda: "Araṇya Kāṇḍa", lon: 73.8, lat: 20.0, clip: "forest_army", side: "left",
    text: "A hermitage on the Godāvarī in the Daṇḍaka forest. Śūrpaṇakhā, the army of Khara, the golden deer, and the abduction all happened here." },
  { id: "kishkindha", name: "Kiṣkindhā", deva: "किष्किन्धा", kanda: "Kiṣkindhā Kāṇḍa", lon: 76.5, lat: 15.3, side: "left",
    text: "The vānara kingdom. Rama met Hanumān, allied with Sugrīva, and sent searchers out in every direction." },
  { id: "mahendra", name: "Mahendra", deva: "महेन्द्र", kanda: "Sundara Kāṇḍa", lon: 77.4, lat: 8.5, side: "left",
    text: "The mountain on the southern shore. Hanumān grew to the size of a mountain here and leapt across the ocean." },
  { id: "setu", name: "Setu", deva: "सेतु", kanda: "Yuddha Kāṇḍa", lon: 79.3, lat: 9.3,
    text: "Nala and the vānara army built a bridge of stones across the sea, and the army crossed to Laṅkā." },
  { id: "lanka", name: "Laṅkā", deva: "लङ्का", kanda: "Sundara · Yuddha Kāṇḍa", lon: 80.7, lat: 7.6, clip: "lanka_crowd",
    text: "Rāvaṇa's golden city: the aśoka grove where Sītā was held, the city Hanumān burned, and the field of the last battle." },
];

/** Order of travel for the drawn route (Mahendra → Laṅkā is the leap; Setu → Laṅkā the bridge). */
export const ROUTE = ["mithila", "ayodhya", "shringavera", "chitrakuta", "panchavati", "kishkindha", "mahendra", "setu"];
