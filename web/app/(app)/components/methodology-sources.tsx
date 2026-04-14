'use client';
import { useState } from 'react';

interface MethodologySection {
  title: string;
  content: string;
  bullets?: string[];
}

interface MethodologySourcesProps {
  sections: MethodologySection[];
  limitations: string[];
  dataNotice: string;
  isPrototypeData?: boolean;
}

export function MethodologySources({
  sections,
  limitations,
  dataNotice,
  isPrototypeData = false,
}: MethodologySourcesProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-lg bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between"
        aria-expanded={isOpen}
      >
        <h2 className="text-lg font-semibold text-midnight-navy">
          Methodology &amp; Sources
        </h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-gray shrink-0"
        >
          {isOpen ? (
            <path d="M18 15l-6-6-6 6" />
          ) : (
            <path d="M6 9l6 6 6-6" />
          )}
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="mt-3 space-y-3 text-sm text-charcoal leading-relaxed">
            {sections.map((section) => (
              <div key={section.title}>
                <h3 className="font-semibold text-midnight-navy text-xs uppercase tracking-wider mb-1">
                  {section.title}
                </h3>
                <p>{section.content}</p>
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-slate-gray">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} dangerouslySetInnerHTML={{ __html: bullet }} />
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <div>
              <h3 className="font-semibold text-midnight-navy text-xs uppercase tracking-wider mb-1">
                Current Limitations
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-gray">
                {limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className={`mt-4 rounded-md border px-4 py-3 text-xs leading-relaxed ${
              isPrototypeData
                ? 'border-warning/30 bg-warning/5'
                : 'border-intelligence-teal/30 bg-intelligence-teal/5'
            }`}
          >
            <strong
              className={
                isPrototypeData ? 'text-warning' : 'text-intelligence-teal'
              }
            >
              {isPrototypeData ? 'Prototype Data Notice:' : 'Data Notice:'}
            </strong>
            <span className="text-charcoal"> {dataNotice}</span>
          </div>
        </>
      )}
    </section>
  );
}
