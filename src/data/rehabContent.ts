import { MedicationId } from '../med-reminders';
import fastRecognitionImg from '../assets/images/resource_fast_recognition_1794675103675.jpg';
import brainNutritionImg from '../assets/images/resource_brain_nutrition_1794675104330.jpg';
import aboutRehabCareImg from '../assets/images/about_rehab_care_1794675104331.jpg';
import speechTherapyImg from '../assets/images/speech_therapy_practice_1793271458638.jpg';

export type Language = 'ta' | 'en';
export type ThemeMode = 'light' | 'dark';
export type TextSizeMode = 'normal' | 'large' | 'xl';
export type ExerciseId = 'ex1' | 'ex2' | 'ex3';

export interface HistoryEntry {
  id: string;
  label_ta: string;
  label_en: string;
  time: string;
}

export interface StepNarrative {
  short_ta: string;
  short_en: string;
  tag_ta: string;
  tag_en: string;
  heading_ta: string;
  heading_en: string;
  description_ta: string;
  description_en: string;
}

export const ISCHEMIC_STEPS: StepNarrative[] = [
  {
    short_ta: '1. தமனி',
    short_en: '1. Flow',
    tag_ta: 'படி 1: ஆரோக்கியமான கரோடிட் தமனி',
    tag_en: 'Step 1: Healthy Carotid Artery',
    heading_ta: 'கழுத்து ரத்தக்குழாய் சுத்தமாகவும் தடையின்றியும் உள்ளது.',
    heading_en: 'Healthy arterial vessel allows smooth, unhindered blood flow.',
    description_ta:
      'இதயத்தில் இருந்து கழுத்து வழியாக மூளைக்கு செல்லும் கரோடிட் தமனி (Carotid Artery) ஆரோக்கியமாக இருப்பதால் ஆக்சிஜன் நிறைந்த ரத்தம் சீராக மூளையை சென்றடைகிறது.',
    description_en:
      'The carotid artery carries oxygen-rich blood smoothly from the heart directly into the brain hemispheres without obstruction.',
  },
  {
    short_ta: '2. கொழுப்பு',
    short_en: '2. Plaque',
    tag_ta: 'படி 2: கொழுப்பு படிந்த தமனி',
    tag_en: 'Step 2: Plaque Buildup & Clot Formation',
    heading_ta: 'ரத்தக்குழாயில் கொழுப்பு படிந்து ரத்த உறைவு கட்டி உருவாகிறது.',
    heading_en: 'Cholesterol plaque narrows the arterial wall and forms a clot.',
    description_ta:
      'அதிக கொலஸ்ட்ரால் மற்றும் ரத்த அழுத்தத்தால் கழுத்து ரத்தக்குழாய் சுவரில் கொழுப்பு படிந்து, ரத்தப்பாதை குறுகி ரத்த உறைவு கட்டி உருவாகிறது.',
    description_en:
      'High cholesterol and hypertension deposit fatty plaque along the vessel wall, narrowing blood flow and triggering clot buildup.',
  },
  {
    short_ta: '3. பயணம்',
    short_en: '3. Travel',
    tag_ta: 'படி 3: ரத்த உறைவு உடைந்து பயணம்',
    tag_en: 'Step 3: Blood Clot Breaks Free',
    heading_ta: 'ரத்த உறைவு கட்டி உடைந்து ரத்த ஓட்டத்தில் மூளையை நோக்கி பயணிக்கிறது.',
    heading_en: 'A clot fragment detaches and travels rapidly toward the brain.',
    description_ta:
      'கழுத்தில் உள்ள கொழுப்பு பகுதியில் இருந்து ஒரு ரத்த உறைவு துண்டு உடைந்து, ரத்தத்தின் வேகத்தோடு மூளையை நோக்கி பயணிக்கிறது.',
    description_en:
      'Arterial pressure dislodges a clot fragment, sweeping it upward through the internal carotid artery into cerebral circulation.',
  },
  {
    short_ta: '4. அடைப்பு',
    short_en: '4. Stroke',
    tag_ta: 'படி 4: மூளையில் அடைப்பு — பக்கவாதம்',
    tag_en: 'Step 4: Clot Lodges in Cerebral Artery',
    heading_ta: 'கட்டி இடது பெருமூளை தமனியில் (Left MCA) சிக்கி பக்கவாதம் ஏற்படுகிறது.',
    heading_en: 'The clot blocks the Left Middle Cerebral Artery, causing ischemia.',
    description_ta:
      'மூளையின் இடது அரைக்கோள ரத்தக்குழாயில் கட்டி சிக்கிக் கொள்வதால், பேச்சு மற்றும் வலது கை-கால் இயக்க செல்கள் ஆக்சிஜன் இன்றி பாதிக்கப்படுகின்றன.',
    description_en:
      'The clot lodges inside the left middle cerebral artery, depriving motor and speech centers of oxygen and causing right-side weakness or speech difficulty.',
  },
  {
    short_ta: '5. சிகிச்சை',
    short_en: '5. Care',
    tag_ta: 'படி 5: அவசர சிகிச்சை & நலம் பெறுதல்',
    tag_en: 'Step 5: Emergency Care & Recovery',
    heading_ta: 'உடனடி மருத்துவ சிகிச்சையால் அடைப்பு கரைக்கப்பட்டு மூளை செல்கள் காக்கப்படுகின்றன.',
    heading_en: 'Rapid emergency treatment dissolves the blockage and restores flow.',
    description_ta:
      'பக்கவாத அறிகுறிகள் தெரிந்த உடனே மருத்துவமனைக்கு சென்றால், clot buster மருந்து (tPA) மூலம் அடைப்பை கரைத்து ரத்த ஓட்டத்தை மீட்கலாம்.',
    description_en:
      'Prompt hospital treatment within the golden window clears the clot, restores blood flow, and protects recovering brain pathways.',
  },
];

export const HEMORRHAGIC_STEPS: StepNarrative[] = [
  {
    short_ta: '1. தமனி',
    short_en: '1. Flow',
    tag_ta: 'படி 1: ஆரோக்கியமான ரத்த ஓட்டம்',
    tag_en: 'Step 1: Normal Arterial Flow',
    heading_ta: 'ரத்தம் மூளைக்கு தடையின்றி சீராக செல்கிறது.',
    heading_en: 'Oxygen-rich blood flows evenly to brain tissue.',
    description_ta:
      'இதயத்தில் இருந்து ரத்தக் குழாய் வழியாக மூளைக்கு ஆக்ஸிஜனும் சத்துக்களும் சீராக செல்கின்றன.',
    description_en: 'Healthy cerebral arteries maintain steady tone and supply vital oxygen.',
  },
  {
    short_ta: '2. பலவீனம்',
    short_en: '2. Weak Wall',
    tag_ta: 'படி 2: பலவீனமான ரத்தக் குழாய்',
    tag_en: 'Step 2: Vessel Wall Weakening',
    heading_ta: 'அதிக ரத்த அழுத்தம் காரணமாக ரத்தக்குழாய் சுவர் பலவீனமடைகிறது.',
    heading_en: 'Uncontrolled blood pressure weakens delicate vessel walls.',
    description_ta:
      'கட்டுப்படுத்தப்படாத உயர் ரத்த அழுத்தம் மூளையில் உள்ள நுண்ணிய ரத்தக்குழாய்களின் சுவர்களை பலவீனப்படுத்தி உப்ப வைக்கிறது.',
    description_en:
      'Chronic high blood pressure stretches thin arterial walls, creating fragile bulges over time.',
  },
  {
    short_ta: '3. வெடிப்பு',
    short_en: '3. Rupture',
    tag_ta: 'படி 3: ரத்தக் குழாய் வெடித்தல்',
    tag_en: 'Step 3: Artery Wall Ruptures',
    heading_ta: 'அதிக அழுத்தத்தால் பலவீனமான ரத்தக் குழாய் வெடித்து ரத்தம் கசிகிறது.',
    heading_en: 'The weakened arterial wall ruptures, leaking blood into brain tissue.',
    description_ta:
      'மூளையின் ரத்தக்குழாய் வெடித்து, ரத்தம் மூளை திசுக்களுக்குள் பரவி அழுத்தத்தை உண்டாக்குகிறது.',
    description_en:
      'When the fragile wall bursts, blood enters surrounding intracranial tissue and disrupts nearby neural pathways.',
  },
  {
    short_ta: '4. அழுத்தம்',
    short_en: '4. Pressure',
    tag_ta: 'படி 4: மூளை திசுக்களுக்கு கடுமையான அழுத்தம்',
    tag_en: 'Step 4: Intracranial Pressure',
    heading_ta: 'கசியும் ரத்தத்தின் அழுத்தத்தால் மூளை செல்கள் பாதிக்கப்பட்டு பக்கவாதம் ஏற்படுகிறது.',
    heading_en: 'Accumulated blood compresses brain tissue and triggers deficits.',
    description_ta:
      'வெளியேறும் ரத்தம் மூளை செல்களை அழுத்துவதால் ஆக்சிஜன் கிடைக்காமல் பக்கவாதம் மற்றும் கடுமையான தலைவலி உண்டாகிறது.',
    description_en:
      'Hematoma pressure compresses brain cells and limits blood supply, causing sudden headache or weakness.',
  },
  {
    short_ta: '5. சிகிச்சை',
    short_en: '5. Care',
    tag_ta: 'படி 5: அவசர மருத்துவ சிகிச்சை & உயிர் காப்பு',
    tag_en: 'Step 5: Emergency Stabilization',
    heading_ta: 'உடனடி சிகிச்சையால் ரத்தக் கசிவு நிறுத்தப்பட்டு ரத்த அழுத்தம் கட்டுப்படுத்தப்படுகிறது.',
    heading_en: 'Specialized emergency care controls pressure and protects brain cells.',
    description_ta:
      'உடனே மருத்துவமனைக்கு சென்றால், ரத்தக் கசிவை நிறுத்தி அழுத்தத்தை குறைத்து மூளை செல்களை காப்பாற்ற முடியும்.',
    description_en:
      'Immediate clinical management lowers blood pressure, relieves pressure, and stabilizes recovery.',
  },
];

export interface ExerciseItem {
  id: ExerciseId;
  category: 'hand' | 'leg' | 'facial';
  category_ta: string;
  category_en: string;
  title_ta: string;
  title_en: string;
  reps_ta: string;
  reps_en: string;
  youtubeId: string;
  youtubeTitle: string;
  sourceLabel: string;
  steps_ta: string[];
  steps_en: string[];
}

export const EXERCISES_LIST: ExerciseItem[] = [
  {
    id: 'ex1',
    category: 'hand',
    category_ta: 'கை பயிற்சி',
    category_en: 'Hand & Finger',
    title_ta: 'கை விரல் பயிற்சி',
    title_en: 'Hand & Finger Mobility',
    reps_ta: '10 முறை · 5 நொடி பிடிப்பு',
    reps_en: '10 reps · 5 sec hold',
    youtubeId: 'ZKR1nOtCNKU',
    youtubeTitle: 'Best Stroke Recovery Hand Exercises - Saebo',
    sourceLabel: 'Saebo · Hand Recovery',
    steps_ta: [
      'கையை மேசையில் சமமாக வைக்கவும்.',
      'கட்டை விரலால் மற்ற விரல்களை மெதுவாகத் தொடவும்.',
      'ஒரு மென்மையான துணியை 5 நொடி பிடித்து அழுத்தவும்.',
      'விரல்களை அகலமாக விரித்து ஓய்வெடுக்கவும்.',
    ],
    steps_en: [
      'Rest your forearm comfortably on a flat table.',
      'Gently touch your thumb to each fingertip.',
      'Squeeze a soft folded cloth gently for 5 seconds.',
      'Open fingers wide and relax between sets.',
    ],
  },
  {
    id: 'ex2',
    category: 'leg',
    category_ta: 'கால் & நடை',
    category_en: 'Leg & Walking',
    title_ta: 'கால் மற்றும் நடை பயிற்சி',
    title_en: 'Leg & Walking Strength',
    reps_ta: '8 முறை · 5 நொடி நீட்டிப்பு',
    reps_en: '8 reps · 5 sec extension',
    youtubeId: 'jHZoQMo2DA0',
    youtubeTitle: 'Best Stroke Walking Exercises - Rehab HQ',
    sourceLabel: 'Rehab HQ · Walking Rehab',
    steps_ta: [
      'நாற்காலியில் முதுகு நேராக இருக்கும்படி அமரவும்.',
      'காலை நேராக நீட்டி 5 நொடி வைத்திருக்கவும்.',
      'பாதங்களை மேலும் கீழும் மெதுவாக அசைக்கவும்.',
      'குடும்ப உதவியுடன் மெதுவாக நிற்க முயற்சி செய்யவும்.',
    ],
    steps_en: [
      'Sit upright on a sturdy chair with back support.',
      'Extend one knee straight out and hold 5 seconds.',
      'Flex ankles gently upward and downward.',
      'Practice standing with caregiver support when ready.',
    ],
  },
  {
    id: 'ex3',
    category: 'facial',
    category_ta: 'முகப் பயிற்சி',
    category_en: 'Facial & Smile',
    title_ta: 'முக புன்னகை பயிற்சி',
    title_en: 'Facial & Smile Symmetry',
    reps_ta: '10 முறை · கண்ணாடி முன் பயிற்சி',
    reps_en: '10 reps · mirror practice',
    youtubeId: 'bMhAHlg-Z68',
    youtubeTitle: 'Facial Paralysis and Smile Symmetry Exercises - Rehab and Revive',
    sourceLabel: 'Rehab & Revive · Facial PT',
    steps_ta: [
      'கண்ணாடியை கண் மட்டத்தில் நேராகப் பார்க்கவும்.',
      'இருபுறமும் அகலமாக புன்னகைத்து 5 நொடி நிற்கவும்.',
      'கன்னத்தில் காற்று நிரப்பி மெதுவாக அடைக்கவும்.',
      'உதட்டை குவித்து மெதுவாக ஊதவும்.',
    ],
    steps_en: [
      'Look straight into a mirror at comfortable eye level.',
      'Smile evenly on both sides and hold for 5 seconds.',
      'Puff cheeks gently with air and hold briefly.',
      'Pucker lips forward as if gently blowing a candle.',
    ],
  },
];

export interface MedicationItem {
  id: MedicationId;
  period: 'morning' | 'afternoon' | 'night';
  name_ta: string;
  name_en: string;
  purpose_ta: string;
  purpose_en: string;
}

export const MEDICATION_ITEMS: MedicationItem[] = [
  {
    id: 'med1',
    period: 'morning',
    name_ta: 'ரத்த அழுத்த மாத்திரை (Amlodipine)',
    name_en: 'Amlodipine (Blood Pressure)',
    purpose_ta: 'BP கட்டுப்பாடு · 1 மாத்திரை',
    purpose_en: 'Blood pressure control · 1 tablet',
  },
  {
    id: 'med2',
    period: 'morning',
    name_ta: 'ரத்தம் மெலிதாக்கும் ஆஸ்பிரின் (Ecosprin)',
    name_en: 'Ecosprin / Aspirin (Clot Prevention)',
    purpose_ta: 'ரத்தக் கட்டி தடுப்பு · 1 மாத்திரை',
    purpose_en: 'Clot prevention · 1 tablet',
  },
  {
    id: 'med3',
    period: 'afternoon',
    name_ta: 'நரம்பு விட்டமின் (Neurobion B-Complex)',
    name_en: 'Neurobion B-Complex (Nerve Support)',
    purpose_ta: 'நரம்பு புத்துணர்ச்சி · 1 மாத்திரை',
    purpose_en: 'Nerve recovery support · 1 tablet',
  },
  {
    id: 'med4',
    period: 'night',
    name_ta: 'கொலஸ்ட்ரால் மாத்திரை (Atorvastatin)',
    name_en: 'Atorvastatin (Cholesterol Control)',
    purpose_ta: 'ரத்தக்குழாய் பாதுகாப்பு · 1 மாத்திரை',
    purpose_en: 'Cholesterol control · 1 tablet',
  },
];

export interface SpeechWordCard {
  id: string;
  word_ta: string;
  word_en: string;
  phonetic: string;
  tip_ta: string;
  tip_en: string;
  category_ta: string;
  category_en: string;
}

export const SPEECH_WORDS: SpeechWordCard[] = [
  {
    id: 'sp-water',
    word_ta: 'தண்ணீர்',
    word_en: 'Water',
    phonetic: 'Thann-neer · WAH-ter',
    tip_ta: 'நாவை மேல் பல்லின் பின்புறம் வைத்து மெதுவாக “தண்-ணீர்” என உச்சரிக்கவும்.',
    tip_en: 'Round lips softly for “W”, or place tongue behind upper teeth for “Th”.',
    category_ta: 'அடிப்படைத் தேவை',
    category_en: 'Essentials',
  },
  {
    id: 'sp-hello',
    word_ta: 'வணக்கம்',
    word_en: 'Hello',
    phonetic: 'Va-nak-kam · heh-LOH',
    tip_ta: 'கீழ் உதட்டை லேசாக தொட்டு “வ”, பின் “ணக்-கம்” என தெளிவாகக் கூறவும்.',
    tip_en: 'Gentle breath for “H”, then press tongue tip to roof of mouth for “L”.',
    category_ta: 'அன்றாட வாழ்த்து',
    category_en: 'Greeting',
  },
  {
    id: 'sp-medicine',
    word_ta: 'மருந்து',
    word_en: 'Medicine',
    phonetic: 'Ma-run-thu · MED-ih-sin',
    tip_ta: 'இரு உதடுகளையும் இணைத்து “ம” எனத் தொடங்கி மூச்சு விட்டு முடிக்கவும்.',
    tip_en: 'Press lips gently together for “M”, and release softly on “sin”.',
    category_ta: 'மருத்துவம்',
    category_en: 'Medical',
  },
  {
    id: 'sp-family',
    word_ta: 'குடும்பம்',
    word_en: 'Family',
    phonetic: 'Ku-dum-bam · FAM-ih-lee',
    tip_ta: 'சிறிய இடைவெளி விட்டு “கு-டும்-பம்” என மூன்று அசைகளாக உச்சரிக்கவும்.',
    tip_en: 'Break into 3 gentle beats: FAM - ih - lee, with a relaxed smile.',
    category_ta: 'குடும்பம்',
    category_en: 'Family',
  },
  {
    id: 'sp-doctor',
    word_ta: 'மருத்துவர்',
    word_en: 'Doctor',
    phonetic: 'Ma-ruth-thu-var · DOCK-ter',
    tip_ta: 'ஆழ்ந்த மூச்சு எடுத்து, மெதுவாக எழுத்துக்களைப் பிரித்துச் சொல்லவும்.',
    tip_en: 'Touch tongue tip firmly behind upper teeth for clear “D”.',
    category_ta: 'மருத்துவம்',
    category_en: 'Medical',
  },
  {
    id: 'sp-thanks',
    word_ta: 'நன்றி',
    word_en: 'Thank You',
    phonetic: 'Nan-dri · THANK-yoo',
    tip_ta: 'நாக்கின் நுனியை மேல் பகுதியில் வைத்து “நன்-றி” என மென்மையாகச் சொல்லவும்.',
    tip_en: 'Place tongue lightly between teeth for “TH” and glide into “you”.',
    category_ta: 'அன்றாட வாழ்த்து',
    category_en: 'Courtesy',
  },
];

export interface MatchQuestion {
  prompt_ta: string;
  prompt_en: string;
  target_ta: string;
  target_en: string;
  emoji: string;
  options: Array<{ label_ta: string; label_en: string; emoji: string; isCorrect: boolean }>;
}

export const MATCH_QUESTIONS: MatchQuestion[] = [
  {
    prompt_ta: 'இந்தப் படத்திற்குரிய சரியான சொல் எது?',
    prompt_en: 'Select the word that matches this picture:',
    target_ta: 'தண்ணீர்',
    target_en: 'Water',
    emoji: '🥛',
    options: [
      { label_ta: 'ஆப்பிள்', label_en: 'Apple', emoji: '🍎', isCorrect: false },
      { label_ta: 'தண்ணீர்', label_en: 'Water', emoji: '🥛', isCorrect: true },
      { label_ta: 'மாத்திரை', label_en: 'Medicine', emoji: '💊', isCorrect: false },
    ],
  },
  {
    prompt_ta: 'மருத்துவர் பரிந்துரைத்ததற்குரிய படம் எது?',
    prompt_en: 'Select the matching item for health care:',
    target_ta: 'மாத்திரை',
    target_en: 'Medicine',
    emoji: '💊',
    options: [
      { label_ta: 'மாத்திரை', label_en: 'Medicine', emoji: '💊', isCorrect: true },
      { label_ta: 'கடிகாரம்', label_en: 'Clock', emoji: '⏰', isCorrect: false },
      { label_ta: 'புத்தகம்', label_en: 'Book', emoji: '📖', isCorrect: false },
    ],
  },
  {
    prompt_ta: 'சத்தான பழத்தைத் தேர்ந்தெடுக்கவும்:',
    prompt_en: 'Choose the heart-healthy fruit:',
    target_ta: 'ஆப்பிள்',
    target_en: 'Apple',
    emoji: '🍎',
    options: [
      { label_ta: 'தண்ணீர்', label_en: 'Water', emoji: '🥛', isCorrect: false },
      { label_ta: 'நாற்காலி', label_en: 'Chair', emoji: '🪑', isCorrect: false },
      { label_ta: 'ஆப்பிள்', label_en: 'Apple', emoji: '🍎', isCorrect: true },
    ],
  },
];

export const CAREGIVER_PHRASES = [
  { ta: 'எனக்கு தண்ணீர் வேண்டும்', en: 'I need some water please' },
  { ta: 'எனக்கு மாத்திரை நேரம் ஆகிவிட்டது', en: 'It is time for my medicine' },
  { ta: 'தயவுசெய்து உட்கார உதவுங்கள்', en: 'Please help me sit up' },
  { ta: 'எனக்கு கொஞ்சம் வலி உள்ளது', en: 'I am feeling some pain' },
  { ta: 'நான் இப்போது நலமாக உணர்கிறேன்', en: 'I am feeling better now' },
  { ta: 'உதவிக்கு மிக்க நன்றி', en: 'Thank you very much for helping' },
];

export type ResourceId = 'fast' | 'home_rehab' | 'brain_nutrition' | 'speech_tips';

export interface ResourceArticle {
  id: ResourceId;
  image: string;
  imageAlt: string;
  category_ta: string;
  category_en: string;
  title_ta: string;
  title_en: string;
  cardDesc_ta: string;
  cardDesc_en: string;
  summary_ta: string;
  summary_en: string;
  points_ta: string[];
  points_en: string[];
  ctaHref: string;
  ctaLabel_ta: string;
  ctaLabel_en: string;
}

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    id: 'fast',
    image: fastRecognitionImg,
    imageAlt: 'Clinical illustration showing cerebral artery health and stroke warning signs',
    category_ta: 'அவசர விழிப்புணர்வு · F.A.S.T.',
    category_en: 'Clinical Awareness · F.A.S.T.',
    title_ta: 'பக்கவாத அறிகுறிகளை உடனடியாக கண்டறியும் F.A.S.T. முறை',
    title_en: 'Recognizing Stroke Warning Signs With F.A.S.T.',
    cardDesc_ta: 'மூளை ரத்த ஓட்டத் தடை மற்றும் F.A.S.T. அறிகுறிகளை உடனடியாக கண்டறியும் வழிகாட்டி.',
    cardDesc_en: 'How arterial blockages affect brain tissue and how F.A.S.T. spotting saves lives.',
    summary_ta:
      'பக்கவாதம் ஏற்படும் போது முதல் 4.5 மணி நேரம் (Golden Window) மிக முக்கியமானது. கீழ்க்காணும் 4 அறிகுறிகளைக் கண்டால் உடனே 108 ஆம்புலன்ஸ் அழைக்கவும்.',
    summary_en:
      'Prompt medical care during the initial golden window preserves vital brain tissue. Check these four immediate clinical signs and call 108 without delay.',
    points_ta: [
      'F — Face (முகம்): சிரிக்கும்போது முகத்தின் ஒரு பக்கம் சாய்கிறதா எனப் பார்க்கவும்.',
      'A — Arms (கைகள்): இரு கைகளையும் உயர்த்தும்போது ஒரு கை கீழே விழுகிறதா?',
      'S — Speech (பேச்சு): சாதாரண வாக்கியத்தை தெளிவாகப் பேச முடியாமல் குழறுகிறதா?',
      'T — Time (நேரம்): இவற்றில் ஏதேனும் ஒன்று தெரிந்தால் உடனடியாக 108 அழைக்கவும்.',
    ],
    points_en: [
      'F — Face Drooping: Ask the person to smile and check if one side droops asymmetrically.',
      'A — Arm Weakness: Ask them to raise both arms; watch if one arm drifts downward.',
      'S — Speech Difficulty: Listen for slurred words, word-finding difficulty, or confusion.',
      'T — Time to Call 108: Record the time symptoms began and seek emergency hospital care immediately.',
    ],
    ctaHref: '#brain-explorer',
    ctaLabel_ta: '3D மூளை விளக்கத்தை பார்க்க',
    ctaLabel_en: 'Explore 3D Brain',
  },
  {
    id: 'brain_nutrition',
    image: brainNutritionImg,
    imageAlt: 'Fresh spinach greens, walnuts, crisp apple slices, and drinking water',
    category_ta: 'உணவு & நீர் · Nutrition',
    category_en: 'Nutrition & Hydration',
    title_ta: 'பக்கவாதத்திற்குப் பிந்தைய சத்தான உணவு',
    title_en: 'Healthy Diet & Hydration After Stroke',
    cardDesc_ta: '8 டம்ளர் தண்ணீர், கீரை, வால்நட் மற்றும் குறைந்த உப்பு உணவு முறைகள்.',
    cardDesc_en: 'Low-sodium, potassium-rich meals and hydration habits to protect arterial health.',
    summary_ta:
      'சரியான நீர்ச்சத்து மற்றும் குறைந்த உப்பு கொண்ட சத்தான உணவு மீண்டும் பக்கவாதம் வராமல் தடுக்க உதவும்.',
    summary_en:
      'Maintaining steady hydration and balanced potassium-rich foods supports healthy blood pressure and secondary stroke prevention.',
    points_ta: [
      'தினமும் 8 டம்ளர் சுத்தமான தண்ணீர் அருந்துவது ரத்த ஓட்டத்தை சீராக வைத்திருக்கும்.',
      'கீரை, ஆப்பிள், கொய்யா மற்றும் வால்நட் போன்ற நார்ச்சத்து உணவுகளைச் சேர்க்கவும்.',
      'உணவில் கூடுதல் உப்பு மற்றும் எண்ணெயில் பொரித்த உணவுகளைத் தவிர்க்கவும்.',
      'மருத்துவர் பரிந்துரைத்த BP மற்றும் கொலஸ்ட்ரால் மருந்துகளை தவறாமல் எடுத்துக்கொள்ளவும்.',
    ],
    points_en: [
      'Aim for 8 glasses of water spread evenly across the day to support blood circulation.',
      'Include leafy spinach, apples, guava, and walnuts for potassium and omega-3 support.',
      'Minimize added table salt and deep-fried snacks to keep arterial pressure stable.',
      'Always take prescribed blood pressure and cholesterol medications on schedule.',
    ],
    ctaHref: '#hydration-section',
    ctaLabel_ta: 'நீர் & உணவு பகுதிக்கு செல்ல',
    ctaLabel_en: 'Open Hydration Tracker',
  },
  {
    id: 'home_rehab',
    image: aboutRehabCareImg,
    imageAlt: 'Home physical therapy session assisting senior recovery mobility',
    category_ta: 'தினசரி உடற்பயிற்சி · Home Rehab',
    category_en: 'Daily Physiotherapy',
    title_ta: 'வீட்டில் செய்யக்கூடிய எளிய உடற்பயிற்சிகள்',
    title_en: 'Safe Exercises at Home',
    cardDesc_ta: '5 நொடி பிடிப்பு பயிற்சிகள் மூலம் கை, கால் தசைகளைப் பாதுகாப்பாக வலுப்படுத்தும் வழிகள்.',
    cardDesc_en: 'Gentle repetition strategies for rebuilding arm, leg, and facial movement safely.',
    summary_ta:
      'தினமும் சிறிய ஆனால் தொடர்ச்சியான பயிற்சிகள் மூளையின் நரம்பு இணைப்புகளை (Neuroplasticity) மீண்டும் கட்டமைக்க உதவுகின்றன.',
    summary_en:
      'Consistent, gentle repetition helps rewire motor pathways through neuroplasticity without over-fatiguing recovering muscles.',
    points_ta: [
      'பயிற்சிக்கு முன் நிலையான நாற்காலி மற்றும் தட்டையான மேசையைத் தயாராக வைக்கவும்.',
      '5 நொடி பிடிப்பு டைமரைப் பயன்படுத்தி கை விரல் மற்றும் கால் நீட்டிப்பு பயிற்சிகளை செய்யவும்.',
      'வலி அல்லது தலைச்சுற்றல் ஏற்பட்டால் உடனே ஓய்வெடுத்து தண்ணீர் அருந்தவும்.',
      'குடும்ப உதவியாளர் அருகில் இருக்கும்போது நடைப் பயிற்சியை மேற்கொள்ளவும்.',
    ],
    points_en: [
      'Prepare a sturdy chair with back support and a clear table before beginning.',
      'Use the built-in 5-second hold timer to pace hand grasp and leg extension repetitions.',
      'Pause immediately if you experience dizziness, sharpness, or shortness of breath.',
      'Practice standing and balance progressions alongside a family caregiver whenever possible.',
    ],
    ctaHref: '#physio-section',
    ctaLabel_ta: 'உடற்பயிற்சி பகுதிக்கு செல்ல',
    ctaLabel_en: 'Open Rehabilitation Exercises',
  },
  {
    id: 'speech_tips',
    image: speechTherapyImg,
    imageAlt: 'Supportive family speech therapy conversation practice at home',
    category_ta: 'பேச்சுப் பயிற்சி · Aphasia Care',
    category_en: 'Speech & Communication',
    title_ta: 'பேச்சுப் பயிற்சி ஆலோசனைகள்',
    title_en: 'Practical Speech Therapy Tips',
    cardDesc_ta: 'மெதுவான உச்சரிப்பு, சொல் அட்டைகள் மற்றும் குடும்பத்தினர் பொறுமையுடன் பேசும் முறை.',
    cardDesc_en: 'Practical daily vocal exercises, word pacing, and caregiver communication habits.',
    summary_ta:
      'மூளையின் பேச்சுப் பகுதிகள் (Broca / Wernicke) மீளும்போது தினமும் மெதுவான, அமைதியான சொல் பயிற்சி நம்பிக்கையை வளர்க்கும்.',
    summary_en:
      'Consistent, calm daily speech practice helps rebuild word retrieval and articulation after stroke without frustration.',
    points_ta: [
      'அமைதியான அறையில் தொலைக்காட்சி சத்தம் இல்லாமல் மெதுவாகப் பேசப் பழகுங்கள்.',
      'சிறிய அன்றாடச் சொற்களை (தண்ணீர், வணக்கம், மருந்து) மீண்டும் உச்சரிக்கவும்.',
      'பேச்சுப் பயிற்சி பகுதியில் உள்ள “மெதுவாக (Slow)” குரல் வசதியைப் பயன்படுத்தவும்.',
      'பேச சிரமமாக இருக்கும்போது “உடனடி வாக்கியங்கள்” பொத்தான்களைத் தொட்டுத் தெரிவிக்கவும்.',
    ],
    points_en: [
      'Practice in a quiet space without background television or competing noise.',
      'Start with short, familiar daily words and break longer phrases into gentle syllables.',
      'Use the Slow playback toggle inside the Speech cards to hear clear pronunciation.',
      'Keep quick caregiver phrase buttons handy whenever immediate needs must be shared clearly.',
    ],
    ctaHref: '#speech-section',
    ctaLabel_ta: 'பேச்சுப் பயிற்சிக்குச் செல்ல',
    ctaLabel_en: 'Open Speech Training',
  },
];
