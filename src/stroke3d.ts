import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import {
  buildSculptedBrainGeometry,
  createBrainTextures,
  ProceduralBrainTextures,
} from './brainProcedural';

// ============================================================================
// 1. GLTF/GLB MODEL SOURCE & LICENSE CREDITS
// Paste any freely licensed CC0 / CC-BY / Public Domain anatomical brain .glb URL
// below. If left as placeholder or if loading fails, the procedural high-detail
// brain atlas builds automatically as a fallback.
// ============================================================================
export const BRAIN_MODEL_URL: string = 'PASTE_MY_GLB_URL_HERE';

export interface BrainModelCredit {
  sourceMode: 'gltf' | 'procedural';
  title_en: string;
  title_ta: string;
  license_en: string;
  license_ta: string;
}

export const PROCEDURAL_MODEL_CREDIT: BrainModelCredit = {
  sourceMode: 'procedural',
  title_en: 'Procedural Cortical & Vascular Atlas (3D Simplex Ridged Gyri)',
  title_ta: 'நடைமுறை முப்பரிமாண மூளை & ரத்தக்குழாய் மாதிரி',
  license_en: 'CC0 / Open Medical Educational Geometry (Generated On-Device)',
  license_ta: 'CC0 / திறந்த மருத்துவக் கல்வி உரிமம் (சாதனத்தில் உருவாக்கப்பட்டது)',
};

export interface BrainStructureInfo {
  id: string;
  name_en: string;
  name_ta: string;
  category_en: string;
  category_ta: string;
  functions_en: string[];
  functions_ta: string[];
  strokeRelevance_en: string;
  strokeRelevance_ta: string;
  rehabTips_en: string;
  rehabTips_ta: string;
  meshIds: string[];
  defaultCameraPos: THREE.Vector3;
  defaultLookAt: THREE.Vector3;
}

// ============================================================================
// 2. SUPPORTED BRAIN REGIONS (10 CANONICAL REGIONS)
// ============================================================================
export const BRAIN_STRUCTURES: Record<string, BrainStructureInfo> = {
  'Brain-cerebral_hemisphere-left': {
    id: 'Brain-cerebral_hemisphere-left',
    name_en: 'Left Hemisphere',
    name_ta: 'இடது பெருமூளை அரைக்கோளம்',
    category_en: 'Telencephalon / Cerebrum',
    category_ta: 'பெருமூளை மண்டலம்',
    functions_en: [
      'Controls voluntary motor movement & sensations for the right side of the body',
      "Houses speech production (Broca's area) & comprehension (Wernicke's area)",
      'Governs logical reasoning, sequential analysis, and language syntax',
    ],
    functions_ta: [
      'உடலின் வலது பக்க உறுப்புகளின் அசைவுகள் மற்றும் உணர்ச்சிகளை இயக்குகிறது',
      'பேசும் திறன் (புரோகா பகுதி) மற்றும் மொழியைப் புரிந்து கொள்ளும் திறன் (வெர்னிக் பகுதி)',
      'தர்க்கரீதியான சிந்தனை, கணிதம் மற்றும் விவரங்களை பகுத்தாயும் திறன்',
    ],
    strokeRelevance_en:
      'Ischemic stroke in the Left Hemisphere (e.g. Left MCA occlusion) causes right-sided hemiplegia (weakness of right arm and leg), facial droop, and speech deficits (Aphasia).',
    strokeRelevance_ta:
      'இடது அரைக்கோளத்தில் ரத்த அடைப்பு ஏற்பட்டால் உடலின் வலது பக்க கை, கால் பலவீனம் (Right Hemiplegia), முகக் கோணல் மற்றும் பேசுவதில் தடுமாற்றம் (அஃபாசியா) உண்டாகிறது.',
    rehabTips_en:
      'Focus on right-hand mobility physiotherapy, structured daily Tamil speech repetition exercises, and bilateral arm reach drills.',
    rehabTips_ta:
      'வலது கை-கால் பிசியோதெரபி பயிற்சிகள், தினசரி தமிழ் வார்த்தை உச்சரிப்பு பயிற்சி மற்றும் கண்ணாடி முன் பேசும் பயிற்சி நலம் தரும்.',
    meshIds: ['left_frontal', 'left_parietal', 'left_temporal', 'left_occipital', 'left_motor_strip'],
    defaultCameraPos: new THREE.Vector3(-4.1, 1.55, 3.0),
    defaultLookAt: new THREE.Vector3(-0.45, 0.95, 0.05),
  },
  'Brain-cerebral_hemisphere-right': {
    id: 'Brain-cerebral_hemisphere-right',
    name_en: 'Right Hemisphere',
    name_ta: 'வலது பெருமூளை அரைக்கோளம்',
    category_en: 'Telencephalon / Cerebrum',
    category_ta: 'பெருமூளை மண்டலம்',
    functions_en: [
      'Controls movement and sensation for the left side of the body',
      'Spatial orientation, depth perception, and facial recognition',
      'Musical processing, creative intuition, and emotional tone of voice',
    ],
    functions_ta: [
      'உடலின் இடது பக்க உறுப்புகளின் இயக்கம் மற்றும் உணர்ச்சிகளை இயக்குகிறது',
      'இட வெளி உணர்வு, ஆழத்தை கணித்தல் மற்றும் முகங்களை அடையாளம் காணுதல்',
      'இசை ரசனை, படைப்பாற்றல் மற்றும் உணர்ச்சி வெளிப்பாடுகள்',
    ],
    strokeRelevance_en:
      'Causes left-sided hemiplegia (weakness or paralysis in left arm/leg), left-sided spatial neglect (inattention to left visual field), and depth misjudgment.',
    strokeRelevance_ta:
      'உடலின் இடது பக்க பக்கவாதம் (Left Hemiplegia), இடது பக்கத்தை கவனிக்கத் தவறும் நிலை (Left Neglect) போன்றவை ஏற்படலாம்.',
    rehabTips_en:
      'Left-side visual scanning exercises, mirror therapy, and bilateral arm movement using two-handed grasping.',
    rehabTips_ta:
      'இடது புறத்தை நோக்கி பார்க்கும் பயிற்சிகள், கண்ணாடி சிகிச்சை (Mirror Therapy) மற்றும் இரு கைகளையும் சேர்த்து இயக்கும் பயிற்சிகள்.',
    meshIds: ['right_frontal', 'right_parietal', 'right_temporal', 'right_occipital', 'right_motor_strip'],
    defaultCameraPos: new THREE.Vector3(4.1, 1.55, 3.0),
    defaultLookAt: new THREE.Vector3(0.45, 0.95, 0.05),
  },
  'Brain-frontal_lobe-left': {
    id: 'Brain-frontal_lobe-left',
    name_en: 'Frontal Lobe',
    name_ta: 'முன்பக்க மடல்',
    category_en: 'Cerebral Cortex',
    category_ta: 'பெருமூளை புறணி',
    functions_en: [
      'Voluntary motor planning & execution (Primary Motor Cortex)',
      "Expressive speech production (Broca's Area)",
      'Executive decisions, concentration, and emotional regulation',
    ],
    functions_ta: [
      'உடல் உறுப்புகளின் திட்டமிட்ட அசைவுகள் (Primary Motor Cortex)',
      'வார்த்தைகளை உச்சரித்துப் பேசும் திறன் (Broca Area)',
      'முடிவெடுத்தல், கவனம் செலுத்துதல் மற்றும் உணர்ச்சிக் கட்டுப்பாடு',
    ],
    strokeRelevance_en:
      'Damage impairs voluntary limb initiation on the opposite side and can produce expressive aphasia, where thoughts are intact but words are hard to form.',
    strokeRelevance_ta:
      'இங்கு பாதிப்பு ஏற்பட்டால் கை-கால்களை நகர்த்துவதில் சிரமமும், நினைக்கும் வார்த்தைகளை பேச்சாக மாற்ற இயலாத நிலை (புரோகா அஃபாசியா) ஏற்படுகிறது.',
    rehabTips_en:
      'Slow verbal pronunciation exercises, repetition of short syllables, and seated limb lift routines.',
    rehabTips_ta:
      'மெதுவான உச்சரிப்பு பயிற்சி ("அம்மா", "தண்ணீர்"), எளிய வாக்கியங்களை திரும்ப திரும்ப கூறுதல் மற்றும் கை தூக்கும் பயிற்சிகள்.',
    meshIds: ['left_frontal', 'left_motor_strip'],
    defaultCameraPos: new THREE.Vector3(-3.1, 1.65, 3.65),
    defaultLookAt: new THREE.Vector3(-0.55, 1.1, 0.65),
  },
  'Brain-parietal_lobe-left': {
    id: 'Brain-parietal_lobe-left',
    name_en: 'Parietal Lobe',
    name_ta: 'உச்சி மடல் (உணர்ச்சிப் பகுதி)',
    category_en: 'Cerebral Cortex',
    category_ta: 'பெருமூளை புறணி',
    functions_en: [
      'Somatosensory reception (touch, temperature, proprioception)',
      'Spatial awareness and hand-eye coordination',
      'Calculation, reading, and writing processing',
    ],
    functions_ta: [
      'தொடுதல், சூடு, குளிர் மற்றும் வலி உணர்ச்சிகளை உணர்தல்',
      'பொருட்களின் தூரம் மற்றும் இட அமைப்பை கணிக்கும் திறன்',
      'எழுதுதல், வாசித்தல் மற்றும் எண்களைக் கையாளும் திறன்',
    ],
    strokeRelevance_en:
      'May produce numbness or altered sensations in the opposite limbs, difficulty identifying objects by touch, or mild reading/writing challenges.',
    strokeRelevance_ta:
      'கையில் மரத்துப்போதல், தொடும் உணர்வு குறைதல், மற்றும் பொருட்களை கைகளால் தொட்டு இனம் காண்பதில் சிரமம் உண்டாகலாம்.',
    rehabTips_en:
      'Tactile sensory rehabilitation (touching sponges, textured fabrics, smooth coins), and guided hand coordination drills.',
    rehabTips_ta:
      'பஞ்சு, துணி, நாணயம் போன்ற பல்வேறு பொருட்களை தொட்டு உணரும் உணர்ச்சி மறுவாழ்வு பயிற்சிகள்.',
    meshIds: ['left_parietal'],
    defaultCameraPos: new THREE.Vector3(-2.9, 2.9, 1.85),
    defaultLookAt: new THREE.Vector3(-0.52, 1.35, -0.35),
  },
  'Brain-temporal_lobe-left': {
    id: 'Brain-temporal_lobe-left',
    name_en: 'Temporal Lobe',
    name_ta: 'பொட்டு மடல் (பேச்சு & கேட்டல்)',
    category_en: 'Cerebral Cortex',
    category_ta: 'பெருமூளை புறணி',
    functions_en: [
      "Language comprehension & decoding (Wernicke's Area)",
      'Auditory processing and sound recognition',
      'Verbal memory encoding via underlying hippocampus',
    ],
    functions_ta: [
      'மற்றவர்கள் பேசுவதைப் புரிந்து கொள்ளுதல் (Wernicke Area)',
      'கேட்டல் திறன் மற்றும் ஒலிகளை இனம் காணுதல்',
      'சொற்களை நினைவில் வைத்திருக்கும் நினைவாற்றல்',
    ],
    strokeRelevance_en:
      'Can cause receptive aphasia where speech remains fluent yet comprehension is reduced, alongside short-term auditory memory challenges.',
    strokeRelevance_ta:
      'மற்றவர்கள் பேசுவது புரியாமல் போதல், தவறான சொற்களைப் பயன்படுத்துதல் மற்றும் குறுகிய கால நினைவாற்றல் குறைபாடு ஏற்படலாம்.',
    rehabTips_en:
      'Picture-to-word matching cards, listening to calm audio stories, and repeating daily conversational questions.',
    rehabTips_ta:
      'படங்களைப் பார்த்து பெயர் சொல்லும் பயிற்சி (Flashcards), ஆடியோ கேட்டு பதில் சொல்லும் பயிற்சி ஆகியவை பயனுள்ளவை.',
    meshIds: ['left_temporal'],
    defaultCameraPos: new THREE.Vector3(-3.8, 0.75, 2.3),
    defaultLookAt: new THREE.Vector3(-0.78, 0.65, 0.15),
  },
  'Brain-occipital_lobe-left': {
    id: 'Brain-occipital_lobe-left',
    name_en: 'Occipital Lobe',
    name_ta: 'பின்மண்டை மடல் (பார்வை மையம்)',
    category_en: 'Cerebral Cortex · Visual Cortex',
    category_ta: 'பெருமூளை பார்வை மையம்',
    functions_en: [
      'Primary visual cortex decoding shapes, contrast, and motion',
      'Color recognition and visual depth tracking',
      'Relays visual fields to temporal & parietal reading networks',
    ],
    functions_ta: [
      'பொருட்களின் வடிவம், நிறம் மற்றும் அசைவுகளை உணரும் முதன்மைப் பார்வை மையம்',
      'பார்வைத் தெளிவு மற்றும் தூரக் கணிப்பு',
      'வாசிப்பதற்கும் முகங்களை அடையாளம் காண்பதற்கும் பார்வைத் தகவலை அனுப்புதல்',
    ],
    strokeRelevance_en:
      'Occipital stroke (PCA territory) causes visual field cuts such as homonymous hemianopia (blindness on one side of vision) or difficulty recognizing familiar faces/words.',
    strokeRelevance_ta:
      'இப்பகுதியில் பக்கவாதம் ஏற்பட்டால் இரு கண்களிலும் ஒரு பக்கப் பார்வை குறைதல் (Hemianopia), வாசிப்பதில் சிரமம் ஏற்படலாம்.',
    rehabTips_en:
      'Saccadic visual scanning exercises across contrasting targets, large-print reading cards, and bright even room lighting.',
    rehabTips_ta:
      'இரு பக்கமும் கண்களைத் திருப்பிப் பார்க்கும் பார்வைப் பயிற்சி, பெரிய எழுத்து அட்டைகள் வாசிப்பு மற்றும் நல்ல வெளிச்சம் உதவும்.',
    meshIds: ['left_occipital'],
    defaultCameraPos: new THREE.Vector3(-2.6, 1.35, -3.7),
    defaultLookAt: new THREE.Vector3(-0.42, 0.85, -1.0),
  },
  'Brain-cerebellum': {
    id: 'Brain-cerebellum',
    name_en: 'Cerebellum',
    name_ta: 'சிறுமூளை (சமநிலை மையம்)',
    category_en: 'Metencephalon / Hindbrain',
    category_ta: 'பின்மூளை & சமநிலை',
    functions_en: [
      'Precision motor timing and subconscious muscular coordination',
      'Postural equilibrium, balance maintenance, and smooth gait',
      'Rapid error correction during walking and fine-finger motor tasks',
    ],
    functions_ta: [
      'உடலின் அசைவுகளை நேர்த்தியாக ஒருங்கிணைத்தல்',
      'நேராக நிமிர்ந்து நிற்கும் சமநிலை (Balance) மற்றும் நடக்கும் விதம்',
      'விரல்களின் நுணுக்கமான அசைவுகள் மற்றும் தள்ளாடாமல் இருக்கும் திறன்',
    ],
    strokeRelevance_en:
      'Cerebellar stroke causes cerebellar ataxia (clumsiness, unsteady gait), severe vertigo, nausea, and intention tremor.',
    strokeRelevance_ta:
      'சிறுமூளை பக்கவாதம் ஏற்பட்டால் கால்கள் தள்ளாடுதல் (Ataxia), கடுமையான தலைசுற்றல் மற்றும் கை நடுக்கம் உண்டாகும்.',
    rehabTips_en:
      'Tandem stance balance training, seated trunk stability exercises, and heel-to-shin coordination drills.',
    rehabTips_ta:
      'சுவரைப் பிடித்து நேராக நிற்கும் சமநிலை பயிற்சி, கால்களை மாற்றி வைத்து நடக்கும் பயிற்சி.',
    meshIds: ['cerebellum_left', 'cerebellum_right', 'cerebellum_vermis'],
    defaultCameraPos: new THREE.Vector3(0.45, 0.05, -3.85),
    defaultLookAt: new THREE.Vector3(0, 0.15, -0.7),
  },
  'Brain-brainstem': {
    id: 'Brain-brainstem',
    name_en: 'Brainstem',
    name_ta: 'மூளைத்தண்டு (சுவாசம் & இதய இயக்கம்)',
    category_en: 'Midbrain, Pons & Medulla',
    category_ta: 'உயிர் காக்கும் நரம்புத்தண்டு',
    functions_en: [
      'Involuntary autonomic regulation of cardiac rate, breathing, and blood pressure',
      'Cranial nerve nuclei for facial movement, eye tracking, swallowing, and tongue',
      'Ascending reticular activating system controlling sleep and alertness',
    ],
    functions_ta: [
      'இதயத் துடிப்பு, மூச்சு விடுதல் மற்றும் ரத்த அழுத்தத்தை தானாக ஒழுங்குபடுத்துதல்',
      'விழுங்குதல், கண் அசைவு, நாக்கு இயக்கம் போன்ற முக நரம்புகள்',
      'விழிப்புணர்வு மற்றும் தூக்க சுழற்சியை கட்டுப்படுத்துதல்',
    ],
    strokeRelevance_en:
      'Critically urgent. May cause difficulty swallowing (dysphagia), double vision, breathing irregularities, or severe dizziness.',
    strokeRelevance_ta:
      'மிகவும் முக்கியமான பகுதி. உணவு விழுங்குவதில் சிரமம் (Dysphagia), இரட்டை பார்வை, மற்றும் மூச்சுத்திணறல் ஏற்படலாம்.',
    rehabTips_en:
      'Gentle chin-tuck swallowing exercises, guided diaphragmatic deep breathing, and oral-motor tongue strengthening.',
    rehabTips_ta:
      'மெதுவாக விழுங்கும் பயிற்சி (Chin-Tuck), சீரான மூச்சுப் பயிற்சி மற்றும் நாக்கு அசைவு பயிற்சிகள்.',
    meshIds: ['stem_midbrain', 'stem_pons', 'stem_medulla'],
    defaultCameraPos: new THREE.Vector3(1.65, -0.25, 3.65),
    defaultLookAt: new THREE.Vector3(0, -0.1, 0),
  },
  'Brain-corpus_callosum': {
    id: 'Brain-corpus_callosum',
    name_en: 'Corpus Callosum',
    name_ta: 'கார்பஸ் கலோசம் (இணைப்புப் பாலம்)',
    category_en: 'Interhemispheric White Matter Tract',
    category_ta: 'இரு அரைக்கோள இணைப்பு நரம்புப் பாலம்',
    functions_en: [
      'Dense 200M+ axon bridge connecting the Left and Right cerebral hemispheres',
      'Coordinates two-handed bilateral tasks and unified sensory perception',
      'Transfers visual and language signals instantaneously between hemispheres',
    ],
    functions_ta: [
      'இடது மற்றும் வலது மூளை அரைக்கோளங்களை இணைக்கும் 20 கோடிக்கும் மேற்பட்ட நரம்பு இழைப் பாலம்',
      'இரு கைகளையும் ஒரே நேரத்தில் ஒருங்கிணைத்துச் செயல்பட வைக்கிறது',
      'பார்வை மற்றும் மொழித் தகவல்களை இரு பக்கங்களுக்கும் உடனடியாகப் பரிமாறுகிறது',
    ],
    strokeRelevance_en:
      'Rare ACA territory infarction disrupting the corpus callosum can cause interhemispheric disconnection, making coordinated two-hand tasks difficult.',
    strokeRelevance_ta:
      'இப்பகுதியில் ரத்த ஓட்டத் தடை ஏற்பட்டால் இடது-வலது மூளை ஒருங்கிணைப்பு குறைந்து, இரு கைகளையும் சேர்த்துச் செயல்படுத்துவதில் சிரமம் ஏற்படலாம்.',
    rehabTips_en:
      'Bilateral symmetrical hand exercises (holding a towel or ball with both hands) stimulate interhemispheric reconnection.',
    rehabTips_ta:
      'இரு கைகளாலும் துண்டு அல்லது பந்தைப் பிடித்து உயர்த்தும் ஒருங்கிணைந்த பயிற்சிகள் நரம்பு இணைப்பை மேம்படுத்தும்.',
    meshIds: ['corpus_callosum'],
    defaultCameraPos: new THREE.Vector3(-2.4, 1.85, 2.75),
    defaultLookAt: new THREE.Vector3(0, 0.95, 0),
  },
  'Brain-vasculature-mca': {
    id: 'Brain-vasculature-mca',
    name_en: 'Middle Cerebral Artery (MCA)',
    name_ta: 'நடு மூளை தமனி (MCA - பக்கவாத மையம்)',
    category_en: 'Stroke-Affected Cerebrovascular Overlay',
    category_ta: 'பக்கவாதம் ஏற்படும் ரத்த ஓட்ட மண்டலம்',
    functions_en: [
      'Arterial conduits delivering ~20% of resting cardiac output to cerebral hemispheres',
      'Internal carotid ascends through skull base into Circle of Willis',
      'MCA supplies lateral cortex regions governing arm/face motor control and speech',
    ],
    functions_ta: [
      'இதயத்திலிருந்து கழுத்து வழியாக மூளைக்கு ஆக்சிஜன் நிறைந்த ரத்தத்தை கொண்டு செல்கிறது',
      'உள் கரோடிட் தமனி மூளையின் நடுப்பகுதியில் வில்லிஸ் வளையமாக பிரிகிறது',
      'நடு மூளை தமனி (MCA) பேச்சு மற்றும் கை-முக இயக்கப் பகுதிகளுக்கு ரத்தம் அளிக்கிறது',
    ],
    strokeRelevance_en:
      'The Middle Cerebral Artery (MCA) is the most common site of ischemic stroke when embolic clots dislodge from carotid plaque.',
    strokeRelevance_ta:
      'கழுத்தில் உருவாகும் ரத்த உறைவு கட்டி (Clot) உடைந்து, மிக அதிகமாக இந்த MCA ரத்தக்குழாயில் தான் அடைத்துக் கொள்கிறது (Ischemic Stroke).',
    rehabTips_en:
      'Immediate emergency hospital care within the golden window, blood pressure control, prescribed antiplatelets, and daily hydration.',
    rehabTips_ta:
      'அறிகுறிகள் தோன்றிய உடனே 108 அவசர மருத்துவ சிகிச்சை, ரத்த அழுத்தம் கட்டுப்பாடு மற்றும் போதுமான தண்ணீர் குடித்தல்.',
    meshIds: ['carotid_arteries', 'mca_artery', 'mca_branches', 'clot_mesh', 'plaque_mesh'],
    defaultCameraPos: new THREE.Vector3(-2.9, 0.9, 3.65),
    defaultLookAt: new THREE.Vector3(-0.35, 0.55, 0.15),
  },
};

// ============================================================================
// 3. MESH-NAME TO REGION-ID MAP (Synced with Raycaster, GLTF & Region Chips)
// ============================================================================
export const MESH_NAME_TO_REGION_ID: Record<string, string> = {
  // Procedural Anatomical Mesh Names
  left_frontal: 'Brain-frontal_lobe-left',
  left_motor_strip: 'Brain-frontal_lobe-left',
  left_parietal: 'Brain-parietal_lobe-left',
  left_temporal: 'Brain-temporal_lobe-left',
  left_occipital: 'Brain-occipital_lobe-left',
  right_frontal: 'Brain-cerebral_hemisphere-right',
  right_parietal: 'Brain-cerebral_hemisphere-right',
  right_temporal: 'Brain-cerebral_hemisphere-right',
  right_occipital: 'Brain-cerebral_hemisphere-right',
  right_motor_strip: 'Brain-cerebral_hemisphere-right',
  cerebellum_left: 'Brain-cerebellum',
  cerebellum_right: 'Brain-cerebellum',
  cerebellum_vermis: 'Brain-cerebellum',
  stem_midbrain: 'Brain-brainstem',
  stem_pons: 'Brain-brainstem',
  stem_medulla: 'Brain-brainstem',
  corpus_callosum: 'Brain-corpus_callosum',
  carotid_arteries: 'Brain-vasculature-mca',
  mca_artery: 'Brain-vasculature-mca',
  mca_branches: 'Brain-vasculature-mca',
  plaque_mesh: 'Brain-vasculature-mca',
  clot_mesh: 'Brain-vasculature-mca',

  // Standard Anatomical GLB / GLTF Aliases (matched case-insensitively below)
  left_hemisphere: 'Brain-cerebral_hemisphere-left',
  cerebral_hemisphere_left: 'Brain-cerebral_hemisphere-left',
  right_hemisphere: 'Brain-cerebral_hemisphere-right',
  cerebral_hemisphere_right: 'Brain-cerebral_hemisphere-right',
  frontal_lobe: 'Brain-frontal_lobe-left',
  parietal_lobe: 'Brain-parietal_lobe-left',
  temporal_lobe: 'Brain-temporal_lobe-left',
  occipital_lobe: 'Brain-occipital_lobe-left',
  cerebellum: 'Brain-cerebellum',
  brainstem: 'Brain-brainstem',
  pons: 'Brain-brainstem',
  medulla: 'Brain-brainstem',
  corpus_callosum_mesh: 'Brain-corpus_callosum',
  middle_cerebral_artery: 'Brain-vasculature-mca',
  mca: 'Brain-vasculature-mca',
};

export function resolveRegionIdFromMeshName(meshName: string): string | null {
  if (!meshName) return null;
  if (MESH_NAME_TO_REGION_ID[meshName]) return MESH_NAME_TO_REGION_ID[meshName];
  const lower = meshName.toLowerCase().replace(/[\s.-]+/g, '_');
  if (MESH_NAME_TO_REGION_ID[lower]) return MESH_NAME_TO_REGION_ID[lower];

  if (lower.includes('corpus') || lower.includes('callosum')) return 'Brain-corpus_callosum';
  if (lower.includes('cerebellum')) return 'Brain-cerebellum';
  if (lower.includes('brainstem') || lower.includes('pons') || lower.includes('medulla') || lower.includes('midbrain')) {
    return 'Brain-brainstem';
  }
  if (lower.includes('mca') || lower.includes('artery') || lower.includes('carotid') || lower.includes('vessel')) {
    return 'Brain-vasculature-mca';
  }
  if (lower.includes('right')) return 'Brain-cerebral_hemisphere-right';
  if (lower.includes('frontal')) return 'Brain-frontal_lobe-left';
  if (lower.includes('parietal')) return 'Brain-parietal_lobe-left';
  if (lower.includes('temporal')) return 'Brain-temporal_lobe-left';
  if (lower.includes('occipital')) return 'Brain-occipital_lobe-left';
  if (lower.includes('left')) return 'Brain-cerebral_hemisphere-left';
  return null;
}

export type PresetViewName =
  | 'left_lateral'
  | 'right_lateral'
  | 'anterior'
  | 'superior'
  | 'posterior'
  | 'sagittal'
  | 'full';

export interface Stroke3DController {
  focusStructure: (structureId: string) => void;
  setPresetView: (viewName: PresetViewName) => void;
  setGhostMode: (enabled: boolean) => void;
  setSplitHemispheres: (amount: number) => void;
  setStep: (stepIndex: number) => void;
  setStrokeType: (type: 'ischemic' | 'hemorrhagic') => void;
  toggleAutoRotate: () => boolean;
  rotateBy: (deltaAzimuthRad: number, deltaPolarRad: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setPaused: (paused: boolean) => void;
  resetView: () => void;
  dispose: () => void;
}

export interface Stroke3DOptions {
  onStructureSelect?: (info: BrainStructureInfo) => void;
  onStructureHover?: (
    info: BrainStructureInfo | null,
    pointerClient?: { x: number; y: number } | null
  ) => void;
  onLoadProgress?: (percent: number, source: 'gltf' | 'procedural') => void;
  onModelCreditChange?: (credit: BrainModelCredit) => void;
  onWebGLError?: (reason: string) => void;
}

// Regions that live deep inside the longitudinal/cerebral fissure: auto-ghost outer cortex on focus
const DEEP_INTERNAL_REGIONS = new Set([
  'Brain-corpus_callosum',
  'Brain-vasculature-mca',
  'Brain-brainstem',
]);

// ============================================================================
// 4. MAIN 3D BRAIN INITIALIZER (GLTF+DRACO -> PROCEDURAL FALLBACK)
// ============================================================================
export function initStroke3D(
  container: HTMLElement,
  options?: Stroke3DOptions
): Stroke3DController {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Probe WebGL availability & software renderer cleanly
  let isSoftwareGl = false;
  let webglAvailable = false;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl2 = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (gl2) {
      webglAvailable = true;
      const ext = gl2.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl2.RENDERER;
      const gpu = String(gl2.getParameter(param) || '');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      gl2.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webglAvailable = false;
  }

  if (!webglAvailable) {
    options?.onWebGLError?.('WebGL is unavailable on this browser or graphics driver.');
    const noop = () => {};
    return {
      focusStructure: noop,
      setPresetView: noop,
      setGhostMode: noop,
      setSplitHemispheres: noop,
      setStep: noop,
      setStrokeType: noop,
      toggleAutoRotate: () => false,
      rotateBy: noop,
      zoomIn: noop,
      zoomOut: noop,
      setPaused: noop,
      resetView: noop,
      dispose: noop,
    };
  }

  const hwThreads = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const devMem = typeof navigator !== 'undefined' ? (navigator as { deviceMemory?: number }).deviceMemory || 4 : 4;
  const isLowEndDevice = isSoftwareGl || hwThreads <= 4 || devMem <= 4;

  // 1. Renderer setup (ACESFilmic, sRGB, AA, DPR <= 2)
  const width = container.clientWidth || 720;
  const height = container.clientHeight || 480;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    options?.onWebGLError?.('Could not initialize 3D WebGL context.');
    const noop = () => {};
    return {
      focusStructure: noop,
      setPresetView: noop,
      setGhostMode: noop,
      setSplitHemispheres: noop,
      setStep: noop,
      setStrokeType: noop,
      toggleAutoRotate: () => false,
      rotateBy: noop,
      zoomIn: noop,
      zoomOut: noop,
      setPaused: noop,
      resetView: noop,
      dispose: noop,
    };
  }

  renderer.setSize(width, height);
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = !isLowEndDevice;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.innerHTML = '';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  // 2. Scene, Studio RoomEnvironment & Dark Navy Gradient Backdrop (#0B1220 -> #04070D)
  const scene = new THREE.Scene();
  const textures: ProceduralBrainTextures = createBrainTextures(renderer, isLowEndDevice);
  scene.background = textures.darkNavyGradientBg;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(-4.1, 1.55, 3.0);

  // 3. OrbitControls (Damping, zoom limits, 1-finger rotate, 2-finger pinch zoom)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl && !prefersReducedMotion;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.minDistance = 2.3;
  controls.maxDistance = 8.4;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI - 0.12;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  controls.target.set(-0.45, 0.95, 0.05);
  controls.update();

  // 4. 3-Point Studio Lighting + Warm Tissue Rim (Subsurface feel)
  const keyLight = new THREE.DirectionalLight(0xfff5ec, 2.05);
  keyLight.position.set(4.8, 6.2, 5.2);
  keyLight.castShadow = !isLowEndDevice;
  if (!isLowEndDevice) {
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 18;
    keyLight.shadow.camera.left = -3.8;
    keyLight.shadow.camera.right = 3.8;
    keyLight.shadow.camera.top = 3.8;
    keyLight.shadow.camera.bottom = -3.8;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  const hemiFillLight = new THREE.HemisphereLight(0xdbeafe, 0x0b1220, 1.1);
  scene.add(hemiFillLight);

  // Subsurface-like warm peach backlight + subtle cool teal rim separation
  const subSurfaceRimLight = new THREE.DirectionalLight(0xf6b9a8, 1.45);
  subSurfaceRimLight.position.set(-4.8, 1.8, -4.5);
  scene.add(subSurfaceRimLight);

  const rimTealLight = new THREE.DirectionalLight(0x2dd4bf, 0.72);
  rimTealLight.position.set(4.2, -1.2, -4.4);
  scene.add(rimTealLight);

  // 5. Realistic MeshPhysicalMaterial Factory (#D9B7A8 moist tissue look)
  const createdMaterials: THREE.Material[] = [];
  const createdGeometries: THREE.BufferGeometry[] = [];

  const trackMat = <T extends THREE.Material>(m: T): T => {
    createdMaterials.push(m);
    return m;
  };
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    createdGeometries.push(g);
    return g;
  };

  const makeCortexMaterial = (tintHex: number) =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: tintHex,
        map: textures.cortexAlbedo,
        normalMap: textures.cortexNormal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        bumpMap: textures.cortexBump,
        bumpScale: 0.032,
        vertexColors: true,
        roughness: 0.55,
        metalness: 0.02,
        clearcoat: 0.25,
        clearcoatRoughness: 0.42,
        sheen: 0.35,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color(0xf8e2d9),
        envMapIntensity: 0.85,
        transparent: true,
        opacity: 1.0,
      })
    );

  const makeCerebellumMaterial = () =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xd1ac9c,
        map: textures.cortexAlbedo,
        normalMap: textures.cerebellumNormal,
        normalScale: new THREE.Vector2(0.95, 0.95),
        bumpMap: textures.cerebellumBump,
        bumpScale: 0.025,
        vertexColors: true,
        roughness: 0.55,
        metalness: 0.02,
        clearcoat: 0.22,
        clearcoatRoughness: 0.48,
        sheen: 0.3,
        sheenColor: new THREE.Color(0xf4dcd2),
        transparent: true,
        opacity: 1.0,
      })
    );

  const makeStemMaterial = () =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xe6cdc2,
        roughness: 0.48,
        metalness: 0.02,
        clearcoat: 0.22,
        clearcoatRoughness: 0.45,
        sheen: 0.28,
        sheenColor: new THREE.Color(0xfff1eb),
        transparent: true,
        opacity: 1.0,
      })
    );

  const makeCorpusCallosumMaterial = () =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xf2e3dc,
        roughness: 0.42,
        metalness: 0.02,
        clearcoat: 0.25,
        clearcoatRoughness: 0.38,
        sheen: 0.3,
        sheenColor: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 1.0,
      })
    );

  // Vascular & stroke overlay materials
  const arteryMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xb91c1c,
      roughness: 0.32,
      metalness: 0.08,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
      transparent: true,
      opacity: 1.0,
    })
  );

  const plaqueMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.68,
      metalness: 0.06,
      transparent: true,
      opacity: 1.0,
    })
  );

  const clotMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      roughness: 0.42,
      metalness: 0.16,
      transparent: true,
      opacity: 1.0,
    })
  );

  const ischemicMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.2,
      roughness: 0.35,
      depthWrite: false,
    })
  );

  // 6. Root Hierarchy
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const brainGroup = new THREE.Group();
  brainGroup.position.set(0, 0.92, 0);
  rootGroup.add(brainGroup);

  const leftHemisphereGroup = new THREE.Group();
  const rightHemisphereGroup = new THREE.Group();
  const gltfAtlasGroup = new THREE.Group();
  brainGroup.add(leftHemisphereGroup);
  brainGroup.add(rightHemisphereGroup);
  brainGroup.add(gltfAtlasGroup);

  const anatomicalMeshes: Record<string, THREE.Mesh> = {};
  const interactiveMeshList: THREE.Mesh[] = [];
  const baseLeftMeshes: THREE.Mesh[] = [];
  const baseRightMeshes: THREE.Mesh[] = [];

  function registerMesh(id: string, mesh: THREE.Mesh, regionId: string) {
    mesh.name = id;
    mesh.userData = { id, structureKey: regionId };
    mesh.castShadow = !isLowEndDevice;
    mesh.receiveShadow = !isLowEndDevice;
    anatomicalMeshes[id] = mesh;
    interactiveMeshList.push(mesh);
  }

  // Always build stroke-affected MCA overlay + blood particles (aligned with both GLB & procedural)
  const vascularGroup = new THREE.Group();
  brainGroup.add(vascularGroup);

  const commonCarotidCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.45, -2.15, 0.02),
    new THREE.Vector3(0.5, -1.58, 0.12),
    new THREE.Vector3(0.52, -0.98, 0.2),
  ]);
  const commonCarotid = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(commonCarotidCurve, 28, 0.105, 14, false)),
    arteryMat.clone()
  );
  trackMat(commonCarotid.material as THREE.Material);
  vascularGroup.add(commonCarotid);
  registerMesh('carotid_arteries', commonCarotid, 'Brain-vasculature-mca');

  const internalCarotidCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.52, -0.98, 0.2),
    new THREE.Vector3(0.44, -0.45, 0.12),
    new THREE.Vector3(0.24, 0.02, 0.04),
    new THREE.Vector3(-0.08, 0.22, 0.16),
    new THREE.Vector3(-0.34, 0.28, 0.24),
  ]);
  const internalCarotid = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(internalCarotidCurve, 32, 0.082, 14, false)),
    arteryMat.clone()
  );
  trackMat(internalCarotid.material as THREE.Material);
  vascularGroup.add(internalCarotid);

  // Middle Cerebral Artery ascending along the Sylvian fissure over the Left Hemisphere
  const mcaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.34, 0.28, 0.24),
    new THREE.Vector3(-0.68, 0.26, 0.34),
    new THREE.Vector3(-0.98, 0.24, 0.26),
    new THREE.Vector3(-1.12, 0.42, 0.02),
    new THREE.Vector3(-1.08, 0.62, -0.28),
  ]);
  const mcaMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(mcaCurve, 34, 0.062, 12, false)),
    arteryMat.clone()
  );
  trackMat(mcaMesh.material as THREE.Material);
  vascularGroup.add(mcaMesh);
  registerMesh('mca_artery', mcaMesh, 'Brain-vasculature-mca');

  const mcaSubCurve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.98, 0.24, 0.26),
    new THREE.Vector3(-1.04, 0.56, 0.42),
    new THREE.Vector3(-0.95, 0.88, 0.46),
  ]);
  const mcaBranch1 = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(mcaSubCurve1, 18, 0.038, 10, false)),
    arteryMat.clone()
  );
  trackMat(mcaBranch1.material as THREE.Material);
  vascularGroup.add(mcaBranch1);
  registerMesh('mca_branches', mcaBranch1, 'Brain-vasculature-mca');

  const mcaSubCurve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.98, 0.24, 0.26),
    new THREE.Vector3(-1.06, -0.02, 0.44),
    new THREE.Vector3(-1.08, -0.22, 0.38),
  ]);
  const mcaBranch2 = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(mcaSubCurve2, 18, 0.034, 10, false)),
    arteryMat.clone()
  );
  trackMat(mcaBranch2.material as THREE.Material);
  vascularGroup.add(mcaBranch2);

  const plaqueMesh = new THREE.Mesh(
    trackGeo(new THREE.DodecahedronGeometry(0.13, 1).scale(1.15, 1.85, 0.85)),
    plaqueMat
  );
  plaqueMesh.position.set(0.55, -0.94, 0.22);
  vascularGroup.add(plaqueMesh);
  registerMesh('plaque_mesh', plaqueMesh, 'Brain-vasculature-mca');

  const clotMesh = new THREE.Mesh(
    trackGeo(new THREE.DodecahedronGeometry(0.1, 1).scale(1.1, 1.25, 0.9)),
    clotMat
  );
  clotMesh.position.set(-0.98, 0.24, 0.26);
  vascularGroup.add(clotMesh);
  registerMesh('clot_mesh', clotMesh, 'Brain-vasculature-mca');

  const ischemicZone = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.68, 22, 18).scale(0.68, 1.0, 0.92)),
    ischemicMat
  );
  ischemicZone.position.set(-0.78, 0.22, 0.14);
  leftHemisphereGroup.add(ischemicZone);

  // Flowing Red Blood Cells (InstancedMesh)
  const PARTICLE_COUNT = isLowEndDevice ? 28 : 42;
  const bloodCellGeo = trackGeo(new THREE.SphereGeometry(0.032, 8, 6).scale(1, 0.52, 1));
  const bloodCellMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.3,
      metalness: 0.1,
    })
  );
  const bloodParticles = new THREE.InstancedMesh(bloodCellGeo, bloodCellMat, PARTICLE_COUNT);
  bloodParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bloodParticles.frustumCulled = false;
  brainGroup.add(bloodParticles);

  const particlePath = new THREE.CurvePath<THREE.Vector3>();
  particlePath.add(commonCarotidCurve);
  particlePath.add(internalCarotidCurve);
  particlePath.add(mcaCurve);

  const particleOffsets = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particleOffsets[i] = i / PARTICLE_COUNT;
  }

  // Contact shadow grounding plane
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(5.6, 5.6));
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    })
  );
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -1.62;
  scene.add(shadowMesh);

  // Subtle focus ring
  const focusRingMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x2dd4bf, transparent: true, opacity: 0.55, wireframe: true })
  );
  const focusRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.28, 0.015, 10, 28)),
    focusRingMat
  );
  focusRing.rotation.x = Math.PI / 2;
  focusRing.position.set(-0.45, 0.95, 0.05);
  scene.add(focusRing);

  // 7. Procedural High-Detail Brain Builder (used directly or as GLB fallback)
  let proceduralBuilt = false;
  let gltfSplitLeftMeshes: THREE.Object3D[] = [];
  let gltfSplitRightMeshes: THREE.Object3D[] = [];

  function buildProceduralBrain() {
    if (proceduralBuilt) return;
    proceduralBuilt = true;

    const lobeDetail = isLowEndDevice ? 6 : 10;
    const cerebellumDetail = isLowEndDevice ? 6 : 8;

    // --- LEFT HEMISPHERE ANATOMICAL LOBES (Unified organic contour, split=0 interlock) ---
    const leftFrontalGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: -1,
        centerOffset: [-0.52, 0.24, 0.54],
        scale: [0.64, 0.68, 0.78],
        ridgeAmp: 0.048,
        medialClipX: 0.03,
      })
    );
    const leftFrontal = new THREE.Mesh(leftFrontalGeo, makeCortexMaterial(0xd9b7a8));
    leftFrontal.position.set(-0.52, 0.24, 0.54);
    leftHemisphereGroup.add(leftFrontal);
    registerMesh('left_frontal', leftFrontal, 'Brain-frontal_lobe-left');
    baseLeftMeshes.push(leftFrontal);

    const leftParietalGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: -1,
        centerOffset: [-0.52, 0.38, -0.34],
        scale: [0.64, 0.62, 0.72],
        ridgeAmp: 0.046,
        medialClipX: 0.03,
      })
    );
    const leftParietal = new THREE.Mesh(leftParietalGeo, makeCortexMaterial(0xd6b2a3));
    leftParietal.position.set(-0.52, 0.38, -0.34);
    leftHemisphereGroup.add(leftParietal);
    registerMesh('left_parietal', leftParietal, 'Brain-parietal_lobe-left');
    baseLeftMeshes.push(leftParietal);

    const leftTemporalGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: -1,
        centerOffset: [-0.74, -0.22, 0.14],
        scale: [0.48, 0.44, 0.84],
        ridgeAmp: 0.04,
        medialClipX: 0.2,
      })
    );
    const leftTemporal = new THREE.Mesh(leftTemporalGeo, makeCortexMaterial(0xdcb9aa));
    leftTemporal.position.set(-0.74, -0.22, 0.14);
    leftHemisphereGroup.add(leftTemporal);
    registerMesh('left_temporal', leftTemporal, 'Brain-temporal_lobe-left');
    baseLeftMeshes.push(leftTemporal);

    const leftOccipitalGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: -1,
        centerOffset: [-0.46, 0.04, -0.98],
        scale: [0.54, 0.52, 0.62],
        ridgeAmp: 0.042,
        medialClipX: 0.03,
      })
    );
    const leftOccipital = new THREE.Mesh(leftOccipitalGeo, makeCortexMaterial(0xd4b0a1));
    leftOccipital.position.set(-0.46, 0.04, -0.98);
    leftHemisphereGroup.add(leftOccipital);
    registerMesh('left_occipital', leftOccipital, 'Brain-occipital_lobe-left');
    baseLeftMeshes.push(leftOccipital);

    // --- RIGHT HEMISPHERE ANATOMICAL LOBES ---
    const rightFrontalGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: 1,
        centerOffset: [0.52, 0.24, 0.54],
        scale: [0.64, 0.68, 0.78],
        ridgeAmp: 0.048,
        medialClipX: 0.03,
      })
    );
    const rightFrontal = new THREE.Mesh(rightFrontalGeo, makeCortexMaterial(0xd9b7a8));
    rightFrontal.position.set(0.52, 0.24, 0.54);
    rightHemisphereGroup.add(rightFrontal);
    registerMesh('right_frontal', rightFrontal, 'Brain-cerebral_hemisphere-right');
    baseRightMeshes.push(rightFrontal);

    const rightParietalGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: 1,
        centerOffset: [0.52, 0.38, -0.34],
        scale: [0.64, 0.62, 0.72],
        ridgeAmp: 0.046,
        medialClipX: 0.03,
      })
    );
    const rightParietal = new THREE.Mesh(rightParietalGeo, makeCortexMaterial(0xd6b2a3));
    rightParietal.position.set(0.52, 0.38, -0.34);
    rightHemisphereGroup.add(rightParietal);
    registerMesh('right_parietal', rightParietal, 'Brain-cerebral_hemisphere-right');
    baseRightMeshes.push(rightParietal);

    const rightTemporalGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: 1,
        centerOffset: [0.74, -0.22, 0.14],
        scale: [0.48, 0.44, 0.84],
        ridgeAmp: 0.04,
        medialClipX: 0.2,
      })
    );
    const rightTemporal = new THREE.Mesh(rightTemporalGeo, makeCortexMaterial(0xdcb9aa));
    rightTemporal.position.set(0.74, -0.22, 0.14);
    rightHemisphereGroup.add(rightTemporal);
    registerMesh('right_temporal', rightTemporal, 'Brain-cerebral_hemisphere-right');
    baseRightMeshes.push(rightTemporal);

    const rightOccipitalGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: 1,
        centerOffset: [0.46, 0.04, -0.98],
        scale: [0.54, 0.52, 0.62],
        ridgeAmp: 0.042,
        medialClipX: 0.03,
      })
    );
    const rightOccipital = new THREE.Mesh(rightOccipitalGeo, makeCortexMaterial(0xd4b0a1));
    rightOccipital.position.set(0.46, 0.04, -0.98);
    rightHemisphereGroup.add(rightOccipital);
    registerMesh('right_occipital', rightOccipital, 'Brain-cerebral_hemisphere-right');
    baseRightMeshes.push(rightOccipital);

    // --- CORPUS CALLOSUM (Medial commissural arch inside longitudinal fissure) ---
    const ccCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.02, 0.58),
      new THREE.Vector3(0, 0.24, 0.34),
      new THREE.Vector3(0, 0.32, -0.04),
      new THREE.Vector3(0, 0.24, -0.42),
      new THREE.Vector3(0, 0.05, -0.62),
    ]);
    const ccGeo = trackGeo(new THREE.TubeGeometry(ccCurve, 32, 0.14, 14, false).scale(2.1, 0.72, 1.0));
    const ccMesh = new THREE.Mesh(ccGeo, makeCorpusCallosumMaterial());
    brainGroup.add(ccMesh);
    registerMesh('corpus_callosum', ccMesh, 'Brain-corpus_callosum');

    // --- CEREBELLUM (Finer parallel horizontal folia) ---
    const cerebLeftGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: cerebellumDetail,
        sideSign: -1,
        centerOffset: [-0.42, -0.58, -0.78],
        scale: [0.48, 0.38, 0.44],
        ridgeAmp: 0.018,
        medialClipX: 0.01,
        foliaOnly: true,
      })
    );
    const cerebellumLeft = new THREE.Mesh(cerebLeftGeo, makeCerebellumMaterial());
    cerebellumLeft.position.set(-0.42, -0.58, -0.78);
    brainGroup.add(cerebellumLeft);
    registerMesh('cerebellum_left', cerebellumLeft, 'Brain-cerebellum');

    const cerebRightGeo = trackGeo(
      buildSculptedBrainGeometry({
        detail: cerebellumDetail,
        sideSign: 1,
        centerOffset: [0.42, -0.58, -0.78],
        scale: [0.48, 0.38, 0.44],
        ridgeAmp: 0.018,
        medialClipX: 0.01,
        foliaOnly: true,
      })
    );
    const cerebellumRight = new THREE.Mesh(cerebRightGeo, makeCerebellumMaterial());
    cerebellumRight.position.set(0.42, -0.58, -0.78);
    brainGroup.add(cerebellumRight);
    registerMesh('cerebellum_right', cerebellumRight, 'Brain-cerebellum');

    const vermisGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 0.56, 16));
    const vermisMesh = new THREE.Mesh(vermisGeo, makeCerebellumMaterial());
    vermisMesh.position.set(0, -0.58, -0.82);
    vermisMesh.rotation.x = 0.25;
    brainGroup.add(vermisMesh);
    registerMesh('cerebellum_vermis', vermisMesh, 'Brain-cerebellum');

    // --- BRAINSTEM (Midbrain, Pons bulge, Medulla Oblongata) ---
    const midbrainGeo = trackGeo(new THREE.CylinderGeometry(0.21, 0.23, 0.38, 20));
    const midbrain = new THREE.Mesh(midbrainGeo, makeStemMaterial());
    midbrain.position.set(0, -0.34, -0.14);
    midbrain.rotation.x = 0.16;
    brainGroup.add(midbrain);
    registerMesh('stem_midbrain', midbrain, 'Brain-brainstem');

    const ponsGeo = trackGeo(new THREE.SphereGeometry(0.32, 24, 20).scale(0.86, 0.88, 0.92));
    const pons = new THREE.Mesh(ponsGeo, makeStemMaterial());
    pons.position.set(0, -0.68, -0.02);
    brainGroup.add(pons);
    registerMesh('stem_pons', pons, 'Brain-brainstem');

    const medullaGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.13, 0.72, 20));
    const medulla = new THREE.Mesh(medullaGeo, makeStemMaterial());
    medulla.position.set(0, -1.16, -0.12);
    medulla.rotation.x = -0.08;
    brainGroup.add(medulla);
    registerMesh('stem_medulla', medulla, 'Brain-brainstem');

    options?.onModelCreditChange?.(PROCEDURAL_MODEL_CREDIT);
    options?.onLoadProgress?.(100, 'procedural');
  }

  // 8. State, Ghosting/X-Ray, & 600ms Smooth Camera Ease State
  let currentStructureId = 'Brain-cerebral_hemisphere-left';
  let isXrayShellOn = true; // Highlights selected region opaque + 0.25 transparency on rest
  let hemisphereSplitAmount = 0;
  let autoRotate = false;
  let currentStep = 3;
  let isPaused = false;
  let disposed = false;

  // Timed 600ms cubic camera animation (auto-cancels on OrbitControls 'start')
  let camAnimActive = false;
  let camAnimStartTime = 0;
  const CAM_ANIM_DURATION_MS = prefersReducedMotion ? 0 : 600;
  const camStartPos = new THREE.Vector3();
  const camTargetPos = new THREE.Vector3(-4.1, 1.55, 3.0);
  const lookStartPos = new THREE.Vector3();
  const lookTargetPos = new THREE.Vector3(-0.45, 0.95, 0.05);

  function startCameraTransition(nextCam: THREE.Vector3, nextLook: THREE.Vector3) {
    if (CAM_ANIM_DURATION_MS === 0) {
      camera.position.copy(nextCam);
      controls.target.copy(nextLook);
      controls.update();
      camAnimActive = false;
      return;
    }
    camStartPos.copy(camera.position);
    lookStartPos.copy(controls.target);
    camTargetPos.copy(nextCam);
    lookTargetPos.copy(nextLook);
    camAnimStartTime = performance.now();
    camAnimActive = true;
  }

  controls.addEventListener('start', () => {
    camAnimActive = false;
    autoRotate = false;
  });

  function applyHighlightAndXray() {
    const selectedStructure = BRAIN_STRUCTURES[currentStructureId];
    const activeMeshIds = selectedStructure ? selectedStructure.meshIds : [];
    const forceInnerXray = DEEP_INTERNAL_REGIONS.has(currentStructureId);
    const shouldGhostOthers = isXrayShellOn || forceInnerXray;

    for (const [id, mesh] of Object.entries(anatomicalMeshes)) {
      const mat = mesh.material as THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
      if (!mat || !('emissive' in mat)) continue;

      const meshRegionId = mesh.userData?.structureKey;
      const isSelected =
        activeMeshIds.includes(id) || (meshRegionId && meshRegionId === currentStructureId);

      if (isSelected) {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
        mat.emissive.setHex(0x2dd4bf);
        mat.emissiveIntensity = 0.48;
      } else if (shouldGhostOthers) {
        mat.transparent = true;
        mat.opacity = 0.25;
        mat.depthWrite = false;
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      } else {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  }

  // 9. Attempt GLTF/GLB + DRACO Load First; Fall Back Cleanly to Procedural Brain
  const isCustomGlbUrl =
    Boolean(BRAIN_MODEL_URL) &&
    BRAIN_MODEL_URL !== 'PASTE_MY_GLB_URL_HERE' &&
    (BRAIN_MODEL_URL.startsWith('http') || BRAIN_MODEL_URL.startsWith('/'));

  let dracoLoader: DRACOLoader | null = null;
  let initAsyncFrame = 0;

  if (isCustomGlbUrl) {
    options?.onLoadProgress?.(10, 'gltf');
    void (async () => {
      try {
        const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/addons/loaders/DRACOLoader.js'),
        ]);
        if (disposed) return;

        dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load(
          BRAIN_MODEL_URL,
          (gltf: GLTF) => {
            if (disposed) return;
            const model = gltf.scene;

            // Normalize bounding size to match camera framing (~2.8 width)
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const scaleFactor = 2.8 / maxDim;
            model.position.sub(center).multiplyScalar(scaleFactor);
            model.scale.setScalar(scaleFactor);

            model.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                createdGeometries.push(mesh.geometry);
                const rawMat = mesh.material;
                // Upgrade basic untextured mesh materials to realistic moist tissue MeshPhysicalMaterial
                if (Array.isArray(rawMat)) {
                  rawMat.forEach((m) => createdMaterials.push(m));
                } else if (rawMat) {
                  createdMaterials.push(rawMat);
                  if (!(rawMat as THREE.MeshPhysicalMaterial).map) {
                    const phys = makeCortexMaterial(0xd9b7a8);
                    mesh.material = phys;
                  }
                }

                const mappedId =
                  resolveRegionIdFromMeshName(mesh.name) || 'Brain-cerebral_hemisphere-left';
                const cleanName = mesh.name || `gltf_part_${interactiveMeshList.length}`;
                registerMesh(cleanName, mesh, mappedId);

                // Track left/right half for Split Hemispheres slider
                const worldBox = new THREE.Box3().setFromObject(mesh);
                const meshCenter = worldBox.getCenter(new THREE.Vector3());
                if (mesh.name.toLowerCase().includes('left') || meshCenter.x < -0.1) {
                  mesh.userData.baseX = mesh.position.x;
                  gltfSplitLeftMeshes.push(mesh);
                } else if (mesh.name.toLowerCase().includes('right') || meshCenter.x > 0.1) {
                  mesh.userData.baseX = mesh.position.x;
                  gltfSplitRightMeshes.push(mesh);
                }
              }
            });

            gltfAtlasGroup.add(model);
            applyHighlightAndXray();
            options?.onModelCreditChange?.({
              sourceMode: 'gltf',
              title_en: (gltf.asset?.generator as string) || 'External Anatomical Brain Mesh (GLB)',
              title_ta: 'வெளிப்புற முப்பரிமாண மூளை மாதிரி (GLB)',
              license_en: (gltf.asset?.copyright as string) || 'CC-BY / CC0 Anatomical Model',
              license_ta: 'CC-BY / CC0 திறந்த மருத்துவ மாதிரி',
            });
            options?.onLoadProgress?.(100, 'gltf');
          },
          (progress) => {
            if (disposed) return;
            const pct =
              progress.total > 0
                ? Math.min(95, Math.round((progress.loaded / progress.total) * 100))
                : 45;
            options?.onLoadProgress?.(pct, 'gltf');
          },
          () => {
            if (disposed) return;
            // GLB failed -> fallback smoothly to procedural brain
            buildProceduralBrain();
            applyHighlightAndXray();
          }
        );
      } catch {
        if (disposed) return;
        buildProceduralBrain();
        applyHighlightAndXray();
      }
    })();
  } else {
    // Stage progress cleanly across two frames so skeleton loader % is visible & responsive
    options?.onLoadProgress?.(35, 'procedural');
    initAsyncFrame = requestAnimationFrame(() => {
      if (disposed) return;
      options?.onLoadProgress?.(75, 'procedural');
      initAsyncFrame = requestAnimationFrame(() => {
        if (disposed) return;
        buildProceduralBrain();
        applyHighlightAndXray();
      });
    });
  }

  // 10. Raycaster for Hover & Click Inspection
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredMesh: THREE.Mesh | null = null;
  let lastRaycastTime = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;

  const onPointerDown = (e: PointerEvent) => {
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
  };

  const onPointerMove = (e: PointerEvent) => {
    const now = performance.now();
    if (now - lastRaycastTime < 40) return;
    lastRaycastTime = now;

    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(interactiveMeshList, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const structKey =
        hit.userData?.structureKey || resolveRegionIdFromMeshName(hit.name) || '';
      const info = BRAIN_STRUCTURES[structKey] || null;
      hoveredMesh = hit;
      renderer.domElement.style.cursor = 'pointer';
      options?.onStructureHover?.(info, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else if (hoveredMesh) {
      hoveredMesh = null;
      renderer.domElement.style.cursor = 'grab';
      options?.onStructureHover?.(null, null);
    }
  };

  const onPointerLeave = () => {
    if (hoveredMesh) {
      hoveredMesh = null;
      options?.onStructureHover?.(null, null);
    }
  };

  const onPointerClick = (e: MouseEvent) => {
    const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
    if (dist > 6) return;

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(interactiveMeshList, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const structKey =
        hit.userData?.structureKey || resolveRegionIdFromMeshName(hit.name);
      if (structKey && BRAIN_STRUCTURES[structKey]) {
        controller.focusStructure(structKey);
      }
    }
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('click', onPointerClick);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);

  const onContextLost = (e: Event) => {
    e.preventDefault();
    options?.onWebGLError?.('WebGL rendering context was interrupted.');
  };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost, false);

  // 11. ResizeObserver
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cr = entry.contentRect;
      if (cr.width > 0 && cr.height > 0) {
        camera.aspect = cr.width / cr.height;
        camera.updateProjectionMatrix();
        renderer.setSize(cr.width, cr.height);
      }
    }
  });
  resizeObserver.observe(container);

  // 12. Stroke Steps Choreography
  interface StepView {
    camPos: THREE.Vector3;
    target: THREE.Vector3;
    clotPos: THREE.Vector3;
    clotVisible: boolean;
    plaqueScale: number;
    ischemicIntensity: number;
    focusRingPos: THREE.Vector3;
    focusColor: number;
  }

  const stepViews: StepView[] = [
    {
      camPos: new THREE.Vector3(2.2, -0.35, 4.1),
      target: new THREE.Vector3(0.45, -0.8, 0.15),
      clotPos: new THREE.Vector3(0.52, -1.4, 0.15),
      clotVisible: false,
      plaqueScale: 0.01,
      ischemicIntensity: 0.1,
      focusRingPos: new THREE.Vector3(0.52, -0.1, 0.2),
      focusColor: 0x38bdf8,
    },
    {
      camPos: new THREE.Vector3(1.85, -0.5, 3.35),
      target: new THREE.Vector3(0.5, -0.85, 0.2),
      clotPos: new THREE.Vector3(0.55, -0.88, 0.22),
      clotVisible: true,
      plaqueScale: 1.0,
      ischemicIntensity: 0.18,
      focusRingPos: new THREE.Vector3(0.55, 0, 0.22),
      focusColor: 0xf59e0b,
    },
    {
      camPos: new THREE.Vector3(1.4, 0.35, 4.2),
      target: new THREE.Vector3(0.25, 0.2, 0.1),
      clotPos: new THREE.Vector3(0.24, 0.02, 0.04),
      clotVisible: true,
      plaqueScale: 0.85,
      ischemicIntensity: 0.32,
      focusRingPos: new THREE.Vector3(0.24, 0.94, 0.04),
      focusColor: 0xf97316,
    },
    {
      camPos: new THREE.Vector3(-4.0, 1.45, 3.05),
      target: new THREE.Vector3(-0.75, 1.05, 0.18),
      clotPos: new THREE.Vector3(-0.98, 0.24, 0.26),
      clotVisible: true,
      plaqueScale: 0.85,
      ischemicIntensity: 1.0,
      focusRingPos: new THREE.Vector3(-0.98, 1.16, 0.26),
      focusColor: 0xef4444,
    },
    {
      camPos: new THREE.Vector3(-3.2, 1.25, 4.35),
      target: new THREE.Vector3(-0.4, 0.85, 0),
      clotPos: new THREE.Vector3(-0.98, 0.24, 0.26),
      clotVisible: false,
      plaqueScale: 0.28,
      ischemicIntensity: 0.16,
      focusRingPos: new THREE.Vector3(-0.45, 0.95, 0.05),
      focusColor: 0x10b981,
    },
  ];

  // Zero-GC scratch objects inside loop
  const _scratchMatrix = new THREE.Matrix4();
  const _scratchPos = new THREE.Vector3();
  const _zoomDir = new THREE.Vector3();
  const _spherical = new THREE.Spherical();
  const _offset = new THREE.Vector3();

  let frameId = 0;
  let lastTime = performance.now();

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed || isPaused) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function tick() {
    if (disposed || isPaused) return;

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    controls.autoRotate = autoRotate && !prefersReducedMotion;
    controls.autoRotateSpeed = 1.1;

    // Smooth hemisphere split separation
    const splitTargetLeft = -hemisphereSplitAmount * 0.65;
    const splitTargetRight = hemisphereSplitAmount * 0.65;
    leftHemisphereGroup.position.x = THREE.MathUtils.damp(
      leftHemisphereGroup.position.x,
      splitTargetLeft,
      7,
      dt
    );
    rightHemisphereGroup.position.x = THREE.MathUtils.damp(
      rightHemisphereGroup.position.x,
      splitTargetRight,
      7,
      dt
    );

    if (gltfSplitLeftMeshes.length > 0 || gltfSplitRightMeshes.length > 0) {
      for (const m of gltfSplitLeftMeshes) {
        const bx = (m.userData.baseX as number) || 0;
        m.position.x = THREE.MathUtils.damp(m.position.x, bx + splitTargetLeft, 7, dt);
      }
      for (const m of gltfSplitRightMeshes) {
        const bx = (m.userData.baseX as number) || 0;
        m.position.x = THREE.MathUtils.damp(m.position.x, bx + splitTargetRight, 7, dt);
      }
    }

    // Smooth ~600ms cubic ease camera animation
    if (camAnimActive) {
      const elapsed = now - camAnimStartTime;
      const rawT = Math.min(1, elapsed / Math.max(1, CAM_ANIM_DURATION_MS));
      // Cubic ease-in-out
      const easeT =
        rawT < 0.5 ? 4 * rawT * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      camera.position.lerpVectors(camStartPos, camTargetPos, easeT);
      controls.target.lerpVectors(lookStartPos, lookTargetPos, easeT);

      if (rawT >= 1) {
        camAnimActive = false;
      }
    }

    controls.update();

    // Subtle vascular pulse + ischemic glow
    const view = stepViews[currentStep] || stepViews[3];
    const pulse = prefersReducedMotion ? 0.6 : 0.5 + 0.5 * Math.sin(now * 0.0038);
    ischemicMat.opacity = 0.08 + view.ischemicIntensity * 0.24 * pulse;
    ischemicMat.emissiveIntensity = 0.18 + view.ischemicIntensity * 0.62 * pulse;

    focusRing.rotation.z += prefersReducedMotion ? 0 : 1.1 * dt;

    // Flowing arterial blood cells
    if (!prefersReducedMotion) {
      const speed = currentStep === 3 ? 0.04 : 0.15;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particleOffsets[i] = (particleOffsets[i] + speed * dt) % 1.0;
        let p = particleOffsets[i];
        if (currentStep === 3 && p > 0.65 && p < 0.96) {
          p = 0.65 - (i % 5) * 0.015;
        }
        particlePath.getPointAt(Math.max(0, Math.min(1, p)), _scratchPos);
        _scratchMatrix.identity();
        _scratchMatrix.setPosition(_scratchPos);
        bloodParticles.setMatrixAt(i, _scratchMatrix);
      }
      bloodParticles.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }
  tick();

  // 13. Controller Public API
  const controller: Stroke3DController = {
    focusStructure: (structureId: string) => {
      const struct = BRAIN_STRUCTURES[structureId];
      if (!struct) return;
      currentStructureId = structureId;
      focusRing.position.copy(struct.defaultLookAt);
      startCameraTransition(struct.defaultCameraPos, struct.defaultLookAt);
      applyHighlightAndXray();
      options?.onStructureSelect?.(struct);
    },

    setPresetView: (viewName: PresetViewName) => {
      switch (viewName) {
        case 'left_lateral':
          startCameraTransition(
            new THREE.Vector3(-4.2, 1.35, 0.4),
            new THREE.Vector3(-0.2, 0.92, 0)
          );
          break;
        case 'right_lateral':
          startCameraTransition(
            new THREE.Vector3(4.2, 1.35, 0.4),
            new THREE.Vector3(0.2, 0.92, 0)
          );
          break;
        case 'anterior':
          startCameraTransition(
            new THREE.Vector3(0, 1.15, 4.65),
            new THREE.Vector3(0, 0.9, 0)
          );
          break;
        case 'superior':
          startCameraTransition(
            new THREE.Vector3(0, 5.1, 0.35),
            new THREE.Vector3(0, 0.92, 0)
          );
          break;
        case 'posterior':
          startCameraTransition(
            new THREE.Vector3(0, 1.05, -4.65),
            new THREE.Vector3(0, 0.85, 0)
          );
          break;
        case 'sagittal':
          controller.setSplitHemispheres(0.8);
          startCameraTransition(
            new THREE.Vector3(-2.4, 1.15, 3.1),
            new THREE.Vector3(0, 0.92, 0)
          );
          break;
        case 'full':
          isXrayShellOn = false;
          applyHighlightAndXray();
          startCameraTransition(
            new THREE.Vector3(-3.3, 1.65, 4.5),
            new THREE.Vector3(0, 0.78, 0)
          );
          break;
      }
    },

    setGhostMode: (enabled: boolean) => {
      isXrayShellOn = enabled;
      applyHighlightAndXray();
    },

    setSplitHemispheres: (amount: number) => {
      hemisphereSplitAmount = Math.max(0, Math.min(1.5, amount));
    },

    setStep: (stepIndex: number) => {
      currentStep = Math.max(0, Math.min(stepViews.length - 1, stepIndex));
      const view = stepViews[currentStep];
      if (!view) return;

      startCameraTransition(view.camPos, view.target);
      clotMesh.position.copy(view.clotPos);
      clotMesh.visible = view.clotVisible;
      plaqueMesh.scale.set(
        view.plaqueScale * 1.15,
        view.plaqueScale * 1.85,
        view.plaqueScale * 0.85
      );
      focusRing.position.copy(view.focusRingPos);
      focusRingMat.color.setHex(view.focusColor);

      if (currentStep === 3) {
        controller.focusStructure('Brain-vasculature-mca');
      }
    },

    setStrokeType: (type: 'ischemic' | 'hemorrhagic') => {
      if (type === 'hemorrhagic') {
        ischemicMat.color.setHex(0xdc2626);
        ischemicMat.emissive.setHex(0xdc2626);
      } else {
        ischemicMat.color.setHex(0x0284c7);
        ischemicMat.emissive.setHex(0x0284c7);
      }
    },

    toggleAutoRotate: () => {
      if (prefersReducedMotion) return false;
      autoRotate = !autoRotate;
      return autoRotate;
    },

    rotateBy: (deltaAzimuthRad: number, deltaPolarRad: number) => {
      camAnimActive = false;
      _offset.copy(camera.position).sub(controls.target);
      _spherical.setFromVector3(_offset);
      _spherical.theta += deltaAzimuthRad;
      _spherical.phi = Math.max(
        controls.minPolarAngle,
        Math.min(controls.maxPolarAngle, _spherical.phi + deltaPolarRad)
      );
      _offset.setFromSpherical(_spherical);
      camera.position.copy(controls.target).add(_offset);
      controls.update();
    },

    zoomIn: () => {
      camAnimActive = false;
      _zoomDir.subVectors(controls.target, camera.position);
      const dist = _zoomDir.length();
      if (dist > controls.minDistance + 0.25) {
        camera.position.addScaledVector(_zoomDir.normalize(), 0.55);
        controls.update();
      }
    },

    zoomOut: () => {
      camAnimActive = false;
      _zoomDir.subVectors(controls.target, camera.position);
      const dist = _zoomDir.length();
      if (dist < controls.maxDistance - 0.25) {
        camera.position.addScaledVector(_zoomDir.normalize(), -0.55);
        controls.update();
      }
    },

    setPaused: (paused: boolean) => {
      if (isPaused === paused) return;
      isPaused = paused;
      if (isPaused) {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
      } else if (!disposed) {
        lastTime = performance.now();
        tick();
      }
    },

    resetView: () => {
      autoRotate = false;
      hemisphereSplitAmount = 0;
      isXrayShellOn = true;
      controller.focusStructure('Brain-cerebral_hemisphere-left');
    },

    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(initAsyncFrame);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('click', onPointerClick);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      createdGeometries.forEach((g) => g.dispose());
      createdMaterials.forEach((m) => m.dispose());
      textures.dispose();
      envTexture.dispose();
      dracoLoader?.dispose();
      renderer.dispose();
      container.innerHTML = '';
    },
  };

  return controller;
}

/* ============================================================================
 * 14. LIGHTWEIGHT HERO 3D BRAIN PREVIEW (SLOW ROTATION + SCROLL SCALE/PARALLAX)
 * ========================================================================= */
export interface HeroBrainPreviewController {
  setScrollProgress: (progress: number) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
}

export function initHeroBrainPreview(
  container: HTMLElement,
  options?: { onReady?: () => void; onError?: (reason: string) => void }
): HeroBrainPreviewController {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let width = container.clientWidth || 640;
  let height = container.clientHeight || 420;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    options?.onError?.(err instanceof Error ? err.message : 'WebGL unavailable');
    return {
      setScrollProgress: () => {},
      setPaused: () => {},
      dispose: () => {},
    };
  }

  const gl = renderer.getContext();
  const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
  const glRendererStr = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '')
    : '';
  const isSoftwareGl = /swiftshader|llvmpipe|software/i.test(glRendererStr);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1.0 : 1.75));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const textures: ProceduralBrainTextures = createBrainTextures(renderer, isSoftwareGl);
  scene.background = null;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
  camera.position.set(0, 0.55, 5.15);
  camera.lookAt(0, 0.15, 0);

  // Soft studio key + warm subsurface + teal glow rim
  const keyLight = new THREE.DirectionalLight(0xfff5ec, 2.0);
  keyLight.position.set(4.5, 5.8, 5.2);
  scene.add(keyLight);

  const hemiLight = new THREE.HemisphereLight(0xd1fae5, 0x0b1220, 0.95);
  scene.add(hemiLight);

  const warmBackLight = new THREE.DirectionalLight(0xf6b9a8, 1.35);
  warmBackLight.position.set(-4.5, 1.8, -4.2);
  scene.add(warmBackLight);

  const tealRimLight = new THREE.DirectionalLight(0x10b981, 1.45);
  tealRimLight.position.set(4.2, -1.0, -4.0);
  scene.add(tealRimLight);

  const tealPointGlow = new THREE.PointLight(0x2dd4bf, 2.4, 9, 1.6);
  tealPointGlow.position.set(-1.6, -1.3, 1.8);
  scene.add(tealPointGlow);

  const createdGeometries: THREE.BufferGeometry[] = [];
  const createdMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    createdGeometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    createdMaterials.push(m);
    return m;
  };

  const makeCortexMat = (tint: number) =>
    trackMat(
      new THREE.MeshPhysicalMaterial({
        color: tint,
        map: textures.cortexAlbedo,
        normalMap: textures.cortexNormal,
        normalScale: new THREE.Vector2(0.85, 0.85),
        bumpMap: textures.cortexBump,
        bumpScale: 0.032,
        vertexColors: true,
        roughness: 0.52,
        metalness: 0.02,
        clearcoat: 0.28,
        clearcoatRoughness: 0.4,
        sheen: 0.35,
        sheenColor: new THREE.Color(0xf8e2d9),
        envMapIntensity: 0.9,
      })
    );

  const brainGroup = new THREE.Group();
  brainGroup.position.set(0, 0.16, 0);
  scene.add(brainGroup);

  const lobeDetail = isSoftwareGl ? 6 : 8;
  const lobeSpecs: Array<{
    sideSign: -1 | 1;
    offset: [number, number, number];
    scale: [number, number, number];
    ridge: number;
    clip: number;
    tint: number;
    folia?: boolean;
  }> = [
    { sideSign: -1, offset: [-0.52, 0.24, 0.54], scale: [0.64, 0.68, 0.78], ridge: 0.048, clip: 0.03, tint: 0xd9b7a8 },
    { sideSign: -1, offset: [-0.52, 0.38, -0.34], scale: [0.64, 0.62, 0.72], ridge: 0.046, clip: 0.03, tint: 0xd6b2a3 },
    { sideSign: -1, offset: [-0.74, -0.22, 0.14], scale: [0.48, 0.44, 0.84], ridge: 0.04, clip: 0.2, tint: 0xdcb9aa },
    { sideSign: -1, offset: [-0.46, 0.04, -0.98], scale: [0.54, 0.52, 0.62], ridge: 0.042, clip: 0.03, tint: 0xd4b0a1 },
    { sideSign: 1, offset: [0.52, 0.24, 0.54], scale: [0.64, 0.68, 0.78], ridge: 0.048, clip: 0.03, tint: 0xd9b7a8 },
    { sideSign: 1, offset: [0.52, 0.38, -0.34], scale: [0.64, 0.62, 0.72], ridge: 0.046, clip: 0.03, tint: 0xd6b2a3 },
    { sideSign: 1, offset: [0.74, -0.22, 0.14], scale: [0.48, 0.44, 0.84], ridge: 0.04, clip: 0.2, tint: 0xdcb9aa },
    { sideSign: 1, offset: [0.46, 0.04, -0.98], scale: [0.54, 0.52, 0.62], ridge: 0.042, clip: 0.03, tint: 0xd4b0a1 },
  ];

  for (const s of lobeSpecs) {
    const geo = trackGeo(
      buildSculptedBrainGeometry({
        detail: lobeDetail,
        sideSign: s.sideSign,
        centerOffset: s.offset,
        scale: s.scale,
        ridgeAmp: s.ridge,
        medialClipX: s.clip,
      })
    );
    const mesh = new THREE.Mesh(geo, makeCortexMat(s.tint));
    mesh.position.set(s.offset[0], s.offset[1], s.offset[2]);
    brainGroup.add(mesh);
  }

  // Cerebellum + Brainstem
  const cereMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd1ac9c,
      map: textures.cortexAlbedo,
      normalMap: textures.cerebellumNormal,
      bumpMap: textures.cerebellumBump,
      bumpScale: 0.025,
      vertexColors: true,
      roughness: 0.54,
      clearcoat: 0.24,
    })
  );
  for (const sx of [-1, 1] as const) {
    const cg = trackGeo(
      buildSculptedBrainGeometry({
        detail: 6,
        sideSign: sx,
        centerOffset: [sx * 0.44, -0.66, -0.78],
        scale: [0.42, 0.33, 0.42],
        ridgeAmp: 0.018,
        medialClipX: 0.04,
        foliaOnly: true,
      })
    );
    const cm = new THREE.Mesh(cg, cereMat);
    cm.position.set(sx * 0.44, -0.66, -0.78);
    brainGroup.add(cm);
  }

  const stemGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.13, 0.95, 16));
  const stemMat = trackMat(
    new THREE.MeshPhysicalMaterial({ color: 0xe6cdc2, roughness: 0.48, clearcoat: 0.2 })
  );
  const stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemMesh.position.set(0, -0.82, -0.22);
  stemMesh.rotation.x = 0.22;
  brainGroup.add(stemMesh);

  let disposed = false;
  let paused = false;
  let frameId = 0;
  let scrollProgress = 0;
  let baseAngle = -0.58;
  let lastTime = performance.now();

  const ro = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (!rect || rect.width < 10 || rect.height < 10 || disposed) return;
    width = rect.width;
    height = rect.height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  });
  ro.observe(container);

  function tick() {
    if (disposed || paused) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    if (!prefersReducedMotion) {
      baseAngle += 0.24 * dt;
    }

    const scrollAngle = prefersReducedMotion ? 0 : scrollProgress * 0.85;
    const scaleBoost = prefersReducedMotion ? 1.0 : 1.0 + scrollProgress * 0.09;
    brainGroup.rotation.y = baseAngle + scrollAngle;
    brainGroup.rotation.x = prefersReducedMotion ? 0.08 : 0.08 + scrollProgress * 0.12;
    brainGroup.scale.setScalar(scaleBoost);

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      frameId = window.setTimeout(() => {
        if (!disposed && !paused) tick();
      }, 90);
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }

  renderer.render(scene, camera);
  options?.onReady?.();
  if (!prefersReducedMotion) {
    tick();
  }

  return {
    setScrollProgress: (progress: number) => {
      scrollProgress = Math.max(0, Math.min(1, progress));
      if (prefersReducedMotion && !disposed) {
        renderer.render(scene, camera);
      }
    },
    setPaused: (nextPaused: boolean) => {
      if (paused === nextPaused) return;
      paused = nextPaused;
      if (paused) {
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
      } else if (!disposed && !prefersReducedMotion) {
        lastTime = performance.now();
        tick();
      }
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      createdGeometries.forEach((g) => g.dispose());
      createdMaterials.forEach((m) => m.dispose());
      textures.dispose();
      envTexture.dispose();
      renderer.dispose();
      container.innerHTML = '';
    },
  };
}
