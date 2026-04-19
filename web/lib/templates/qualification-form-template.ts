/* ── Qualification Form Template Builder ──────────────────────────────────
 * Generates a self-contained HTML/CSS/JS qualification form that gets
 * injected into AI-generated landing pages. The AI handles marketing
 * content; this template handles the conversion-critical form.
 *
 * Two styles:
 *   - multi-step: one question per screen, auto-advance, branching logic
 *   - single-page: all questions + contact form on one page
 * ──────────────────────────────────────────────────────────────────────── */

import type { ScreeningQuestion } from "@/lib/data/tort-qualification-criteria";

export interface QualificationFormOptions {
  screeningQuestions: ScreeningQuestion[];
  firmName: string;
  firmUrl?: string;
  tortName: string;
  disqualifyMessage: string;
  qualifyMessage: string;
  style: "multi-step" | "single-page";
}

/* ── US states for contact form dropdown ─────────────────────────────── */

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado",
  "Connecticut","Delaware","District of Columbia","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota",
  "Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

/* ── Public API ──────────────────────────────────────────────────────── */

export function buildQualificationFormHtml(
  options: QualificationFormOptions,
): string {
  return options.style === "multi-step"
    ? buildMultiStep(options)
    : buildSinglePage(options);
}

/* ════════════════════════════════════════════════════════════════════════
 *  MULTI-STEP FORM
 * ════════════════════════════════════════════════════════════════════════ */

function buildMultiStep(opts: QualificationFormOptions): string {
  const { screeningQuestions, firmName, firmUrl, tortName, disqualifyMessage, qualifyMessage } = opts;
  const totalSteps = screeningQuestions.length;

  const stateOptions = US_STATES.map(
    (s) => `<option value="${s}">${s}</option>`,
  ).join("\n              ");

  const questionsJson = JSON.stringify(
    screeningQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options ?? [],
      disqualifyOn: q.disqualifyOn ?? [],
      helpText: q.helpText ?? "",
    })),
  );

  /* Build step HTML for each screening question */
  const stepsHtml = screeningQuestions
    .map((q, i) => {
      let answersHtml = "";

      if (q.type === "yes_no") {
        answersHtml = `
            <div class="qf-btn-row">
              <button type="button" class="qf-answer-btn" data-step="${i}" data-value="Yes">Yes</button>
              <button type="button" class="qf-answer-btn" data-step="${i}" data-value="No">No</button>
            </div>`;
      } else if (q.type === "select") {
        answersHtml = `
            <div class="qf-btn-stack">
              ${(q.options ?? []).map((o) => `<button type="button" class="qf-answer-btn" data-step="${i}" data-value="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("\n              ")}
            </div>`;
      } else {
        // text or date
        const inputType = q.type === "date" ? "date" : "text";
        answersHtml = `
            <div class="qf-input-row">
              <input type="${inputType}" class="qf-text-input" id="qf-input-${i}" placeholder="${q.type === "date" ? "" : "Type your answer..."}" />
              <button type="button" class="qf-next-btn" data-step="${i}">Next &rarr;</button>
            </div>`;
      }

      return `
          <!-- Step ${i + 1} -->
          <div class="qf-step" data-step-index="${i}">
            <p class="qf-step-counter">Step ${i + 1} of ${totalSteps}</p>
            <h3 class="qf-question">${escapeHtml(q.question)}</h3>
            ${q.helpText ? `<p class="qf-help">${escapeHtml(q.helpText)}</p>` : ""}
            ${answersHtml}
            ${i > 0 ? `<button type="button" class="qf-back-btn" data-back-step="${i}">&larr; Back</button>` : ""}
          </div>`;
    })
    .join("\n");

  return `<!-- QUALIFICATION FORM — MULTI-STEP — Generated from tested template -->
<!-- INTEGRATION: Replace the handleSubmit function with your CRM/intake system endpoint -->
<section class="qf-section" id="qualification-form">
  <style>${multiStepCss(totalSteps)}</style>

  <div class="qf-container">
    <!-- Progress bar -->
    <div class="qf-progress">
      ${screeningQuestions.map((_, i) => `<div class="qf-progress-segment" data-seg="${i}"></div>`).join("\n      ")}
    </div>

    <div class="qf-card">
      <!-- Screening steps -->
      <div class="qf-steps-wrapper" id="qf-steps-wrapper">
        ${stepsHtml}
      </div>

      <!-- Disqualify screen -->
      <div class="qf-screen qf-screen-disqualify" id="qf-disqualify" style="display:none">
        <div class="qf-icon-circle qf-icon-warning">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 class="qf-screen-title">We Appreciate Your Time</h3>
        <p class="qf-screen-msg">${escapeHtml(disqualifyMessage)}</p>
        <p class="qf-screen-sub">However, every situation is unique. If you believe your circumstances are different, we encourage you to reach out.</p>
        <div class="qf-dq-actions">
          <a href="tel:8005550199" class="qf-btn-primary qf-btn-phone">Call For a Free Consultation</a>
          <button type="button" class="qf-btn-secondary" id="qf-dq-back">&larr; Review My Answers</button>
        </div>
      </div>

      <!-- Qualify screen — contact form -->
      <div class="qf-screen qf-screen-qualify" id="qf-qualify" style="display:none">
        <div class="qf-icon-circle qf-icon-success">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3 class="qf-screen-title">You May Qualify</h3>
        <p class="qf-screen-msg">${escapeHtml(qualifyMessage)}</p>

        <form class="qf-contact-form" id="qf-contact-form" novalidate>
          <div class="qf-form-row">
            <div class="qf-form-field">
              <label for="qf-fname">First Name <span class="qf-req">*</span></label>
              <input type="text" id="qf-fname" name="firstName" required autocomplete="given-name" />
            </div>
            <div class="qf-form-field">
              <label for="qf-lname">Last Name <span class="qf-req">*</span></label>
              <input type="text" id="qf-lname" name="lastName" required autocomplete="family-name" />
            </div>
          </div>
          <div class="qf-form-row">
            <div class="qf-form-field">
              <label for="qf-phone">Phone <span class="qf-req">*</span></label>
              <input type="tel" id="qf-phone" name="phone" required autocomplete="tel" placeholder="(555) 123-4567" />
            </div>
            <div class="qf-form-field">
              <label for="qf-email">Email <span class="qf-req">*</span></label>
              <input type="email" id="qf-email" name="email" required autocomplete="email" placeholder="you@example.com" />
            </div>
          </div>
          <div class="qf-form-row">
            <div class="qf-form-field">
              <label for="qf-state">State <span class="qf-req">*</span></label>
              <select id="qf-state" name="state" required>
                <option value="">Select your state</option>
                ${stateOptions}
              </select>
            </div>
            <div class="qf-form-field">
              <label for="qf-callback">Best Time to Call</label>
              <select id="qf-callback" name="bestTimeToCall">
                <option value="">Any time</option>
                <option value="morning">Morning (8am–12pm)</option>
                <option value="afternoon">Afternoon (12pm–5pm)</option>
                <option value="evening">Evening (5pm–8pm)</option>
              </select>
            </div>
          </div>
          <p class="qf-form-error" id="qf-form-error" style="display:none"></p>
          <button type="submit" class="qf-btn-primary qf-btn-submit">
            Get Your Free Case Review
          </button>
          <p class="qf-privacy">Your information is confidential and protected. We will never share your data without your consent.</p>
        </form>
      </div>

      <!-- Thank you screen -->
      <div class="qf-screen qf-screen-thankyou" id="qf-thankyou" style="display:none">
        <div class="qf-icon-circle qf-icon-success qf-icon-animate">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3 class="qf-screen-title">Thank You!</h3>
        <p class="qf-screen-msg" id="qf-ty-msg">A representative from ${escapeHtml(firmName)} will contact you within 24 hours.</p>
        <p class="qf-screen-sub">If you need immediate assistance, please call:</p>
        <a href="tel:8005550199" class="qf-btn-primary qf-btn-phone">Call (800) 555-0199</a>
      </div>
    </div>
  </div>

  <script>${multiStepJs(questionsJson, firmName)}</script>
</section>`;
}

/* ════════════════════════════════════════════════════════════════════════
 *  SINGLE-PAGE FORM
 * ════════════════════════════════════════════════════════════════════════ */

function buildSinglePage(opts: QualificationFormOptions): string {
  const { screeningQuestions, firmName, disqualifyMessage, qualifyMessage } = opts;

  const stateOptions = US_STATES.map(
    (s) => `<option value="${s}">${s}</option>`,
  ).join("\n                ");

  const questionsJson = JSON.stringify(
    screeningQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options ?? [],
      disqualifyOn: q.disqualifyOn ?? [],
      helpText: q.helpText ?? "",
    })),
  );

  const questionsHtml = screeningQuestions
    .map((q, i) => {
      let inputHtml = "";

      if (q.type === "yes_no") {
        inputHtml = `
              <div class="qf-toggle-group" data-question-id="${q.id}">
                <button type="button" class="qf-toggle-btn" data-qid="${q.id}" data-value="Yes">Yes</button>
                <button type="button" class="qf-toggle-btn" data-qid="${q.id}" data-value="No">No</button>
              </div>`;
      } else if (q.type === "select") {
        inputHtml = `
              <div class="qf-select-group" data-question-id="${q.id}">
                ${(q.options ?? []).map((o) => `<button type="button" class="qf-select-btn" data-qid="${q.id}" data-value="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("\n                ")}
              </div>`;
      } else {
        const inputType = q.type === "date" ? "date" : "text";
        inputHtml = `
              <input type="${inputType}" class="qf-sp-input" data-qid="${q.id}" placeholder="${q.type === "date" ? "" : "Type your answer..."}" />`;
      }

      return `
            <div class="qf-sp-question" data-index="${i}">
              <label class="qf-sp-label">${i + 1}. ${escapeHtml(q.question)}</label>
              ${q.helpText ? `<p class="qf-sp-help">${escapeHtml(q.helpText)}</p>` : ""}
              ${inputHtml}
            </div>`;
    })
    .join("\n");

  return `<!-- QUALIFICATION FORM — SINGLE PAGE — Generated from tested template -->
<!-- INTEGRATION: Replace the handleSubmit function with your CRM/intake system endpoint -->
<section class="qf-section" id="qualification-form">
  <style>${singlePageCss()}</style>

  <div class="qf-container">
    <div class="qf-card">
      <h2 class="qf-sp-heading">See If You Qualify</h2>
      <p class="qf-sp-subheading">Answer the questions below to find out if you may be eligible for a free case review.</p>

      <form class="qf-sp-form" id="qf-sp-form" novalidate>
        <div class="qf-sp-questions">
          ${questionsHtml}
        </div>

        <hr class="qf-sp-divider" />

        <h3 class="qf-sp-contact-heading">Your Contact Information</h3>
        <div class="qf-form-row">
          <div class="qf-form-field">
            <label for="qf-sp-fname">First Name <span class="qf-req">*</span></label>
            <input type="text" id="qf-sp-fname" name="firstName" required autocomplete="given-name" />
          </div>
          <div class="qf-form-field">
            <label for="qf-sp-lname">Last Name <span class="qf-req">*</span></label>
            <input type="text" id="qf-sp-lname" name="lastName" required autocomplete="family-name" />
          </div>
        </div>
        <div class="qf-form-row">
          <div class="qf-form-field">
            <label for="qf-sp-phone">Phone <span class="qf-req">*</span></label>
            <input type="tel" id="qf-sp-phone" name="phone" required autocomplete="tel" placeholder="(555) 123-4567" />
          </div>
          <div class="qf-form-field">
            <label for="qf-sp-email">Email <span class="qf-req">*</span></label>
            <input type="email" id="qf-sp-email" name="email" required autocomplete="email" placeholder="you@example.com" />
          </div>
        </div>
        <div class="qf-form-row">
          <div class="qf-form-field">
            <label for="qf-sp-state">State <span class="qf-req">*</span></label>
            <select id="qf-sp-state" name="state" required>
              <option value="">Select your state</option>
              ${stateOptions}
            </select>
          </div>
          <div class="qf-form-field">
            <label for="qf-sp-callback">Best Time to Call</label>
            <select id="qf-sp-callback" name="bestTimeToCall">
              <option value="">Any time</option>
              <option value="morning">Morning (8am–12pm)</option>
              <option value="afternoon">Afternoon (12pm–5pm)</option>
              <option value="evening">Evening (5pm–8pm)</option>
            </select>
          </div>
        </div>

        <p class="qf-form-error" id="qf-sp-error" style="display:none"></p>
        <button type="submit" class="qf-btn-primary qf-btn-submit">See If You Qualify</button>
        <p class="qf-privacy">Your information is confidential and protected. We will never share your data without your consent.</p>
      </form>

      <!-- Result screens (hidden until submit) -->
      <div class="qf-screen qf-screen-disqualify" id="qf-sp-disqualify" style="display:none">
        <div class="qf-icon-circle qf-icon-warning">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 class="qf-screen-title">We Appreciate Your Time</h3>
        <p class="qf-screen-msg">${escapeHtml(disqualifyMessage)}</p>
        <p class="qf-screen-sub">However, every situation is unique. If you believe your circumstances are different, we encourage you to reach out.</p>
        <a href="tel:8005550199" class="qf-btn-primary qf-btn-phone">Call For a Free Consultation</a>
      </div>

      <div class="qf-screen qf-screen-qualify" id="qf-sp-qualify" style="display:none">
        <div class="qf-icon-circle qf-icon-success qf-icon-animate">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3 class="qf-screen-title">Thank You!</h3>
        <p class="qf-screen-msg" id="qf-sp-ty-msg">A representative from ${escapeHtml(firmName)} will contact you within 24 hours.</p>
        <p class="qf-screen-sub">If you need immediate assistance, please call:</p>
        <a href="tel:8005550199" class="qf-btn-primary qf-btn-phone">Call (800) 555-0199</a>
      </div>
    </div>
  </div>

  <script>${singlePageJs(questionsJson, firmName, disqualifyMessage, qualifyMessage)}</script>
</section>`;
}

/* ════════════════════════════════════════════════════════════════════════
 *  CSS — MULTI-STEP
 * ════════════════════════════════════════════════════════════════════════ */

function multiStepCss(totalSteps: number): string {
  return `
    /* ── QF Reset + Variables ── */
    .qf-section {
      --qf-navy: #0B1D3A;
      --qf-navy-light: #122B52;
      --qf-teal: #1A8C96;
      --qf-teal-light: #E0F4F5;
      --qf-teal-dark: #147A83;
      --qf-white: #FFFFFF;
      --qf-gray-50: #F8FAFC;
      --qf-gray-100: #F1F5F9;
      --qf-gray-200: #E2E8F0;
      --qf-gray-300: #CBD5E1;
      --qf-gray-400: #94A3B8;
      --qf-gray-500: #64748B;
      --qf-gray-600: #475569;
      --qf-gray-700: #334155;
      --qf-gray-800: #1E293B;
      --qf-red: #DC2626;
      --qf-red-light: #FEF2F2;
      --qf-green: #16A34A;
      --qf-green-light: #F0FDF4;
      --qf-amber: #D97706;
      --qf-amber-light: #FFFBEB;
      --qf-radius: 12px;
      --qf-radius-sm: 8px;
      --qf-shadow: 0 4px 24px rgba(11, 29, 58, 0.10);
      --qf-shadow-lg: 0 8px 40px rgba(11, 29, 58, 0.15);
      --qf-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-family: var(--qf-font);
      -webkit-font-smoothing: antialiased;
    }
    .qf-section *, .qf-section *::before, .qf-section *::after {
      box-sizing: border-box;
      margin: 0; padding: 0;
    }

    /* ── Container ── */
    .qf-container {
      max-width: 620px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    /* ── Progress Bar ── */
    .qf-progress {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
    }
    .qf-progress-segment {
      flex: 1;
      height: 5px;
      border-radius: 3px;
      background: var(--qf-gray-200);
      transition: background 0.4s ease;
    }
    .qf-progress-segment.active {
      background: var(--qf-teal);
    }
    .qf-progress-segment.completed {
      background: var(--qf-navy);
    }

    /* ── Card ── */
    .qf-card {
      background: var(--qf-white);
      border-radius: var(--qf-radius);
      box-shadow: var(--qf-shadow);
      padding: 32px 28px;
      position: relative;
      overflow: hidden;
    }

    /* ── Steps ── */
    .qf-steps-wrapper { position: relative; }
    .qf-step {
      display: none;
      opacity: 0;
      transform: translateX(20px);
      transition: opacity 0.35s ease, transform 0.35s ease;
    }
    .qf-step.active {
      display: block;
      opacity: 1;
      transform: translateX(0);
    }
    .qf-step-counter {
      font-size: 13px;
      font-weight: 600;
      color: var(--qf-teal);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .qf-question {
      font-size: 22px;
      font-weight: 700;
      color: var(--qf-navy);
      line-height: 1.35;
      margin-bottom: 8px;
    }
    .qf-help {
      font-size: 14px;
      color: var(--qf-gray-500);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    /* ── Answer Buttons ── */
    .qf-btn-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 16px;
    }
    .qf-btn-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 16px;
    }
    .qf-answer-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px 24px;
      font-size: 16px;
      font-weight: 600;
      font-family: var(--qf-font);
      color: var(--qf-navy);
      background: var(--qf-gray-50);
      border: 2px solid var(--qf-gray-200);
      border-radius: var(--qf-radius-sm);
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 56px;
      text-align: center;
      line-height: 1.3;
    }
    .qf-answer-btn:hover {
      border-color: var(--qf-teal);
      background: var(--qf-teal-light);
      color: var(--qf-teal-dark);
    }
    .qf-answer-btn:active {
      transform: scale(0.98);
    }
    .qf-answer-btn.selected {
      border-color: var(--qf-teal);
      background: var(--qf-teal-light);
      color: var(--qf-teal-dark);
      box-shadow: 0 0 0 3px rgba(26, 140, 150, 0.15);
    }

    /* ── Text/Date Input ── */
    .qf-input-row {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .qf-text-input {
      width: 100%;
      padding: 16px;
      font-size: 16px;
      font-family: var(--qf-font);
      border: 2px solid var(--qf-gray-200);
      border-radius: var(--qf-radius-sm);
      background: var(--qf-gray-50);
      color: var(--qf-navy);
      transition: border-color 0.2s;
    }
    .qf-text-input:focus {
      outline: none;
      border-color: var(--qf-teal);
      box-shadow: 0 0 0 3px rgba(26, 140, 150, 0.12);
    }
    .qf-next-btn {
      align-self: flex-end;
      padding: 14px 32px;
      font-size: 15px;
      font-weight: 600;
      font-family: var(--qf-font);
      color: var(--qf-white);
      background: var(--qf-teal);
      border: none;
      border-radius: var(--qf-radius-sm);
      cursor: pointer;
      transition: background 0.2s;
    }
    .qf-next-btn:hover { background: var(--qf-teal-dark); }

    /* ── Back Button ── */
    .qf-back-btn {
      margin-top: 20px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      font-family: var(--qf-font);
      color: var(--qf-gray-500);
      background: none;
      border: 1px solid var(--qf-gray-200);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .qf-back-btn:hover {
      color: var(--qf-navy);
      border-color: var(--qf-gray-400);
    }

    /* ── Screens (Disqualify / Qualify / Thank You) ── */
    .qf-screen {
      text-align: center;
      padding: 16px 0;
      animation: qfFadeIn 0.4s ease;
    }
    @keyframes qfFadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .qf-icon-circle {
      width: 72px; height: 72px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
    }
    .qf-icon-success {
      background: var(--qf-green-light);
      color: var(--qf-green);
    }
    .qf-icon-warning {
      background: var(--qf-amber-light);
      color: var(--qf-amber);
    }
    .qf-icon-animate svg {
      animation: qfCheckPop 0.6s ease 0.2s both;
    }
    @keyframes qfCheckPop {
      0%   { transform: scale(0.5); opacity: 0; }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    .qf-screen-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--qf-navy);
      margin-bottom: 12px;
    }
    .qf-screen-msg {
      font-size: 15px;
      color: var(--qf-gray-600);
      line-height: 1.6;
      margin-bottom: 8px;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }
    .qf-screen-sub {
      font-size: 14px;
      color: var(--qf-gray-400);
      margin-bottom: 24px;
    }
    .qf-dq-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      margin-top: 16px;
    }

    /* ── Primary / Secondary Buttons ── */
    .qf-btn-primary {
      display: inline-block;
      padding: 16px 32px;
      font-size: 16px;
      font-weight: 700;
      font-family: var(--qf-font);
      color: var(--qf-white);
      background: var(--qf-teal);
      border: none;
      border-radius: var(--qf-radius-sm);
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      transition: background 0.2s, transform 0.15s;
      min-width: 240px;
    }
    .qf-btn-primary:hover { background: var(--qf-teal-dark); }
    .qf-btn-primary:active { transform: scale(0.98); }
    .qf-btn-secondary {
      display: inline-block;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 500;
      font-family: var(--qf-font);
      color: var(--qf-gray-500);
      background: none;
      border: 1px solid var(--qf-gray-300);
      border-radius: var(--qf-radius-sm);
      cursor: pointer;
      transition: all 0.2s;
    }
    .qf-btn-secondary:hover {
      color: var(--qf-navy);
      border-color: var(--qf-navy);
    }
    .qf-btn-phone { text-decoration: none; }

    /* ── Contact Form ── */
    .qf-contact-form { margin-top: 24px; text-align: left; }
    .qf-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .qf-form-field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--qf-gray-700);
      margin-bottom: 6px;
    }
    .qf-req { color: var(--qf-red); }
    .qf-form-field input,
    .qf-form-field select {
      width: 100%;
      padding: 12px 14px;
      font-size: 15px;
      font-family: var(--qf-font);
      border: 2px solid var(--qf-gray-200);
      border-radius: var(--qf-radius-sm);
      background: var(--qf-white);
      color: var(--qf-navy);
      transition: border-color 0.2s;
      -webkit-appearance: none;
    }
    .qf-form-field input:focus,
    .qf-form-field select:focus {
      outline: none;
      border-color: var(--qf-teal);
      box-shadow: 0 0 0 3px rgba(26, 140, 150, 0.12);
    }
    .qf-form-field input.qf-invalid,
    .qf-form-field select.qf-invalid {
      border-color: var(--qf-red);
    }
    .qf-form-error {
      color: var(--qf-red);
      font-size: 13px;
      margin-bottom: 12px;
    }
    .qf-btn-submit {
      width: 100%;
      margin-top: 4px;
      padding: 18px;
      font-size: 17px;
    }
    .qf-privacy {
      font-size: 11px;
      color: var(--qf-gray-400);
      text-align: center;
      margin-top: 14px;
      line-height: 1.5;
    }

    /* ── Mobile ── */
    @media (max-width: 600px) {
      .qf-container { padding: 16px 12px; }
      .qf-card { padding: 24px 18px; }
      .qf-question { font-size: 19px; }
      .qf-form-row { grid-template-columns: 1fr; gap: 12px; }
      .qf-btn-row { grid-template-columns: 1fr; }
      .qf-answer-btn { padding: 16px 20px; font-size: 15px; min-height: 52px; }
      .qf-btn-primary { min-width: unset; width: 100%; }
    }
  `;
}

/* ════════════════════════════════════════════════════════════════════════
 *  CSS — SINGLE-PAGE
 * ════════════════════════════════════════════════════════════════════════ */

function singlePageCss(): string {
  return `
    /* ── QF Reset + Variables ── */
    .qf-section {
      --qf-navy: #0B1D3A;
      --qf-navy-light: #122B52;
      --qf-teal: #1A8C96;
      --qf-teal-light: #E0F4F5;
      --qf-teal-dark: #147A83;
      --qf-white: #FFFFFF;
      --qf-gray-50: #F8FAFC;
      --qf-gray-100: #F1F5F9;
      --qf-gray-200: #E2E8F0;
      --qf-gray-300: #CBD5E1;
      --qf-gray-400: #94A3B8;
      --qf-gray-500: #64748B;
      --qf-gray-600: #475569;
      --qf-gray-700: #334155;
      --qf-gray-800: #1E293B;
      --qf-red: #DC2626;
      --qf-red-light: #FEF2F2;
      --qf-green: #16A34A;
      --qf-green-light: #F0FDF4;
      --qf-amber: #D97706;
      --qf-amber-light: #FFFBEB;
      --qf-radius: 12px;
      --qf-radius-sm: 8px;
      --qf-shadow: 0 4px 24px rgba(11, 29, 58, 0.10);
      --qf-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-family: var(--qf-font);
      -webkit-font-smoothing: antialiased;
    }
    .qf-section *, .qf-section *::before, .qf-section *::after {
      box-sizing: border-box;
      margin: 0; padding: 0;
    }

    .qf-container {
      max-width: 680px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    .qf-card {
      background: var(--qf-white);
      border-radius: var(--qf-radius);
      box-shadow: var(--qf-shadow);
      padding: 36px 32px;
    }

    /* ── Heading ── */
    .qf-sp-heading {
      font-size: 26px;
      font-weight: 700;
      color: var(--qf-navy);
      text-align: center;
      margin-bottom: 8px;
    }
    .qf-sp-subheading {
      font-size: 15px;
      color: var(--qf-gray-500);
      text-align: center;
      margin-bottom: 28px;
      line-height: 1.5;
    }

    /* ── Questions ── */
    .qf-sp-questions { display: flex; flex-direction: column; gap: 24px; }
    .qf-sp-question {
      padding-bottom: 24px;
      border-bottom: 1px solid var(--qf-gray-100);
    }
    .qf-sp-question:last-child { border-bottom: none; padding-bottom: 0; }
    .qf-sp-label {
      display: block;
      font-size: 16px;
      font-weight: 600;
      color: var(--qf-navy);
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .qf-sp-help {
      font-size: 13px;
      color: var(--qf-gray-400);
      margin-bottom: 12px;
      line-height: 1.5;
    }

    /* ── Toggle buttons (yes/no) ── */
    .qf-toggle-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .qf-toggle-btn {
      padding: 14px 20px;
      font-size: 15px;
      font-weight: 600;
      font-family: var(--qf-font);
      color: var(--qf-navy);
      background: var(--qf-gray-50);
      border: 2px solid var(--qf-gray-200);
      border-radius: var(--qf-radius-sm);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }
    .qf-toggle-btn:hover {
      border-color: var(--qf-teal);
      background: var(--qf-teal-light);
    }
    .qf-toggle-btn.selected {
      border-color: var(--qf-teal);
      background: var(--qf-teal-light);
      color: var(--qf-teal-dark);
      box-shadow: 0 0 0 3px rgba(26, 140, 150, 0.15);
    }

    /* ── Select buttons ── */
    .qf-select-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .qf-select-btn {
      padding: 14px 20px;
      font-size: 15px;
      font-weight: 500;
      font-family: var(--qf-font);
      color: var(--qf-navy);
      background: var(--qf-gray-50);
      border: 2px solid var(--qf-gray-200);
      border-radius: var(--qf-radius-sm);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    .qf-select-btn:hover {
      border-color: var(--qf-teal);
      background: var(--qf-teal-light);
    }
    .qf-select-btn.selected {
      border-color: var(--qf-teal);
      background: var(--qf-teal-light);
      color: var(--qf-teal-dark);
      box-shadow: 0 0 0 3px rgba(26, 140, 150, 0.15);
    }

    /* ── Text input ── */
    .qf-sp-input {
      width: 100%;
      padding: 14px 16px;
      font-size: 15px;
      font-family: var(--qf-font);
      border: 2px solid var(--qf-gray-200);
      border-radius: var(--qf-radius-sm);
      background: var(--qf-gray-50);
      color: var(--qf-navy);
      transition: border-color 0.2s;
    }
    .qf-sp-input:focus {
      outline: none;
      border-color: var(--qf-teal);
      box-shadow: 0 0 0 3px rgba(26, 140, 150, 0.12);
    }

    /* ── Divider + Contact ── */
    .qf-sp-divider {
      border: none;
      border-top: 2px solid var(--qf-gray-100);
      margin: 32px 0;
    }
    .qf-sp-contact-heading {
      font-size: 20px;
      font-weight: 700;
      color: var(--qf-navy);
      margin-bottom: 20px;
    }

    /* ── Contact Form (shared) ── */
    .qf-form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .qf-form-field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--qf-gray-700);
      margin-bottom: 6px;
    }
    .qf-req { color: var(--qf-red); }
    .qf-form-field input,
    .qf-form-field select {
      width: 100%;
      padding: 12px 14px;
      font-size: 15px;
      font-family: var(--qf-font);
      border: 2px solid var(--qf-gray-200);
      border-radius: var(--qf-radius-sm);
      background: var(--qf-white);
      color: var(--qf-navy);
      transition: border-color 0.2s;
      -webkit-appearance: none;
    }
    .qf-form-field input:focus,
    .qf-form-field select:focus {
      outline: none;
      border-color: var(--qf-teal);
      box-shadow: 0 0 0 3px rgba(26, 140, 150, 0.12);
    }
    .qf-form-field input.qf-invalid,
    .qf-form-field select.qf-invalid {
      border-color: var(--qf-red);
    }
    .qf-form-error {
      color: var(--qf-red);
      font-size: 13px;
      margin-bottom: 12px;
    }

    /* ── Buttons ── */
    .qf-btn-primary {
      display: inline-block;
      padding: 16px 32px;
      font-size: 16px;
      font-weight: 700;
      font-family: var(--qf-font);
      color: var(--qf-white);
      background: var(--qf-teal);
      border: none;
      border-radius: var(--qf-radius-sm);
      cursor: pointer;
      text-decoration: none;
      text-align: center;
      transition: background 0.2s, transform 0.15s;
    }
    .qf-btn-primary:hover { background: var(--qf-teal-dark); }
    .qf-btn-primary:active { transform: scale(0.98); }
    .qf-btn-submit { width: 100%; margin-top: 4px; padding: 18px; font-size: 17px; }
    .qf-btn-phone { text-decoration: none; min-width: 240px; }
    .qf-privacy {
      font-size: 11px;
      color: var(--qf-gray-400);
      text-align: center;
      margin-top: 14px;
      line-height: 1.5;
    }

    /* ── Result Screens ── */
    .qf-screen {
      text-align: center;
      padding: 24px 0;
      animation: qfFadeIn 0.4s ease;
    }
    @keyframes qfFadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .qf-icon-circle {
      width: 72px; height: 72px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
    }
    .qf-icon-success { background: var(--qf-green-light); color: var(--qf-green); }
    .qf-icon-warning { background: var(--qf-amber-light); color: var(--qf-amber); }
    .qf-icon-animate svg {
      animation: qfCheckPop 0.6s ease 0.2s both;
    }
    @keyframes qfCheckPop {
      0%   { transform: scale(0.5); opacity: 0; }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    .qf-screen-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--qf-navy);
      margin-bottom: 12px;
    }
    .qf-screen-msg {
      font-size: 15px;
      color: var(--qf-gray-600);
      line-height: 1.6;
      margin-bottom: 8px;
      max-width: 480px;
      margin-left: auto;
      margin-right: auto;
    }
    .qf-screen-sub {
      font-size: 14px;
      color: var(--qf-gray-400);
      margin-bottom: 24px;
    }

    /* ── Unanswered highlight ── */
    .qf-sp-question.qf-unanswered {
      background: var(--qf-red-light);
      border-radius: var(--qf-radius-sm);
      padding: 16px;
      margin: -16px;
      margin-bottom: 8px;
    }

    /* ── Mobile ── */
    @media (max-width: 600px) {
      .qf-container { padding: 16px 12px; }
      .qf-card { padding: 24px 18px; }
      .qf-sp-heading { font-size: 22px; }
      .qf-form-row { grid-template-columns: 1fr; gap: 12px; }
      .qf-toggle-group { grid-template-columns: 1fr; }
      .qf-btn-primary { width: 100%; }
    }
  `;
}

/* ════════════════════════════════════════════════════════════════════════
 *  JS — MULTI-STEP
 * ════════════════════════════════════════════════════════════════════════ */

function multiStepJs(questionsJson: string, firmName: string): string {
  return `
(function() {
  'use strict';

  var questions = ${questionsJson};
  var totalSteps = questions.length;
  var currentStep = 0;
  var answers = {};
  var isDisqualified = false;

  var stepsWrapper = document.getElementById('qf-steps-wrapper');
  var disqualifyScreen = document.getElementById('qf-disqualify');
  var qualifyScreen = document.getElementById('qf-qualify');
  var thankyouScreen = document.getElementById('qf-thankyou');
  var contactForm = document.getElementById('qf-contact-form');
  var formError = document.getElementById('qf-form-error');
  var dqBackBtn = document.getElementById('qf-dq-back');

  /* Show a specific step */
  function showStep(idx) {
    currentStep = idx;
    var steps = stepsWrapper.querySelectorAll('.qf-step');
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.remove('active');
      steps[i].style.display = 'none';
    }
    if (idx < totalSteps) {
      steps[idx].style.display = 'block';
      /* Small delay for CSS transition */
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          steps[idx].classList.add('active');
        });
      });
    }
    updateProgress(idx);
  }

  /* Update progress bar */
  function updateProgress(idx) {
    var segs = document.querySelectorAll('.qf-progress-segment');
    for (var i = 0; i < segs.length; i++) {
      segs[i].classList.remove('active', 'completed');
      if (i < idx) segs[i].classList.add('completed');
      else if (i === idx) segs[i].classList.add('active');
    }
  }

  /* Show screen, hide steps */
  function showScreen(screen) {
    stepsWrapper.style.display = 'none';
    disqualifyScreen.style.display = 'none';
    qualifyScreen.style.display = 'none';
    thankyouScreen.style.display = 'none';
    screen.style.display = 'block';
    /* Complete all progress segments */
    var segs = document.querySelectorAll('.qf-progress-segment');
    for (var i = 0; i < segs.length; i++) segs[i].classList.add('completed');
  }

  /* Handle answer click (yes_no / select) */
  function handleAnswer(stepIdx, value) {
    var q = questions[stepIdx];
    answers[q.id] = value;

    /* Highlight selected button */
    var step = stepsWrapper.querySelectorAll('.qf-step')[stepIdx];
    var btns = step.querySelectorAll('.qf-answer-btn');
    for (var b = 0; b < btns.length; b++) {
      btns[b].classList.remove('selected');
      if (btns[b].getAttribute('data-value') === value) {
        btns[b].classList.add('selected');
      }
    }

    /* Check disqualification */
    if (q.disqualifyOn && q.disqualifyOn.indexOf(value) !== -1) {
      isDisqualified = true;
      setTimeout(function() { showScreen(disqualifyScreen); }, 250);
      return;
    }

    /* Advance */
    if (stepIdx < totalSteps - 1) {
      setTimeout(function() { showStep(stepIdx + 1); }, 250);
    } else {
      /* All questions answered — show qualify screen */
      setTimeout(function() { showScreen(qualifyScreen); }, 250);
    }
  }

  /* Handle text/date next */
  function handleTextNext(stepIdx) {
    var input = document.getElementById('qf-input-' + stepIdx);
    if (!input) return;
    var val = input.value.trim();
    if (!val) { input.focus(); return; }
    answers[questions[stepIdx].id] = val;
    if (stepIdx < totalSteps - 1) {
      showStep(stepIdx + 1);
    } else {
      showScreen(qualifyScreen);
    }
  }

  /* Back navigation */
  function handleBack(stepIdx) {
    if (stepIdx > 0) showStep(stepIdx - 1);
  }

  /* Event delegation for answer buttons */
  stepsWrapper.addEventListener('click', function(e) {
    var btn = e.target.closest('.qf-answer-btn');
    if (btn) {
      var step = parseInt(btn.getAttribute('data-step'), 10);
      var value = btn.getAttribute('data-value');
      handleAnswer(step, value);
      return;
    }
    var nextBtn = e.target.closest('.qf-next-btn');
    if (nextBtn) {
      var stepN = parseInt(nextBtn.getAttribute('data-step'), 10);
      handleTextNext(stepN);
      return;
    }
    var backBtn = e.target.closest('.qf-back-btn');
    if (backBtn) {
      var stepB = parseInt(backBtn.getAttribute('data-back-step'), 10);
      handleBack(stepB);
    }
  });

  /* Enter key on text inputs */
  stepsWrapper.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var input = e.target.closest('.qf-text-input');
      if (input) {
        e.preventDefault();
        var nextBtn = input.parentElement.querySelector('.qf-next-btn');
        if (nextBtn) nextBtn.click();
      }
    }
  });

  /* DQ back button */
  if (dqBackBtn) {
    dqBackBtn.addEventListener('click', function() {
      isDisqualified = false;
      stepsWrapper.style.display = '';
      disqualifyScreen.style.display = 'none';
      showStep(currentStep);
    });
  }

  /* Contact form validation + submit */
  function validateEmail(email) {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    var digits = phone.replace(/\\D/g, '');
    return digits.length >= 10;
  }

  /* INTEGRATION: Replace this function with your CRM endpoint */
  function handleSubmit(formData) {
    console.log('Form submitted:', JSON.stringify(formData, null, 2));
    /* Example: fetch('/api/leads', { method: 'POST', body: JSON.stringify(formData) }) */
  }

  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      formError.style.display = 'none';

      /* Clear previous validation */
      var inputs = contactForm.querySelectorAll('input, select');
      for (var i = 0; i < inputs.length; i++) inputs[i].classList.remove('qf-invalid');

      var fname = document.getElementById('qf-fname');
      var lname = document.getElementById('qf-lname');
      var phone = document.getElementById('qf-phone');
      var email = document.getElementById('qf-email');
      var state = document.getElementById('qf-state');
      var callback = document.getElementById('qf-callback');

      var errors = [];
      if (!fname.value.trim()) { errors.push('First name'); fname.classList.add('qf-invalid'); }
      if (!lname.value.trim()) { errors.push('Last name'); lname.classList.add('qf-invalid'); }
      if (!validatePhone(phone.value)) { errors.push('Valid phone number'); phone.classList.add('qf-invalid'); }
      if (!validateEmail(email.value)) { errors.push('Valid email address'); email.classList.add('qf-invalid'); }
      if (!state.value) { errors.push('State'); state.classList.add('qf-invalid'); }

      if (errors.length) {
        formError.textContent = 'Please provide: ' + errors.join(', ');
        formError.style.display = 'block';
        return;
      }

      var formData = {
        screeningAnswers: answers,
        contact: {
          firstName: fname.value.trim(),
          lastName: lname.value.trim(),
          phone: phone.value.trim(),
          email: email.value.trim(),
          state: state.value,
          bestTimeToCall: callback ? callback.value : '',
        },
        qualified: true,
      };

      handleSubmit(formData);

      /* Show thank you */
      var tyMsg = document.getElementById('qf-ty-msg');
      if (tyMsg) {
        tyMsg.textContent = 'Thank you, ' + fname.value.trim() + '. A representative from ${escapeForJs(firmName)} will contact you within 24 hours.';
      }
      showScreen(thankyouScreen);
    });
  }

  /* Init: show first step */
  showStep(0);
})();
`;
}

/* ════════════════════════════════════════════════════════════════════════
 *  JS — SINGLE-PAGE
 * ════════════════════════════════════════════════════════════════════════ */

function singlePageJs(
  questionsJson: string,
  firmName: string,
  disqualifyMessage: string,
  qualifyMessage: string,
): string {
  return `
(function() {
  'use strict';

  var questions = ${questionsJson};
  var answers = {};

  var form = document.getElementById('qf-sp-form');
  var errorEl = document.getElementById('qf-sp-error');
  var dqScreen = document.getElementById('qf-sp-disqualify');
  var qualifyScreen = document.getElementById('qf-sp-qualify');

  /* Toggle / Select button handling */
  document.querySelector('.qf-card').addEventListener('click', function(e) {
    var toggle = e.target.closest('.qf-toggle-btn');
    if (toggle) {
      var qid = toggle.getAttribute('data-qid');
      var val = toggle.getAttribute('data-value');
      answers[qid] = val;
      var group = toggle.closest('.qf-toggle-group');
      var btns = group.querySelectorAll('.qf-toggle-btn');
      for (var i = 0; i < btns.length; i++) btns[i].classList.remove('selected');
      toggle.classList.add('selected');
      /* Clear unanswered highlight */
      var questionEl = toggle.closest('.qf-sp-question');
      if (questionEl) questionEl.classList.remove('qf-unanswered');
      return;
    }
    var sel = e.target.closest('.qf-select-btn');
    if (sel) {
      var sqid = sel.getAttribute('data-qid');
      var sval = sel.getAttribute('data-value');
      answers[sqid] = sval;
      var sgroup = sel.closest('.qf-select-group');
      var sbtns = sgroup.querySelectorAll('.qf-select-btn');
      for (var j = 0; j < sbtns.length; j++) sbtns[j].classList.remove('selected');
      sel.classList.add('selected');
      var sqEl = sel.closest('.qf-sp-question');
      if (sqEl) sqEl.classList.remove('qf-unanswered');
    }
  });

  /* Collect text/date inputs */
  function collectTextInputs() {
    var inputs = form.querySelectorAll('.qf-sp-input');
    for (var i = 0; i < inputs.length; i++) {
      var qid = inputs[i].getAttribute('data-qid');
      if (inputs[i].value.trim()) answers[qid] = inputs[i].value.trim();
    }
  }

  function validateEmail(email) {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  }

  function validatePhone(phone) {
    var digits = phone.replace(/\\D/g, '');
    return digits.length >= 10;
  }

  /* INTEGRATION: Replace this function with your CRM endpoint */
  function handleSubmit(formData) {
    console.log('Form submitted:', JSON.stringify(formData, null, 2));
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    collectTextInputs();
    errorEl.style.display = 'none';

    /* Clear validation */
    var allInputs = form.querySelectorAll('input, select');
    for (var i = 0; i < allInputs.length; i++) allInputs[i].classList.remove('qf-invalid');
    var allQs = form.querySelectorAll('.qf-sp-question');
    for (var j = 0; j < allQs.length; j++) allQs[j].classList.remove('qf-unanswered');

    /* Check required screening questions are answered */
    var unanswered = [];
    for (var q = 0; q < questions.length; q++) {
      var qq = questions[q];
      if ((qq.type === 'yes_no' || qq.type === 'select') && !answers[qq.id]) {
        unanswered.push(q);
      }
    }
    if (unanswered.length > 0) {
      for (var u = 0; u < unanswered.length; u++) {
        var qEl = form.querySelectorAll('.qf-sp-question')[unanswered[u]];
        if (qEl) qEl.classList.add('qf-unanswered');
      }
      errorEl.textContent = 'Please answer all screening questions before submitting.';
      errorEl.style.display = 'block';
      /* Scroll to first unanswered */
      var first = form.querySelectorAll('.qf-sp-question')[unanswered[0]];
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    /* Validate contact fields */
    var fname = document.getElementById('qf-sp-fname');
    var lname = document.getElementById('qf-sp-lname');
    var phone = document.getElementById('qf-sp-phone');
    var email = document.getElementById('qf-sp-email');
    var state = document.getElementById('qf-sp-state');
    var callback = document.getElementById('qf-sp-callback');

    var errs = [];
    if (!fname.value.trim()) { errs.push('First name'); fname.classList.add('qf-invalid'); }
    if (!lname.value.trim()) { errs.push('Last name'); lname.classList.add('qf-invalid'); }
    if (!validatePhone(phone.value)) { errs.push('Valid phone number'); phone.classList.add('qf-invalid'); }
    if (!validateEmail(email.value)) { errs.push('Valid email address'); email.classList.add('qf-invalid'); }
    if (!state.value) { errs.push('State'); state.classList.add('qf-invalid'); }

    if (errs.length) {
      errorEl.textContent = 'Please provide: ' + errs.join(', ');
      errorEl.style.display = 'block';
      return;
    }

    /* Check for disqualification */
    var disqualified = false;
    for (var d = 0; d < questions.length; d++) {
      var dq = questions[d];
      if (dq.disqualifyOn && dq.disqualifyOn.length > 0 && answers[dq.id]) {
        if (dq.disqualifyOn.indexOf(answers[dq.id]) !== -1) {
          disqualified = true;
          break;
        }
      }
    }

    var formData = {
      screeningAnswers: answers,
      contact: {
        firstName: fname.value.trim(),
        lastName: lname.value.trim(),
        phone: phone.value.trim(),
        email: email.value.trim(),
        state: state.value,
        bestTimeToCall: callback ? callback.value : '',
      },
      qualified: !disqualified,
    };

    handleSubmit(formData);

    /* Show result */
    form.style.display = 'none';
    if (disqualified) {
      dqScreen.style.display = 'block';
    } else {
      var tyMsg = document.getElementById('qf-sp-ty-msg');
      if (tyMsg) {
        tyMsg.textContent = 'Thank you, ' + fname.value.trim() + '. A representative from ${escapeForJs(firmName)} will contact you within 24 hours.';
      }
      qualifyScreen.style.display = 'block';
    }
  });
})();
`;
}

/* ════════════════════════════════════════════════════════════════════════
 *  UTILITIES
 * ════════════════════════════════════════════════════════════════════════ */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeForJs(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}
