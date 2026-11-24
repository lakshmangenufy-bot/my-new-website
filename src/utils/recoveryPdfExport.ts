import { jsPDF } from 'jspdf';
import type { Language } from '../data/rehabContent';

export interface PdfExerciseSummary {
  title_ta: string;
  title_en: string;
  reps_ta: string;
  reps_en: string;
  done: boolean;
}

export interface PdfMedicationSummary {
  name_ta: string;
  name_en: string;
  periodLabel_ta: string;
  periodLabel_en: string;
  taken: boolean;
}

export interface PdfNoteSummary {
  dateKey: string;
  label: string;
  text: string;
  updatedAt?: string;
}

export interface PdfWeekDaySummary {
  shortLabel: string;
  pct: number;
  isToday: boolean;
  isFuture: boolean;
}

export interface RecoverySummaryPdfInput {
  lang: Language;
  dateKey: string;
  formattedDate: string;
  exportedAtLabel: string;
  profileName: string;
  caregiverName: string;
  caregiverPhone: string;
  recoveryFocus: 'mobility' | 'speech' | 'medications' | 'brain';
  progressPct: number;
  finishedMilestones: number;
  totalMilestones: number;
  exercises: PdfExerciseSummary[];
  medications: PdfMedicationSummary[];
  waterCount: number;
  waterGoal: number;
  practicedSpeechCount: number;
  totalSpeechCount: number;
  practicedWordLabels: string[];
  todayNote: { text: string; updatedAt: string } | null;
  recentNotes: PdfNoteSummary[];
  weekDays: PdfWeekDaySummary[];
}

const PAGE_W = 1240;
const PAGE_H = 1754;
const MARGIN_X = 64;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const TOP_SAFE = 60;
const BOTTOM_SAFE = PAGE_H - 92;
const FONT_STACK = "'Noto Sans', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif";

const FOCUS_LABELS: Record<RecoverySummaryPdfInput['recoveryFocus'], { en: string; ta: string }> = {
  mobility: { en: 'Hand & Leg Mobility', ta: 'கை & கால் இயக்கம்' },
  speech: { en: 'Speech & Clarity', ta: 'பேச்சு & தெளிவு' },
  medications: { en: 'Medication Consistency', ta: 'மருந்து ஒழுங்கு' },
  brain: { en: '3D Brain Education', ta: '3D மூளைக் கல்வி' },
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string
): string[] {
  ctx.font = font;
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      lines.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
          current = '';
        }
        // Break overly long unbroken tokens gracefully
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width <= maxWidth) {
              chunk += ch;
            } else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

export async function downloadRecoverySummaryPdf(input: RecoverySummaryPdfInput): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 450)),
    ]);
  }

  const isTa = input.lang === 'ta';
  const pages: HTMLCanvasElement[] = [];

  const createPageCanvas = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to initialize canvas 2D context for PDF export.');
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.textBaseline = 'top';
    pages.push(canvas);
    return { canvas, ctx };
  };

  let { ctx } = createPageCanvas();
  let y = TOP_SAFE;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight <= BOTTOM_SAFE) return;
    ({ ctx } = createPageCanvas());
    y = TOP_SAFE;

    // Compact continuation header on subsequent pages
    ctx.fillStyle = '#1F6F63';
    ctx.font = `600 20px ${FONT_STACK}`;
    ctx.fillText(
      isTa ? 'StrokeCare AI — தினசரி மீட்புச் சுருக்கம் (தொடர்ச்சி)' : 'StrokeCare AI — Daily Recovery Summary (Continued)',
      MARGIN_X,
      y
    );
    ctx.fillStyle = '#52606D';
    ctx.font = `400 17px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillText(input.formattedDate, PAGE_W - MARGIN_X, y + 2);
    ctx.textAlign = 'left';

    y += 38;
    ctx.strokeStyle = '#D9E4E0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, y);
    ctx.lineTo(PAGE_W - MARGIN_X, y);
    ctx.stroke();
    y += 28;
  };

  // =========================================================================
  // 1. HEADER BANNER
  // =========================================================================
  const bannerH = 148;
  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, bannerH, 24);
  ctx.fillStyle = '#1F6F63';
  ctx.fill();

  ctx.fillStyle = '#D1FAE5';
  ctx.font = `600 18px ${FONT_STACK}`;
  ctx.fillText(
    isTa ? 'STROKECARE AI · தினசரி மறுவாழ்வு அறிக்கை' : 'STROKECARE AI · DAILY RECOVERY REPORT',
    MARGIN_X + 32,
    y + 26
  );

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText(
    isTa ? 'தினசரி மீட்பு சுருக்கம்' : 'Daily Recovery Summary',
    MARGIN_X + 32,
    y + 56
  );

  ctx.fillStyle = '#E6FFFA';
  ctx.font = `400 19px ${FONT_STACK}`;
  ctx.fillText(
    `${input.formattedDate}  ·  ${isTa ? 'உருவாக்கப்பட்ட நேரம்' : 'Generated'}: ${input.exportedAtLabel}`,
    MARGIN_X + 32,
    y + 104
  );

  y += bannerH + 28;

  // =========================================================================
  // 2. PATIENT PROFILE + OVERALL COMPLETION ROW (2 SIDE-BY-SIDE CARDS)
  // =========================================================================
  const colGap = 24;
  const halfW = (CONTENT_W - colGap) / 2;
  const topCardH = 210;

  // Left Card: Patient & Caregiver Profile
  drawRoundedRect(ctx, MARGIN_X, y, halfW, topCardH, 20);
  ctx.fillStyle = '#F2F7F6';
  ctx.fill();
  ctx.strokeStyle = '#D5E4DF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#1F6F63';
  ctx.font = `700 18px ${FONT_STACK}`;
  ctx.fillText(isTa ? 'நோயாளி & பராமரிப்பாளர் விவரம்' : 'Patient & Caregiver Profile', MARGIN_X + 24, y + 22);

  const focusLabel = isTa ? FOCUS_LABELS[input.recoveryFocus].ta : FOCUS_LABELS[input.recoveryFocus].en;
  const profileRows: Array<[string, string]> = [
    [isTa ? 'பெயர்' : 'Name', input.profileName.trim() || (isTa ? 'குறிப்பிடப்படவில்லை' : 'Not set')],
    [isTa ? 'கவனம்' : 'Focus', focusLabel],
    [
      isTa ? 'பராமரிப்பாளர்' : 'Caregiver',
      input.caregiverName.trim()
        ? `${input.caregiverName.trim()}${input.caregiverPhone.trim() ? ` (${input.caregiverPhone.trim()})` : ''}`
        : input.caregiverPhone.trim() || (isTa ? 'சேர்க்கப்படவில்லை' : 'Not set'),
    ],
  ];

  let py = y + 60;
  for (const [k, v] of profileRows) {
    ctx.fillStyle = '#3A4753';
    ctx.font = `600 18px ${FONT_STACK}`;
    ctx.fillText(`${k}:`, MARGIN_X + 24, py);

    ctx.fillStyle = '#0F1F2E';
    ctx.font = `600 19px ${FONT_STACK}`;
    const valueLines = wrapTextLines(ctx, v, halfW - 170, ctx.font);
    ctx.fillText(valueLines[0] || v, MARGIN_X + 148, py - 1);
    py += 44;
  }

  // Right Card: Completion Overview
  const rightX = MARGIN_X + halfW + colGap;
  drawRoundedRect(ctx, rightX, y, halfW, topCardH, 20);
  ctx.fillStyle = '#F2F7F6';
  ctx.fill();
  ctx.strokeStyle = '#D5E4DF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#1F6F63';
  ctx.font = `700 18px ${FONT_STACK}`;
  ctx.fillText(isTa ? 'இன்றைய மொத்த முன்னேற்றம்' : 'Overall Daily Progress', rightX + 24, y + 22);

  ctx.fillStyle = '#0F1F2E';
  ctx.font = `700 48px ${FONT_STACK}`;
  ctx.fillText(`${input.progressPct}%`, rightX + 24, y + 58);

  ctx.fillStyle = '#3A4753';
  ctx.font = `500 20px ${FONT_STACK}`;
  ctx.fillText(
    isTa
      ? `${input.totalMilestones}-ல் ${input.finishedMilestones} இலக்குகள் நிறைவு`
      : `${input.finishedMilestones} of ${input.totalMilestones} daily goals completed`,
    rightX + 150,
    y + 76
  );

  // Progress bar
  const barX = rightX + 24;
  const barY = y + 124;
  const barW = halfW - 48;
  drawRoundedRect(ctx, barX, barY, barW, 18, 9);
  ctx.fillStyle = '#D2E3DE';
  ctx.fill();

  if (input.progressPct > 0) {
    const fillW = Math.max(18, (barW * Math.min(100, input.progressPct)) / 100);
    drawRoundedRect(ctx, barX, barY, fillW, 18, 9);
    ctx.fillStyle = '#1F6F63';
    ctx.fill();
  }

  // Sub-stats line
  const exDoneCount = input.exercises.filter((e) => e.done).length;
  const medDoneCount = input.medications.filter((m) => m.taken).length;
  ctx.fillStyle = '#0F1F2E';
  ctx.font = `600 17px ${FONT_STACK}`;
  ctx.fillText(
    isTa
      ? `பயிற்சி: ${exDoneCount}/${input.exercises.length}  ·  மருந்து: ${medDoneCount}/${input.medications.length}  ·  நீர்: ${input.waterCount}/${input.waterGoal}`
      : `Physio: ${exDoneCount}/${input.exercises.length}  ·  Meds: ${medDoneCount}/${input.medications.length}  ·  Water: ${input.waterCount}/${input.waterGoal}  ·  Speech: ${input.practicedSpeechCount}/${input.totalSpeechCount}`,
    rightX + 24,
    y + 162
  );

  y += topCardH + 28;

  // =========================================================================
  // 3. PHYSIOTHERAPY & MEDICATIONS CHECKLISTS
  // =========================================================================
  const listRowH = 62;
  const exCardH = 74 + input.exercises.length * listRowH;
  const medCardH = 74 + input.medications.length * listRowH;
  const sectionH = Math.max(exCardH, medCardH);
  ensureSpace(sectionH + 24);

  // Exercises Card
  drawRoundedRect(ctx, MARGIN_X, y, halfW, sectionH, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#DCE5E3';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0F1F2E';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText(isTa ? 'தினசரி உடற்பயிற்சிகள்' : 'Physiotherapy Exercises', MARGIN_X + 24, y + 22);

  let rowY = y + 68;
  for (const ex of input.exercises) {
    drawRoundedRect(ctx, MARGIN_X + 20, rowY, halfW - 40, 50, 12);
    ctx.fillStyle = ex.done ? '#E3F1ED' : '#F8FAFC';
    ctx.fill();

    // Status pill
    const pillText = ex.done ? (isTa ? 'முடிந்தது' : 'Done') : isTa ? 'நிலுவை' : 'Pending';
    ctx.font = `700 16px ${FONT_STACK}`;
    const pillW = Math.max(82, ctx.measureText(pillText).width + 24);
    drawRoundedRect(ctx, MARGIN_X + halfW - 28 - pillW, rowY + 9, pillW, 32, 16);
    ctx.fillStyle = ex.done ? '#1F6F63' : '#E2E8F0';
    ctx.fill();
    ctx.fillStyle = ex.done ? '#FFFFFF' : '#3A4753';
    ctx.textAlign = 'center';
    ctx.fillText(pillText, MARGIN_X + halfW - 28 - pillW / 2, rowY + 15);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#0F1F2E';
    ctx.font = `600 18px ${FONT_STACK}`;
    const label = isTa ? ex.title_ta : ex.title_en;
    const clipped = wrapTextLines(ctx, label, halfW - pillW - 76, ctx.font)[0] || label;
    ctx.fillText(clipped, MARGIN_X + 34, rowY + 14);
    rowY += listRowH;
  }

  // Medications Card
  drawRoundedRect(ctx, rightX, y, halfW, sectionH, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#DCE5E3';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0F1F2E';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText(isTa ? 'மருந்து அட்டவணை' : 'Medications Checklist', rightX + 24, y + 22);

  rowY = y + 68;
  for (const med of input.medications) {
    drawRoundedRect(ctx, rightX + 20, rowY, halfW - 40, 50, 12);
    ctx.fillStyle = med.taken ? '#E3F1ED' : '#F8FAFC';
    ctx.fill();

    const pillText = med.taken ? (isTa ? 'எடுத்தது' : 'Taken') : isTa ? 'நிலுவை' : 'Pending';
    ctx.font = `700 16px ${FONT_STACK}`;
    const pillW = Math.max(82, ctx.measureText(pillText).width + 24);
    drawRoundedRect(ctx, rightX + halfW - 28 - pillW, rowY + 9, pillW, 32, 16);
    ctx.fillStyle = med.taken ? '#15803D' : '#E2E8F0';
    ctx.fill();
    ctx.fillStyle = med.taken ? '#FFFFFF' : '#3A4753';
    ctx.textAlign = 'center';
    ctx.fillText(pillText, rightX + halfW - 28 - pillW / 2, rowY + 15);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#0F1F2E';
    ctx.font = `600 17px ${FONT_STACK}`;
    const medLabel = `${isTa ? med.periodLabel_ta : med.periodLabel_en}: ${isTa ? med.name_ta : med.name_en}`;
    const clippedMed = wrapTextLines(ctx, medLabel, halfW - pillW - 76, ctx.font)[0] || medLabel;
    ctx.fillText(clippedMed, rightX + 34, rowY + 14);
    rowY += listRowH;
  }

  y += sectionH + 28;

  // =========================================================================
  // 4. HYDRATION & SPEECH PRACTICE ROW
  // =========================================================================
  const hsH = 162;
  ensureSpace(hsH + 24);

  // Hydration Card
  drawRoundedRect(ctx, MARGIN_X, y, halfW, hsH, 20);
  ctx.fillStyle = '#F0F9FF';
  ctx.fill();
  ctx.strokeStyle = '#BAE6FD';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0369A1';
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(isTa ? 'தண்ணீர் அளவு' : 'Hydration Tracker', MARGIN_X + 24, y + 22);

  ctx.fillStyle = '#0F1F2E';
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText(
    isTa ? `${input.waterCount} / ${input.waterGoal} டம்ளர்` : `${input.waterCount} / ${input.waterGoal} glasses`,
    MARGIN_X + 24,
    y + 58
  );

  // 8 glass indicators
  const glassW = (halfW - 48 - 7 * 8) / 8;
  for (let i = 0; i < input.waterGoal; i++) {
    const gx = MARGIN_X + 24 + i * (glassW + 8);
    drawRoundedRect(ctx, gx, y + 114, glassW, 20, 6);
    ctx.fillStyle = i < input.waterCount ? '#0284C7' : '#DBEAFE';
    ctx.fill();
  }

  // Speech Card
  drawRoundedRect(ctx, rightX, y, halfW, hsH, 20);
  ctx.fillStyle = '#FFFBEB';
  ctx.fill();
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#B45309';
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(isTa ? 'பேச்சுப் பயிற்சி' : 'Speech Practice', rightX + 24, y + 22);

  ctx.fillStyle = '#0F1F2E';
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillText(
    isTa
      ? `${input.practicedSpeechCount} / ${input.totalSpeechCount} சொற்கள்`
      : `${input.practicedSpeechCount} / ${input.totalSpeechCount} words`,
    rightX + 24,
    y + 58
  );

  const wordsText =
    input.practicedWordLabels.length > 0
      ? `${isTa ? 'பயிற்சி செய்தவை' : 'Practiced'}: ${input.practicedWordLabels.join(', ')}`
      : isTa
      ? 'இன்று இன்னும் சொற்கள் குறிக்கப்படவில்லை (இலக்கு: 3+)'
      : 'No words logged yet today (Daily goal: 3+ words)';
  ctx.fillStyle = '#3A4753';
  ctx.font = `500 17px ${FONT_STACK}`;
  const wordLines = wrapTextLines(ctx, wordsText, halfW - 48, ctx.font);
  ctx.fillText(wordLines[0] || wordsText, rightX + 24, y + 114);

  y += hsH + 28;

  // =========================================================================
  // 5. WEEKLY ACTIVITY STRIP
  // =========================================================================
  const weekCardH = 160;
  ensureSpace(weekCardH + 24);

  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, weekCardH, 20);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#DCE5E3';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#0F1F2E';
  ctx.font = `700 22px ${FONT_STACK}`;
  ctx.fillText(isTa ? 'இந்த வாரத் தொடர்ச்சி' : 'This Week Activity', MARGIN_X + 24, y + 20);

  const dayCount = Math.max(1, input.weekDays.length);
  const dayGap = 14;
  const dayW = (CONTENT_W - 48 - dayGap * (dayCount - 1)) / dayCount;
  input.weekDays.forEach((d, idx) => {
    const dx = MARGIN_X + 24 + idx * (dayW + dayGap);
    const dy = y + 62;
    drawRoundedRect(ctx, dx, dy, dayW, 74, 14);
    ctx.fillStyle = d.isFuture
      ? '#F8FAFC'
      : d.pct >= 100
      ? '#E3F1ED'
      : d.isToday
      ? '#F2F7F6'
      : '#F8FAFC';
    ctx.fill();
    if (d.isToday) {
      ctx.strokeStyle = '#1F6F63';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.fillStyle = '#3A4753';
    ctx.font = `600 17px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText(d.shortLabel, dx + dayW / 2, dy + 12);

    ctx.fillStyle = d.isFuture ? '#94A3B8' : d.pct >= 100 ? '#1F6F63' : '#0F1F2E';
    ctx.font = `700 22px ${FONT_STACK}`;
    ctx.fillText(d.isFuture ? '—' : `${d.pct}%`, dx + dayW / 2, dy + 40);
    ctx.textAlign = 'left';
  });

  y += weekCardH + 28;

  // =========================================================================
  // 6. PERSONAL NOTES ("HOW I FELT")
  // =========================================================================
  const noteFont = `400 20px ${FONT_STACK}`;
  const noteMaxW = CONTENT_W - 48;
  const todayNoteText =
    input.todayNote?.text?.trim() ||
    (isTa
      ? 'இன்றைய தனிப்பட்ட குறிப்பு எதுவும் சேர்க்கப்படவில்லை.'
      : 'No personal reflection note recorded for today.');
  const todayNoteLines = wrapTextLines(ctx, todayNoteText, noteMaxW, noteFont);
  const noteCardH = 86 + todayNoteLines.length * 30;
  ensureSpace(noteCardH + 24);

  drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, noteCardH, 20);
  ctx.fillStyle = '#F2F7F6';
  ctx.fill();
  ctx.strokeStyle = '#D5E4DF';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#1F6F63';
  ctx.font = `700 21px ${FONT_STACK}`;
  ctx.fillText(
    isTa ? 'இன்று நான் உணர்ந்த விதம் (தனிப்பட்ட குறிப்பு)' : 'How I Felt Today (Personal Note)',
    MARGIN_X + 24,
    y + 22
  );

  if (input.todayNote?.updatedAt) {
    ctx.fillStyle = '#52606D';
    ctx.font = `600 17px ${FONT_STACK}`;
    ctx.textAlign = 'right';
    ctx.fillText(
      isTa ? `சேமிக்கப்பட்டது · ${input.todayNote.updatedAt}` : `Saved · ${input.todayNote.updatedAt}`,
      MARGIN_X + CONTENT_W - 24,
      y + 24
    );
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = input.todayNote?.text?.trim() ? '#0F1F2E' : '#52606D';
  ctx.font = noteFont;
  let ny = y + 64;
  for (const line of todayNoteLines) {
    ctx.fillText(line, MARGIN_X + 24, ny);
    ny += 30;
  }

  y += noteCardH + 24;

  // Recent earlier notes from the week (excluding today)
  const pastNotes = input.recentNotes.filter((n) => n.dateKey !== input.dateKey && n.text.trim().length > 0);
  if (pastNotes.length > 0) {
    ensureSpace(80);
    ctx.fillStyle = '#0F1F2E';
    ctx.font = `700 21px ${FONT_STACK}`;
    ctx.fillText(
      isTa ? 'முந்தைய நாட்களின் குறிப்புகள்' : 'Earlier Notes This Week',
      MARGIN_X,
      y
    );
    y += 36;

    for (const past of pastNotes) {
      const pLines = wrapTextLines(ctx, past.text.trim(), CONTENT_W - 48, `400 19px ${FONT_STACK}`);
      const pCardH = 66 + pLines.length * 28;
      ensureSpace(pCardH + 16);

      drawRoundedRect(ctx, MARGIN_X, y, CONTENT_W, pCardH, 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#DCE5E3';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#1F6F63';
      ctx.font = `700 18px ${FONT_STACK}`;
      ctx.fillText(
        `${past.label}${past.updatedAt ? ` · ${past.updatedAt}` : ''}`,
        MARGIN_X + 24,
        y + 16
      );

      ctx.fillStyle = '#0F1F2E';
      ctx.font = `400 19px ${FONT_STACK}`;
      let pyLine = y + 48;
      for (const pl of pLines) {
        ctx.fillText(pl, MARGIN_X + 24, pyLine);
        pyLine += 28;
      }

      y += pCardH + 14;
    }
  }

  // =========================================================================
  // 7. FOOTER ON EVERY PAGE (DISCLAIMER + PAGE NUMBERS)
  // =========================================================================
  const totalPages = pages.length;
  const footerText = isTa
    ? 'StrokeCare AI கல்வி மற்றும் தினசரி வீட்டு மீட்புப் பதிவு மட்டுமே · மருத்துவரின் ஆலோசனைக்கு மாற்றல்ல.'
    : 'Educational home recovery summary generated on your device by StrokeCare AI · Not a substitute for professional medical advice.';

  pages.forEach((canvas, idx) => {
    const pCtx = canvas.getContext('2d');
    if (!pCtx) return;
    pCtx.textBaseline = 'top';
    pCtx.strokeStyle = '#DCE5E3';
    pCtx.lineWidth = 1.5;
    pCtx.beginPath();
    pCtx.moveTo(MARGIN_X, PAGE_H - 72);
    pCtx.lineTo(PAGE_W - MARGIN_X, PAGE_H - 72);
    pCtx.stroke();

    pCtx.fillStyle = '#52606D';
    pCtx.font = `400 15px ${FONT_STACK}`;
    pCtx.fillText(footerText, MARGIN_X, PAGE_H - 54);

    pCtx.font = `600 16px ${FONT_STACK}`;
    pCtx.textAlign = 'right';
    pCtx.fillText(
      isTa ? `பக்கம் ${idx + 1} / ${totalPages}` : `Page ${idx + 1} of ${totalPages}`,
      PAGE_W - MARGIN_X,
      PAGE_H - 55
    );
    pCtx.textAlign = 'left';
  });

  // =========================================================================
  // 8. BUILD & DOWNLOAD REAL PDF FILE
  // =========================================================================
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  pages.forEach((canvas, idx) => {
    if (idx > 0) pdf.addPage();
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH, undefined, 'FAST');
  });

  pdf.save(`strokecare-recovery-summary-${input.dateKey}.pdf`);
}
