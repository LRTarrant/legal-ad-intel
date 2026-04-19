/* ── Tort Qualification Criteria ─────────────────────────────────────────
 * Centralized data store for screening questions and disqualification
 * logic used by the campaign builder's landing page generator.
 * ──────────────────────────────────────────────────────────────────────── */

export type QuestionType = "yes_no" | "select" | "text" | "date";

export interface ScreeningQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  disqualifyOn?: string[];
  helpText?: string;
}

export interface TortQualificationCriteria {
  slug: string;
  tortName: string;
  screeningQuestions: ScreeningQuestion[];
  disqualifiers: string[];
  disqualifyMessage: string;
  qualifyMessage: string;
}

/* ── Data ──────────────────────────────────────────────────────────────── */

const DEPO_PROVERA: TortQualificationCriteria = {
  slug: "depo-provera",
  tortName: "Depo-Provera (Meningioma)",
  screeningQuestions: [
    {
      id: "depo-product",
      question: "Did you use Depo-Provera, Depo-SubQ Provera 104, or an authorized generic?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "This includes any medroxyprogesterone acetate injectable contraceptive.",
    },
    {
      id: "depo-injections",
      question: "How many injections did you receive?",
      type: "select",
      options: ["1 injection", "2 injections", "3–5 injections", "6 or more injections"],
      disqualifyOn: ["1 injection"],
      helpText: "A minimum of 2 injections or 12 months of use is required.",
    },
    {
      id: "depo-diagnosis",
      question: "Have you been diagnosed with a meningioma (brain tumor)?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "Meningioma is a tumor that forms on membranes covering the brain and spinal cord.",
    },
    {
      id: "depo-timing",
      question: "Were you diagnosed with a meningioma after you began using Depo-Provera?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "The diagnosis must have occurred after initiating Depo-Provera use.",
    },
    {
      id: "depo-representation",
      question: "Do you currently have an attorney representing you for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
    {
      id: "depo-use-window",
      question: "When did you start using Depo-Provera?",
      type: "select",
      options: ["Before 1992", "1992–2000", "2001–2010", "2011–present"],
      disqualifyOn: ["Before 1992"],
      helpText: "Use must fall within the 1992–present window.",
    },
  ],
  disqualifiers: [
    "Never used Depo-Provera",
    "Only 1 injection / less than 6 months",
    "No brain tumor diagnosis",
    "Brain tumor existed before Depo use",
    "Already represented",
    "Use prior to 1992",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current qualification criteria for the Depo-Provera meningioma lawsuit. However, every situation is unique. We recommend speaking with a legal professional for a personalized review of your case.",
  qualifyMessage:
    "Great news — based on your answers, you may qualify for the Depo-Provera meningioma lawsuit. Complete your contact information below for a free, no-obligation case review.",
};

const ROUNDUP: TortQualificationCriteria = {
  slug: "roundup",
  tortName: "Roundup (Non-Hodgkin Lymphoma)",
  screeningQuestions: [
    {
      id: "roundup-product",
      question: "Did you use Roundup or a glyphosate-based weedkiller?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "roundup-duration",
      question: "How many years did you use the product?",
      type: "select",
      options: ["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "More than 10 years"],
      disqualifyOn: ["Less than 1 year", "1–2 years"],
      helpText: "Minimum 3 years of regular use or 40+ hours lifetime exposure is required.",
    },
    {
      id: "roundup-diagnosis",
      question: "Have you been diagnosed with non-Hodgkin lymphoma or another blood cancer?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "roundup-timing",
      question: "Were you diagnosed after your exposure to Roundup/glyphosate?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "The cancer diagnosis must have occurred after your exposure period.",
    },
    {
      id: "roundup-representation",
      question: "Do you currently have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
    {
      id: "roundup-exposure-type",
      question: "Was your exposure occupational or residential?",
      type: "select",
      options: ["Occupational (farming, landscaping, groundskeeping)", "Residential (home garden/yard)", "Both"],
    },
  ],
  disqualifiers: [
    "Never used Roundup/glyphosate products",
    "Less than 40 hours total lifetime exposure / less than 3 years use",
    "No NHL or blood cancer diagnosis",
    "Cancer diagnosis preceded Roundup exposure",
    "Already represented by an attorney",
    "Statute of limitations expired",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the Roundup lawsuit. However, every case is different. We encourage you to consult with a legal professional for a personalized evaluation.",
  qualifyMessage:
    "Based on your answers, you may qualify for the Roundup lymphoma lawsuit. Please provide your contact information below for a free, confidential case review.",
};

const HAIR_RELAXER: TortQualificationCriteria = {
  slug: "hair-relaxer",
  tortName: "Hair Relaxer (Cancer)",
  screeningQuestions: [
    {
      id: "hair-product",
      question: "Did you use chemical hair relaxer or straightener products?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "hair-duration",
      question: "How long did you use the product?",
      type: "select",
      options: ["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "More than 10 years"],
      disqualifyOn: ["Less than 1 year"],
      helpText: "Typically 2+ years of regular use is required.",
    },
    {
      id: "hair-frequency",
      question: "How often did you use hair relaxer products?",
      type: "select",
      options: ["Once a year or less", "2–3 times per year", "4–6 times per year", "Every 1–2 months", "Monthly or more"],
    },
    {
      id: "hair-diagnosis",
      question: "Have you been diagnosed with uterine cancer, endometrial cancer, ovarian cancer, uterine fibroids, or endometriosis?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "hair-timing",
      question: "Were you diagnosed after you began using hair relaxer products?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "hair-representation",
      question: "Do you already have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "Never used chemical hair relaxer products",
    "Only occasional use (less than 1 year)",
    "No qualifying cancer or fibroid diagnosis",
    "Diagnosis existed before hair relaxer use",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not currently qualify for the hair relaxer lawsuit. Each case is unique — we recommend consulting with a legal professional for a personalized review.",
  qualifyMessage:
    "Based on your answers, you may qualify for the hair relaxer cancer lawsuit. Please provide your contact information below for a free, confidential case evaluation.",
};

const TALCUM_POWDER: TortQualificationCriteria = {
  slug: "talcum-powder",
  tortName: "Talcum Powder (Ovarian Cancer / Mesothelioma)",
  screeningQuestions: [
    {
      id: "talc-product",
      question: "Did you regularly use talcum powder products (e.g., J&J Baby Powder, Shower to Shower)?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "talc-duration",
      question: "How long did you use talcum powder products?",
      type: "select",
      options: ["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "More than 10 years"],
      disqualifyOn: ["Less than 1 year"],
      helpText: "Typically 3+ years of regular use is required.",
    },
    {
      id: "talc-usage-area",
      question: "How did you use the product?",
      type: "select",
      options: ["Perineal/genital area", "Body dusting", "Occupational exposure", "Multiple areas"],
    },
    {
      id: "talc-diagnosis",
      question: "Have you been diagnosed with ovarian cancer, mesothelioma, peritoneal mesothelioma, fallopian tube cancer, or endometrial cancer?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "talc-timing",
      question: "Were you diagnosed after you began using talcum powder products?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "talc-representation",
      question: "Do you already have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "Never used talcum powder products",
    "Only brief or minimal exposure (less than 1 year)",
    "No qualifying cancer diagnosis (ovarian, mesothelioma, etc.)",
    "Diagnosis existed before talcum powder use began",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the talcum powder lawsuit. Each situation is different — speaking with a legal professional can provide a more thorough assessment.",
  qualifyMessage:
    "Based on your answers, you may qualify for the talcum powder cancer lawsuit. Complete your information below for a free, no-obligation case evaluation.",
};

const PARAQUAT: TortQualificationCriteria = {
  slug: "paraquat",
  tortName: "Paraquat (Parkinson's Disease)",
  screeningQuestions: [
    {
      id: "paraquat-exposure",
      question: "Were you exposed to paraquat herbicide (mixing, spraying, handling, or proximity to sprayed fields)?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "paraquat-duration",
      question: "How long were you exposed to paraquat?",
      type: "select",
      options: ["Less than 1 year", "1–3 years", "4–10 years", "More than 10 years"],
      helpText: "Include time working on or near farms where paraquat was used.",
    },
    {
      id: "paraquat-diagnosis",
      question: "Have you been diagnosed with Parkinson's disease?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "paraquat-timing",
      question: "Were you diagnosed after your exposure to paraquat?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "There must be a temporal relationship between exposure and diagnosis.",
    },
    {
      id: "paraquat-representation",
      question: "Do you already have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
    {
      id: "paraquat-occupation",
      question: "What was your occupation during exposure?",
      type: "select",
      options: ["Farm worker", "Pesticide applicator", "Agricultural laborer", "Lived near sprayed fields", "Other"],
    },
  ],
  disqualifiers: [
    "No documented or provable paraquat exposure",
    "No Parkinson's disease diagnosis",
    "Parkinson's diagnosis clearly attributable to genetic factors with no chemical exposure",
    "Claims filed outside statute of limitations without tolling basis",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your responses, you may not meet the current criteria for the paraquat Parkinson's lawsuit. Every situation is different — we recommend consulting with a legal professional.",
  qualifyMessage:
    "Based on your answers, you may qualify for the paraquat Parkinson's disease lawsuit. Please provide your contact information below for a free case review.",
};

const AFFF: TortQualificationCriteria = {
  slug: "afff-firefighting-foam",
  tortName: "AFFF / Firefighting Foam (PFAS)",
  screeningQuestions: [
    {
      id: "afff-exposure",
      question: "Did you use or handle AFFF firefighting foam, or drink water from wells near military bases or airports?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "afff-duration",
      question: "How long were you exposed to AFFF or contaminated water?",
      type: "select",
      options: ["Less than 6 months", "6 months – 2 years", "3–10 years", "More than 10 years"],
      disqualifyOn: ["Less than 6 months"],
      helpText: "Minimum 6 months occupational exposure or documented water contamination.",
    },
    {
      id: "afff-diagnosis",
      question: "Have you been diagnosed with kidney cancer, testicular cancer, bladder cancer, thyroid disease, or ulcerative colitis?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "afff-timing",
      question: "Were you diagnosed during or after your exposure period?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "afff-representation",
      question: "Do you currently have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
    {
      id: "afff-occupation",
      question: "What was your occupation or exposure type?",
      type: "select",
      options: ["Firefighter", "Military personnel", "Airport crew", "Lived near military base or airport", "Other"],
    },
  ],
  disqualifiers: [
    "No occupational or environmental AFFF/PFAS exposure",
    "Exposure less than 6 months with no water contamination",
    "No qualifying cancer or disease diagnosis",
    "Diagnosis existed before AFFF exposure",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the AFFF firefighting foam lawsuit. We recommend speaking with a legal professional for a personalized review.",
  qualifyMessage:
    "Based on your answers, you may qualify for the AFFF firefighting foam lawsuit. Please provide your contact information for a free, no-obligation case evaluation.",
};

const BARD_POWERPORT: TortQualificationCriteria = {
  slug: "bard-powerport",
  tortName: "Bard PowerPort Catheter",
  screeningQuestions: [
    {
      id: "bard-implant",
      question: "Did you have a Bard PowerPort or Bard PowerPort MRI catheter implanted?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "bard-injury",
      question: "What type of injury did you experience?",
      type: "select",
      options: [
        "Catheter fracture",
        "Fragment migration to heart or lungs",
        "Blood clots (thrombosis)",
        "Infection at the port site",
        "Device malfunction requiring surgical removal",
        "Other injury related to the device",
        "No injury experienced",
      ],
      disqualifyOn: ["No injury experienced"],
      helpText: "Common injuries include catheter fracture, fragment migration, pulmonary embolism, and infection.",
    },
    {
      id: "bard-timing",
      question: "Did the injury occur while the device was implanted or shortly after removal?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "bard-documentation",
      question: "Do you have medical records documenting the device implantation and injury?",
      type: "yes_no",
      helpText: "This includes surgical records, imaging (X-ray, CT), or hospital records for emergency interventions.",
    },
    {
      id: "bard-representation",
      question: "Do you currently have an attorney representing you for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "No Bard PowerPort device implanted",
    "No injury experienced from the device",
    "Injury unrelated to the catheter device",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the Bard PowerPort lawsuit. Every case is unique — consulting with a legal professional can provide a more thorough evaluation.",
  qualifyMessage:
    "Based on your answers, you may qualify for the Bard PowerPort catheter lawsuit. Please provide your contact information for a free case review.",
};

const SOCIAL_MEDIA: TortQualificationCriteria = {
  slug: "social-media-addiction",
  tortName: "Social Media Addiction",
  screeningQuestions: [
    {
      id: "social-age",
      question: "Was the affected person under 18 when they began using social media?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "Claimant must have been a minor (under 18, or under 21 in some filings) when addiction began.",
    },
    {
      id: "social-platform",
      question: "Which platform(s) were primarily used?",
      type: "select",
      options: ["Instagram", "Facebook", "TikTok", "Snapchat", "YouTube", "Multiple platforms"],
      helpText: "Must be a named defendant platform.",
    },
    {
      id: "social-diagnosis",
      question: "Has the person been diagnosed with depression, anxiety, PTSD, eating disorder, self-harm, or suicidal ideation?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "A documented mental health diagnosis linked to social media use is required.",
    },
    {
      id: "social-documentation",
      question: "Are there medical or psychological records linking social media use to mental health decline?",
      type: "yes_no",
      helpText: "Medical/psychological records establishing causation strengthen the claim.",
    },
    {
      id: "social-representation",
      question: "Do you currently have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "Person was 18 or older when social media use began",
    "No documented mental health diagnosis",
    "No causation link between social media and mental health decline",
    "Platform not named as a defendant",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the social media addiction lawsuit. We encourage you to consult a legal professional for a personalized evaluation.",
  qualifyMessage:
    "Based on your answers, you may qualify for the social media addiction lawsuit. Please complete your contact details for a free, confidential case review.",
};

const ROBLOX: TortQualificationCriteria = {
  slug: "roblox-abuse",
  tortName: "Roblox Child Exploitation",
  screeningQuestions: [
    {
      id: "roblox-platform",
      question: "Did the child use the Roblox platform?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "Co-defendants include Discord, Snapchat, and Instagram if contact moved to those platforms.",
    },
    {
      id: "roblox-harm",
      question: "What type of harm occurred?",
      type: "select",
      options: [
        "Sexual exploitation or grooming",
        "Sextortion or coerced images",
        "Sexual assault",
        "Trafficking",
        "Other predatory contact",
        "General dissatisfaction with content (no predator contact)",
      ],
      disqualifyOn: ["General dissatisfaction with content (no predator contact)"],
    },
    {
      id: "roblox-age",
      question: "Was the child a minor (under 18) at the time of the exploitation?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "roblox-evidence",
      question: "Are there records documenting the incident (platform usage, chat logs, police reports, medical records)?",
      type: "yes_no",
      helpText: "Evidence such as platform usage records, chat logs, police reports, or psychological records support the claim.",
    },
    {
      id: "roblox-representation",
      question: "Do you currently have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "Child did not use the Roblox platform",
    "No predator contact involved — general content dissatisfaction",
    "Child was not a minor at time of exploitation",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the Roblox exploitation lawsuit. We recommend speaking with a legal professional for a personalized assessment.",
  qualifyMessage:
    "Based on your answers, you may qualify for the Roblox child exploitation lawsuit. Please provide your contact information for a free, confidential case review.",
};

const GLP1_GASTROPARESIS: TortQualificationCriteria = {
  slug: "glp1-gastroparesis",
  tortName: "GLP-1 Gastroparesis (Ozempic/Mounjaro)",
  screeningQuestions: [
    {
      id: "glp1g-medication",
      question: "Which GLP-1 medication did you take?",
      type: "select",
      options: [
        "Ozempic (semaglutide)",
        "Wegovy (semaglutide)",
        "Rybelsus (semaglutide)",
        "Mounjaro (tirzepatide)",
        "Zepbound (tirzepatide)",
        "None of these",
      ],
      disqualifyOn: ["None of these"],
    },
    {
      id: "glp1g-injury",
      question: "What injury did you experience?",
      type: "select",
      options: [
        "Gastroparesis (stomach paralysis)",
        "Bowel obstruction",
        "Ileus",
        "Aspiration during surgery",
        "Severe persistent vomiting",
        "Mild/transient nausea only",
        "No injury",
      ],
      disqualifyOn: ["Mild/transient nausea only", "No injury"],
      helpText: "Mild or transient nausea is a known and expected side effect and does not qualify.",
    },
    {
      id: "glp1g-timing",
      question: "Did your symptoms develop after starting the GLP-1 medication?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "Pre-existing gastroparesis before GLP-1 use does not qualify.",
    },
    {
      id: "glp1g-records",
      question: "Do you have medical records documenting your diagnosis (physician diagnosis, hospitalization records)?",
      type: "yes_no",
      helpText: "A physician diagnosis and hospitalization records strengthen the claim.",
    },
    {
      id: "glp1g-representation",
      question: "Do you currently have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "Did not take a qualifying GLP-1 medication",
    "Only experienced mild/transient nausea (expected side effect)",
    "Pre-existing gastroparesis before GLP-1 use",
    "No documented diagnosis from a physician",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the GLP-1 gastroparesis lawsuit. We recommend consulting a legal professional for a personalized evaluation.",
  qualifyMessage:
    "Based on your answers, you may qualify for the GLP-1 gastroparesis lawsuit. Please provide your contact information for a free, no-obligation case review.",
};

const GLP1_VISION: TortQualificationCriteria = {
  slug: "glp1-vision-loss",
  tortName: "GLP-1 Vision Loss (NAION)",
  screeningQuestions: [
    {
      id: "glp1v-medication",
      question: "Which GLP-1 medication did you take?",
      type: "select",
      options: [
        "Ozempic (semaglutide)",
        "Wegovy (semaglutide)",
        "Rybelsus (semaglutide)",
        "Mounjaro (tirzepatide)",
        "Zepbound (tirzepatide)",
        "None of these",
      ],
      disqualifyOn: ["None of these"],
    },
    {
      id: "glp1v-injury",
      question: "What type of vision loss did you experience?",
      type: "select",
      options: [
        "NAION (non-arteritic anterior ischemic optic neuropathy)",
        "Sudden vision loss",
        "Permanent visual field deficits",
        "Optic nerve damage",
        "Pre-existing vision condition unrelated to medication",
        "No vision problems",
      ],
      disqualifyOn: ["Pre-existing vision condition unrelated to medication", "No vision problems"],
      helpText: "Weight-loss users face 7.64x risk vs. 4.28x for diabetic users.",
    },
    {
      id: "glp1v-timing",
      question: "Did your vision loss develop after starting the GLP-1 medication?",
      type: "yes_no",
      disqualifyOn: ["No"],
    },
    {
      id: "glp1v-records",
      question: "Do you have ophthalmologist records documenting your diagnosis (fundoscopy, OCT, visual field testing)?",
      type: "yes_no",
      helpText: "An ophthalmologist diagnosis of NAION or ischemic optic neuropathy is key evidence.",
    },
    {
      id: "glp1v-representation",
      question: "Do you currently have an attorney for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "Did not take a qualifying GLP-1 medication",
    "Pre-existing NAION or optic nerve condition before GLP-1 use",
    "Arteritic (giant cell arteritis-related) ischemic optic neuropathy",
    "No documented diagnosis from an ophthalmologist",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the GLP-1 vision loss lawsuit. We recommend consulting with a legal professional for a detailed evaluation.",
  qualifyMessage:
    "Based on your answers, you may qualify for the GLP-1 vision loss lawsuit. Please provide your contact information for a free, confidential case evaluation.",
};

const LYFT: TortQualificationCriteria = {
  slug: "lyft-sexual-assault",
  tortName: "Lyft Sexual Assault",
  screeningQuestions: [
    {
      id: "lyft-ride",
      question: "Were you a passenger in a Lyft ride when the incident occurred?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "The assault must have been committed by a Lyft driver during a ride.",
    },
    {
      id: "lyft-assault",
      question: "What type of incident occurred?",
      type: "select",
      options: [
        "Non-consensual touching or kissing",
        "Attempted sexual assault",
        "Completed sexual assault",
        "Kidnapping or trafficking",
        "Verbal sexual harassment only",
      ],
    },
    {
      id: "lyft-documentation",
      question: "Do you have documentation of the incident (police report, medical records, Lyft ride history, therapy records)?",
      type: "yes_no",
      helpText: "Medical records, police reports, or documented psychological injury support the claim.",
    },
    {
      id: "lyft-representation",
      question: "Do you currently have an attorney representing you for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "Incident did not occur during a Lyft ride",
    "Assault not committed by a Lyft driver",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the Lyft sexual assault lawsuit. We strongly encourage you to seek support from a legal professional or victim advocacy organization.",
  qualifyMessage:
    "Based on your answers, you may qualify for the Lyft sexual assault lawsuit. Your information will be kept strictly confidential. Please provide your contact details for a free case evaluation.",
};

const UBER: TortQualificationCriteria = {
  slug: "uber-sexual-assault",
  tortName: "Uber Sexual Assault",
  screeningQuestions: [
    {
      id: "uber-ride",
      question: "Were you a passenger in an Uber ride when the incident occurred?",
      type: "yes_no",
      disqualifyOn: ["No"],
      helpText: "The assault must have been committed by an Uber driver during a ride.",
    },
    {
      id: "uber-assault",
      question: "What type of incident occurred?",
      type: "select",
      options: [
        "Non-consensual touching or kissing",
        "Attempted sexual assault",
        "Completed sexual assault",
        "Kidnapping or trafficking",
        "Verbal sexual harassment only",
      ],
    },
    {
      id: "uber-documentation",
      question: "Do you have documentation of the incident (police report, medical records, Uber ride history, therapy records)?",
      type: "yes_no",
      helpText: "Medical records, police reports, or documented psychological injury support the claim.",
    },
    {
      id: "uber-representation",
      question: "Do you currently have an attorney representing you for this claim?",
      type: "yes_no",
      disqualifyOn: ["Yes"],
    },
  ],
  disqualifiers: [
    "Incident did not occur during an Uber ride",
    "Assault not committed by an Uber driver",
    "Already represented by another attorney",
  ],
  disqualifyMessage:
    "Based on your answers, you may not meet the current criteria for the Uber sexual assault lawsuit. We strongly encourage you to seek support from a legal professional or victim advocacy organization.",
  qualifyMessage:
    "Based on your answers, you may qualify for the Uber sexual assault lawsuit. Your information will be kept strictly confidential. Please provide your contact details for a free case evaluation.",
};

/* ── Exports ───────────────────────────────────────────────────────────── */

export const TORT_QUALIFICATION_CRITERIA: TortQualificationCriteria[] = [
  DEPO_PROVERA,
  ROUNDUP,
  HAIR_RELAXER,
  TALCUM_POWDER,
  PARAQUAT,
  AFFF,
  BARD_POWERPORT,
  SOCIAL_MEDIA,
  ROBLOX,
  GLP1_GASTROPARESIS,
  GLP1_VISION,
  LYFT,
  UBER,
];

/** Look up qualification criteria by tort slug. */
export function getQualificationCriteria(
  slug: string,
): TortQualificationCriteria | undefined {
  return TORT_QUALIFICATION_CRITERIA.find((t) => t.slug === slug);
}

/** Look up qualification criteria by tort display name (fuzzy match). */
export function getQualificationCriteriaByName(
  tortName: string,
): TortQualificationCriteria | undefined {
  const lower = tortName.toLowerCase();
  return TORT_QUALIFICATION_CRITERIA.find(
    (t) =>
      t.tortName.toLowerCase().includes(lower) ||
      lower.includes(t.slug.replace(/-/g, " ")) ||
      lower.includes(t.tortName.toLowerCase()),
  );
}
